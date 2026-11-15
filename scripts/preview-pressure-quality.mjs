import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.RT_PLAYWRIGHT_PATH??'playwright'),root=path.resolve('packages/brush-rt/dist'),out=process.env.PRESSURE_QUALITY_OUTPUT??'/tmp/pressure-quality/report.json';
const server=http.createServer(async(req,res)=>{try{if(req.url==='/')return res.setHeader('Content-Type','text/html').end('<!doctype html><canvas width="900" height="1450" style="width:360px;height:580px"></canvas>');const file=path.resolve(root,'.'+req.url);if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,...(process.env.HANDOFF_CHROMIUM?{executablePath:process.env.HANDOFF_CHROMIUM}:{}),args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report={sourceCommit:process.env.EXPECTED_COMMIT_SHA??'',scope:'Artificial1MiB preview limit; actual canonical samples/records, held display completion, exact strict tiles/scene after catch-up/rebuild/history; software GPU, not physical performance',cases:[],errors:[]};
try{for(const backend of ['webgl2','webgpu']){
 const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/');
 const result=await page.evaluate(async backend=>{
  const {GpuRenderer,RealtimeSession,referenceBrushes,CanonicalBuilder}=await import('/rt/index.mjs'),canvas=document.querySelector('canvas'),r=await GpuRenderer.create(canvas,4000,4000,backend,{strokeHandoff:true}),b=r.backend,s=new RealtimeSession(r,new URL('/rt/canonical.worker.mjs',location.href));
  b.previewLimitBytes=1048576;s.prediction=false;r.setPerformanceEnabled(true);const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));let raf=requestAnimationFrame(function frame(t){s.frame(t);raf=requestAnimationFrame(frame);});
  async function waitFor(test,label){const start=performance.now();while(!test()){if(r.errors.length||s.errors.length||performance.now()-start>90000)throw Error(label+' '+JSON.stringify({errors:[...r.errors,...s.errors],metrics:r.performanceSummary()}));await sleep(5);r.frame(performance.now());}}
  async function idle(){await waitFor(()=>!r.inflight&&!r.needsFrame&&!r.mailbox.value,'preview idle');}
  const hash=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(x=>x.toString(16).padStart(2,'0')).join('');
  async function tiles(){const output={};for(const t of b.tiles.values()){let data;if(b.gl){data=new Uint8Array(128*128*4);b.gl.bindFramebuffer(b.gl.FRAMEBUFFER,t.layer[t.l].f);b.gl.readPixels(0,0,128,128,b.gl.RGBA,b.gl.UNSIGNED_BYTE,data);}else{const d=b.device,buffer=d.createBuffer({size:128*128*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),e=d.createCommandEncoder();e.copyTextureToBuffer({texture:t.layer[t.l]},{buffer,bytesPerRow:512},[128,128]);d.queue.submit([e.finish()]);await buffer.mapAsync(GPUMapMode.READ);data=new Uint8Array(buffer.getMappedRange()).slice();buffer.unmap();buffer.destroy();}output[t.surfaceKey+'\0'+t.key]=await hash(data);}return Object.fromEntries(Object.entries(output).sort(([a],[b])=>a.localeCompare(b)));}
  const peek=r.document.peekMany.bind(r.document),ids=[];r.document.peekMany=()=>[];
  for(let n=0;n<6;n++){
   const preset=structuredClone(referenceBrushes[n===4?4:0]);preset.size=16;preset.forceFade.enabled=n%2===0;const id=s.begin(preset),samples=Array.from({length:61},(_,i)=>({x:500+2200*i/60,y:1100+n*20+Math.sin(i/8)*180,t:performance.now()+i*8,pressure:.7,pointerType:'pen'}));ids.push(id);for(const q of samples)s.accept(q);const record=await s.end(),builder=new CanonicalBuilder(preset,record.seed);for(const q of samples)builder.accept(q);builder.finish();if(JSON.stringify(record)!==JSON.stringify(builder.record()))throw Error('Canonical record changed under pressure');s.commitRecord(record);await idle();
  }
  if(!b.previewPressure||b.previewDeferredFrames===0||b.peakPreviewBytes>b.previewLimitBytes||s.rawAccepted!==366||r.inputPreviewSamples.length!==0)throw Error('Pressure preflight/visibility not exercised '+JSON.stringify(r.performanceSummary()));
  let firstDone=false;const first=r.waitStroke([ids[0]]).then(()=>{firstDone=true;});
  r.document.peekMany=limit=>peek(limit).filter(j=>j.id===ids[0]);r.needsFrame=true;r.requestWork();await waitFor(()=>!r.document.jobs.some(j=>j.id===ids[0])&&!r.inflight,'first formal completion');await sleep(20);
  if(firstDone||!r.strokeFrames.has(ids[0])||!b.previewPressure)throw Error('Undisplayed stroke was acknowledged as complete');
  r.document.peekMany=peek;r.needsFrame=true;r.requestWork();await Promise.all([first,r.waitStroke(ids.slice(1))]);await r.drain();await idle();
  if(b.previewPressure||r.document.jobs.length||r.document.count||r.inputPreviewSamples.length!==6||r.strokeFrames.size||r.inputStarts.size)throw Error('Pressure did not recover '+JSON.stringify(r.performanceSummary()));
  const records=JSON.stringify(s.records),exact=JSON.stringify(await tiles()),scene=await hash(await b.readViewport());await s.rebuild();await r.drain();
  if(JSON.stringify(s.records)!==records||JSON.stringify(await tiles())!==exact||await hash(await b.readViewport())!==scene)throw Error('Exact rebuild differs after pressure');
  const last=s.records.at(-1),keys=s.recordTiles.get(last);await s.undoDerived(last,keys);await s.redoDerived(last,keys);await r.drain();if(JSON.stringify(await tiles())!==exact)throw Error('History differs after pressure');
  const result={strokes:6,rawAccepted:s.rawAccepted,recordsMatch:true,exactRebuild:true,exactHistory:true,heldCompletion:true,firstInputs:6,metrics:r.performanceSummary(),errors:[...r.errors,...s.errors]};cancelAnimationFrame(raf);s.destroy();return result;
 },backend);assert.deepEqual(result.errors,[]);report.cases.push({backend,...result});console.log('PRESSURE_QUALITY '+JSON.stringify({backend,raw:result.rawAccepted,deferrals:result.metrics.previewDeferredFrames,peakBytes:result.metrics.peakPreviewBytes,budgetBytes:result.metrics.previewBudgetBytes}));await page.close();
}}finally{await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2));await browser.close();server.close();}assert.deepEqual(report.errors,[]);
