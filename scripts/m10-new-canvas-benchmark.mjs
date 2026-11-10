import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const {chromium}=createRequire(import.meta.url)(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const directory=path.resolve('apps/editor/dist');
const destination=process.env.M10_CANVAS_STARTUP_EVIDENCE??'/tmp/illustro-m10-quality/initial-canvas.json';
const configurations=[
 {width:512,height:384,background:'transparent',backend:'webgl2'},
 {width:2048,height:1536,background:'white',backend:'webgpu'}
];
const results=[];
await fs.mkdir(path.dirname(destination),{recursive:true});
const server=http.createServer(async(req,res)=>{
 try{
  const uri=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(directory,'.'+(uri==='/'?'/index.html':uri));
  if(!file.startsWith(directory+path.sep))throw Error('invalid path');
  const value=await fs.readFile(file);
  res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(file)]??'application/octet-stream');
  res.end(value);
 }catch{res.writeHead(404).end();}
});
let browser;
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
 for(const item of configurations){
  const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true,deviceScaleFactor:2});
  const page=await context.newPage(),pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  try{
   await page.goto('http://127.0.0.1:'+server.address().port+'/?perf=1&backend='+item.backend);
   // A typical artist spends time on Home choosing a document. Verify that
   // the EXACT prepared GPU host survives the Create button, not just a spare
   // unrelated warmup context or an early fake "ready" label.
   let prewarmed=false;
   if(item.width===512&&item.height===384&&item.background==='transparent'){
    await page.waitForFunction(()=>performance.getEntriesByName('illustro-canvas:home-gpu-prewarm').length>0,null,{timeout:120000});
    prewarmed=true;
   }
   await page.locator('#ihStart').click();
   await page.locator('#ihNewWidth').fill(String(item.width));
   await page.locator('#ihNewHeight').fill(String(item.height));
   await page.locator('#ihNewBackground').selectOption(item.background);
   const start=Date.now();
   await page.locator('#ihNewCreate').click();
   await page.waitForFunction(()=>{
    const app=document.getElementById('app'),brush=document.getElementById('brush'),status=document.getElementById('status');
    return app&&!app.inert&&brush&&!brush.disabled&&status?.textContent?.includes('描画できます');
   },null,{timeout:120000});
   const wallClockMs=Date.now()-start;
   const data=await page.evaluate(()=>({
    measures:performance.getEntriesByType('measure').filter(e=>e.name.startsWith('illustro-canvas:')).map(e=>({stage:e.name.slice('illustro-canvas:'.length),ms:Math.round(e.duration*10)/10})),
    backend:document.getElementById('canvas')?.dataset.backend??'',
    gpuWarmupMs:window.__illustroPerformance?.probe?.()?.renderer?.info?.preparationWallMs??null,
    hasDrawingSurface:!!document.getElementById('canvas')?.getBoundingClientRect().width,
    errorText:document.getElementById('status')?.textContent??''
   }));
   assert.ok(data.hasDrawingSurface,'canvas must be visible and editable');
   assert.ok(data.measures.some(m=>m.stage==='gpu-and-worker-init'),'GPU timing must be captured');
   assert.ok(data.measures.some(m=>m.stage==='storage-init'),'storage timing must be captured');
   assert.ok(data.measures.some(m=>m.stage==='click-to-editable'),'draw-ready measurement must exist');
   if(item.background==='transparent')assert.ok(!data.measures.some(m=>m.stage==='projection-restore'),
     'a first pristine blank must not replay a nonexistent drawing');
   // Being editable means that a real pointer path can reach a canonical commit.
   const rect=await page.locator('#canvas').boundingBox();
   assert.ok(rect&&rect.width>120&&rect.height>100,'visible drawing surface');
   await page.mouse.move(rect.x+rect.width*.38,rect.y+rect.height*.45);
   await page.mouse.down();
   await page.mouse.move(rect.x+rect.width*.62,rect.y+rect.height*.54,{steps:14});
   await page.mouse.up();
   await page.waitForFunction(()=>Number(document.getElementById('canvas')?.dataset.committedStrokes)>0,null,{timeout:40000});
   assert.deepEqual(pageErrors,[],'no browser exceptions');
   if(prewarmed)assert.ok(await page.evaluate(()=>performance.getEntriesByName('illustro-canvas:reused-home-gpu').length>0),
     'a prepared Home drawing host must be reused by the first new document');
   results.push({...item,wallClockMs,...data,prewarmed,firstStrokeCommitted:true});
   console.log('M10_FIRST_CANVAS',JSON.stringify(results.at(-1)));
  }finally{await context.close();}
 }
}finally{
 await fs.writeFile(destination,JSON.stringify({commit:process.env.EXPECTED_COMMIT_SHA??null,mode:'software-Chromium-not-physical-Android',results},null,2));
 await browser?.close();await new Promise(resolve=>server.close(resolve));
}
