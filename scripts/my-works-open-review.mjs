import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const outfile=process.env.MY_WORKS_EVIDENCE??'/tmp/my-works-evidence/report.json';
const report={status:'FAIL',commit:process.env.EXPECTED_COMMIT_SHA??'local',checks:[],times:{},errors:[]};
await fs.mkdir(path.dirname(outfile),{recursive:true});
const root=path.resolve('apps/editor/dist');
const server=http.createServer(async(request,response)=>{
  try{
    const url=decodeURIComponent((request.url??'/').split('?')[0]);
    const file=path.resolve(root,'.'+(url==='/'?'/index.html':url));
    if(!file.startsWith(root+path.sep))throw Error('Outside root');
    const bytes=await fs.readFile(file);
    response.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.json')?'application/json':'application/octet-stream');
    response.end(bytes);
  }catch{response.writeHead(404);response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
let context;
const check=(id,note)=>{report.checks.push({id,note});console.log('PASS '+id+' '+note);};
async function newWork(page,name,width,height){
  await page.locator('#ihStart').click();
  await page.locator('#ihNewName').fill(name);await page.locator('#ihNewWidth').fill(String(width));await page.locator('#ihNewHeight').fill(String(height));
  await page.locator('#ihNewCreate').click();await page.locator('#ihApp').waitFor({state:'hidden',timeout:90000});
  return page.locator('#canvas').getAttribute('data-document-id');
}
async function draw(page){
  const rect=await page.locator('#canvas').boundingBox();assert.ok(rect);
  await page.mouse.move(rect.x+rect.width*.35,rect.y+rect.height*.4);await page.mouse.down();
  await page.mouse.move(rect.x+rect.width*.64,rect.y+rect.height*.59,{steps:12});await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.committedStrokes==='1'&&document.querySelector('#canvas')?.dataset.historyBusy==='false',null,{timeout:90000});
}
async function showWorks(page){
  await page.locator('#home').click();await page.locator('#ihApp').waitFor({state:'visible',timeout:10000});
  await page.locator('#ihNavWorks').click();
}
async function waitPreview(page,id,timeout=90000){
  await page.waitForFunction(id=>{const img=document.querySelector('[data-work-id="'+id+'"] .ih-work-preview img');return img&&img.complete&&img.naturalWidth>0;},id,{timeout});
  return page.locator('[data-work-id="'+id+'"] .ih-work-preview img').evaluate(image=>({width:image.naturalWidth,height:image.naturalHeight}));
}
async function eraseThumbnail(page,id){
  return page.evaluate(id=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('illustro-work-library-v1');request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{const db=request.result,tx=db.transaction('works','readwrite'),store=tx.objectStore('works'),get=store.get(id);
      get.onsuccess=()=>{const entry=get.result;if(!entry){tx.abort();return;}store.put({...entry,thumbnail:null,thumbnailRevision:null});};
      tx.oncomplete=()=>{db.close();resolve(true);};tx.onabort=()=>reject(tx.error);
    };
  }),id);
}
try{
  const profile=await fs.mkdtemp('/tmp/my-works-profile-');
  context=await chromium.launchPersistentContext(profile,{headless:true,viewport:{width:1100,height:800},serviceWorkers:'block',acceptDownloads:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
  await context.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true}));
  let page=context.pages()[0]??await context.newPage();await page.goto(base+'?backend=webgl2#home');
  const id=await newWork(page,'MY WORKS QA 512',512,384);assert.ok(id);await draw(page);await showWorks(page);
  const preview=await waitPreview(page,id);assert.ok(preview.width<=320&&preview.height<=240);
  check('live-preview','512px current preview generated with real dimensions');
  // The projection checkpoint runs on idle; make sure it is durable before removing the thumbnail.
  await page.waitForTimeout(4000);await eraseThumbnail(page,id);await page.reload();await page.locator('#ihNavWorks').click();
  const repaired=await waitPreview(page,id,120000);assert.ok(repaired.width>0);
  check('cold-preview-repair','thumbnail reconstructed from saved tiles after browser reload');
  const start=Date.now();await page.locator('[data-work-id="'+id+'"] .ih-work-preview').click();await page.locator('#ihApp').waitFor({state:'hidden',timeout:90000});
  report.times.reopen512ms=Date.now()-start;
  assert.equal(await page.locator('#canvas').getAttribute('data-document-id'),id);
  assert.equal(await page.locator('#canvas').getAttribute('data-committed-strokes'),'1');
  // A downloaded portable work must embed its current verified gallery preview.
  const waitDownload=page.waitForEvent('download',{timeout:60000});await page.locator('#save').click();
  const exported=await waitDownload,bytes=await fs.readFile(await exported.path());
  const manifestLength=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(16,true);
  const manifest=JSON.parse(bytes.subarray(24,24+manifestLength).toString());
  assert.ok(manifest.sections.some(section=>section.id==='render-preview'&&section.type==='render.preview.png.v1'&&!section.required));
  check('portable-png-preview','downloaded .illustro includes an optional preview for the exact saved revision');
  await page.locator('#home').click();await page.locator('#ihApp').waitFor({state:'visible'});
  await page.locator('#ihNavHome').click();
  const large=await newWork(page,'MY WORKS QA 4000',4000,4000);assert.ok(large);
  await draw(page);await showWorks(page);
  await page.waitForFunction(()=>{const state=document.getElementById('saveState');return state?.dataset.autosavePending==='false'&&state.dataset.protectedThrough!=='0';},null,{timeout:90000});
  await page.waitForTimeout(3500); // let the sparse image checkpoint finish
  await page.reload();await page.locator('#ihNavWorks').click();
  await page.locator('[data-work-id="'+large+'"]').waitFor({timeout:45000});
  const startLarge=Date.now();await page.locator('[data-work-id="'+large+'"] .ih-work-preview').click();
  await page.locator('#ihApp').waitFor({state:'hidden',timeout:120000});
  report.times.reopen4000ms=Date.now()-startLarge;
  assert.equal(await page.locator('#canvas').getAttribute('data-document-id'),large);
  assert.equal(await page.locator('#canvas').getAttribute('data-committed-strokes'),'1');
  const savedRevision=await page.locator('#canvas').getAttribute('data-revision-id');
  await page.locator('#undo').click();
  await page.waitForFunction(original=>document.getElementById('canvas')?.dataset.revisionId!==original,savedRevision,{timeout:60000});
  await page.locator('#redo').click();
  await page.waitForFunction(original=>document.getElementById('canvas')?.dataset.revisionId===original,savedRevision,{timeout:60000});
  check('save-reopen-4000','4000px document remained editable with the exact saved stroke count');
  await page.locator('#home').click();await page.locator('#ihApp').waitFor({state:'visible'});await page.locator('#ihNavHome').click();
  const layers10=await newWork(page,'MY WORKS QA 4000 TEN LAYERS',4000,4000);
  for(let i=1;i<10;i++)await page.locator('#addLayer').click();
  assert.equal(await page.locator('#canvas').getAttribute('data-layer-count'),'10');
  await draw(page);await showWorks(page);
  await page.waitForFunction(()=>{const e=document.getElementById('saveState');return e?.dataset.autosavePending==='false'&&e.dataset.protectedThrough!=='0';},null,{timeout:120000});
  await page.waitForTimeout(4500);await page.reload();await page.locator('#ihNavWorks').click();
  await page.locator('[data-work-id="'+layers10+'"] .ih-work-preview').click();await page.locator('#ihApp').waitFor({state:'hidden',timeout:120000});
  assert.equal(await page.locator('#canvas').getAttribute('data-layer-count'),'10');
  assert.equal(await page.locator('#canvas').getAttribute('data-committed-strokes'),'1');
  check('reopen-4000-ten-layers','ten layer artwork survives a cold browser reload with its formal stroke');
  report.status='PASS';
}catch(error){report.errors.push(String(error?.stack??error));throw error;}
finally{await fs.writeFile(outfile,JSON.stringify(report,null,2));await context?.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
