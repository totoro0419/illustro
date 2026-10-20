import test from 'node:test';
import assert from 'node:assert/strict';
import {RealtimeSession} from '../dist/rt/session.mjs';
import {CanonicalBuilder} from '../dist/rt/model.mjs';
import {referenceBrushes} from '../dist/rt/index.mjs';
import {GpuRenderer,TileDocument} from '../dist/rt/renderer.mjs';

test('gesture cancellation retains 2000 completed strokes without resetting or replaying the artwork',async()=>{
 const original=globalThis.Worker,messages=[],calls={resets:0,replays:0,cancels:[]};
 globalThis.Worker=class{postMessage(m){messages.push(m);}terminate(){}};
 try{
  const renderer={setLive(){},document:{append(){calls.replays++;},end(){return ['0,0'];}},async reset(){calls.resets++;},async drain(){},async cancelStroke(id){calls.cancels.push(id);}},session=new RealtimeSession(renderer,'mock');
  const builder=new CanonicalBuilder(referenceBrushes[0]);builder.accept({x:40,y:40,t:1,pointerType:'touch'});builder.finish();
  const records=Array.from({length:2000},()=>builder.record()),redo=[builder.record()];session.records=records;session.redoRecords=redo;
  session.begin(referenceBrushes[0]);session.accept({x:60,y:60,t:2,pointerType:'touch'});session.flush();const id=session.active.id;
  await session.cancel();
  assert.equal(calls.resets,0,'cancelling the first finger must not clear completed GPU layers');
  assert.equal(calls.replays,0,'completed stroke count must not determine cancellation work');
  assert.deepEqual(calls.cancels,[id]);assert.equal(session.records,records);assert.equal(session.redoRecords,redo);assert.equal(session.active,null);
  assert.equal(messages.at(-1).type,'cancel');
  session.worker.onmessage({data:{type:'commands',id,commands:builder.commands}});
  session.worker.onmessage({data:{type:'record',id,record:builder.record()}});
  assert.equal(session.records.length,2000);assert.equal(calls.replays,0,'late cancelled worker output must not recreate the stroke');
 }finally{globalThis.Worker=original;}
});

test('cancelling queued coverage removes only that stroke, including partial job offsets and deduplication state',()=>{
 const builder=new CanonicalBuilder(referenceBrushes[0]);for(let i=0;i<30;i++)builder.accept({x:40+i*4,y:40,t:i,pointerType:'touch'});builder.finish();
 const d=new TileDocument(512,384);d.append(1,builder.p,builder.commands,null,'a');d.append(2,builder.p,builder.commands,null,'b');
 const first=d.peekMany(1)[0];d.complete(first);const other=d.jobs.filter(j=>j.id===2),otherCount=other.reduce((n,j)=>n+j.commands.length-j.offset,0);
 const cancelled=d.cancel(1);assert.equal(cancelled.surfaceKey,'a');assert.ok(cancelled.keys.length);assert.deepEqual(d.jobs,other);assert.equal(d.count,otherCount);
 assert.ok([...d.open.values()].every(j=>j.id===2));assert.equal(d.touched.has(1),false);assert.equal(d.solidSeen.has(1),false);assert.equal(d.jobs.some(j=>j.id===1),false);
 d.end(2,builder.p,'b');assert.throws(()=>d.cancel(2),/ended stroke/,'formal commits cannot be discarded as gesture feedback');
});

