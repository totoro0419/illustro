import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const root=path.resolve('packages/brush-rt/dist'),output=process.env.M10_AVAILABILITY_OUTPUT??'/tmp/m10-availability/report.json';
const server=http.createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p==='/')return res.setHeader('Content-Type','text/html').end('<!doctype html><style>body{margin:0}canvas{width:320px;height:480px;display:block}</style><canvas width="640" height="960"></canvas>');const f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(f));}catch{res.writeHead(404).end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report={sourceCommit:process.env.EXPECTED_COMMIT_SHA??null,scope:'Real browser Canvas2D refusal and actual WebGL context / WebGPU device destruction. Verifies route fallback and complete exportable semantic input, not complete application device reconstruction or physical display recovery.',cases:[],errors:[]};await fs.mkdir(path.dirname(output),{recursive:true});
try{for(const backend of ['webgl2','webgpu'])for(const fault of ['cpu-unavailable','gpu-loss']){
 const page=await browser.newPage({viewport:{width:320,height:480},deviceScaleFactor:2});page.on('pageerror',e=>report.errors.push(e.message));
 if(fault==='cpu-unavailable')await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='2d'?null:get.call(this,kind,...args);};});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const result=await page.evaluate(async({backend,fault})=>{
  const E=await import('/rt/index.mjs'),r=await E.GpuRenderer.create(document.querySelector('canvas'),512,384,backend,{strokeHandoff:true,strokeOverlay:{mode:fault==='gpu-loss'?'gpu':'cpu'}}),s=new E.RealtimeSession(r,new URL('/rt/canonical.worker.mjs',location.href));s.prediction=false;r.setSurfaceStack(['a']);r.setViewTransform(Float32Array.from([640,960,320,480,512,384,4,0,0,0,1,1,0,0,0,0]));
  const wait=ms=>new Promise(ok=>setTimeout(ok,ms));let running=true;const frame=t=>{if(running){s.frame(t);requestAnimationFrame(frame);}};requestAnimationFrame(frame);
  const p=structuredClone(E.referenceBrushes[0]);p.size=12;p.forceFade.enabled=false;const id=s.begin(p,0,{},'a'),at=performance.now();
  const input=i=>s.accept({x:245+i*4,y:188+Math.sin(i)*4,t:at+i*8,pressure:.7,pointerType:'pen'});
  input(0);input(1);await wait(40);let gpuLossConfirmed=false;
  if(fault==='gpu-loss'){
   if(r.backend.gl){const extension=r.backend.gl.getExtension('WEBGL_lose_context');if(!extension)throw Error('Context-loss API unavailable');extension.loseContext();}
   else r.backend.device.destroy();
   const start=performance.now();while(!r.backend.lost&&!r.backend.error){if(performance.now()-start>5000)throw Error('Loss was not acknowledged');await wait(2);}gpuLossConfirmed=true;
  }
  for(let i=2;i<6;i++){input(i);await wait(8);}const record=await s.end();s.commitRecord(record,[],'a');let formalInkPixels=null;
  if(fault==='cpu-unavailable'){await r.waitStroke([id]);const pixels=await r.read('a');formalInkPixels=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])formalInkPixels++;}
  else{const start=performance.now();while(!r.proxy.metrics.updates){if(performance.now()-start>5000)throw Error('CPU fallback did not process feedback');await wait(2);}}
  const exported=JSON.parse(JSON.stringify(s.export()));E.validateRecord(exported.strokes[0]);const result={gpuLossConfirmed,rawAccepted:s.rawAccepted,records:exported.strokes.length,exportedInputCount:exported.strokes[0].raw.length,route:r.proxy.policy.summary().route,proxyUnavailable:r.info.proxyUnavailable??null,cpuRasterPixels:r.proxy.metrics.rasterPixels,cpuUpdates:r.proxy.metrics.updates,formalInkPixels,sessionErrors:s.errors,rendererErrors:r.errors,semanticRecord:exported.strokes[0]};running=false;s.destroy();return result;
 },{backend,fault});
 assert.equal(result.rawAccepted,6);assert.equal(result.exportedInputCount,6);assert.equal(result.records,1);assert.deepEqual(result.sessionErrors,[]);if(fault==='cpu-unavailable'){assert.equal(result.route,'gpu');assert.equal(result.cpuRasterPixels,0);assert.match(result.proxyUnavailable,/Canvas2D unavailable/);assert.ok(result.formalInkPixels>0);}else{assert.equal(result.gpuLossConfirmed,true);assert.equal(result.route,'cpu');assert.ok(result.cpuUpdates>0);}
 report.cases.push({backend,fault,...result});await fs.writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify({backend,fault,route:result.route,inputs:result.exportedInputCount,records:result.records}));await page.close();
}}finally{await fs.writeFile(output,JSON.stringify(report,null,2));await browser.close();server.close();}assert.deepEqual(report.errors,[]);
