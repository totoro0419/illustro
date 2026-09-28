import os from 'node:os';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import {
  calibrateReconstruction, makeStroke, reconstruct, generateDabs, renderStrictGlobal, renderStrictTiled,
  compareStrict, renderPreviewF32, previewError, benchmarkHotPath, benchmarkReplayFragments,
  StreamingStrokeRecorder, randomOrderInvariant, makeSemanticStrokeRecord, dabsFromSemanticRecord
} from './brush.js';
import {
  calibrateRegion, resolveRegion, assignInitialIds, reconcileRegions, resetPrototypeIds,
  incrementalResolve, faceSignature, benchmarkRegion
} from './region.js';
import { staticRegionFixtures, regionTransitions, transitionWithConflictingAssignments, incrementalFixture } from './region-corpus.js';

function median(xs){const a=[...xs].sort((x,y)=>x-y);return a[Math.floor(a.length/2)];}
function round(v,n=6){const p=10**n;return Math.round(v*p)/p;}

const brushCalibration=calibrateReconstruction();
const brushProfile=brushCalibration[0].profile;
const raw=brushCalibration.find(r=>r.profile.kind==='raw');
const hotRuns=Array.from({length:7},()=>benchmarkHotPath(brushProfile,{batches:240,batchSize:32}));
const hotSummary={
  runs:hotRuns.length,
  p50MsMedian:round(median(hotRuns.map(x=>x.p50Ms))),
  p95MsMedian:round(median(hotRuns.map(x=>x.p95Ms))),
  p99MsMedian:round(median(hotRuns.map(x=>x.p99Ms))),
  maxObservedMs:round(Math.max(...hotRuns.map(x=>x.maxMs))),
  batchSize:32,
  rawRuns:hotRuns.map(x=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k,typeof v==='number'?round(v):v])))
};

let previewMax=0,previewRmseMax=0;
const previewCases=[];
for(const [i,kind] of ['straight','curve','corner','slow','micro','stationary'].entries()){
  const s=makeStroke(kind,kind==='stationary'?240:360,{seed:200+i,noise:kind==='stationary'?.38:.3});
  const d=generateDabs(reconstruct(s,brushProfile),{spacing:1.5});
  const e=previewError(renderStrictGlobal(d),renderPreviewF32(d));
  previewMax=Math.max(previewMax,e.max);previewRmseMax=Math.max(previewRmseMax,e.rmse);
  previewCases.push({kind,max:round(e.max,9),rmse:round(e.rmse,9),pixels:e.pixels,dabs:d.length});
}

const tileStroke=makeStroke('curve',420,{seed:250,noise:.25}).map(p=>({...p,x:p.x+220,y:p.y+120}));
const tileDabs=generateDabs(reconstruct(tileStroke,brushProfile),{spacing:1.5});
const tileGlobal=renderStrictGlobal(tileDabs);
const tileNormal=compareStrict(tileGlobal,renderStrictTiled(tileDabs));
const tileReverse=compareStrict(tileGlobal,renderStrictTiled(tileDabs,{reverseTiles:true}));

const stream=new StreamingStrokeRecorder({pageSamples:256,tailSamples:16,maxPendingPages:8});
for(let i=0;i<100000;i++){stream.accept({i});if(i%1024===1023)stream.drainOne();}
stream.release();
const semanticPackedEstimateBytesPerSample=40;
const stagingEstimateBytes=(stream.maxPendingObserved*256+16)*semanticPackedEstimateBytesPerSample;

const replay=benchmarkReplayFragments(brushProfile);
const targetP95=4.0;
const passingReplay=replay.filter(r=>r.p95Ms<=targetP95);
const hardFragmentLimit=passingReplay.length?passingReplay.at(-1).fragments:4;
const hardIndex=replay.findIndex(r=>r.fragments===hardFragmentLimit);
const watermarkFragments=replay[Math.max(0,hardIndex-1)].fragments;

const semantic=makeSemanticStrokeRecord(makeStroke('curve',300,{seed:260,noise:.2}),brushProfile,{sourceSnapshotRef:'source@fixture',selectionSnapshotRef:'selection@fixture',mixingState:{load:.5,reservoir:[.1,.2,.3,.7]}});
const reopenCompare=compareStrict(renderStrictGlobal(dabsFromSemanticRecord(semantic)),renderStrictGlobal(dabsFromSemanticRecord(JSON.parse(JSON.stringify(semantic)))));

