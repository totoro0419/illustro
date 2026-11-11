import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const root=path.resolve(process.env.M10_PREVIEW_EVIDENCE??'/tmp/m10-preview-evidence');
const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
const before=await read('cpu-before.json'),after=await read('cpu-after.json'),matrix=await read('report.json'),sustained=await read('sustained/report.json');
assert.equal(before.sourceCommit,'4708ffe5136ad1fa47be5909c129bb5f8fcb7869');if(process.env.EXPECTED_COMMIT_SHA)assert.equal(after.sourceCommit,process.env.EXPECTED_COMMIT_SHA);
const {PNG}=createRequire(import.meta.url)(process.env.RT_PNG_PATH??'pngjs');
const cpuKey=c=>[c.size,c.zoom,c.brush].join('|'),base=new Map(before.cases.map(c=>[cpuKey(c),c]));
assert.equal(after.cases.length,100);let reduced=0;
for(const c of after.cases){const old=base.get(cpuKey(c));assert.ok(old);if(Number(c.zoom)>=4){assert.ok(c.rasterPixels<old.rasterPixels,'document raster must reduce high-zoom work: '+cpuKey(c));if(c.brush==='pencil'&&Number(c.zoom)>=16){assert.ok(c.rasterPixels<old.rasterPixels*.1);assert.ok(c.cpuMs.p50<old.cpuMs.p50*.5,'material CPU reduction');reduced++;}}}
assert.equal(matrix.cases.length,1120,'complete 4 sizes x 5 zooms x 7 brushes x 4 routes x 2 backends');assert.deepEqual(matrix.errors,[]);assert.deepEqual(sustained.errors,[]);
let baselineFailures=0,exactGpuElisions=0;
for(const c of matrix.cases){if(c.baselineFailure){baselineFailures++;assert.equal(c.mode,'A');assert.match(c.diagnostic?.error??'',/Overlay memory pressure/);continue;}assert.deepEqual(c.errors,[]);assert.equal(c.remainingJobs,0);assert.equal(c.remainingCommands,0);assert.equal(c.formalAfterUp.count,c.strokes.length,'all stroke completion timings are required');if(c.mode==='C'){assert.equal(c.proxy.rasterPixels,0,'forced GPU must omit CPU raster work');exactGpuElisions++;}if(c.mode==='B'&&Number(c.zoom)>=4&&!['hard','soft'].includes(c.brush))assert.ok(c.proxy.maxSliceMs<50,'high-zoom CPU slice exceeded the original long-task boundary');}
const autoComparisons=[];
for(const c of matrix.cases.filter(c=>c.mode==='D')){const peers=matrix.cases.filter(x=>['B','C'].includes(x.mode)&&x.backend===c.backend&&x.width===c.width&&x.height===c.height&&x.zoom===c.zoom&&x.brush===c.brush);const measure=x=>x.inputToDisplayProxy?.p95??x.firstDisplayProxy?.p95;const values=peers.map(measure).filter(Number.isFinite),actual=measure(c);assert.equal(values.length,2);assert.ok(Number.isFinite(actual));const frame=c.frameInterval.p50??16.7;assert.ok(actual<=Math.max(...values)+50+frame,'auto exceeded either route plus the measured first-feedback deadline and one frame');autoComparisons.push({backend:c.backend,size:c.width,zoom:c.zoom,brush:c.brush,p95:actual,slowerRouteP95:Math.max(...values)});}
assert.equal(exactGpuElisions,280);assert.equal(sustained.cases.length,84);
for(const c of sustained.cases){assert.deepEqual(c.errors,[]);assert.equal(c.remainingJobs,0);assert.equal(c.remainingCommands,0);assert.equal(c.strokes.length,12);assert.equal(c.rawAccepted,12*17+(['hard','soft'].includes(c.brush)?5:0));}
for(const [file,route]of [['adapt-gpu/report.json','gpu'],['adapt-cpu/report.json','cpu']]){const r=await read(file);assert.deepEqual(r.errors,[]);assert.equal(r.cases.length,1);const c=r.cases[0];assert.equal(c.routes.at(-1),route);assert.ok(c.routes.slice(-6).filter(x=>x===route).length>=4);assert.equal(c.records,12);assert.equal(c.rawAccepted,108);assert.deepEqual(c.errors,[]);}
const availability=await read('availability/report.json');assert.deepEqual(availability.errors,[]);assert.equal(availability.cases.length,4);for(const c of availability.cases){assert.equal(c.rawAccepted,6);assert.equal(c.exportedInputCount,6);assert.equal(c.records,1);assert.deepEqual(c.sessionErrors,[]);if(c.fault==='cpu-unavailable'){assert.equal(c.route,'gpu');assert.equal(c.cpuRasterPixels,0);assert.ok(c.formalInkPixels>0);}else{assert.equal(c.gpuLossConfirmed,true);assert.equal(c.route,'cpu');assert.ok(c.cpuUpdates>0);}}
const quality=[];
for(const directory of ['quality-fit','quality-zoom','quality-rotated']){
 const r=await read(directory+'/report.json');assert.deepEqual(r.errors,[]);let exact=0,previews=0;
 for(const b of r.cases.filter(c=>c.mode==='B'||c.mode==='C')){
  const a=r.cases.find(c=>c.mode==='A'&&c.backend===b.backend&&c.size===b.size&&c.layout===b.layout&&c.brush===b.brush&&c.ratio===b.ratio);assert.ok(a);
  const name=c=>`${c.backend}-${c.size}-${c.layout}-${c.brush}-${c.mode}-${c.ratio}-final.png`,aa=PNG.sync.read(await fs.readFile(path.join(root,directory,name(a)))),bb=PNG.sync.read(await fs.readFile(path.join(root,directory,name(b))));assert.equal(aa.width,bb.width);assert.equal(aa.height,bb.height);assert.deepEqual(aa.data,bb.data,'same-backend final compositor pixels must stay exact');exact++;
  if(b.mode==='B'){// One RGBA8 step is the existing strict-reference quantization bound.
   assert.ok(b.quality.meanAbsMaxChannel<=a.quality.meanAbsMaxChannel+1,'CPU preview mean error regressed beyond a single quantization step');previews++;
  }
 }
 assert.ok(exact>0&&previews>0);quality.push({directory,exactFinalScreenshots:exact,cpuPreviewsWithinBaseline:previews});
}
const formal=await read('formal/report.json');assert.deepEqual(formal.errors,[]);assert.equal(formal.cases.length,2);
const status={sourceCommit:process.env.EXPECTED_COMMIT_SHA??'working-tree',baseline:matrix.baseline,status:'AUTOMATED CHECKS PASSED; USER REVIEW REQUIRED',milestoneAccepted:false,userAccepted:false,physicalDevicesVerified:false,matrixCases:matrix.cases.length,sustainedCases:sustained.cases.length,autoComparisons: autoComparisons.length,baselineMemoryFailures:baselineFailures,forcedGpuCasesWithZeroCpuWork:exactGpuElisions,highZoomMaterialReductionCases:reduced,availabilityCases:availability.cases.length,quality,scope:matrix.scope,limits:['CPU canvas uploads and GPU completion are different proxies; physical display latency is unmeasured.','Cold-route sampling can be slower on an exploratory stroke; steady choices reuse recent contextual samples.','Task budget bounds cooperative calculations; driver, canvas allocation and GC can exceed it.','Actual Android pen/touch feel, physical VRAM, heat/power and complete device-loss recovery require separate verification.','Other unfinished M10 quality items remain unfinished.']};
await fs.writeFile(path.join(root,'qa-status.json'),JSON.stringify(status,null,2));console.log(JSON.stringify(status,null,2));
