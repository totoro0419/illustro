import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calibrateReconstruction, makeStroke, reconstruct, generateDabs, renderStrictGlobal, renderStrictTiled,
  compareStrict, renderPreviewF32, previewError, zoomNormalize, randomOrderInvariant, StreamingStrokeRecorder,
  benchmarkHotPath, makeSemanticStrokeRecord, dabsFromSemanticRecord, processWithPrediction, generateExposureDabs
} from './brush.js';

const calibration=calibrateReconstruction();
const profile=calibration[0].profile;

test('reconstruction calibration selects adaptive One Euro profile',()=>{
  assert.deepEqual(profile,{kind:'one-euro',minCutoff:4,beta:4,dCutoff:1});
  assert.ok(calibration[0].stationaryRmse < calibration.find(r=>r.profile.kind==='raw').stationaryRmse*0.6);
});

test('actual sample count is preserved and predicted samples never enter canonical record',()=>{
  const actual=makeStroke('curve',320,{seed:41,noise:.25});
  const predicted=makeStroke('curve',12,{seed:99,noise:.7}).map((p,i)=>({...p,t:actual.at(-1).t+(i+1)*8}));
  const a=processWithPrediction(actual,predicted,profile);
  const b=processWithPrediction(actual,predicted.map(p=>({...p,x:p.x+100,y:p.y-100})),profile);
  assert.equal(a.canonical.reconstructed.length,actual.length);
  assert.deepEqual(a.canonical,b.canonical);
  assert.deepEqual(a.canonicalDabs,b.canonicalDabs);
  assert.notDeepEqual(a.previewDabs,b.previewDabs);
});

test('strict replay is deterministic after serialize/reopen',()=>{
  const actual=makeStroke('curve',420,{seed:55,noise:.28});
  const record=makeSemanticStrokeRecord(actual,profile);
  const reopened=JSON.parse(JSON.stringify(record));
  const a=renderStrictGlobal(dabsFromSemanticRecord(record));
  const b=renderStrictGlobal(dabsFromSemanticRecord(reopened));
  assert.deepEqual(compareStrict(a,b),{mismatches:0,maxDelta:0,pixels:compareStrict(a,b).pixels});
});

test('tile traversal order and tile boundaries do not change strict result',()=>{
  const s=makeStroke('curve',360,{seed:66,noise:.2}).map(p=>({...p,x:p.x+220,y:p.y+120}));
  const dabs=generateDabs(reconstruct(s,profile),{spacing:1.5});
  const global=renderStrictGlobal(dabs),tiled=renderStrictTiled(dabs),reversed=renderStrictTiled(dabs,{reverseTiles:true});
  assert.equal(compareStrict(global,tiled).mismatches,0);
  assert.equal(compareStrict(global,reversed).mismatches,0);
});

test('zoom normalization does not change canonical semantic record',()=>{
  const s=makeStroke('corner',300,{seed:70,noise:.2});
  const base=makeSemanticStrokeRecord(s,profile);
  for(const zoom of [0.125,0.5,1,4,16,64]) assert.deepEqual(makeSemanticStrokeRecord(zoomNormalize(s,zoom),profile),base);
});

test('counter-based random stream is order invariant',()=>assert.equal(randomOrderInvariant(8192),true));

test('preview f32 stays inside prototype tolerance',()=>{
  let max=0;
  for(const [i,kind] of ['straight','curve','corner','slow','micro'].entries()){
    const s=makeStroke(kind,320,{seed:80+i,noise:.3});const d=generateDabs(reconstruct(s,profile),{spacing:1.5});const e=previewError(renderStrictGlobal(d),renderPreviewF32(d));max=Math.max(max,e.max);
  }
  assert.ok(max<=1/4096,`max preview error ${max}`);
});

test('release work stays bounded by one page plus mutable tail',()=>{
  for(const n of [1000,10000,100000]){
    const r=new StreamingStrokeRecorder({pageSamples:256,tailSamples:16,maxPendingPages:8});
    for(let i=0;i<n;i++){r.accept({i});if(i%1024===1023)r.drainOne();}
    r.release();assert.equal(r.accepted,n);assert.ok(r.releaseWork<=272,`n=${n}, release=${r.releaseWork}`);assert.ok(r.maxPendingObserved<=9);
  }
});

test('derived renderer loss/recreate preserves canonical output',()=>{
  const s=makeStroke('curve',280,{seed:91,noise:.25});const record=makeSemanticStrokeRecord(s,profile);let derived=renderPreviewF32(dabsFromSemanticRecord(record));assert.ok(derived.size>0);derived=null;const a=renderStrictGlobal(dabsFromSemanticRecord(record));const b=renderStrictGlobal(dabsFromSemanticRecord(JSON.parse(JSON.stringify(record))));assert.equal(compareStrict(a,b).mismatches,0);
});

test('reference hot path benchmark remains below local harness budget',()=>{
  const b=benchmarkHotPath(profile,{batches:120,batchSize:32});assert.ok(b.p95Ms<2.0,JSON.stringify(b));
});

test('time exposure is event-rate independent for stationary airbrush semantics',()=>{
  const a=makeStroke('stationary',121,{seed:101,noise:0,hz:120});
  const b=makeStroke('stationary',241,{seed:101,noise:0,hz:240});
  const ea=generateExposureDabs(reconstruct(a,profile),{intervalMs:1000/60});
  const eb=generateExposureDabs(reconstruct(b,profile),{intervalMs:1000/60});
  assert.deepEqual(ea.map(d=>[d.t,d.x,d.y]),eb.map(d=>[d.t,d.x,d.y]));
});

test('source/selection snapshots and mixing checkpoint survive semantic reopen',()=>{
  const s=makeStroke('slow',180,{seed:102,noise:.15});
  const opts={sourceSnapshotRef:'raster-source@rev-a',selectionSnapshotRef:'selection@rev-a',mixingState:{reservoir:[0.2,0.3,0.4,0.8],load:0.65}};
  const r=makeSemanticStrokeRecord(s,profile,opts);const reopened=JSON.parse(JSON.stringify(r));assert.deepEqual(reopened.sourceSnapshotRef,opts.sourceSnapshotRef);assert.deepEqual(reopened.selectionSnapshotRef,opts.selectionSnapshotRef);assert.deepEqual(reopened.mixingState,opts.mixingState);
});

test('pressure tilt and azimuth semantics survive normalization record',()=>{
  const s=makeStroke('curve',90,{seed:103,noise:.1});const r=makeSemanticStrokeRecord(s,profile);assert.ok(r.reconstructed[0].pressure<r.reconstructed.at(-1).pressure);assert.ok(r.reconstructed.some(x=>Number.isFinite(x.tilt)&&Number.isFinite(x.azimuth)));
});
