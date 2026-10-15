import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const root=path.resolve(process.env.UNDO_APP_ROOT??'apps/editor/dist'),out=process.env.UNDO_OUTPUT??'/tmp/undo-evidence/report.json';
const server=http.createServer(async(req,res)=>{try{const p=path.resolve(root,'.'+(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!p.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream');res.end(await fs.readFile(p));}catch{res.writeHead(404).end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,...(process.env.HANDOFF_CHROMIUM?{executablePath:process.env.HANDOFF_CHROMIUM}:{}),args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report={commit:process.env.EXPECTED_COMMIT_SHA,cases:[],errors:[],scope:'Trusted keyboard commands. GPU submission/completion proxies, not physical scanout or Android hardware.'};
const profiles=process.env.UNDO_QUICK?[{width:3000,height:3000,size:64}]:[{width:512,height:384,size:32},{width:3000,height:3000,size:64},{width:3000,height:3000,size:256}];
try{for(const backend of ['webgl2','webgpu'])for(const profile of profiles){
 const {width,height,size}=profile,context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true}),p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto((process.env.UNDO_PUBLIC_URL||'http://127.0.0.1:'+server.address().port+'/')+'?m09=1&perf=1&backend='+backend);await p.evaluate(([w,h])=>{document.getElementById('newCanvasWidth').value=String(w);document.getElementById('newCanvasHeight').value=String(h);},[width,height]);await p.locator('#new').click();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('描画できます'),null,{timeout:90000});
 if(process.env.EXPECTED_COMMIT_SHA)assert.equal(await p.locator('#canvas').getAttribute('data-commit'),process.env.EXPECTED_COMMIT_SHA);
 await p.evaluate(async size=>{
  const port=window.__illustroPerformance,{renderer:r,session:s,controller:c}=port.probe(),stats={inputs:[],core:[],drains:[],renders:[],rebuilds:[],backendCopies:[]};window.__undoMeasure=stats;
  const wrap=(obj,key,arr)=>{const original=obj[key];if(typeof original!=='function')return;obj[key]=function(...args){const t={at:performance.now()};arr.push(t);const value=original.apply(this,args);if(value?.then)return value.then(v=>{t.ms=performance.now()-t.at;return v;});t.ms=performance.now()-t.at;return value;};};
  wrap(c,'undo',stats.core);wrap(c,'redo',stats.core);wrap(r,'drain',stats.drains);wrap(r,'rebuildTiles',stats.rebuilds);wrap(r,'rebuildTileGroups',stats.rebuilds);wrap(r.backend,'render',stats.renders);wrap(r.backend,'undoCommit',stats.backendCopies);wrap(r.backend,'redoCommit',stats.backendCopies);
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase()))stats.inputs.push({at:performance.now(),key:e.key,shift:e.shiftKey});},true);
  document.getElementById('size').value=String(size);document.getElementById('size').dispatchEvent(new Event('input'));const canvas=document.getElementById('canvas'),b=canvas.getBoundingClientRect();canvas.setPointerCapture=()=>{};
  const emit=(type,x,y)=>canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:11,pointerType:'pen',button:0,buttons:type==='pointerup'?0:1,pressure:type==='pointerup'?0:.7,clientX:b.x+x,clientY:b.y+y}));
  for(let i=0;i<16;i++){emit('pointerdown',b.width*.5-90,b.height*.5+(i%4)*5);for(let j=1;j<=8;j++)emit('pointermove',b.width*.5-90+j*20,b.height*.5+(i%4)*5+Math.sin(j)*4);emit('pointerup',b.width*.5+70,b.height*.5+(i%4)*5);const at=performance.now();while(port.read().handoff.pendingLogical||port.read().handoff.pendingGpu){if(performance.now()-at>120000)throw Error('setup timeout');await new Promise(ok=>setTimeout(ok,5));}}
 },size);
 const idle=()=>p.waitForFunction(()=>{const r=window.__illustroPerformance.read();return document.getElementById('canvas').dataset.historyBusy==='false'&&!r.historyNavigation?.pending;},null,{timeout:180000});
 const phases=[],measure=async(name,action)=>{const before=await p.evaluate(()=>({at:performance.now(),strokes:window.__illustroPerformance.read().strokes,measure:structuredClone(window.__undoMeasure),metrics:window.__illustroPerformance.read()}));await action();await idle();const after=await p.evaluate(()=>({at:performance.now(),strokes:window.__illustroPerformance.read().strokes,measure:structuredClone(window.__undoMeasure),metrics:window.__illustroPerformance.read()}));const delta={};for(const k of Object.keys(before.measure))delta[k]=after.measure[k].slice(before.measure[k].length);const phase={name,elapsedMs:after.at-before.at,fromStrokes:before.strokes,toStrokes:after.strokes,requested:delta.inputs.length,applied:delta.core.length,measure:delta,after:after.metrics};phases.push(phase);console.log('UNDO_PHASE '+JSON.stringify({backend,width,size,name,elapsedMs:phase.elapsedMs,requested:phase.requested,applied:phase.applied,drains:delta.drains.length,renders:delta.renders.length,rebuilds:delta.rebuilds.length}));return phase;};
 await measure('isolated-undo',async()=>{for(let i=0;i<6;i++){await p.keyboard.press('Control+z');await idle();}});
 await measure('isolated-redo',async()=>{for(let i=0;i<6;i++){await p.keyboard.press('Control+Shift+z');await idle();}});
 const burst=await measure('burst-undo',async()=>{for(let i=0;i<12;i++){await p.keyboard.press('Control+z');await p.waitForTimeout(25);}});
 await measure('burst-redo',async()=>{for(let i=0;i<12;i++){await p.keyboard.press('Control+Shift+z');await p.waitForTimeout(25);}});
 // Missing GPU snapshots must still navigate correctly using exact dirty reconstruction.
 const startCold=await p.evaluate(()=>{const {renderer:r}=window.__illustroPerformance.probe();r.dropHistory([...r.backend.historyPatches.keys()]);return window.__illustroPerformance.read().strokes;});
 await measure('cold-burst-undo',async()=>{for(let i=0;i<6;i++){await p.keyboard.press('Control+z');await p.waitForTimeout(25);}});
 if(width===3000&&size===256)await measure('immediate-undo-broad-stroke',async()=>{
  await p.evaluate(()=>{document.getElementById('brush').value='foundation-marker';document.getElementById('brush').dispatchEvent(new Event('change'));document.getElementById('size').value='512';document.getElementById('size').dispatchEvent(new Event('input'));const canvas=document.getElementById('canvas'),b=canvas.getBoundingClientRect(),emit=(type,x,y)=>canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:11,pointerType:'pen',button:0,buttons:type==='pointerup'?0:1,pressure:type==='pointerup'?0:.65,clientX:b.x+x,clientY:b.y+y}));emit('pointerdown',b.width*.5-200,b.height*.5-200);for(let i=1;i<=120;i++)emit('pointermove',b.width*.5+(Math.floor(i/20)%2?200-400*(i%20)/19:-200+400*(i%20)/19),b.height*.5-200+400*i/120);emit('pointerup',b.width*.5+200,b.height*.5+200);});await p.keyboard.press('Control+z');
 });
 const final=await p.evaluate(()=>window.__illustroPerformance.read());assert.deepEqual(final.frameState.errors,[]);assert.deepEqual(final.frameState.sessionErrors,[]);
 if(process.env.UNDO_REQUIRE_ALL){assert.equal(burst.applied,12);assert.equal(burst.toStrokes,4);assert.equal(final.strokes,startCold-6);}
 report.cases.push({backend,...profile,phases,final});await context.close();
}}finally{await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2));await browser.close();server.close();}assert.deepEqual(report.errors,[]);
