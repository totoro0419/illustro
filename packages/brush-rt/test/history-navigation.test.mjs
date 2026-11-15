import test from 'node:test';
import assert from 'node:assert/strict';
import {RealtimeSession} from '../dist/rt/session.mjs';
import {GpuRenderer} from '../dist/rt/renderer.mjs';

function harness(hot=true){
 const calls={copies:[],rebuilds:[],appends:[]},renderer={document:{jobs:[],append(...args){calls.appends.push(args);},end(){}},async prepareHistory(){},discardPendingForHistory(){return {discarded:false,baseReused:false};},async applyHistory(steps){calls.copies.push(steps);return hot;},async drain(){},dropHistory(){},async rebuildTileGroups(groups){calls.rebuilds.push(groups);}};
 const session=Object.create(RealtimeSession.prototype);Object.assign(session,{renderer,records:[],redoRecords:[],recordIds:new WeakMap,recordSurfaces:new WeakMap,recordTiles:new WeakMap,recordOrder:new WeakMap,tileRecords:new Map,nextRecordOrder:0,id:10,historyPatchHits:0,historyReplayFallbacks:0,async settle(){}});
 const records=[0,1,2].map(i=>({preset:{},commands:[],i}));for(const [i,r]of records.entries()){session.records.push(r);session.recordIds.set(r,i+1);session.indexRecord(r,[i+',0'],'layer');}
 const step=(direction,i)=>({direction,record:records[i],keys:[i+',0'],surfaceKey:'layer'});
 return {session,calls,records,step};
}
test('mixed commands retain logical order while projecting only their net suffix',async()=>{
 const {session:s,calls,records:r,step}=harness();await s.navigateDerived([step('undo',2),step('undo',1),step('redo',1)]);
 assert.deepEqual(s.records,r.slice(0,2));assert.deepEqual(s.redoRecords,[r[2]]);assert.deepEqual(s.recordsForKeys(['0,0','1,0','2,0'],'layer'),r.slice(0,2));
 assert.deepEqual(calls.copies[0].map(p=>[p.id,p.direction]),[[3,'undo']]);assert.equal(calls.rebuilds.length,0);
});
test('a cold inverse pair does not force reconstruction or alter the redo branch',async()=>{
 const {session:s,calls,records:r,step}=harness();await s.navigateDerived([step('undo',2),step('undo',1),step('redo',1),step('redo',2)]);
 assert.deepEqual(s.records,r);assert.deepEqual(s.redoRecords,[]);assert.deepEqual(calls.copies,[[]]);assert.equal(calls.rebuilds.length,0);assert.deepEqual(s.recordsForKeys(['0,0','1,0','2,0'],'layer'),r);
});
test('cold mixed history rebuilds only the final affected footprint',async()=>{
 const {session:s,calls,step}=harness(false);await s.navigateDerived([step('undo',2),step('undo',1),step('redo',1)]);
 assert.deepEqual(calls.rebuilds[0].map(g=>[g.surfaceKey,g.keys]),[['layer',['2,0']]]);assert.equal(s.historyReplayFallbacks,1);
});
test('a cold net Redo evaluates the suffix without rebuilding the retained base',async()=>{
 const {session:s,calls,records:r,step}=harness(false);s.records.pop();s.redoRecords.push(r[2]);s.unindexRecord(r[2]);
 await s.navigateDerived([step('redo',2),step('undo',2),step('redo',2)]);
 assert.deepEqual(s.records,r);assert.equal(calls.appends.length,1);assert.equal(calls.rebuilds.length,0);
});
test('cold reconstruction collects private dirty tiles and flushes once after release',async()=>{
 const events=[],backend={dirtyConfirmed:new Set,tiles:new Map,setPresentationHeld(v){this.presentationHeld=v;events.push(['held',v]);},invalidateTiles(keys){for(const key of keys)this.dirtyConfirmed.add(key);},presentCurrent(){events.push(['present']);}};
 const r=new GpuRenderer(backend,512,384);r.document.append=()=>{};r.document.end=()=>{};
 r.drain=async final=>{events.push(['drain',final??true]);if(backend.deferredHistoryDirty){assert.equal(backend.presentationHeld,true);backend.deferredHistoryDirty.add('1,0');}};
 await r.rebuildTileGroups([{surfaceKey:'layer',keys:['0,0'],entries:[]}]);
 assert.deepEqual(events,[['drain',false],['held',true],['drain',false],['drain',true],['held',false],['present']]);assert.equal(backend.deferredHistoryDirty,null);assert.deepEqual([...backend.dirtyConfirmed],['0,0','1,0']);
});
