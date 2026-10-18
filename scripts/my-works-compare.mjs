import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const file=process.env.MY_WORKS_COMPARISON??'/tmp/my-works-comparison.json',baseline=process.env.MY_WORKS_BASELINE;
if(!baseline)throw new Error('MY_WORKS_BASELINE must be an immutable built revision');
const report={baseline:'dbe053d32b4f172c84eb3b632b292e2ad4a20b57',after:process.env.EXPECTED_COMMIT_SHA??'local',cases:[],errors:[],note:'Measurements in software-GPU Chromium only; paired artworks use the same scripted brush inputs, not identical random seed.'};
const servers=[];let browser;
function serverFor(root){
  return new Promise(resolve=>{
    const server=http.createServer(async(request,response)=>{
      try{const pathname=decodeURIComponent((request.url??'/').split('?')[0]),file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
        if(!file.startsWith(root+path.sep))throw Error('out of root');const data=await fs.readFile(file);
        response.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html');response.end(data);
      }catch{response.writeHead(404);response.end();}
    });server.listen(0,'127.0.0.1',()=>{servers.push(server);resolve('http://127.0.0.1:'+server.address().port+'/');});
  });
}
const median=values=>{const s=[...values].sort((a,b)=>a-b);return s[Math.floor(s.length/2)];};
async function buildArtwork(page,width,height,layerCount){
  await page.locator('#ihStart').click();await page.locator('#ihNewWidth').fill(String(width));await page.locator('#ihNewHeight').fill(String(height));
  await page.locator('#ihNewCreate').click();await page.locator('#ihApp').waitFor({state:'hidden',timeout:120000});
  for(let i=1;i<layerCount;i++)await page.locator('#addLayer').click();
  const id=await page.locator('#canvas').getAttribute('data-document-id'),box=await page.locator('#canvas').boundingBox();assert.ok(id&&box);
  for(let stroke=0;stroke<8;stroke++){
    const y=box.y+box.height*(.3+stroke*.04);await page.mouse.move(box.x+box.width*.25,y);await page.mouse.down();
    await page.mouse.move(box.x+box.width*.72,y+6,{steps:8});await page.mouse.up();
    await page.waitForFunction(n=>document.getElementById('canvas')?.dataset.committedStrokes===String(n)&&document.getElementById('canvas')?.dataset.historyBusy==='false',stroke+1,{timeout:80000});
  }
  await page.locator('#home').click();await page.locator('#ihApp').waitFor({state:'visible',timeout:30000});
  await page.waitForFunction(()=>{const s=document.getElementById('saveState');return s?.dataset.autosavePending==='false'&&s?.dataset.protectedThrough!=='0';},null,{timeout:90000});
  await page.waitForTimeout(4000);return id;
}
async function measure(base,size,layerCount){
  const context=await browser.newContext({viewport:{width:1150,height:850},serviceWorkers:'block'});const page=await context.newPage();
  try{
    await page.goto(base+'?backend=webgl2#home');const id=await buildArtwork(page,size,size,layerCount),times=[],memory=[];
    for(let i=0;i<3;i++){
      await page.reload();await page.locator('#ihNavWorks').click();await page.locator('[data-work-id="'+id+'"] .ih-work-preview').waitFor({timeout:80000});
      const start=performance.now();await page.locator('[data-work-id="'+id+'"] .ih-work-preview').click();
      await page.locator('#ihApp').waitFor({state:'hidden',timeout:120000});
      times.push(Math.round(performance.now()-start));
      assert.equal(await page.locator('#canvas').getAttribute('data-document-id'),id);
      assert.equal(await page.locator('#canvas').getAttribute('data-committed-strokes'),'8');
      const bytes=await page.evaluate(()=>performance.memory?.usedJSHeapSize??null);memory.push(bytes);
      await page.locator('#home').click();await page.locator('#ihApp').waitFor({state:'visible',timeout:10000});
    }
    return {times,medianMs:median(times),heapBytes:memory};
  }finally{await context.close();}
}
try{
  const [beforeUrl,afterUrl]=await Promise.all([serverFor(path.resolve(baseline)),serverFor(path.resolve('apps/editor/dist'))]);
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-precise-memory-info','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
  for(const [size,layers] of [[512,1],[2048,3],[4000,3]]){
    const before=await measure(beforeUrl,size,layers),after=await measure(afterUrl,size,layers);
    const measured={size,layers,before,after,ratio:Math.round((after.medianMs/before.medianMs)*100)/100};
    report.cases.push(measured);console.log('MEASURE '+JSON.stringify(measured));
  }
}catch(error){report.errors.push(String(error?.stack??error));throw error;}
finally{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(report,null,2));await browser?.close();await Promise.all(servers.map(s=>new Promise(resolve=>s.close(resolve))));}
