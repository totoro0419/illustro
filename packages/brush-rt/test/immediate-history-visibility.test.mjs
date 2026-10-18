import test from 'node:test';
import assert from 'node:assert/strict';
import {GpuRenderer} from '../dist/rt/renderer.mjs';

test('stroke visibility is revoked before submitted GPU ownership is released',()=>{
 const retired=[],hidden=[],b={overlayHoldIds:new Set([10]),overlayDirty:new Map,retirePreview:id=>retired.push(id)},r=new GpuRenderer(b,4000,4000,{strokeHandoff:true});
 b.overlayHoldIds.add(10);r.inflight=true;r.requestWork=()=>{};r.proxy={cancel:id=>hidden.push(id),closeGuards(){}};r.previewStates.set(10,{id:10});r.previewStates.set(11,{id:11});r.previewStates.set(1,{id:1});r.wrapPreviews.set(10,[11]);r.snapshot={id:10};r.mailbox.value={id:10};
 r.hideStrokePreview(10);assert.deepEqual(hidden,[10,11]);assert.deepEqual(retired,[]);assert.ok(!r.previewStates.has(10));assert.ok(r.previewStates.has(1));assert.equal(r.mailbox.value,null);assert.ok(b.overlayHoldIds.has(10),'retain preceding layer ownership until exact restoration');
 r.inflight=false;r.flushHiddenPreviews();assert.deepEqual(retired,[10,11]);r.setLive({id:10});assert.ok(!r.previewStates.has(10),'late preview must remain hidden');
});

test('restoring B does not clear the retained preview of A',()=>{
 const b={retirePreview(){},overlayHoldIds:new Set},r=new GpuRenderer(b,4000,4000,{strokeHandoff:true});let invalidations=0;
 r.requestWork=()=>{};r.proxy={cancel(){},closeGuards(){},suspended:false,invalidate(){invalidations++;}};r.previewStates.set(10,{id:10});r.previewStates.set(1,{id:1});r.hideStrokePreview(10);r.setLive=state=>r.previewStates.set(state.id,state);r.restoreStrokePreview(10);
 assert.ok(r.previewStates.has(1));assert.ok(r.previewStates.has(10));assert.equal(invalidations,0);
});
