import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationPyramid,ViewportCache,presentationRectangles,navigationRectangle} from '../dist/rt/minification.mjs';
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
test('navigation bounds include every visible artwork corner through rotation and flips',()=>{
 const {view}=harness(),width=1000,height=1600;
 for(const angle of [0,.43,-1.1,Math.PI])for(const flipX of [-1,1])for(const flipY of [-1,1])for(const zoom of [.025,.09,1,32]){
  Object.assign(view,{6:zoom,7:angle,8:75,9:-300,10:flipX,11:flipY});const [x0,y0,x1,y1]=navigationRectangle(view,width,height);
  for(const x of [0,2000,4000])for(const y of [0,2000,4000]){
   const dx=(x-2000)*flipX,dy=(y-2000)*flipY,px=(200+75+zoom*(dx*Math.cos(angle)-dy*Math.sin(angle)))*2.5,py=(320-300+zoom*(dx*Math.sin(angle)+dy*Math.cos(angle)))*2.5;
   if(px>=0&&py>=0&&px<width&&py<height)assert.ok(px>=x0&&px<x1&&py>=y0&&py<y1);
  }
 }
 view[12]=1;assert.deepEqual(navigationRectangle(view,width,height),[0,0,width,height]);
});
test('an entirely offscreen navigation clears the old image and leaves normal caching unchanged',()=>{
 const {b,c,view}=harness();b.navigationPresentation=true;view[8]=100000;const hidden=c.plan(view,null,true);assert.equal(hidden.clearBackground,true);assert.deepEqual(hidden.rects,[]);assert.equal(c.last.screenPixels,0);
 b.navigationPresentation=false;assert.deepEqual(c.plan(view,null,true).rects,[[0,0,1000,1600]]);assert.equal(c.plan(view).cached,true);
});
test('ending a gesture schedules the exact idle presentation even without another view input',()=>{
 const backend={previews:new Map,viewTransform:new Float32Array(16)},r=new GpuRenderer(backend,512,512,{strokeHandoff:true});let work=0;r.requestWork=()=>{work++;};
 r.setNavigationActive(true);assert.equal(backend.navigationPresentation,true);assert.equal(r.viewPending,false);
 r.setNavigationActive(false);assert.equal(backend.navigationPresentation,false);assert.equal(r.viewPending,true);assert.equal(work,1);assert.equal(r.document.jobs.length,0);
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
