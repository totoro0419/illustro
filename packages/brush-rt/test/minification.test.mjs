import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationPyramid} from '../dist/rt/minification.mjs';
function cache(){const b={width:3000,height:3000,liveTarget:{id:0},referenceImage:{id:'reference'}};
 const p=new PresentationPyramid(b,'');let id=0;const calls=[];
 p.initialize=()=>{};p.allocate=(w,h)=>({id:++id,w,h});p.draw=(source,level,rects)=>calls.push({source:source.id,target:level.image.id,rects});
 const v=new Float32Array([800,600,800,600,3000,3000,.25,0,0,0,1,1,0,0,0,0]);return {p,v,calls};}
test('minification storage is bounded and movement does not rebuild unchanged levels',()=>{
 const {p,v,calls}=cache();p.source(v);const initial=calls.length;assert.equal(initial,2);assert.ok(p.bytes<3000*3000*4/3+10000);
 for(let i=0;i<100;i++){v[8]=i;p.source(v);}assert.equal(calls.length,initial);
});
test('one dirty tile updates only its reduced rectangles',()=>{
 const {p,v,calls}=cache();p.source(v);calls.length=0;p.invalidate(new Set(['1,1']));p.source(v);
 assert.deepEqual(calls[0].rects,[[64,64,128,128]]);assert.deepEqual(calls[1].rects,[[32,32,64,64]]);
});
test('a deeper level skipped during edits is refreshed when zoom exposes it',()=>{
 const {p,v,calls}=cache();p.source(v);v[6]=.5;p.invalidate(new Set(['1,1']));p.source(v);
 calls.length=0;v[6]=.25;p.source(v);assert.equal(calls.length,1);assert.deepEqual(calls[0].rects,[[0,0,750,750]]);
});
test('100 percent and exact-pixel views keep the original source',()=>{
 const {p,v,calls}=cache();v[6]=1;assert.equal(p.source(v).scale,1);assert.equal(calls.length,0);
 v[6]=.125;v[13]=1;assert.equal(p.source(v).source.id,0);
});
