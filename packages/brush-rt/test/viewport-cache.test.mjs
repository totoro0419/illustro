import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationPyramid,ViewportCache,presentationRectangles} from '../dist/rt/minification.mjs';
import {needsFormalFeedback,boundedFormalJobs} from '../dist/rt/renderer.mjs';
function harness(){
 let id=0;const released=[],b={width:4000,height:4000,canvas:{width:1000,height:1600},sparsePreview:true,gl:{RGBA8:1,UNSIGNED_BYTE:2},liveTarget:{id:0},surface:(w,h)=>({id:++id,w,h}),release:x=>released.push(x)};
 b.presentationPyramid=new PresentationPyramid(b,'');b.presentationPyramid.initialize=()=>{};b.presentationPyramid.draw=()=>{};b.viewportCache=new ViewportCache(b);
 const view=new Float32Array([1000,1600,400,640,4000,4000,.09,0,0,0,1,1,0,0,0,0]);return {b,c:b.viewportCache,p:b.presentationPyramid,view,released};
}
test('viewport cache reuses an unchanged frame and recomputes a bounded changed area',()=>{
 const {b,c,p,view}=harness();assert.deepEqual(c.plan(view).rects,[[0,0,1000,1600]]);assert.equal(c.bytes,1000*1600*4);assert.deepEqual(c.plan(view).rects,[]);
 p.invalidate(new Set(['15,15']));const plan=c.plan(view);assert.ok(plan.rects.length);assert.ok(c.last.screenPixels<1000*1600/50);assert.equal(c.plan(view).rects.length,0);assert.equal(b.width,4000);
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
