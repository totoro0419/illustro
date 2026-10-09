import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const publicBase=(process.env.M06_PUBLIC_URL??'').trim();
const expectedCommit=(process.env.EXPECTED_COMMIT_SHA??'').trim();
const evidence=path.resolve(process.env.M06_EVIDENCE_DIRECTORY??'/tmp/illustro-m06');
await fs.mkdir(evidence,{recursive:true});
let server=null,base=publicBase;
if(!publicBase){
  const root=path.resolve(import.meta.dirname,'../apps/editor/dist');
  server=http.createServer(async(req,res)=>{
    try{
      const name=decodeURIComponent((req.url??'/').split('?')[0]);
      const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
      if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
      const data=await fs.readFile(file),ext=path.extname(file);
      res.setHeader('Content-Type',ext==='.js'||ext==='.mjs'?'text/javascript':ext==='.css'?'text/css':ext==='.html'?'text/html; charset=utf-8':ext==='.json'?'application/json':'application/octet-stream');
      if(file.endsWith('sw.js'))res.setHeader('Cache-Control','no-store');
      res.end(data);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base='http://127.0.0.1:'+server.address().port+'/';
}
const report={milestone:'M06',mode:publicBase?'public':'local',base,status:'FAIL',backends:[],fixedPages:[],errors:[]};
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface']});
const qa=async page=>JSON.parse((await page.locator('#qaAuto').textContent())??'{}');
async function draw(page,a,b,steps=18){
  const box=await page.locator('#canvas').boundingBox();assert.ok(box);
  await page.mouse.move(box.x+a[0]*box.width,box.y+a[1]*box.height);
  await page.mouse.down();await page.mouse.move(box.x+b[0]*box.width,box.y+b[1]*box.height,{steps});await page.mouse.up();
}
async function waitStroke(page,n){await page.waitForFunction(count=>document.querySelector('canvas')?.dataset.committedStrokes===String(count)&&document.querySelector('canvas')?.dataset.historyBusy==='false',n,{timeout:45000});}
function validFormat(data,format){
  if(format==='png')assert.deepEqual([...data.slice(0,8)],[137,80,78,71,13,10,26,10]);
  else if(format==='jpeg')assert.ok(data[0]===255&&data[1]===216&&data[2]===255);
  else assert.ok(data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP');
}
async function exportOne(page,format,quality=90){
  await page.locator('#exportImage').click();
  await page.locator('#exportFormat').selectOption(format);
  if(format!=='png')await page.locator('#exportQuality').fill(String(quality));
  const promise=page.waitForEvent('download',{timeout:120000});
  await page.locator('#exportRun').click();
  const download=await promise;
  const file=await download.path();assert.ok(file);
  const data=await fs.readFile(file);validFormat(data,format);
  assert.ok(download.suggestedFilename().endsWith(format==='jpeg'?'.jpg':'.'+format));
  await page.waitForFunction(n=>JSON.parse(document.getElementById('qaAuto')?.textContent??'{}').export.count>=n,1,{timeout:45000});
  const meta=await qa(page);
  assert.equal(meta.export.last.mime,'image/'+format);
  assert.equal(meta.export.last.width,512);assert.equal(meta.export.last.height,384);
  assert.ok(meta.export.last.encodeMs>=0);
  await fs.writeFile(path.join(evidence,format+'-'+quality+'-'+meta.backend+'.'+(format==='jpeg'?'jpg':format)),data);
  return {data,meta,filename:download.suggestedFilename()};
}
async function pixels(page,data){
  const image=await page.evaluate(async(base64)=>{
    const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
    const bitmap=await createImageBitmap(new Blob([bytes]));
    const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);
    const at=(x,y)=>[...ctx.getImageData(x,y,1,1).data];
    const result={width:bitmap.width,height:bitmap.height,corner:at(0,0),first:at(160,96),second:at(90,211),erased:at(256,211)};
    bitmap.close();return result;
  },data.toString('base64'));
  assert.equal(image.width,512);assert.equal(image.height,384);
  return image;
}
try{
  for(const backend of ['webgl2','webgpu']){
    const context=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:900}});
    await context.addInitScript(()=>{try{Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true});}catch{}});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(base+(publicBase?'?backend='+backend+'&build='+expectedCommit:'?qa=1&backend='+backend),{waitUntil:'networkidle',timeout:45000});
    if(await page.locator('#qaPanel').count())await page.locator('#qaPanel').evaluate(el=>{el.open=false;});
    await page.locator('#new').click();await page.waitForFunction(()=>!document.getElementById('brush')?.disabled,{timeout:45000});
    const info=await qa(page);assert.equal(info.milestone,'M06');assert.equal(info.backendSelection.selected,backend);if(expectedCommit)assert.equal(info.commit,expectedCommit);
    await draw(page,[.15,.25],[.85,.25]);await waitStroke(page,1);
    await page.locator('#addLayer').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.layerCount==='2');
    await draw(page,[.15,.55],[.85,.55]);await waitStroke(page,2);
    await page.locator('#erase').click();await draw(page,[.43,.55],[.57,.55],12);await waitStroke(page,3);
    const before=await qa(page),rev=before.currentRevision,seq=before.commitSequence;
    const png=await exportOne(page,'png'),pngPixels=await pixels(page,png.data);
    console.log('M06 PNG diagnostics',JSON.stringify({backend,info:(await qa(page)).layers,pngPixels,revision:rev}));
    console.log('M06 PNG alpha probes',JSON.stringify(await page.evaluate(async b64=>{const b=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)),bitmap=await createImageBitmap(new Blob([b]));const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(bitmap,0,0);const out={};for(const y of [90,95,96,97,100,190,200,210,211,212,218,225,245])out[y]=[90,160,256,350].map(p=>[...x.getImageData(p,y,1,1).data]);bitmap.close();return out;},png.data.toString('base64'))));
    assert.equal(pngPixels.corner[3],0,'PNG presentation white leaked into transparent artwork');
    assert.ok(pngPixels.first[3]>0,'first formal layer missing');
    assert.ok(pngPixels.second[3]>0,'second formal layer missing');
    assert.ok(pngPixels.erased[3]<pngPixels.second[3],'eraser did not affect image alpha');
    const jpeg=await exportOne(page,'jpeg',82),jpegPixels=await pixels(page,jpeg.data);
    assert.ok(jpegPixels.corner.slice(0,3).every(n=>n>245),'JPEG transparency matte unexpectedly dark');
    assert.equal(jpegPixels.corner[3],255);
    const jpegLow=await exportOne(page,'jpeg',25);assert.notEqual(jpegLow.data.toString('base64'),jpeg.data.toString('base64'),'JPEG quality ignored');
    const webp=await exportOne(page,'webp',90),webpPixels=await pixels(page,webp.data);
    assert.equal(webpPixels.corner[3],0,'WebP missing alpha');assert.ok(webpPixels.first[3]>0);
    const webpLow=await exportOne(page,'webp',30);assert.notEqual(webpLow.data.toString('base64'),webp.data.toString('base64'),'WebP quality ignored');
    const after=await qa(page);
    assert.equal(after.currentRevision,rev);assert.equal(after.commitSequence,seq);
    assert.equal(after.persistence.savedRevision,before.persistence.savedRevision);
    assert.equal(after.persistence.dirty,before.persistence.dirty);
    await page.locator('#paint').click();await draw(page,[.15,.75],[.85,.75]);await waitStroke(page,4);
    const added=await qa(page);assert.notEqual(added.currentRevision,rev);
    await page.locator('#undo').click();await page.waitForFunction(s=>document.querySelector('canvas')?.dataset.revisionId===s,rev,{timeout:30000});
    await page.locator('#redo').click();await page.waitForFunction(s=>document.querySelector('canvas')?.dataset.revisionId===s,added.currentRevision,{timeout:30000});
    // All three exporters run locally even when network access is unavailable.
    await context.setOffline(true);
    for(const format of ['png','jpeg','webp'])await exportOne(page,format,80);
    await context.setOffline(false);
    assert.deepEqual(errors,[],'browser console errors');
    report.backends.push({backend,status:'PASS',revision:rev,png:pngPixels,jpeg:jpegPixels,webp:webpPixels,qualityChanged:true,offlineFormats:['png','jpeg','webp'],unchangedSaveState:true,undoRedo:true,encodeMs:png.meta.export.last.encodeMs,estimatedPeakBytes:png.meta.export.last.estimatedPeakBytes,consoleErrors:errors});
    await context.close();
  }
  report.status='PASS';
}catch(error){report.failure=String(error?.stack??error);throw error;}
finally{await fs.writeFile(path.join(evidence,'report.json'),JSON.stringify(report,null,2));await browser.close();if(server)server.close();console.log(JSON.stringify(report,null,2));}
