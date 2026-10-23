import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkerStrokeSink} from '../dist/rt/worker-stroke-sink.mjs';

test('a stroke completed before its first preview packet keeps its final ink until precise raster ACK',async()=>{
 const oldBitmap=globalThis.createImageBitmap;
 let captured=0,destroyed=0;
 globalThis.createImageBitmap=async element=>{captured++;return {width:element.width,height:element.height,close(){}};};
 try{
  const events=[];
  const parent=new WorkerStrokeSink(()=>events.push('publish'));
  const layer=parent.forStroke(28);
  layer.element={width:64,height:32};layer.view=[800,1000,390,640,4000,4000,1,0,0,0,1,1,0,0,0,0];
  layer.rect=[0,0,64,32];layer.scale=1;layer.plan={polygon:[{x:0,y:0},{x:64,y:0},{x:64,y:32},{x:0,y:32}]};
  layer.destroy=()=>destroyed++;
  parent.retireStroke(28);
  assert.equal(parent.layers.has(28),true,'finished ink is still available for publication');
  assert.equal(destroyed,0,'no premature bitmap destruction');
  const packet=await parent.snapshot();
  assert.deepEqual(packet.layers.map(x=>x.id),[28]);
  assert.deepEqual(packet.retired,[28]);
  assert.equal(captured,1);
  assert.equal(parent.retirementPending.has(28),true,'sending a preview is not an exact image ACK');
  const noChanges=await parent.snapshot();
  assert.equal(noChanges.layers.length,0);
  parent.acknowledgeRetired([28]);
  assert.equal(parent.layers.has(28),false);
  assert.equal(parent.retirementPending.has(28),false);
  assert.equal(destroyed,1);
  assert.ok(events.length>0);
 }finally{
  if(oldBitmap===undefined)delete globalThis.createImageBitmap;
  else globalThis.createImageBitmap=oldBitmap;
 }
});

test('an unsuccessful raster publication keeps every final preview available for retry',async()=>{
 const s=new WorkerStrokeSink(()=>{});
 const l=s.forStroke(37);let destroyed=0;l.destroy=()=>destroyed++;
 s.retireStroke(37);
 s.changed.clear();s.retired.clear(); // simulates a transported but unacknowledged packet
 assert.equal(s.layers.has(37),true);
 assert.equal(s.retirementPending.has(37),true);
 assert.equal(destroyed,0);
 s.changed.add(37);s.retired.add(37); // rejected publication retries
 assert.equal(s.changed.has(37),true);
 s.acknowledgeRetired([37]);
 assert.equal(destroyed,1);
});
