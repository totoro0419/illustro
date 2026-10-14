import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const [root,statusFile]=process.argv.slice(2),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const before=read(path.join(root,'before/report.json')),after=read(path.join(root,'after/report.json')),orbit=read(path.join(root,'orbit/orbit-report.json')),m09=read(path.join(root,'m09/m09-local.json')),gestures=read(path.join(root,'canvas-gestures/report.json')),status=read(statusFile),source=process.env.GITHUB_SHA;
assert.equal(before.commit,'719dbe455f1ef83963640d640b89a3e101e0e5d7');assert.equal(before.cases.length,1);assert.ok(before.cases[0].hit.misses.length>0);
for(const report of [before,after,orbit,m09,gestures]){assert.deepEqual(report.errors,[]);if(report!==before)assert.equal(report.commit,source);}
assert.equal(after.cases.length,5);for(const c of after.cases){assert.deepEqual(c.errors,[]);assert.deepEqual(c.hit.misses,[]);assert.deepEqual(c.sv.misses,[]);}
assert.equal(gestures.cases.length,6);for(const c of gestures.cases){assert.equal(c.resets,0);assert.equal(c.replayed,0);assert.equal(c.difference.max,0);}
assert.ok(orbit.tests.length>=3);assert.ok(m09.cases.length>=3);
assert.equal(status.review,'EXPERIMENTAL_NOT_ACCEPTED');
// Prior performance evidence keeps its actual measured source. This color-only
// publication does not relabel old frames/latency as new measurements.
status.measurementSourceCommit??=status.commit;status.previousFunctionalSourceCommit??=status.commit;status.commit=source;
status.colorInteraction={commit:source,priorSource:before.commit,result:'VERIFIED_BROWSER_NOT_PHYSICAL_DEVICE',fullBandCases:5,ringHitMisses:0,visibleSvHitMisses:0,phoneTabletTrustedTouch:true,physicalAndroid:'UNVERIFIED',reports:['color-interaction/before/report.json','color-interaction/after/report.json','color-interaction/orbit/orbit-report.json','color-interaction/m09/m09-local.json']};
status.gestureCancellation={...status.gestureCancellation,commit:source,trustedTouchCases:6,after:{wholeDocumentResetsPerCancellation:0,replayedCompletedStrokesPerCancellation:0},gpuPixelEvidenceSourceCommit:status.measurementSourceCommit,latestReport:'color-interaction/canvas-gestures/report.json'};
fs.writeFileSync(statusFile,JSON.stringify(status,null,2)+'\n');console.log(JSON.stringify({commit:source,measurementSourceCommit:status.measurementSourceCommit,colorInteraction:status.colorInteraction,gestureCancellation:status.gestureCancellation,latencyComparison:status.latencyComparison}));
