import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const {PNG}=require(process.env.RT_PNG_PATH??'pngjs');
const root=path.resolve('apps/editor/dist');
const evidence=process.env.PREVIEW_ALPHA_EVIDENCE??'/tmp/illustro-preview-alpha/report.json';
await fs.mkdir(path.dirname(evidence),{recursive:true});
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep))throw Error('Outside app root');
  const data=await fs.readFile(file);
  res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');
  res.end(data);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const results=[];
function blackCover(before,after,rect){
 const a=PNG.sync.read(before),b=PNG.sync.read(after);
 assert.equal(a.width,b.width);assert.equal(a.height,b.height);
 const left=Math.max(0,Math.ceil(rect.x+5)),top=Math.max(0,Math.ceil(rect.y+5)),right=Math.min(a.width,Math.floor(rect.x+rect.width-5)),bottom=Math.min(a.height,Math.floor(rect.y+rect.height-5));
 let white=0,black=0;
 for(let y=top;y<bottom;y+=2)for(let x=left;x<right;x+=2){
  const i=(y*a.width+x)*4;
  if(a.data[i]<245||a.data[i+1]<245||a.data[i+2]<245)continue;
  white++;
  if(b.data[i]<48&&b.data[i+1]<48&&b.data[i+2]<48)black++;
 }
 return {white,black,rate:white?black/white:null};
}
try{
 for(const backend of ['webgl2','webgpu']){
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/?qa=1&perf=1&backend='+backend+'&overlay=cpu');
  await page.evaluate(()=>{
   document.getElementById('newCanvasWidth').value='4000';
   document.getElementById('newCanvasHeight').value='4000';
   document.getElementById('new').click();
  });
  await page.waitForFunction(()=>document.getElementById('status')?.textContent?.includes('描画できます'),null,{timeout:90000});
  await page.evaluate(()=>{
   document.getElementById('finger').checked=true;
   document.getElementById('finger').dispatchEvent(new Event('change'));
   const brush=document.getElementById('brush');brush.value='foundation-g-pen';brush.dispatchEvent(new Event('change'));
   const size=document.getElementById('size');size.value='32';size.dispatchEvent(new Event('input'));
   const hex=document.getElementById('colorHex');hex.value='#FF57DA';hex.dispatchEvent(new Event('input'));hex.dispatchEvent(new Event('change'));
  });
  const inspect=await page.evaluate(()=>window.__illustroPerformance.probe().renderer.call('inspect'));
  assert.ok(inspect,'drawing diagnostics available');
  const rect=await page.locator('#canvas').evaluate(node=>{const r=node.parentElement.getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height};});
  const baseline=await page.screenshot({scale:'css'});
  const cdp=await context.newCDPSession(page);
  const point=(x,y)=>({x:rect.x+rect.width*x,y:rect.y+rect.height*y,id:9,radiusX:1,radiusY:1,force:.8});
  await page.evaluate(()=>window.__illustroPerformance.probe().renderer.call('gate','formal'));
  let held=false;
  try{
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(.22,.35)]});
   const outline=[[.75,.35],[.75,.67],[.25,.67]];
   let x=.22,y=.35;
   for(const [nx,ny] of outline){
    for(let step=1;step<=18;step++){
     const t=step/18;
     await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(x+(nx-x)*t,y+(ny-y)*t)]});
    }
    x=nx;y=ny;
   }
   await page.waitForFunction(()=>{
    return [...document.querySelectorAll('canvas.illustro-stroke-overlay')].some(c=>c.width>64&&c.height>64&&c.style.display!=='none');
   },null,{timeout:45000});
   const pre=await page.evaluate(()=>{
    const canvases=[...document.querySelectorAll('canvas.illustro-stroke-overlay')].filter(c=>c.style.display!=='none'&&c.width>64&&c.height>64);
    const c=canvases.at(-1),data=c.getContext('2d',{alpha:true})?.getImageData(0,0,c.width,c.height).data;
    let opaque=0,transparent=0;
    if(data)for(let i=3;i<data.length;i+=4){if(data[i])opaque++;else transparent++;}
    return {canvasCount:canvases.length,opaque,transparent,rect:(()=>{const r=c.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()};
   });
   assert.ok(pre.opaque>10,'preview has actual ink');
   assert.ok(pre.transparent>100,'preview source keeps transparent pixels');
   const during=await page.screenshot({scale:'css'});
   const duringBlack=blackCover(baseline,during,pre.rect);
   assert.ok(duringBlack.white>400,'at least 400 reference white pixels in preview box');
   assert.equal(duringBlack.black,0,'transparent preview must not turn white paper into a black rectangle');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForFunction(async()=>{const state=await window.__illustroPerformance.probe().renderer.call('inspect');return state.gates.held==='formal';},null,{timeout:60000});
   held=true;
   const pending=await page.screenshot({scale:'css'}),pendingBlack=blackCover(baseline,pending,pre.rect);
   assert.equal(pendingBlack.black,0,'no black rectangle during pending formal GPU completion');
   await fs.writeFile(path.join(path.dirname(evidence),backend+'-pending.png'),pending);
   results.push({backend,source:pre,duringBlack,pendingBlack,held,errors});
   assert.deepEqual(errors,[],'no browser exceptions');
  }finally{
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}).catch(()=>{});
   await page.evaluate(()=>window.__illustroPerformance.probe().renderer.call('gate',false)).catch(()=>{});
  }
  await context.close();
 }
}finally{
 await fs.writeFile(evidence,JSON.stringify({revision:process.env.EXPECTED_COMMIT_SHA??'working-tree',results},null,2));
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
