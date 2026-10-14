import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const root=path.resolve(process.env.GESTURE_APP_ROOT??'apps/editor/dist'),baseline=process.env.GESTURE_EXPECT_REPLAY==='1';
const out=process.env.GESTURE_EVIDENCE_DIRECTORY??'/tmp/gesture-cancel-evidence';await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{const url=(req.url??'/').split('?')[0],file=path.resolve(root,'.'+(url==='/'?'/index.html':url));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report={commit:process.env.EXPECTED_COMMIT_SHA??null,baseline,environment:'Chromium software GPU and trusted CDP touch input; physical Android unverified',cases:[],errors:[]};
const read=page=>page.evaluate(()=>({metrics:window.__illustroPerformance.read(),probe:globalThis.__gestureCancelProbe??null}));
try{for(const backend of ['webgl2','webgpu']){
 const context=await browser.newContext({viewport:{width:1100,height:900},deviceScaleFactor:2,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(base+'?m09=1&perf=1&backend='+backend);await page.locator('#new').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('描画できます'),null,{timeout:90000});
 await page.evaluate(()=>{for(const id of ['qaPanel','canvasPerformance']){const el=document.getElementById(id);if(el)el.hidden=true;}document.getElementById('size').value='8';document.getElementById('size').dispatchEvent(new Event('input'));});
 const box=await page.locator('#canvas').boundingBox();assert.ok(box);
 for(let i=0;i<50;i++){
  const x=box.x+box.width*.35+(i%10)*10,y=box.y+box.height*.35+Math.floor(i/10)*16;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+6,y+5,{steps:2});await page.mouse.up();
  await page.waitForFunction(n=>Number(document.getElementById('canvas').dataset.committedStrokes)===n&&document.getElementById('canvas').dataset.historyBusy==='false',i+1,{timeout:45000});
 }
 await page.evaluate(()=>{const f=document.getElementById('finger');f.checked=true;f.dispatchEvent(new Event('change'));});
 const cdp=await context.newCDPSession(page),touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y,radiusX:4,radiusY:4,force:.7}))});
 const ax=box.x+box.width*.4,ay=box.y+box.height*.45,bx=ax+65,by=ay+30;
 for(const scenario of ['short-first-touch','draw-then-two-fingers','pointercancel']){
  await page.locator('#fitView').click();await page.locator('#resetRotation').click();await page.waitForFunction(()=>{const s=window.__illustroPerformance.read().frameState;return !s.inflight&&!s.needsFrame&&!s.viewPending;},null,{timeout:45000});
  const before=await read(page),image=(await page.locator('#canvas').screenshot()).toString('base64');
  await touch('touchStart',[[0,ax,ay]]);
  await page.waitForTimeout(scenario==='short-first-touch'?40:240);
  if(scenario!=='short-first-touch')await touch('touchMove',[[0,ax+14,ay+9]]);
  if(scenario==='pointercancel')await touch('touchCancel',[]);
  else{
   await touch('touchStart',[[0,ax+14,ay+9],[1,bx,by]]);
   for(let i=1;i<=8;i++)await touch('touchMove',[[0,ax+14+i*2,ay+9-i],[1,bx+i*3,by+i]]);
   await touch('touchEnd',[]);
  }
  await page.waitForFunction(()=>document.getElementById('canvas').dataset.historyBusy==='false',null,{timeout:90000});
  const after=await read(page);assert.equal(after.metrics.strokes,50);assert.equal(after.metrics.revision,before.metrics.revision);
  const beforeReplay=baseline?before.probe.replayedStrokes:before.metrics.fullReplayStrokes,afterReplay=baseline?after.probe.replayedStrokes:after.metrics.fullReplayStrokes;
  const replayed=afterReplay-beforeReplay,resets=(baseline?after.probe.rebuilds-before.probe.rebuilds:after.metrics.fullDocumentRebuilds-before.metrics.fullDocumentRebuilds);
  if(baseline){assert.equal(resets,1);assert.equal(replayed,50,'baseline must expose the actual cancellation replay');}
  else{assert.equal(resets,0);assert.equal(replayed,0);assert.equal(after.metrics.cancelledStrokeCount-before.metrics.cancelledStrokeCount,1);assert.deepEqual(after.metrics.frameState.errors,[]);assert.deepEqual(after.metrics.frameState.sessionErrors,[]);}
  await page.locator('#fitView').click();await page.locator('#resetRotation').click();await page.waitForFunction(()=>{const s=window.__illustroPerformance.read().frameState;return !s.inflight&&!s.needsFrame&&!s.viewPending;},null,{timeout:45000});
  const result=(await page.locator('#canvas').screenshot()).toString('base64');
  const difference=await page.evaluate(async({before,after})=>{
   const decode=async png=>{const bitmap=await createImageBitmap(new Blob([Uint8Array.from(atob(png),c=>c.charCodeAt(0))],{type:'image/png'})),c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);bitmap.close();return ctx.getImageData(0,0,c.width,c.height).data;};
   const a=await decode(before),b=await decode(after);if(a.length!==b.length)throw Error('canvas backing size changed');let max=0,over2=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);max=Math.max(max,d);if(d>2)over2++;}return {max,over2};
  },{before:image,after:result});
  assert.equal(difference.over2,0,'completed displayed artwork must survive '+scenario);
  report.cases.push({backend,scenario,strokes:50,resets,replayed,difference,before,after});
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 }
 // Navigation cancellation must keep existing history usable.
 await page.locator('#undo').click();await page.waitForFunction(()=>Number(document.getElementById('canvas').dataset.committedStrokes)===49&&document.getElementById('canvas').dataset.historyBusy==='false',null,{timeout:90000});
 await page.locator('#redo').click();await page.waitForFunction(()=>Number(document.getElementById('canvas').dataset.committedStrokes)===50&&document.getElementById('canvas').dataset.historyBusy==='false',null,{timeout:90000});
 await page.screenshot({path:path.join(out,backend+'.png')});await context.close();
 }assert.equal(report.cases.length,6);assert.deepEqual(report.errors,[]);
}catch(e){report.errors.push(e.stack);throw e;}finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();server.close();}
console.log(JSON.stringify({commit:report.commit,baseline,cases:report.cases.map(({backend,scenario,resets,replayed,difference})=>({backend,scenario,resets,replayed,difference})),errors:report.errors}));
