import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const root=path.resolve('apps/editor/dist'),out=process.env.UNDO_REPEAT_OUTPUT??'/tmp/undo-repeat/report.json';
const server=http.createServer(async(req,res)=>{try{const name=req.url.split('?')[0],file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report={sourceCommit:process.env.EXPECTED_COMMIT_SHA,scope:'Focused history correctness and operation counts in Chromium/SwiftShader. No hardware latency or Android performance measurement.',cases:[],errors:[]};
try{for(const backend of ['webgl2','webgpu']){
 const context=await browser.newContext({viewport:{width:1000,height:800}}),p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));
 await context.addInitScript(()=>Object.defineProperty(navigator,'deviceMemory',{value:4}));
 await p.goto((process.env.UNDO_REPEAT_PUBLIC_URL??'http://127.0.0.1:'+server.address().port+'/')+'?m09=1&perf=1&backend='+backend);
 await p.locator('#new').click();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('描画できます'),null,{timeout:60000});
 assert.equal(await p.locator('#canvas').getAttribute('data-commit'),process.env.EXPECTED_COMMIT_SHA);
 const idle=()=>p.waitForFunction(()=>{const m=window.__illustroPerformance.read();return !m.historyNavigation.pending&&!m.handoff.pendingLogical&&!m.handoff.pendingGpu&&!m.frameState.inflight&&!m.frameState.jobs&&document.getElementById('canvas').dataset.historyBusy==='false';},null,{timeout:60000});
 await p.evaluate(()=>document.getElementById('addLayer').click());await idle();
 await p.evaluate(()=>{
  const port=window.__illustroPerformance,{renderer:r}=port.probe(),b=r.backend,render=b.render.bind(b);window.__historyRenders=[];
  b.render=function(...args){const record={held:this.presentationHeld,privateHistory:!!this.deferredHistoryDirty,jobs:args[1].length};window.__historyRenders.push(record);const pending=render(...args);return Promise.resolve(pending).then(value=>{Object.assign(record,{composited:this.lastSubmission.compositedTiles,presented:this.lastSubmission.presentationSubmitted});return value;});};
  window.__historyPixels=async()=>{await r.drain(false);const {controller:c}=port.probe(),result={};for(const layer of c.layers){const bytes=await b.read(layer.surface.descriptor.surfaceId);result[layer.id]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).join(',');}const scene=await b.readViewport();result.scene=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',scene))).join(',');return result;};
  window.__historyDraw=i=>{const {controller:c}=port.probe();c.selectLayer(c.layers[i%2].id);const brush=document.getElementById('brush');brush.value=i%2?'foundation-marker':'foundation-g-pen';brush.dispatchEvent(new Event('change'));const size=document.getElementById('size');size.value='40';size.dispatchEvent(new Event('input'));const canvas=document.getElementById('canvas'),box=canvas.getBoundingClientRect();canvas.setPointerCapture=()=>{};const emit=(type,x)=>canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:11,pointerType:'pen',button:0,buttons:type==='pointerup'?0:1,pressure:type==='pointerup'?0:.65,clientX:box.x+box.width*.5+x,clientY:box.y+box.height*.5+(i%4)*6}));emit('pointerdown',-60);for(let j=1;j<=8;j++)emit('pointermove',-60+j*15);emit('pointerup',60);};
 });
 const expected=[await p.evaluate(()=>window.__historyPixels())],heads=[await p.locator('#canvas').getAttribute('data-revision-id')];
 for(let i=0;i<12;i++){await p.evaluate(i=>window.__historyDraw(i),i);await idle();expected.push(await p.evaluate(()=>window.__historyPixels()));heads.push(await p.locator('#canvas').getAttribute('data-revision-id'));}
 const verify=async n=>{await idle();assert.equal(await p.locator('#canvas').getAttribute('data-committed-strokes'),String(n));assert.equal(await p.locator('#canvas').getAttribute('data-revision-id'),heads[n]);assert.deepEqual(await p.evaluate(()=>window.__historyPixels()),expected[n],backend+' exact artwork and composition at '+n);};
 const press=async directions=>{for(const d of directions)await p.keyboard.press(d==='undo'?'Control+z':'Control+Shift+z');};
 await press(Array(10).fill('undo'));await verify(2);await press(Array(10).fill('redo'));await verify(12);
 await press(['undo','undo','redo','undo','undo','redo']);await verify(10);await press(['redo','redo']);await verify(12);
 const before=await p.evaluate(()=>{
  const port=window.__illustroPerformance,{renderer:r}=port.probe();r.dropHistory([...r.backend.historyPatches.keys()]);window.__historyRenders.length=0;
  const prepare=r.prepareHistory.bind(r);r.prepareHistory=async()=>{r.prepareHistory=prepare;await new Promise(resolve=>window.__releaseHistory=resolve);return prepare();};
  return port.read().historyNavigation;
 });
 // Deterministic backlog through the existing UI handlers: all commands are
 // accepted while preparation is held, with no timing-dependent debounce.
 const commands=[...Array(8).fill('undo'),...Array.from({length:40},()=>['undo','redo']).flat(),...Array(4).fill('redo')];
 await p.evaluate(commands=>{for(const d of commands)document.getElementById(d).click();},commands);
 assert.equal(await p.evaluate(()=>window.__illustroPerformance.read().historyNavigation.accepted),before.accepted+commands.length);
 await p.evaluate(()=>window.__releaseHistory());await verify(8);
 const burst=await p.evaluate(()=>({navigation:window.__illustroPerformance.read().historyNavigation,renders:window.__historyRenders.slice()}));
 assert.equal(burst.navigation.batches-before.batches,1,'one final-head projection for all 92 accepted commands');
 const privateFrames=burst.renders.filter(x=>x.privateHistory);assert.ok(privateFrames.length>0,'cold fallback exercised');assert.ok(privateFrames.every(x=>x.composited===0&&!x.presented),'no private prefix composition/presentation');
 const visibleComposites=burst.renders.filter(x=>!x.privateHistory&&x.composited>0);assert.equal(visibleComposites.length,1,'dirty union composed once');
 await press(Array(4).fill('redo'));await verify(12);
 // History must release input immediately and keep a subsequent stroke exact.
 await p.evaluate(()=>window.__historyDraw(12));await idle();const next=await p.evaluate(()=>window.__historyPixels());await press(['undo']);await verify(12);await press(['redo']);await idle();assert.deepEqual(await p.evaluate(()=>window.__historyPixels()),next);
 const metrics=await p.evaluate(()=>window.__illustroPerformance.read());assert.equal(metrics.historyNavigation.refused,0);assert.equal(metrics.historyNavigation.fault,null);assert.deepEqual(metrics.frameState.errors,[]);assert.deepEqual(metrics.frameState.sessionErrors,[]);assert.equal(metrics.historyGpuBudgetBytes,32*1024*1024);assert.ok(metrics.historyGpuReservedBytes<=metrics.historyGpuBudgetBytes);
 report.cases.push({backend,exactPixels:true,exactRevisionOrder:true,trustedKeyboardCommands:34,queuedCommands:commands.length,queuedProjectionBatches:1,privateRebuildFrames:privateFrames.length,privateCompositedTiles:0,finalCompositePasses:visibleComposites.length,cacheBudgetBytes:metrics.historyGpuBudgetBytes,followingStroke:true});
 console.log('UNDO_REPEAT '+JSON.stringify(report.cases.at(-1)));await context.close();
}}finally{await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2));await browser.close();server.close();}assert.deepEqual(report.errors,[]);assert.equal(report.cases.length,2);
