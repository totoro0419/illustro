// Deletion-phase browser probe. No new presentation or editor behavior.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const {chromium}=createRequire(import.meta.url)(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const root=path.resolve('apps/editor/dist');
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  const ext=path.extname(file);
  res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.json':'application/json'})[ext]??'application/octet-stream');
  res.end(await fs.readFile(file));
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report=[];
try{
 for(const backend of ['webgl2','webgpu']){
  const context=await browser.newContext({viewport:{width:1024,height:800},deviceScaleFactor:1,hasTouch:true});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/?m09=1&perf=1&backend='+backend);
  await page.evaluate(()=>{
   document.getElementById('newCanvasWidth').value='512';
   document.getElementById('newCanvasHeight').value='512';
   document.getElementById('new').click();
  });
  await page.waitForFunction(()=>document.getElementById('status')?.textContent?.includes('描画できます'),null,{timeout:90000});
  const before=await page.evaluate(async()=>{
   const {renderer,controller}=window.__illustroPerformance.probe();
   const surface=controller.selectedLayer.surface.descriptor.surfaceId;
   return Array.from(await renderer.read(surface));
  });
  const box=await page.locator('#canvas').boundingBox();assert.ok(box?.width>100&&box?.height>100,'canvas target exists');
  await page.locator('#brush').evaluate(el=>{el.value='foundation-g-pen';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.mouse.move(box.x+box.width*.32,box.y+box.height*.40);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.72,box.y+box.height*.55,{steps:20});
  await page.mouse.up();
  await page.waitForFunction(()=>document.getElementById('canvas')?.dataset.committedStrokes==='1',null,{timeout:30000});
  const after=await page.evaluate(async()=>{
   const {renderer,controller}=window.__illustroPerformance.probe();
   await renderer.drain();
   const surface=controller.selectedLayer.surface.descriptor.surfaceId;
   return Array.from(await renderer.read(surface));
  });
  assert.equal(after.length,before.length,'formal raster size preserved');
  const changed=after.reduce((n,v,i)=>n+(v!==before[i]?1:0),0);
  assert.ok(changed>0,'formal pixels must change after drawing even with screen presentation removed');
  await page.locator('#undo').click();
  await page.waitForFunction(()=>document.getElementById('canvas')?.dataset.committedStrokes==='0',null,{timeout:30000});
  const undone=await page.evaluate(async()=>{
   const {renderer,controller}=window.__illustroPerformance.probe();
   const surface=controller.selectedLayer.surface.descriptor.surfaceId;
   return Array.from(await renderer.read(surface));
  });
  assert.deepEqual(undone,before,'Undo must restore exact pre-stroke image');
  await page.locator('#redo').click();
  await page.waitForFunction(()=>document.getElementById('canvas')?.dataset.committedStrokes==='1',null,{timeout:30000});
  const redone=await page.evaluate(async()=>{
   const {renderer,controller}=window.__illustroPerformance.probe();
   const surface=controller.selectedLayer.surface.descriptor.surfaceId;
   return Array.from(await renderer.read(surface));
  });
  assert.deepEqual(redone,after,'Redo must restore exact committed image');
  assert.deepEqual(errors,[],'no browser runtime errors');
  report.push({backend,strokes:1,changedChannels:changed,undoPixelsExact:true,redoPixelsExact:true,blankEditorCanvasExpected:true});
  await context.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
console.log('M10_DELETION_BROWSER '+JSON.stringify(report));
