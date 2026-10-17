import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const roots={before:path.resolve(process.env.FORMAL_BEFORE_ROOT??'/tmp/handoff-before/packages/brush-rt/dist'),after:path.resolve('packages/brush-rt/dist')};
const output=process.env.FORMAL_QUALITY_OUTPUT??'/tmp/instant-quality/formal/report.json';
const server=http.createServer(async(req,res)=>{try{const [,mode,...parts]=new URL(req.url,'http://localhost').pathname.split('/'),root=roots[mode];if(!root)throw Error('root');if(!parts.join('')){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><canvas width="390" height="844"></canvas>');}const file=path.resolve(root,parts.join('/'));if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,...(process.env.HANDOFF_CHROMIUM?{executablePath:process.env.HANDOFF_CHROMIUM}:{}),args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report={sourceCommit:process.env.EXPECTED_COMMIT_SHA??'',baselineCommit:process.env.OVERLAY_BASELINE_SHA??'d9f52391bb2eeed4750e571262c8a089171d011e',scope:'Exact same-backend immutable baseline comparison; seven brushes, forced fade, three layers, overlap, hot history and full replay. Software GPU, not physical Android.',cases:[],errors:[]};
try{
 for(const backend of ['webgl2','webgpu']){
  const builds={};
  for(const mode of ['before','after']){
   const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/${mode}/`);
   builds[mode]=await page.evaluate(async({backend,mode})=>{
    const {GpuRenderer,RealtimeSession,referenceBrushes}=await import(`/${mode}/rt/index.mjs`);
    const r=await GpuRenderer.create(document.querySelector('canvas'),4000,4000,backend,{strokeHandoff:true,...(mode==='after'?{strokeOverlay:{ratio:'auto'}}:{})}),s=new RealtimeSession(r,new URL(`/${mode}/rt/canonical.worker.mjs`,location.href));r.setViewTransform(new Float32Array([390,844,390,844,4000,4000,.09,0,0,0,1,1,0,0,0,0]));r.setSurfaceStack(['a','b','c']);s.prediction=false;
    const b=r.backend,seen=new WeakSet,allocations=[],tile=b.tile.bind(b),render=b.render.bind(b),frames=[];let computePasses=0;
    b.tile=function(...args){const t=tile(...args);if(!seen.has(t)){seen.add(t);let stroke=t.stroke;Object.defineProperty(t,'stroke',{configurable:true,get:()=>stroke,set:v=>{stroke=v;if(v)allocations.push(v);}});}return t;};
    if(b.device){const create=b.device.createCommandEncoder.bind(b.device);b.device.createCommandEncoder=function(...args){const e=create(...args),begin=e.beginComputePass.bind(e);e.beginComputePass=function(...a){computePasses++;return begin(...a);};return e;};}
    b.render=function(snapshot,jobs,states){allocations.length=0;const passes=computePasses,pending=render(snapshot,jobs,states);frames.push({targets:allocations.reduce((n,a)=>n+a.length,0),passes:computePasses-passes,commands:jobs.reduce((n,j)=>n+(j.skip?0:j.commands.length),0),jobs:jobs.filter(j=>!j.skip).length});return pending;};
    const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
    async function settle(){await r.drain();const at=performance.now();while(r.inflight||r.needsFrame||r.mailbox.value){if(r.errors.length||performance.now()-at>60000)throw Error('settle '+r.errors);r.frame(performance.now());await sleep(5);}}
    async function pixels(){const result={};for(const t of b.tiles.values()){let bytes;if(b.gl){bytes=new Uint8Array(128*128*4);b.gl.bindFramebuffer(b.gl.FRAMEBUFFER,t.layer[t.l].f);b.gl.readPixels(0,0,128,128,b.gl.RGBA,b.gl.UNSIGNED_BYTE,bytes);}else{const d=b.device,buf=d.createBuffer({size:65536,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),e=d.createCommandEncoder();e.copyTextureToBuffer({texture:t.layer[t.l]},{buffer:buf,bytesPerRow:512},[128,128]);d.queue.submit([e.finish()]);await buf.mapAsync(GPUMapMode.READ);bytes=new Uint8Array(buf.getMappedRange()).slice();buf.unmap();buf.destroy();}result[t.surfaceKey+'\0'+t.key]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');}return Object.fromEntries(Object.entries(result).sort(([a],[b])=>a.localeCompare(b)));}
    const steps=[],records=[];
    for(let i=0;i<referenceBrushes.length;i++){
     const p=structuredClone(referenceBrushes[i]);p.size=p.id.includes('marker')?128:p.id.includes('eraser')?96:32;if(p.forceFade)p.forceFade.enabled=p.id.includes('g-pen');const surface=p.blend==='erase'?'a':['a','b','c'][i%3];
     const id=s.begin(p,0,mode==='after'?{forceFadeGeometry:'legacy'}:{},surface);for(let q=0;q<40;q++)s.accept({x:160+q*4,y:180+Math.sin(q/6)*22,t:1000+i*1000+q*4,pressure:.3+q/80,pointerType:'pen'});const record=await s.end();records.push(record);s.commitRecord(record,[],surface);await r.waitStroke([id]);await settle();const committed=await pixels();await s.undoDerived(record,s.recordTiles.get(record),surface);await s.redoDerived(record,s.recordTiles.get(record),surface);await settle();if(JSON.stringify(await pixels())!==JSON.stringify(committed))throw Error('history '+p.id);steps.push({brush:p.id,pixels:committed});
    }
    // Keep all twelve translucent/erasing strokes pending, then finish in input order.
    const peek=r.document.peekMany.bind(r.document);r.document.peekMany=()=>[];const ids=[];
    for(let i=0;i<12;i++){const p=structuredClone(referenceBrushes[0]);p.size=48;p.opacity=.4;p.forceFade.enabled=false;p.color=[i/11,.2,.7-i/20];if(i%5===4)p.blend='erase';const id=s.begin(p,0,{},'a');s.accept({x:160+i,y:180,t:10000+i*30,pressure:.7,pointerType:'pen'});s.accept({x:280+i,y:200,t:10010+i*30,pressure:.7,pointerType:'pen'});const record=await s.end();records.push(record);s.commitRecord(record,[],'a');ids.push(id);}
    r.document.peekMany=peek;r.needsFrame=true;r.requestWork();await r.waitStroke(ids);await settle();const final=await pixels();await s.rebuild();await settle();if(JSON.stringify(await pixels())!==JSON.stringify(final))throw Error('replay');
    const errors=[...r.errors,...s.errors],targets=frames.reduce((n,f)=>n+f.targets,0),passes=frames.reduce((n,f)=>n+f.passes,0),jobs=frames.reduce((n,f)=>n+f.jobs,0),commands=frames.reduce((n,f)=>n+f.commands,0),remainingTargets=[...b.tiles.values()].filter(t=>t.stroke).length,recordHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(records))))).map(x=>x.toString(16).padStart(2,'0')).join('');s.destroy();return {steps,final,recordHash,targets,passes,jobs,commands,remainingTargets,errors};
   },{backend,mode});assert.deepEqual(builds[mode].errors,[]);assert.equal(builds[mode].remainingTargets,0);await page.close();
  }
  const {before,after}=builds;assert.deepEqual(after.steps,before.steps);assert.deepEqual(after.final,before.final);assert.equal(after.recordHash,before.recordHash);assert.equal(after.commands,before.commands);assert.equal(after.jobs,before.jobs);assert.equal(after.targets,before.targets);assert.equal(after.passes,before.passes);
  report.cases.push({backend,exactBrushPixels:true,exactOverlap:true,exactHistory:true,exactReplay:true,exactRecords:true,before,after});console.log(JSON.stringify({backend,targets:[before.targets,after.targets],computePasses:[before.passes,after.passes],jobs:after.jobs,exactPixels:true}));
 }
}finally{await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2));await browser.close();server.close();}
assert.deepEqual(report.errors,[]);
