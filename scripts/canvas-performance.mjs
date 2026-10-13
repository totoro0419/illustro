import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const root=path.resolve(process.env.PERF_RUNTIME_ROOT??'packages/brush-rt/dist');
const output=process.env.PERF_OUTPUT??'/tmp/canvas-performance.json';
const html='<!doctype html><meta charset="utf-8"><style>body{margin:0}canvas{width:800px;height:600px}</style><canvas width="800" height="600"></canvas>';
const server=http.createServer(async(req,res)=>{try{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}
 const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(file));
}catch{res.writeHead(404).end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report={baseline:process.env.PERF_BASELINE==='1',commit:process.env.EXPECTED_COMMIT_SHA??'',environment:'Chromium / SwiftShader software GPU; no Android hardware',metricScope:'GPU canvas submission cadence and input-to-submission proxy. Physical scanout FPS, photon latency and GPU timer queries are unmeasured.',cases:[],errors:[]};
try{
 for(const kind of ['webgl2','webgpu'])for(const size of [512,2048,3000])for(const layers of [1,3,10]){
  const page=await browser.newPage();await page.exposeFunction('recordPerfCase',async item=>{report.cases.push(item);await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2));console.log(item.kind,item.size,item.layers,item.strokes,'measured');});page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  const result=await page.evaluate(async({kind,size,layers,quick})=>{
   const {GpuRenderer,CanonicalBuilder,referenceBrushes}=await import('/rt/index.mjs');
   const canvas=document.querySelector('canvas');
   const r=await GpuRenderer.create(canvas,size,size===512?384:size,kind,{webglDesynchronized:false});
   const keys=Array.from({length:layers},(_,i)=>'layer-'+i);r.setSurfaceStack(keys);r.formalQuantum=256;
   r.setPerformanceEnabled?.(true);const b=r.backend,results=[];let renderCalls=0,compositions=0,presentCalls=0;
   const render=b.render.bind(b),present=b.presentCurrent.bind(b);
   b.render=(...args)=>{renderCalls++;compositions+=b.dirtyConfirmed.size;return render(...args);};
   let samples=null,presentationEncoded=false;
   const submitted=()=>{presentCalls++;if(samples)samples.push(performance.now());};
   if(b.device){
    const encode=b.encodePresentation.bind(b),submit=b.device.queue.submit.bind(b.device.queue);
    b.encodePresentation=(...args)=>{const result=encode(...args);presentationEncoded=true;return result;};
    b.device.queue.submit=(...args)=>{const result=submit(...args);if(presentationEncoded){submitted();presentationEncoded=false;}return result;};
   }else{
    const flush=b.gl.flush.bind(b.gl);
    b.presentCurrent=(...args)=>{presentationEncoded=true;return present(...args);};
    b.gl.flush=(...args)=>{const result=flush(...args);if(presentationEncoded){submitted();presentationEncoded=false;}return result;};
   }
   const base=new Float32Array([800,600,800,600,size,size===512?384:size,Math.min(1,500/size),0,0,0,1,1,0,0,0,0]);
   const settleFixture=async()=>{const frame=r.frame;r.frame=function(now){this.formalQuantum=256;return frame.call(this,now);};try{await r.drain();}finally{r.frame=frame;}};
   r.setViewTransform(base);await settleFixture();let count=0;
   for(const strokes of quick?[0,50]:[0,50,500,2000]){
    while(count<strokes){
     const p=structuredClone(referenceBrushes[0]);p.size=8;p.forceFade.enabled=false;
     const builder=new CanonicalBuilder(p);const x=32+(count%8)*20,y=40+(Math.floor(count/8)%5)*18;
     builder.accept({x,y,t:count*20,pointerType:'mouse'});builder.accept({x:x+12,y:y+4,t:count*20+10,pointerType:'mouse'});builder.finish();
     r.document.append(count+1,builder.p,builder.record().commands,null,keys[count%layers]);r.document.end(count+1,builder.p,keys[count%layers]);count++;
    }
    await settleFixture();
    const before={renderCalls,compositions,presentCalls,jobs:r.document.jobs.length};
    const times=[],cpu=[],latency=[];samples=[];const start=performance.now();let inputAt=start;
    await new Promise(resolve=>{const tick=ts=>{
     times.push(ts);const v=base.slice();v[8]=60*Math.sin((ts-start)/180);v[9]=40*Math.cos((ts-start)/210);v[7]=.2*Math.sin((ts-start)/340);v[6]*=1+.2*Math.sin((ts-start)/280);
     inputAt=performance.now();r.setViewTransform(v);const begin=performance.now();r.frame(ts);cpu.push(performance.now()-begin);
     if(samples.length&&samples.at(-1)>=inputAt)latency.push(samples.at(-1)-inputAt);
     if(ts-start<(quick?600:1400))requestAnimationFrame(tick);else resolve();
    };requestAnimationFrame(tick);});
    const submitted=samples;samples=null;await r.drain();
    const intervals=submitted.slice(1).map((t,i)=>t-submitted[i]),raf=times.slice(1).map((t,i)=>t-times[i]);
    const p95=a=>a.length?[...a].sort((x,y)=>x-y)[Math.ceil(a.length*.95)-1]:null;
    const elapsed=times.at(-1)-start;
    results.push({kind,size,height:size===512?384:size,layers,strokes,submissionFps:submitted.length*1000/elapsed,frameIntervalP95Ms:p95(intervals),rafIntervalP95Ms:p95(raf),inputToSubmissionP95Ms:p95(latency),javascriptP95Ms:p95(cpu),stalls:intervals.filter(t=>t>p95(raf)*1.5).length,renderCalls:renderCalls-before.renderCalls,compositedTileCount:compositions-before.compositions,presentationSubmissions:submitted.length,strokeReplayDuringMovement:r.document.jobs.length-before.jobs,occupiedGpuTiles:b.tiles.size,historyGpuReservedBytes:b.historyReservedBytes,metrics:r.performanceSummary?.()??null});
    await window.recordPerfCase(results.at(-1));
    if(r.errors.length)throw Error(r.errors.join(';'));
   }
   r.destroy();return results;
  },{kind,size,layers,quick:process.env.PERF_QUICK==='1'});
  for(const item of result){assert.ok(item.presentationSubmissions>0,'every measured workload needs observed GPU presentation submissions');assert.equal(item.strokeReplayDuringMovement,0);if(!report.baseline)assert.ok(item.renderCalls<=1,'movement must only present; final drain may render');}
  await page.close();
  console.log(kind,size,layers,'measured');
 }
 assert.deepEqual(report.errors,[]);
}finally{await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2));await browser.close();server.close();}
