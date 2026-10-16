import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationPyramid,ViewportCache,presentationRectangles} from '../dist/rt/minification.mjs';
import {GpuRenderer,needsFormalFeedback,boundedFormalJobs,previewMemoryDemand} from '../dist/rt/renderer.mjs';
function harness(){
 let id=0;const released=[],b={width:4000,height:4000,canvas:{width:1000,height:1600},sparsePreview:true,gl:{RGBA8:1,UNSIGNED_BYTE:2},liveTarget:{id:0},surface:(w,h)=>({id:++id,w,h}),release:x=>released.push(x)};
 b.presentationPyramid=new PresentationPyramid(b,'');b.presentationPyramid.initialize=()=>{};b.presentationPyramid.draw=()=>{};b.viewportCache=new ViewportCache(b);
 const view=new Float32Array([1000,1600,400,640,4000,4000,.09,0,0,0,1,1,0,0,0,0]);return {b,c:b.viewportCache,p:b.presentationPyramid,view,released};
}
test('viewport cache reuses an unchanged frame and recomputes a bounded changed area',()=>{
 const {b,c,p,view}=harness();assert.deepEqual(c.plan(view).rects,[[0,0,1000,1600]]);assert.equal(c.bytes,1000*1600*4);assert.deepEqual(c.plan(view).rects,[]);
 p.invalidate(new Set(['15,15']));const plan=c.plan(view);assert.ok(plan.rects.length);assert.ok(c.last.screenPixels<1000*1600/50);assert.equal(c.last.screenCopiedPixels,c.last.screenPixels);assert.equal(c.plan(view).rects.length,0);assert.equal(b.width,4000);
});
test('viewport invalidation is independent of minification at 100 percent',()=>{
 const {c,p,view}=harness();view[6]=1;c.plan(view);assert.equal(p.full,true);assert.deepEqual(c.plan(view).rects,[]);p.invalidate(new Set(['15,15']));c.plan(view);assert.ok(c.last.screenPixels<1000*1600/4);assert.deepEqual(c.plan(view).rects,[]);
});
test('view changes, missed generations and clearing require a complete image',()=>{
 const {c,p,view}=harness();c.plan(view);view[7]=.4;assert.equal(c.plan(view).rects[0][2],1000);p.invalidate(new Set(['15,15']));p.invalidate(new Set(['16,16']));assert.deepEqual(c.plan(view).rects,[[0,0,1000,1600]]);p.clear();assert.deepEqual(c.plan(view).rects,[[0,0,1000,1600]]);
});
test('view-only, seamless and budget fallbacks retain the direct presentation path',()=>{
 const {b,c,view,released}=harness();c.plan(view);assert.equal(c.plan(view,null,true).cached,false);assert.deepEqual(c.plan(view).rects,[[0,0,1000,1600]]);view[12]=1;assert.equal(c.plan(view).cached,false);view[12]=0;b.canvas.width=9000;assert.equal(c.plan(view).cached,false);assert.equal(c.bytes,0);assert.equal(c.image,null);assert.ok(released.length);
});
test('offscreen edits and flips produce conservative clipped screen rectangles',()=>{
 const {view}=harness();view[6]=1;assert.deepEqual(presentationRectangles(view,1000,1600,['0,0'],1),[]);const normal=presentationRectangles(view,1000,1600,['15,15'],1);view[10]=-1;view[11]=-1;const flipped=presentationRectangles(view,1000,1600,['15,15'],1);assert.ok(normal.length&&flipped.length);for(const rects of [normal,flipped])for(const [x,y,x1,y1]of rects){assert.ok(x>=0&&y>=0&&x1<=1000&&y1<=1600&&x1>x&&y1>y);}
});
test('intermediate coverage can reuse ended feedback, while commits and partial feedback publish',()=>{
 const job={id:1,key:'0,0',surfaceKey:'a',commit:false},feedback={lastState:{finished:true},surfaceKey:'a',tiles:new Map([['0,0',{}]])},backend={sparsePreview:true,previews:new Map([[1,feedback]])};assert.equal(needsFormalFeedback(backend,job),false);assert.equal(needsFormalFeedback(backend,{...job,commit:true}),true);assert.equal(needsFormalFeedback(backend,{...job,surfaceKey:'b'}),true);assert.equal(needsFormalFeedback(backend,{...job,key:'1,0'}),true);feedback.lastState.finished=false;assert.equal(needsFormalFeedback(backend,job),true);backend.previews.clear();assert.equal(needsFormalFeedback(backend,job),true);
});
test('normal formal batches bound command overhead as well as pixel work',()=>{
 let requested=0;const jobs=Array.from({length:200},(_,id)=>({id,key:'0,0',surfaceKey:'a',preset:{},commands:[],commit:true})),document={peekMany:limit=>{requested=limit;return jobs.slice(0,limit);}};const selected=boundedFormalJobs(document,2_000_000,32);assert.equal(requested,32);assert.equal(selected.length,32);assert.deepEqual(selected,jobs.slice(0,32));assert.equal(jobs.length,200);
});

test('active input bounds batch overhead while idle and held reconstruction recover throughput',async()=>{
 const limits=[],backend={previews:new Map,dirtyConfirmed:new Set,presentationHeld:false,lastSubmission:{presentationSubmitted:false},render:()=>Promise.resolve()},r=new GpuRenderer(backend,512,512,{strokeHandoff:true});r.requestWork=()=>{};r.document.peekMany=limit=>{limits.push(limit);return [];};
 for(const [finished,held,pressure]of [[false,false,false],[true,false,false],[false,true,false],[false,false,true]]){r.snapshot={finished,preset:{}};backend.presentationHeld=held;backend.previewPressure=pressure;r.needsFrame=true;r.frame(0);await Promise.resolve();}
 assert.deepEqual(limits,[32,128,128,128]);assert.equal(r.document.jobs.length,0);
});

test('preview budget preflight uses frozen published geometry without consuming it',()=>{
 const command=x=>{const c=new Float32Array(24);c[0]=x;c[1]=64;c[2]=4;c[13]=x;c[18]=2;c[19]=1;return c;},source=[64,192,320].map(command),v={stableCursor:1,index:0,tiles:new Map([['0,0',{}]])},b={width:512,height:128,previewBytes:262144,previews:new Map([[1,v]])},state={id:1,preset:{tip:'round'},stableSource:source,stableEnd:2,commands:[source[0]]};
 assert.equal(previewMemoryDemand(b,[state]),2*262144);assert.equal(v.stableCursor,1);assert.equal(v.index,0);assert.equal(v.lastState,undefined);assert.deepEqual([...v.tiles.keys()],['0,0']);
 v.lastState=state;assert.equal(previewMemoryDemand(b,[state]),262144);
});
