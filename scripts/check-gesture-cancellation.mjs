import fs from 'node:fs';
import assert from 'node:assert/strict';
const [beforePath,afterPath,qualityPath,statusPath]=process.argv.slice(2),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const before=read(beforePath),after=read(afterPath),quality=read(qualityPath),status=read(statusPath);
assert.equal(before.commit,'6f18011a4a862fff07889dd9d77fab291d0fd05e');assert.equal(after.commit,status.commit);assert.equal(quality.commit,status.commit);
assert.equal(before.cases.length,6);assert.equal(after.cases.length,6);assert.equal(quality.cases.length,8);for(const report of [before,after,quality])assert.deepEqual(report.errors,[]);
for(const row of before.cases){assert.equal(row.resets,1);assert.equal(row.replayed,50);}
for(const row of after.cases){assert.equal(row.resets,0);assert.equal(row.replayed,0);assert.equal(row.difference.over2,0);}
let stages=0;for(const row of quality.cases)for(const stage of row.stages){stages++;assert.equal(stage.changedLayerBytes,0);assert.equal(stage.changedCompositeBytes,0);assert.equal(stage.resetDelta,0);assert.equal(stage.replayDelta,0);assert.equal(stage.layerObjectsPreserved,true);assert.equal(stage.occupiedTiles,1);assert.equal(stage.jobs,0);assert.equal(stage.previewCount,0);assert.equal(stage.historyBytes,stage.historyBefore);}
assert.equal(stages,32);
status.gestureCancellation={result:'VERIFIED_BROWSER_SOFTWARE_NOT_DEVICE',baselineCommit:before.commit,commit:after.commit,trustedTouchCases:6,completedStrokesPerCase:50,before:{wholeDocumentResetsPerCancellation:1,replayedCompletedStrokesPerCancellation:50},after:{wholeDocumentResetsPerCancellation:0,replayedCompletedStrokesPerCancellation:0},gpuPixelStages:stages,changedCompletedLayerBytes:0,physicalAndroid:'UNVERIFIED',reports:['gesture-cancellation/before/report.json','gesture-cancellation/after/report.json','gesture-cancellation/gpu/report.json']};
fs.writeFileSync(statusPath,JSON.stringify(status,null,2)+'\n');console.log(JSON.stringify(status.gestureCancellation));
