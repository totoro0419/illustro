import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
let base=process.env.HISTORY_RESIDENT_ORIGIN??'',server;
if(!base){const roots={before:path.resolve('/tmp/illustro-history-before'),after:path.resolve('apps/editor/dist')};server=http.createServer(async(req,res)=>{try{const parts=req.url.split('?')[0].split('/'),root=roots[parts[1]];if(!root)return res.writeHead(404).end();const name=parts.slice(2).join('/')||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+'/'))return res.writeHead(403).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));base='http://127.0.0.1:'+server.address().port;}
const out=process.env.HISTORY_RESIDENT_OUTPUT??'/tmp/tile-history-resident/report.json';await fs.mkdir(path.dirname(out),{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.HANDOFF_CHROMIUM?{executablePath:process.env.HANDOFF_CHROMIUM}:{}),args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report={scope:'4000px; 24 short overlapping strokes in one 128px tile, normal 32MiB GPU limit, trusted keyboard Undo/Redo. Software GPU, no physical device claim.',cases:[],errors:[]};
try{for(const backend of ['webgl2','webgpu'])for(const mode of ['before','after']){
 const context=await browser.newContext({viewport:{width:1000,height:800}});await context.addInitScript(()=>Object.defineProperty(navigator,'deviceMemory',{value:4}));const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto(`${base}/${mode}/?m09=1&perf=1&backend=${backend}`);
 await p.evaluate(()=>{document.getElementById('newCanvasWidth').value='4000';document.getElementById('newCanvasHeight').value='4000';document.getElementById('new').click();});await p.waitForFunction(()=>document.getElementById('status').textContent.includes('描画できます'),null,{timeout:90000});
 if(mode==='after'&&process.env.EXPECTED_COMMIT_SHA)assert.equal(await p.locator('#canvas').getAttribute('data-commit'),process.env.EXPECTED_COMMIT_SHA);
 await p.evaluate(()=>{
  const port=window.__illustroPerformance,{renderer:r}=port.probe(),b=r.backend;
  window.__residentIdle=async()=>{const at=performance.now();for(;;){const m=port.read();if(!m.historyNavigation.pending&&!m.handoff.pendingLogical&&!m.handoff.pendingGpu&&!m.frameState.inflight&&!m.frameState.jobs&&!m.frameState.needsFrame)return;if(performance.now()-at>60000)throw Error('resident idle timeout '+JSON.stringify(m.frameState));await new Promise(ok=>setTimeout(ok,4));}};
  window.__residentHash=async()=>{await window.__residentIdle();const c=port.probe().controller,bytes=await b.read(c.layers[0].surface.descriptor.surfaceId);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).join(',');};
  window.__residentDraw=async i=>{const input=document.getElementById('size');input.value='8';input.dispatchEvent(new Event('input'));const canvas=b.canvas,box=canvas.getBoundingClientRect(),v=b.viewTransform;canvas.setPointerCapture=()=>{};for(let j=0;j<=12;j++){const type=j===0?'pointerdown':j===12?'pointerup':'pointermove',x=1940+60*j/12,y=1950+i*2,event=new PointerEvent(type,{bubbles:true,pointerId:11,pointerType:'pen',button:0,buttons:type==='pointerup'?0:1,pressure:type==='pointerup'?0:.65,clientX:box.x+v[2]/2+v[8]+v[6]*(x-v[4]/2),clientY:box.y+v[3]/2+v[9]+v[6]*(y-v[5]/2)});Object.defineProperty(event,'timeStamp',{value:1000+i*1000+j*10});canvas.dispatchEvent(event);}await window.__residentIdle();};
 });
 const expected={},heads={};for(let i=0;i<24;i++){await p.evaluate(i=>window.__residentDraw(i),i);if([3,22,23].includes(i)){expected[i+1]=await p.evaluate(()=>window.__residentHash());heads[i+1]=await p.locator('#canvas').getAttribute('data-revision-id');}}
 const setup=await p.evaluate(()=>window.__illustroPerformance.read());assert.equal(setup.historyGpuBudgetBytes,32*1024*1024);if(mode==='after')assert.equal(setup.tileHistory.spilled,0,'all history images are GPU resident');
 const phases=[];for(const [name,keys,target]of [['single-undo',['Control+z'],23],['single-redo',['Control+Shift+z'],24],['trusted-20-undo',Array(20).fill('Control+z'),4],['trusted-20-redo',Array(20).fill('Control+Shift+z'),24]]){
  const before=await p.evaluate(()=>({at:performance.now(),data:window.__illustroPerformance.read()}));for(const key of keys)await p.keyboard.press(key);await p.evaluate(()=>window.__residentIdle());const after=await p.evaluate(()=>({at:performance.now(),data:window.__illustroPerformance.read()}));
  assert.equal(after.data.strokes,target);assert.equal(after.data.revision,heads[target]);assert.equal(after.data.strokeReplayFallbacks,before.data.strokeReplayFallbacks);assert.deepEqual(await p.evaluate(()=>window.__residentHash()),expected[target]);
  if(mode==='after'){assert.equal(after.data.tileHistory.coldTiles,0);assert.ok(after.data.tileHistory.hotTiles>0);}
  phases.push({name,elapsedMs:after.at-before.at,accepted:after.data.historyNavigation.accepted-before.data.historyNavigation.accepted,after:after.data});
 }
 report.cases.push({backend,mode,sourceCommit:setup.commit,exactPixels:true,phases});await context.close();await fs.writeFile(out,JSON.stringify(report,null,2));
}}finally{await fs.writeFile(out,JSON.stringify(report,null,2));await browser.close();server?.close();}assert.deepEqual(report.errors,[]);assert.equal(report.cases.length,4);
