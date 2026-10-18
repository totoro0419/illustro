import test from 'node:test';
import assert from 'node:assert/strict';
import {GpuRenderer,TileDocument} from '../dist/rt/renderer.mjs';

test('history removal cancels only selected queued ids, preserving retained offsets and order',()=>{
 const d=new TileDocument(4000,4000),preset={};d.jobs=[{id:1,key:'0,0',surfaceKey:'a',preset,commands:[1,2,3],offset:1,commit:false},{id:1,key:'0,0',surfaceKey:'a',preset,commands:[],offset:0,commit:true},{id:2,key:'1,0',surfaceKey:'b',preset,commands:[4,5],offset:0,commit:false},{id:2,key:'1,0',surfaceKey:'b',preset,commands:[],offset:0,commit:true}];d.count=4;
 const retained=d.jobs.slice(0,2);assert.deepEqual(d.discardHistory([2]),{jobs:2,commands:2});assert.deepEqual(d.jobs,retained);assert.equal(d.count,2);assert.equal(d.jobs[0].offset,1);
});
test('interrupting formal coverage preserves committed images and unrelated stroke resources',async()=>{
 const interrupted=[],retired=[],released=[],r=new GpuRenderer({tiles:new Map,dirtyConfirmed:new Set,previews:new Map,overlayHoldIds:new Set,overlayDirty:new Map},4000,4000);
 const b=r.backend;b.imageHistory={interrupt(id){interrupted.push(id);}};b.gl={};b.release=image=>released.push(image);b.retirePreview=id=>retired.push(id);
 const a={active:1,stroke:['removed'],layer:['before','after'],l:1,previousPreset:'old',preset:'new'},z={active:2,stroke:['retained'],layer:['other'],l:0};b.tiles.set('a',a);b.tiles.set('b',z);
 r.document.jobs=[{id:1,commands:[1,2],offset:0,commit:false},{id:2,commands:[3],offset:0,commit:false}];r.document.count=3;r.historyPreparing=true;r.ended.add(1);r.ended.add(2);r.wrapPreviews.set(1,[100]);r.previewStates.set(100,{});
 assert.deepEqual(await r.discardImageHistoryPending([{id:1,direction:'undo'}]),{jobs:1,commands:2});assert.deepEqual(interrupted,[1]);assert.deepEqual(released,['removed']);assert.equal(a.l,1);assert.deepEqual(a.layer,['before','after']);assert.equal(a.preset,'old');assert.equal(z.active,2);assert.deepEqual(z.stroke,['retained']);assert.equal(r.ended.has(2),true);assert.deepEqual(retired,[1,100]);assert.equal(r.previewStates.has(100),false);
});
test('submitted work must be acknowledged before any history cancellation mutates the queue',async()=>{
 const r=new GpuRenderer({tiles:new Map},4000,4000);r.historyPreparing=true;r.inflight=true;await assert.rejects(r.discardImageHistoryPending([{id:1,direction:'undo'}]),/acknowledge/);
});
