import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
let base=process.env.PERF_PUBLIC_URL??'',server;
if(!base){const root=path.resolve('apps/editor/dist');server=http.createServer(async(req,res)=>{try{const p=path.resolve(root,'.'+(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!p.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream');res.end(await fs.readFile(p));}catch{res.writeHead(404).end();}});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));base='http://127.0.0.1:'+server.address().port+'/';}
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report={cases:[],errors:[],environment:'software GPU; Android and physical latency unverified'};
try{for(const backend of ['webgl2','webgpu']){
 const context=await browser.newContext({viewport:{width:900,height:900},deviceScaleFactor:2,hasTouch:true}),p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto(base+'?m09=1&perf=1&backend='+backend);await p.evaluate(()=>{document.getElementById('newCanvasWidth').value='3000';document.getElementById('newCanvasHeight').value='3000';});
 await p.locator('#new').click();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('描画できます'),null,{timeout:90000});
 await p.locator('#canvasPerformance > summary').click();await p.locator('#performanceEnabled').check();await p.locator('#canvasPerformance > summary').click();
 const blank=await p.evaluate(()=>window.__illustroPerformance.capture());assert.equal(blank.tiles,0);assert.equal(blank.bytes,0);assert.equal(blank.after.occupiedGpuTiles,blank.before.occupiedGpuTiles);
 for(let layer=0;layer<3;layer++){
  if(layer){if(!(await p.locator('#addLayer').isVisible())){if(await p.locator('#workspaceToggle').getAttribute('aria-expanded')==='false')await p.locator('#workspaceToggle').click();if(!(await p.locator('#addLayer').isVisible()))await p.locator('.box-toggle[aria-controls="layersBoxBody"]').click();}await p.locator('#addLayer').click();}
  const box=await p.locator('#canvas').boundingBox();await p.mouse.move(box.x+box.width*.45,box.y+box.height*.4+layer*12);await p.mouse.down();await p.mouse.move(box.x+box.width*.46,box.y+box.height*.4+layer*12);await p.mouse.up();
  await p.waitForFunction(n=>Number(document.getElementById('canvas').dataset.committedStrokes)===n&&document.getElementById('canvas').dataset.historyBusy==='false',layer+1,{timeout:150000});
 }
 const sparse=await p.evaluate(()=>window.__illustroPerformance.capture());assert.ok(sparse.tiles>0&&sparse.tiles<1728);assert.equal(sparse.before.occupiedGpuTiles,sparse.after.occupiedGpuTiles);
 const concurrent=await p.evaluate(async()=>{
  const port=window.__illustroPerformance,before=port.read(),checkpoint=port.checkpoint(true);const times=[],start=performance.now();
  await new Promise(resolve=>{const tick=ts=>{times.push(ts);port.view(.2+.02*Math.sin(ts/150),.2*Math.cos(ts/160));if(ts-start<1600)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});await checkpoint;
  const after=port.read();return {before,after,callbacks:times.length,rafP95Ms:times.slice(1).map((v,i)=>v-times[i]).sort((a,b)=>a-b)[Math.ceil((times.length-1)*.95)-1]??null};
 });
 assert.equal(concurrent.after.revision,concurrent.before.revision);assert.equal(concurrent.after.strokes,3);assert.equal(concurrent.after.strokeReplayFallbacks,concurrent.before.strokeReplayFallbacks);assert.deepEqual(concurrent.after.checkpointErrors,[]);assert.ok(concurrent.after.viewPresentations>concurrent.before.viewPresentations);
 await p.locator('#undo').click();await p.waitForFunction(()=>Number(document.getElementById('canvas').dataset.committedStrokes)===2&&document.getElementById('canvas').dataset.historyBusy==='false',null,{timeout:90000});
 await p.locator('#redo').click();await p.waitForFunction(()=>Number(document.getElementById('canvas').dataset.committedStrokes)===3&&document.getElementById('canvas').dataset.historyBusy==='false',null,{timeout:90000});
 report.cases.push({backend,dpr:2,document:[3000,3000],blank,sparse,concurrent,result:'verified'});await context.close();
 }}finally{await fs.mkdir('/tmp/perf-checkpoint-evidence',{recursive:true});await fs.writeFile('/tmp/perf-checkpoint-evidence/report.json',JSON.stringify(report,null,2));await browser.close();server?.close();}
assert.deepEqual(report.errors,[]);
console.log(JSON.stringify(report));
