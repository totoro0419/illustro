import test from 'node:test';
import assert from 'node:assert/strict';
import {StrokeOverlay} from '../dist/rt/stroke-overlay.mjs';

// This test protects the independent GPU/CPU handoff without modifying the
// frozen accepted renderer, canonical stroke data, or older regression suite.
function scenario(ids){
 let closed=0,hidden=0;
 const sink={hideGuard(){hidden++;}};
 const backend={surfaceStack:['paint'],previews:new Map};
 const overlay=new StrokeOverlay(backend,{sink});
 overlay.epoch=1;
 for(const id of ids)overlay.footprints.set(id,new Set(['0,0']));
 overlay.guards=[{bitmap:{close(){closed++;}}}];
 return {overlay,counts:()=>({closed,hidden})};
}
test('another GPU submission cannot hide a transparent stroke transition guard',()=>{
 const {overlay,counts}=scenario([7]);
 overlay.fallbackPresented(1,overlay.epoch,false);
 assert.equal(overlay.guards.length,1);
 assert.equal(counts().closed,0);
 overlay.presented(7,overlay.epoch);
 assert.equal(overlay.guards.length,0);
 assert.deepEqual(counts(),{closed:1,hidden:1});
 overlay.destroy();
});
test('multiple transparent strokes keep the guard until all protected strokes are published',()=>{
 const {overlay,counts}=scenario([7,16]);
 overlay.presented(7,overlay.epoch);
 overlay.fallbackPresented(2,overlay.epoch,false);
 assert.equal(overlay.guards.length,1);
 assert.deepEqual(counts(),{closed:0,hidden:0});
 overlay.presented(16,overlay.epoch);
 assert.equal(overlay.guards.length,0);
 assert.deepEqual(counts(),{closed:1,hidden:1});
 overlay.destroy();
});
test('an explicitly adopted GPU fallback can clear the guard after exact GPU publication',()=>{
 const {overlay,counts}=scenario([7]);
 overlay.fallback=true;
 overlay.fallbackPresented(3,overlay.epoch,true);
 assert.equal(overlay.guards.length,0);
 assert.deepEqual(counts(),{closed:1,hidden:1});
 overlay.destroy();
});