const fixtures=staticRegionFixtures();
const transitions=regionTransitions().filter(t=>t.name!=='merge-conflicting-assignment');
const regionCalibration=calibrateRegion(fixtures,transitions);
const regionPolicy=regionCalibration[0].policy;
const staticResults=fixtures.map(f=>{const r=resolveRegion(f.grid,regionPolicy);return {name:f.name,class:f.class,status:r.status,faces:r.faces.length,expectedStatus:f.expectStatus,expectedFaces:f.expectFaces,pass:r.status===f.expectStatus&&r.faces.length===f.expectFaces,confidence:round(r.confidence.score,4)};});
resetPrototypeIds();
const transitionResults=transitions.map(tr=>{const a=assignInitialIds(resolveRegion(tr.oldGrid,regionPolicy));const b=resolveRegion(tr.newGrid,regionPolicy);const rec=reconcileRegions(a,b,regionPolicy,tr.options??{});return {name:tr.name,class:tr.class,oldFaces:a.faces.length,newFaces:b.faces.length,status:rec.status,decisions:rec.decisions.map(d=>d.kind),pass:tr.check(a,b,rec)};});
const conflict=transitionWithConflictingAssignments(regionPolicy,resolveRegion,assignInitialIds,reconcileRegions,resetPrototypeIds);
const incrementalF=incrementalFixture();
const prev=resolveRegion(incrementalF.oldGrid,regionPolicy);
const incremental=incrementalResolve(prev,incrementalF.newGrid,incrementalF.dirty,regionPolicy);
const full=resolveRegion(incrementalF.newGrid,regionPolicy);
const incrementalEqual=JSON.stringify(faceSignature(incremental))===JSON.stringify(faceSignature(full));
const regionPerfRuns=Array.from({length:5},()=>benchmarkRegion(fixtures,regionPolicy));
const regionPerf={
  runs:5,
  p50MsMedian:round(median(regionPerfRuns.map(x=>x.p50Ms))),
  p95MsMedian:round(median(regionPerfRuns.map(x=>x.p95Ms))),
  p99MsMedian:round(median(regionPerfRuns.map(x=>x.p99Ms))),
  maxObservedMs:round(Math.max(...regionPerfRuns.map(x=>x.maxMs))),
  fixtureRunsPerBenchmark:regionPerfRuns[0].runs
};
const large=fixtures.find(f=>f.name==='large-sparse');
const largeTimes=[];
for(let i=0;i<30;i++){const t0=performance.now();resolveRegion(large.grid,regionPolicy);largeTimes.push(performance.now()-t0);}
largeTimes.sort((a,b)=>a-b);
const largeP95=largeTimes[Math.floor((largeTimes.length-1)*.95)];
const estimatedMsPer16k=largeP95/(large.grid.width*large.grid.height/16384);

const output={
  schemaVersion:1,
  generatedAt:new Date().toISOString(),
  environment:{node:process.version,platform:process.platform,arch:process.arch,cpuModel:os.cpus()[0]?.model??'unknown',logicalCpus:os.cpus().length,totalMemoryBytes:os.totalmem()},
  brush:{
    selectedReconstruction:brushProfile,
    calibrationTop5:brushCalibration.slice(0,5).map(r=>({...r,dynamicMean:round(r.dynamicMean),dynamicWorst:round(r.dynamicWorst),stationaryRmse:round(r.stationaryRmse),worstEndpoint:round(r.worstEndpoint),score:round(r.score)})),
    rawBaseline:{dynamicMean:round(raw.dynamicMean),dynamicWorst:round(raw.dynamicWorst),stationaryRmse:round(raw.stationaryRmse),worstEndpoint:round(raw.worstEndpoint),score:round(raw.score)},
    stationaryJitterReductionVsRaw:round(1-brushCalibration[0].stationaryRmse/raw.stationaryRmse,4),
    hotPath:hotSummary,
    strictReplay:{mismatches:reopenCompare.mismatches,maxDelta:reopenCompare.maxDelta},
    tileTraversal:{normalMismatches:tileNormal.mismatches,reverseMismatches:tileReverse.mismatches,pixels:tileNormal.pixels},
    prngOrderInvariant:randomOrderInvariant(16384),
    preview:{maxError:round(previewMax,9),maxRmse:round(previewRmseMax,9),prototypeTolerance:1/4096,cases:previewCases},
    streaming:{accepted:stream.accepted,pageSamples:256,tailSamples:16,maxPendingPages:8,maxPendingObserved:stream.maxPendingObserved,releaseWork:stream.releaseWork,sealedPages:stream.sealedPages,backpressureEvents:stream.admissionFailures,semanticPackedEstimateBytesPerSample,stagingEstimateBytes},
    materialization:{referenceP95TargetMs:targetP95,sweep:replay.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,typeof v==='number'?round(v):v]))),watermarkFragments,hardFragmentLimit}
  },
  region:{
    selectedPolicy:regionPolicy,
    calibration:{pass:regionCalibration[0].pass,total:regionCalibration[0].total,ambiguityFalsePositive:regionCalibration[0].ambiguityFalsePositive},
    staticCorpus:{pass:staticResults.filter(x=>x.pass).length,total:staticResults.length,results:staticResults},
    transitions:{pass:transitionResults.filter(x=>x.pass).length,total:transitionResults.length,results:transitionResults},
    conflictingMerge:{status:conflict.rec.status,assignmentConflict:conflict.rec.decisions.some(d=>d.kind==='merge'&&d.assignmentConflict)},
    incremental:{equalToFull:incrementalEqual,...incremental.incremental,affectedRatio:round(incremental.incremental.affectedOldCells/incremental.incremental.fullDomainCells,6)},
    performance:regionPerf,
    largeSparse:{width:large.grid.width,height:large.grid.height,p95Ms:round(largeP95),estimatedMsPer16kCells:round(estimatedMsPer16k),recommendedBackgroundChunkCells:16384}
  }
};
fs.mkdirSync(new URL('../results/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../results/benchmark-2026-09-28.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
