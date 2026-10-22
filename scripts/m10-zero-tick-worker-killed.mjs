import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {inkCentroid} from './m10-composed-motion.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const {PNG}=require(process.env.RT_PNG_PATH??'pngjs');
const root=path.resolve('apps/editor/dist');
const output=process.env.ZERO_TICK_WORKER_OUTPUT??'/tmp/m10-zero-tick-kill/report.json';
await fs.mkdir(path.dirname(output),{recursive:true});
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const target=path.resolve(root,pathname.slice(1)||'index.html');
  if(!target.startsWith(root+path.sep))throw Error('outside');
  res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':target.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');
  res.end(await fs.readFile(target));
 }catch{res.writeHead(404).end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report={kind:'kill actual drawing and presentation Workers, then native 2-finger gesture with composed pixel comparison',cases:[]};
try{
 for(const backend of ['webgl2','webgpu']){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true});
  const page=await context.newPage(),cdp=await context.newCDPSession(page);
  await page.goto('http://127.0.0.1:'+server.address().port+'/?m09=1&perf=1&backend='+backend);
  await page.evaluate(()=>{
   document.getElementById('newCanvasWidth').value='4000';
   document.getElementById('newCanvasHeight').value='4000';
   document.getElementById('new').click();
  });
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('描画できます'),null,{timeout:90000});
  await page.evaluate(()=>{
   const finger=document.getElementById('finger');finger.checked=true;finger.dispatchEvent(new Event('change'));
   const brush=document.getElementById('brush');brush.value='foundation-g-pen';brush.dispatchEvent(new Event('change'));
   const size=document.getElementById('size');size.value='128';size.dispatchEvent(new Event('input'));
  });
  const rect=await page.locator('.surface').boundingBox();
  assert.ok(rect?.width>100&&rect?.height>100);
  const pt=(rx,ry,id)=>({x:rect.x+rect.width*rx,y:rect.y+rect.height*ry,id,radiusX:2,radiusY:2,force:.8});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(.18,.36,1)]});
  for(let i=1;i<=55;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt(.18+.64*i/55,.36+.09*Math.sin(i*4/55),1)]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.evaluate(async()=>{
    const probe=window.__illustroPerformance.probe();
    await probe.renderer.drain();
  });
  await page.waitForTimeout(180);
  // Interruption regression: the first finger is actively drawing when a
  // second finger begins a camera gesture. Native lostpointercapture must not
  // cancel the legitimate stroke before it can be committed.
  const committedBefore=await page.evaluate(()=>window.__illustroPerformance.probe().controller.committedStrokeCount);
  const inkStart=pt(.18,.72,5),inkEnd=pt(.48,.7,5),navSecond=pt(.73,.55,6);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[inkStart]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[inkEnd]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[inkEnd,navSecond]});
  for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[
    {...inkEnd,x:inkEnd.x+i*1.5,y:inkEnd.y+i*.6},
    {...navSecond,x:navSecond.x+i*2.1,y:navSecond.y-i*.5}
  ]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(n=>window.__illustroPerformance.probe().controller.committedStrokeCount>=n+1,committedBefore,{timeout:90000});
  const committedAfter=await page.evaluate(()=>window.__illustroPerformance.probe().controller.committedStrokeCount);
  assert.equal(committedAfter,committedBefore+1,'two-finger interruption must preserve exactly one canonical stroke');
  await page.evaluate(async()=>window.__illustroPerformance.probe().renderer.drain());
  const before=PNG.sync.read(await page.screenshot({scale:'css'}));
  const source=inkCentroid(before,rect);
  assert.ok(source.count>100,'picture was not visible before terminating Workers: '+JSON.stringify(source));
  // Actually terminate BOTH Workers. A Promise gate after GPU submission
  // is NOT sufficient evidence, so this test refuses to use one.
  const frozen=await page.evaluate(()=>{
    const host=window.__illustroPerformance.probe().renderer;
    if(!(host.worker instanceof Worker)||!(host.presentation instanceof Worker))throw Error('not the real Workers');
    const stage=document.querySelector('.illustro-view-plane');
    if(!stage)throw Error('no stable display stage');
    host.worker.terminate();host.presentation.terminate();
    return {before:stage.style.transform,hostPresentationVersion:host.presentationVersion};
  });
  const a=pt(.25,.62,2),b=pt(.75,.62,3);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});
  for(let i=1;i<=24;i++){
   const dx=i*2.1,dy=i*.75;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...a,x:a.x+dx,y:a.y+dy},{...b,x:b.x+dx,y:b.y+dy}]});
  }
  await page.waitForTimeout(120);
  const during=PNG.sync.read(await page.screenshot({scale:'css'}));
  const ink=inkCentroid(during,rect);
  const moved=await page.evaluate(()=>document.querySelector('.illustro-view-plane').style.transform);
  assert.notEqual(moved,frozen.before,'the synchronous CSS matrix did not change with both Workers dead');
  assert.ok(ink.count>100,'image vanished while Workers were terminated: '+JSON.stringify(ink));
  const distance=Math.hypot(ink.x-source.x,ink.y-source.y);
  assert.ok(distance>12,'existing pixels did not move despite Workers being truly terminated: '+JSON.stringify({source,ink,distance}));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  report.cases.push({backend,distance,sourcePixels:source.count,destinationPixels:ink.count,passed:true,workerCountTerminated:2});
  await context.close();
 }
 await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log('ZERO_TICK_WORKERS_TERMINATED '+JSON.stringify(report));
}catch(error){
 report.error=String(error.stack||error);
 await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
 throw error;
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
