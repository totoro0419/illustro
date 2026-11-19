import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('drawing-worker restore applies Core tile clips and marks materialized history',async()=>{
 const file=readFileSync(new URL('../src/drawing.worker.mjs',import.meta.url),'utf8');
 const start=file.indexOf('async function restore('),end=file.indexOf('\nasync function pixel(',start);
 assert.ok(start>0&&end>start);
 const appends=[],indexed=[],states=[];
 const backend={tiles:new Map,previews:new Map,setPresentationHeld:v=>states.push(v),async presentCurrent(){}};
 const renderer={backend,document:{append:(...args)=>appends.push(args),end(){}},proxy:{setEnabled(){},invalidate(){}},async reset(){},async drain(){}};
 const session={seedSequence:0,indexRecord:(...args)=>indexed.push(args),presetForRecord:r=>r.preset};
 const context={renderer,session,records:new Map,pendingTiles:new Set,remember:(_token,record)=>record,
  seed:async()=>{},stats:()=>({}),requestPublish(){},performance};
 runInNewContext(file.slice(start,end)+'\nglobalThis.restoreProjection=restore;',context);
 const record={seed:[1,2],preset:{},commands:[]};
 await context.restoreProjection({entries:[{token:'source',record,surfaceKey:'L',keys:['2,0'],cached:false}],cache:null,geometry:true});
 assert.deepEqual([...appends[0][3]],['2,0']);
 assert.deepEqual(indexed[0][1],['2,0']);
 assert.equal(session.hasRasterBase,true);assert.deepEqual(states,[true,false]);
 appends.length=0;
 await context.restoreProjection({entries:[{token:'cached',record,surfaceKey:'L',keys:['2,0'],cached:true}],cache:null,geometry:false});
 assert.equal(appends.length,0);assert.equal(session.hasRasterBase,false);
});
