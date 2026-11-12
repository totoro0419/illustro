import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),pw=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const definitions=[
 {name:'m09',commit:'e04d3e29ab162d487d0c774524323bf49c684a4d',root:process.env.LATENCY_M09_ROOT??'/tmp/latency-m09'},
 {name:'prior',commit:'3040c4be6610bce42c3a98ec3f4646abd0253926',root:process.env.LATENCY_PRIOR_ROOT??'/tmp/latency-prior'},
 {name:'current',commit:process.env.EXPECTED_COMMIT_SHA??null,root:path.resolve(import.meta.dirname,'..')}
];
const bundles=new Map(await Promise.all(definitions.map(async d=>[d.name,await fs.readFile(path.join(d.root,'prototypes/brush-rt/dist/illustro-brush-rt.html'))])));
const output=process.env.LATENCY_EVIDENCE_DIRECTORY??'/tmp/brush-latency-evidence';await fs.mkdir(output,{recursive:true});
const report={environment:'Chromium SwiftShader software GPU',measurement:'GPU-completion proxy, not physical display or photon latency',cases:[],errors:[]};
const save=()=>fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
const server=http.createServer((q,r)=>{const html=bundles.get(new URL(q.url,'http://localhost').pathname.slice(1));r.setHeader('Content-Type','text/html');r.end(html);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await pw.chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface']});
try{
 // Interleave versions; never compare reports from unrelated runner sessions.
 // Keep the original four-second failure cases and add matched 4s recurring
 // path periods for start/middle/end in a twelve-second continuous stroke.
 for(const backend of ['webgl2','webgpu'])for(const index of [4,6])for(const workload of [{duration:4000,shape:'fast-curve'},{duration:12000,shape:'long'}])for(let repeat=0;repeat<2;repeat++){
  const ordered=repeat?definitions.slice().reverse():definitions;
  for(const definition of ordered){
   const page=await browser.newPage({viewport:{width:1280,height:1050}});
   page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
   try{
    await page.goto(`http://127.0.0.1:${server.address().port}/${definition.name}?backend=${backend}&document=2048`);
    await page.waitForFunction(()=>window.__rt||document.getElementById('status').classList.contains('danger'),{timeout:45000});
    assert.ok(await page.evaluate(()=>!!window.__rt),await page.locator('#status').textContent());
    const measured=await page.evaluate(async({index,workload})=>{
     const {renderer,session,foundationPresets}=window.__rt;
     const selector=document.getElementById('brush');selector.value='f:'+index;selector.onchange();
     document.getElementById('stabilization').value='.75';document.getElementById('fast').value='0';
     document.getElementById('opacity').value=String(foundationPresets[index].opacity);
     const result=await window.__rt.run({size:512,hz:240,brushIndex:'f:'+index,prediction:false,...workload});
     const samples=result.samplesDetail;
     const percentile=(a,p)=>a.length?[...a].sort((x,y)=>x-y)[Math.ceil(a.length*p)-1]:null;
     const intervals=samples.slice(1).map((v,i)=>v.completedAt-samples[i].completedAt);
     const submittedWork=samples.map(v=>v.gpuWorkMs);
     return {result,completionIntervalP95Ms:percentile(intervals,.95),completionWorkP95Ms:percentile(submittedWork,.95),retainedInputs:session.records.at(-1).raw.length,errors:[...renderer.errors,...session.errors]};
    },{index,workload});
    const {samplesDetail,...summary}=measured.result;
    report.cases.push({version:definition.name,commit:definition.commit,backend,repeat,...measured,result:{...summary,samplesDetail}});
    await save();assert.equal(summary.actualSamples,summary.scheduledSamples);assert.equal(measured.retainedInputs,summary.actualSamples);assert.deepEqual(measured.errors,[]);
    console.log(JSON.stringify({version:definition.name,backend,repeat,brush:summary.preset.id,shape:summary.shape,samples:summary.samples,start:summary.startP95,middle:summary.middleP95,end:summary.endP95,growth:summary.growth,steadyGrowth:summary.steadyGrowth,gate:summary.growthGate,workP95:measured.completionWorkP95Ms}));
   }finally{await page.close();}
  }
 }
 assert.equal(report.cases.length,48);assert.deepEqual(report.errors,[]);
}catch(e){report.errors.push(e.stack);throw e;}
finally{await save();await browser.close();server.close();}
// Completion of a comparison is not a latency pass. Every original gate result
// is preserved, including baseline failures and insufficient completion windows.
