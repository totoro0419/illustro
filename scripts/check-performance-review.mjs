import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Experimental QA publication is distinct from performance acceptance.
// The original latency gate still fails CI; its complete evidence remains public.
const [input,output]=process.argv.slice(2);
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
await fs.writeFile(output,JSON.stringify(status,null,2));console.log(JSON.stringify(status));
