import test from 'node:test';
import assert from 'node:assert/strict';
import {GpuRenderer} from '../dist/rt/renderer.mjs';

function createHarness(){
 const calls={render:0,present:0};
 const backend={
  dirtyConfirmed:new Set(),
  previews:new Map(),
  setViewTransform(){},
  setSurfaceStack(){},
  poll(){},
  render(){calls.render++;return Promise.resolve();},
  presentCurrent(){calls.present++;return Promise.resolve();}
 };
 const renderer=new GpuRenderer(backend,512,384);
 // Simulate the settled state after the initial document presentation.
 renderer.needsFrame=false;
 return {renderer,backend,calls};
}
async function settle(){await Promise.resolve();await Promise.resolve();}

test('pan, zoom or rotation changes reuse the cached composite without raster rendering',async()=>{
 const {renderer,calls}=createHarness();
 for(const value of [1,2,3]){
  renderer.setViewTransform(new Float32Array([value]));
  assert.equal(renderer.frame(performance.now()),true);
  await settle();
 }
 assert.equal(calls.present,3);
 assert.equal(calls.render,0,'view-only changes must not run tile/preview rasterization');
 assert.equal(renderer.errors.length,0);
});

test('an invalidated tile bypasses view-only presentation',async()=>{
 const {renderer,backend,calls}=createHarness();
 backend.dirtyConfirmed.add('0,0');
 renderer.setViewTransform(new Float32Array([1]));
 assert.equal(renderer.frame(performance.now()),true);
 await settle();
 assert.equal(calls.render,1,'dirty tiles must be recomposited');
 assert.equal(calls.present,0);
});

test('active previews and surface stack updates preserve the full rendering path',async()=>{
 const {renderer,backend,calls}=createHarness();
 renderer.previewStates.set(7,{id:7});
 renderer.setViewTransform(new Float32Array([1]));
 renderer.frame(performance.now());
 await settle();
 assert.equal(calls.render,1,'active previews must still render');

 renderer.previewStates.clear();
 renderer.setSurfaceStack(['layer-a']);
 renderer.frame(performance.now());
 await settle();
 assert.equal(calls.render,2,'layer changes must still render');

 renderer.setViewTransform(new Float32Array([2]));
 backend.dirtyConfirmed.clear();
 renderer.frame(performance.now());
 await settle();
 assert.equal(calls.present,1,'settled canvas movement should reuse the composite');
});
