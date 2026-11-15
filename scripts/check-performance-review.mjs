import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Experimental QA publication is distinct from performance acceptance.
// The original latency gate still fails CI; its complete evidence remains public.
const [input,output,comparisonInput]=process.argv.slice(2);
assert.ok(input&&output,'foundation report and review status paths are required');
const report=JSON.parse(await fs.readFile(input,'utf8'));
assert.deepEqual(report.backends.map(b=>b.backend).sort(),['webgl2','webgpu']);
for(const b of report.backends){
 assert.ok(['CHECKS_PASS','GATE_FAIL'].includes(b.status)&&!b.failure,'runtime safety check did not finish');
 assert.deepEqual(b.consoleErrors,[]);assert.equal(b.previewDifferences?.length??0,0,'brush image differences prevent QA publication');
 assert.ok(b.checks.length>=34&&b.benchmarks.length>=4,'incomplete brush evidence');
 for(const sample of b.benchmarks){assert.equal(sample.actualSamples,sample.scheduledSamples);assert.equal(sample.retainedCanonicalInputs,sample.actualSamples,'canonical input retention failed');}
 assert.equal(b.status,(b.latencyDifferences?.length??0)?'GATE_FAIL':'CHECKS_PASS');
}
const status={commit:process.env.GITHUB_SHA??null,review:'EXPERIMENTAL_NOT_ACCEPTED',functionalAndBrushImages:'verified',foundationCiResult:process.env.FOUNDATION_RESULT??null,physicalDevice:'UNVERIFIED',gpuTimerQueries:'UNMEASURED',measurementScope:report.environment,latency:report.backends.map(b=>({backend:b.backend,status:b.status,differences:b.latencyDifferences??[]}))};
if(comparisonInput){
 const comparison=JSON.parse(await fs.readFile(comparisonInput,'utf8'));
 assert.equal(comparison.cases.length,48,'incomplete matched latency comparison');assert.deepEqual(comparison.errors,[]);
 for(const c of comparison.cases){assert.deepEqual(c.errors,[]);assert.equal(c.retainedInputs,c.result.actualSamples);assert.equal(c.result.actualSamples,c.result.scheduledSamples);}
 const current=comparison.cases.filter(c=>c.version==='current');assert.equal(current.length,16);
 for(const c of current)assert.equal(c.commit,process.env.GITHUB_SHA,'comparison source differs from published app');
 const failures=current.filter(c=>c.result.growthGate!=='PASS_PROXY').map(c=>({backend:c.backend,brush:c.result.preset.id,shape:c.result.shape,repeat:c.repeat,samples:c.result.samples,startSamples:c.result.startSamples,middleSamples:c.result.middleSamples,endSamples:c.result.endSamples,growth:c.result.growth,steadyGrowth:c.result.steadyGrowth,gate:c.result.growthGate,completionWorkP95Ms:c.completionWorkP95Ms}));
 status.latencyComparison={scope:comparison.measurement,currentRuns:current.length,failedOrInsufficient:failures.length,failures,report:'latency-comparison/report.json'};
}
await fs.writeFile(output,JSON.stringify(status,null,2));console.log(JSON.stringify(status));