test('in-flight cancellation waits for resource safety, preserves layer identity and still presents the latest view',async()=>{
 const original=globalThis.requestAnimationFrame;let now=0,ready=false,resolveSubmission;globalThis.requestAnimationFrame=callback=>queueMicrotask(()=>callback(now+=16));
 try{
  const committed={pixels:'finished artwork'},calls={renders:0,views:0,cancels:[],retired:[],resets:0},backend={surfaceStack:['a'],tiles:new Map(),dirtyConfirmed:new Set(),presentationHeld:false,
   render(s,jobs){calls.renders++;assert.ok(jobs.every(j=>j.id===1));if(calls.renders===1)return new Promise(resolve=>{resolveSubmission=resolve;});return Promise.resolve();},
   poll(){if(ready){ready=false;resolveSubmission();return true;}},setViewTransform(v){this.viewTransform=v;},presentView(){calls.views++;return true;},
   cancelStroke(id,keys,surface){assert.equal(r.inflight,false);calls.cancels.push({id,keys,surface});},retirePreview(id){calls.retired.push(id);},clear(){calls.resets++;},
  };
  const r=new GpuRenderer(backend,512,384),b=new CanonicalBuilder(referenceBrushes[0]);backend.canvas={style:{}};const view=new Float32Array([800,600,800,600,512,384,1,0,0,0,1,1,0,0,0,0]);backend.viewTransform=view;r.presentationView=view.slice();for(let i=0;i<50;i++)b.accept({x:40+i*3,y:40,t:i,pointerType:'touch'});b.finish();
  backend.tiles.set('a\u00000,0',committed);r.document.append(1,b.p,b.commands,null,'a');r.frame(0);assert.equal(r.inflight,true);
  r.previewStates.set(1,{id:1});r.previewStates.set(8000001,{id:8000001});r.wrapPreviews.set(1,[8000001]);r.wrapCaches.set(1,{});r.snapshot={id:1};r.mailbox.set({id:1});
  const cancelled=r.cancelStroke(1);const next=view.slice();next[8]=20;r.setViewTransform(next);r.frame(1);assert.equal(backend.canvas.style.transform,'matrix(1,0,0,1,20,0)','navigation is not blocked by cancellation completion');assert.equal(calls.views,0);assert.equal(calls.cancels.length,0);
  ready=true;await cancelled;assert.equal(backend.tiles.get('a\u00000,0'),committed);assert.equal(calls.resets,0);assert.equal(r.document.jobs.length,0);assert.equal(r.document.count,0);
  assert.equal(calls.cancels.length,1);assert.equal(calls.cancels[0].surface,'a');assert.deepEqual(calls.retired,[1,8000001]);assert.equal(r.previewStates.size,0);assert.equal(r.wrapPreviews.size,0);assert.equal(r.wrapCaches.size,0);assert.equal(r.snapshot,null);assert.equal(r.mailbox.value,null);assert.deepEqual(r.errors,[]);
 }finally{globalThis.requestAnimationFrame=original;}
});

test('an unsubmitted gesture stroke never waits for another stroke GPU acknowledgement',async()=>{
 const calls=[],backend={previews:new Map([[1,{owner:'submitted old stroke'}]]),tiles:new Map,dirtyConfirmed:new Set,cancelStroke(id,keys){calls.push({id,keys});},retirePreview(id){calls.push({retired:id});}};
 const r=new GpuRenderer(backend,512,384,{strokeHandoff:true});r.requestWork=()=>{};r.inflight=true;r.guardPreparing=true;r.previewStates.set(10,{id:10});r.mailbox.set({id:10});r.inputStarts.set(10,{});r.document.cancel=()=>{throw Error('an unrelated queue must not be scanned');};
 await r.cancelStroke(10);assert.equal(r.inflight,true);assert.equal(r.guardPreparing,true);assert.equal(r.cancellingStroke,false);assert.equal(r.previewStates.has(10),false);assert.equal(r.mailbox.value,null);assert.equal(backend.previews.has(1),true);assert.deepEqual(calls,[{retired:10}]);
});

test('handoff cancellation keeps the safety barrier for its own formal or preview resources',async()=>{
 const previous=globalThis.requestAnimationFrame;try{for(const kind of ['formal','preview']){
  let resume,done=false;globalThis.requestAnimationFrame=fn=>{resume=fn;};const calls=[],backend={previews:new Map(kind==='preview'?[[10,{}]]:[]),tiles:new Map,dirtyConfirmed:new Set,cancelStroke(id){calls.push(id);},retirePreview(id){this.previews.delete(id);}};
  const r=new GpuRenderer(backend,512,384,{strokeHandoff:true});r.requestWork=()=>{};if(kind==='formal')r.document.touched.set(10,{surfaceKey:'a',keys:new Set});r.inflight=r.guardPreparing=true;
  const pending=r.cancelStroke(10).then(()=>done=true);assert.equal(typeof resume,'function');assert.equal(done,false);assert.deepEqual(calls,[]);r.inflight=r.guardPreparing=false;resume(performance.now());await pending;assert.equal(done,true);assert.deepEqual(calls,[10]);assert.equal(backend.previews.has(10),false);
 }}finally{if(previous===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=previous;}
});
