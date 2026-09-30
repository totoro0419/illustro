import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveStrokeConnectivity, evaluateConnectivity, aggregateConnectivityEvaluations, strokeFromSemanticRecord} from '../connectivity/endpoint-connectivity.js';
import {buildSegmentScenes,runSegmentBenchmark} from '../connectivity/segment-connectivity-benchmark.mjs';
import {evaluateRecords} from '../connectivity/evaluate-connectivity-records.mjs';
const line=(strokeId,x0,y0,x1,y1,width=2)=>({strokeId,width,points:[{x:x0,y:y0},{x:x1,y:y1}]});
const es=(endpointA,strokeId,arcFraction=.5)=>({endpointA,target:{kind:'segment',strokeId,arcFraction}});

test('T contacts create real segment anchors and split the target stroke into spans',()=>{
 const g=resolveStrokeConnectivity([line('bar',0,0,40,0),line('stem',20,0,20,20)]);
 assert.deepEqual(g.implementedTargetKinds,['endpoint','segment']);assert.equal(g.edges.length,1);assert.equal(g.edges[0].to.kind,'segment');
 assert.equal(g.anchors.length,1);assert.equal(g.strokeSpans.filter(s=>s.strokeId==='bar').length,2);
 assert.equal(evaluateConnectivity(g,[es('stem:start','bar')]).f1,1);
});

test('T, Y, curve, width-change, crossing vicinity, thin/thick and all caps have measured exact cases',()=>{
 const scenes=buildSegmentScenes().filter(s=>s.category!=='dense');
 for(const scene of scenes)assert.equal(evaluateConnectivity(resolveStrokeConnectivity(scene.strokes),scene.truth).graphExactMatch,true,scene.name);
});

test('positive segment gaps retain ambiguity and diagnostics rather than becoming false contacts',()=>{
 const g=resolveStrokeConnectivity([line('bar',0,0,40,0),line('stem',20,2.2,20,20)]);
 const c=g.candidates.find(c=>c.target.kind==='segment'&&c.endpointA==='stem:start');assert.ok(c.effectiveGap>0);assert.equal(c.connected,false);
 assert.equal(c.decisionReason,'segment-gap-unconfirmed');assert.equal(c.decision,'ambiguous');
 assert.equal(evaluateConnectivity(g,[es('stem:start','bar')]).missedConnection,1);
});

test('manual endpoint-to-segment correction works beyond search and preserves automatic scores',()=>{
 const strokes=[line('bar',0,0,40,0),line('stem',20,40,20,80)],truth=[es('stem:start','bar')];
 const g=resolveStrokeConnectivity(strokes,{manualConnections:truth});assert.equal(g.edges.length,1);assert.equal(g.edges[0].decisionReason,'manual-connect');assert.ok(g.candidates.find(c=>c.manualOverride).confidence<.7);
 const cut=resolveStrokeConnectivity(strokes,{manualConnections:truth,manualDisconnections:truth});assert.equal(cut.edges.length,0);
});

test('semantic adapter requires actual renderer width mapping and retains canonical samples',()=>{
 const record={schemaVersion:1,reconstructed:[{x:0,y:0,t:0,pressure:.2},{x:10,y:0,t:6,pressure:.8}]};
 assert.throws(()=>strokeFromSemanticRecord(record,{strokeId:'a'}),/widthAtPoint/);
 const s=strokeFromSemanticRecord(record,{strokeId:'a',widthAtPoint:p=>1+p.pressure*4});assert.equal(s.points.at(-1).x,10);assert.equal(s.points.at(-1).width,4.2);assert.equal(s.points.at(-1).timestamp,6);
});

test('human record analysis re-runs geometry, excludes unfinished and duplicate records',()=>{
 const strokes=[line('bar',0,0,40,0),line('stem',20,0,20,20)],truthConnections=[es('stem:start','bar')];
 const r={recordId:'one',strokes,truthConnections,metrics:{f1:0},session:{truthFinalized:true,reviewedAfterDrawing:true,inputCounts:{trusted:0,untrusted:3}}};
 const result=evaluateRecords([{records:[r,r,{...r,recordId:'two',session:{truthFinalized:false}}]}]);
 assert.equal(result.aggregate.sceneCount,1);assert.equal(result.aggregate.f1,1);assert.equal(result.excluded.length,2);assert.equal(result.trustedInputSubset.sceneCount,0);assert.equal(result.trustedInputSubset.precision,null);
 assert.equal(aggregateConnectivityEvaluations([]).f1,null);
});

test('combined benchmark improves recall over endpoint-only and records remaining cap false positives',()=>{
 const result=runSegmentBenchmark();assert.equal(result.after.sceneCount,24);assert.equal(result.transforms.sceneCount,864);
 assert.equal(result.after.trueConnection,28);assert.equal(result.after.missedConnection,0);assert.equal(result.beforeEndpointOnly.missedConnection,25);
 // Explicit known failure budget, not a precision claim or hidden relabeling.
 assert.equal(result.after.falseConnection,4);assert.equal(result.transforms.falseConnection,144);
 assert.equal(result.failures.filter(r=>!r.name.includes('/')).length,2);
});

test('spatial rejection preserves every candidate score and graph for mixed geometry',()=>{
 for(const scene of buildSegmentScenes()) {
  const filtered=resolveStrokeConnectivity(scene.strokes),unfiltered=resolveStrokeConnectivity(scene.strokes,{disableSpatialFilter:true});
  const rows=g=>g.candidates.map(c=>({id:c.candidateId,confidence:c.confidence,decision:c.decision,target:c.target}));
  assert.deepEqual(rows(filtered),rows(unfiltered),scene.name);
 }
});
