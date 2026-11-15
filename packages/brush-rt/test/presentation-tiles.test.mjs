import test from 'node:test';
import assert from 'node:assert/strict';
import {tilePages,ATLAS_TILES,ATLAS_SIZE} from '../dist/rt/presentation-tiles.mjs';
import {StrokeOverlay,toDocument} from '../dist/rt/stroke-overlay.mjs';

test('transport covers document corners and partial edge tiles independently of the viewport',()=>{
 const pages=tilePages(['0,0','31,0','0,31','31,31','32,32','-1,0'],4000,4000);
 assert.deepEqual(pages[0].map(({key,w,h})=>({key,w,h})),[{key:'0,0',w:128,h:128},{key:'31,0',w:32,h:128},{key:'0,31',w:128,h:32},{key:'31,31',w:32,h:32}]);
});
test('atlases carry each dirty document tile exactly once without overlapping slots',()=>{
 const keys=Array.from({length:123},(_,i)=>i%32+','+Math.floor(i/32)),pages=tilePages(keys,4000,4000);
 assert.equal(pages.length,Math.ceil(keys.length/ATLAS_TILES));assert.deepEqual(pages.flat().map(t=>t.key),keys);
 for(const page of pages){const slots=new Set;for(const t of page){assert.ok(t.sx+t.w<=ATLAS_SIZE&&t.sy+t.h<=ATLAS_SIZE);slots.add(t.sx+','+t.sy);}assert.equal(slots.size,page.length);}
});
test('navigation retains a pending document grid and work instead of cancelling hidden areas',()=>{
 const backend={width:4000,height:4000},q=new StrokeOverlay(backend,{documentSpace:true});
 const view=[780,1200,390,600,4000,4000,1,0,0,0,1,1,0,0,0,0];q.setView(view);
 const work={},v={id:1,work,view:q.plan.rasterView,plan:q.plan};q.states.set(1,v);q.pending.set(1,{});const epoch=q.epoch;
 q.setView([...view.slice(0,6),.08,.7,100,-70,-1,1,...view.slice(12)]);
 assert.equal(q.epoch,epoch);assert.equal(v.work,work);assert.equal(q.pending.size,1);
 assert.equal(v.plan.screenWidth,4000);assert.equal(v.plan.screenHeight,4000);
 const corner=toDocument(v.view,0,0);assert.deepEqual(corner,{x:0,y:0});
});
