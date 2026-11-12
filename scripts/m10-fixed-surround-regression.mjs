import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const {PNG}=require(process.env.RT_PNG_PATH??'pngjs');
const root=path.resolve('apps/editor/dist');
const output=process.env.SURROUND_EVIDENCE??'/tmp/illustro-surround/report.json';
await fs.mkdir(path.dirname(output),{recursive:true});
const server=http.createServer(async(req,res)=>{
  try{
    const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const filename=path.resolve(root,'.'+(route==='/'?'/index.html':route));
    if(!filename.startsWith(root+path.sep))throw Error('outside build');
    const bytes=await fs.readFile(filename);
    res.setHeader('content-type',filename.endsWith('.js')?'text/javascript':filename.endsWith('.css')?'text/css':filename.endsWith('.html')?'text/html':'application/octet-stream');
    res.end(bytes);
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const expected=[241,244,249],report={source:process.env.EXPECTED_COMMIT_SHA??'working-tree',cases:[]};
function corners(png,rect){
  const image=PNG.sync.read(png);
  const points=[[.12,.12],[.88,.12],[.12,.88],[.88,.88]];
  return points.map(([fx,fy])=>{
    const x=Math.floor(rect.x+rect.width*fx),y=Math.floor(rect.y+rect.height*fy);
    assert.ok(x>=0&&x<image.width&&y>=0&&y<image.height,'sample in screenshot');
    const index=(y*image.width+x)*4;
    return {x,y,rgba:[...image.data.subarray(index,index+4)]};
  });
}
try{
 for(const backend of ['webgl2','webgpu']){
  const context=await browser.newContext({viewport:{width:1300,height:880},deviceScaleFactor:1,hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/?m08=1&perf=1&backend='+backend);
  await page.locator('#new').click();
  await page.waitForFunction(()=>!document.querySelector('#brush')?.disabled,null,{timeout:90000});
  // Diagnostic controls are fixed above the viewport; exclude them from pixels.
  await page.evaluate(()=>{for(const id of ['qaPanel','canvasPerformance']){const el=document.getElementById(id);if(el)el.style.display='none';}});
  const test=await page.evaluate(()=>{
    const m=window.__illustroPerformance;
    m.view(.10,0);
    const area=document.getElementById('canvasArea'),surface=area.querySelector('.surface'),scene=surface.querySelector('.illustro-viewport-scene'),canvas=document.getElementById('canvas');
    const box=surface.getBoundingClientRect();
    const colors=[area,surface,scene,canvas].map(el=>getComputedStyle(el).backgroundColor);
    return {colors,rect:{x:box.x,y:box.y,width:box.width,height:box.height},scenePresent:!!scene};
  });
  assert.equal(test.scenePresent,true,'production viewport scene present');
  assert.deepEqual(test.colors,Array(4).fill('rgb(241, 244, 249)'),'every underlay uses one fixed surround RGB');
  await page.waitForTimeout(400);
  const before=await page.screenshot({scale:'css'}),samples=[{stage:'idle',samples:corners(before,test.rect)}];
  await page.evaluate(()=>{
    const m=window.__illustroPerformance;
    m.probe().renderer.beginViewportNavigation();
    m.view(.12,.38);
  });
  await page.waitForTimeout(80);
  assert.equal(await page.locator('.illustro-viewport-scene').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(241, 244, 249)');
  const moving=await page.screenshot({scale:'css'});
  samples.push({stage:'moving',samples:corners(moving,test.rect)});
  await page.evaluate(()=>{
    const m=window.__illustroPerformance;
    m.probe().renderer.endViewportNavigation();
  });
  await page.waitForTimeout(400);
  const after=await page.screenshot({scale:'css'});
  samples.push({stage:'after',samples:corners(after,test.rect)});
  for(const {stage,samples:points} of samples)for(const {x,y,rgba} of points){
    assert.equal(rgba[3],255,backend+' '+stage+' background opaque at '+x+','+y);
    for(let c=0;c<3;c++)assert.ok(Math.abs(rgba[c]-expected[c])<=2,backend+' '+stage+' mismatch at '+x+','+y+': '+rgba+' versus '+expected);
  }
  assert.deepEqual(errors,[],backend+' uncaught browser exception');
  await fs.writeFile(path.join(path.dirname(output),backend+'-moving.png'),moving);
  report.cases.push({backend,colors:test.colors,samples,errors,pass:true});
  await context.close();
 }
}finally{
 await fs.writeFile(output,JSON.stringify(report,null,2));
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
