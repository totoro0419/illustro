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

test('publication canceled during a document port wait stages exact canonical Redo without GPU jobs',async()=>{
 const {RealtimeSession}=await import('../dist/rt/session.mjs');
 const command=Array(24).fill(0);Object.assign(command,{0:100,1:100,2:20,16:90,17:90,18:10,19:1});const record={commands:[command],preset:{},seed:[1,2]};
 const patches=new Map,history={patches,interrupt(id){patches.set(id,{state:'applied',incomplete:true});}};
 const renderer={document:{width:4000,height:4000,append(){throw Error('undone data must not be sent to the GPU');}},backend:{imageHistory:history}},s=Object.create(RealtimeSession.prototype);
 Object.assign(s,{renderer,staged:new Map([[1,record]]),recordIds:new WeakMap([[record,1]]),recordSurfaces:new WeakMap,recordOrder:new WeakMap,recordTiles:new WeakMap,tileRecords:new Map,nextRecordOrder:0,redoRecords:[]});
 s.commitUndoneRecord(record,[],'lower');assert.deepEqual(s.redoRecords,[record]);assert.equal(s.staged.size,0);assert.equal(s.tileRecords.size,0);assert.equal(s.recordSurfaces.get(record),'lower');assert.ok(s.recordTiles.get(record).length>0);assert.equal(patches.get(1).state,'undone');assert.equal(patches.get(1).incomplete,true);
});

test('history resumption preserves unrelated pending bitmaps and republishes only visible states',()=>{
 const b={retirePreview(){},overlayHoldIds:new Set},r=new GpuRenderer(b,4000,4000,{strokeHandoff:true});const enqueued=[];let resumed=0;
 r.requestWork=()=>{};r.proxy={resumeAfterHistory(){resumed++;},enqueue(s){enqueued.push(s.id);},invalidate(){throw Error('must not discard an unrelated pending bitmap');}};r.previewStates.set(1,{id:1});r.previewStates.set(10,{id:10});r.hiddenStrokeIds.add(1);r.resumeHistory();assert.equal(resumed,1);assert.deepEqual(enqueued,[10]);
});
