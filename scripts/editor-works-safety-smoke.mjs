import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const evidence=process.env.HOME_EVIDENCE_DIRECTORY??'/tmp/illustro-works',publicBase=process.env.HOME_PUBLIC_URL??'';
await fs.mkdir(evidence,{recursive:true});let server,base=publicBase;
if(!base){const root=path.resolve('apps/editor/dist');server=http.createServer(async(req,res)=>{try{const name=decodeURIComponent((req.url??'/').split('?')[0]),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+'/'))throw Error();const bytes=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(bytes);}catch{res.writeHead(404);res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port+'/';}
const launch={headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']};
const report={tests:[],errors:[],commit:process.env.EXPECTED_COMMIT_SHA??'local',mode:publicBase?'public':'local'};const record=(name,extra={})=>{report.tests.push({name,status:'PASS',...extra});console.log('PASS '+name);};
const errors=[];let browser;
const state=page=>page.locator('#canvas').evaluate(c=>({...c.dataset,width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight,dpr:devicePixelRatio,view:JSON.parse(c.dataset.view??'null')}));
async function create(page,name,width=512,height=384,background='transparent'){await page.locator('#ihStart').click();await page.locator('#ihNewName').fill(name);await page.locator('#ihNewWidth').fill(String(width));await page.locator('#ihNewHeight').fill(String(height));await page.locator('#ihNewBackground').selectOption(background);await page.locator('#ihNewCreate').click();await page.locator('#ihApp').waitFor({state:'hidden',timeout:45000});return state(page);}
async function draw(page,n=1){const box=await page.locator('#canvas').boundingBox();assert.ok(box);await page.mouse.move(box.x+box.width*.4,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.x+box.width*.58,box.y+box.height*.56,{steps:9});await page.mouse.up();await page.waitForFunction(count=>document.getElementById('canvas').dataset.committedStrokes===String(count)&&document.getElementById('canvas').dataset.historyBusy==='false',n,{timeout:45000});}
async function home(page){await page.locator('#home').click();await page.locator('#ihApp').waitFor({state:'visible',timeout:45000});}
async function works(page,n){await page.locator('#ihNavWorks').click();await page.waitForFunction(count=>document.querySelectorAll('.ih-work-card').length===count,n,{timeout:15000});}
async function open(page,id){await page.locator('[data-work-id="'+id+'"] .ih-work-preview').click();await page.locator('#ihApp').waitFor({state:'hidden',timeout:45000});}
async function download(page,action){const wait=page.waitForEvent('download',{timeout:45000});await action();const d=await wait;return {name:d.suggestedFilename(),buffer:await fs.readFile(await d.path())};}
try{
 browser=await chromium.launch(launch);
 const profile=await fs.mkdtemp('/tmp/illustro-profile-');
 let persistent=await chromium.launchPersistentContext(profile,{...launch,viewport:{width:1024,height:768}}),page=await persistent.newPage();
 await page.goto(base+'?backend=webgl2');const saved=await create(page,'ブラウザ再起動');await draw(page);await home(page);
  // Home is intentionally immediate. Persistence is independently confirmed before a simulated clean browser exit.
  await page.waitForFunction(()=>{const el=document.getElementById('saveState');return el?.dataset.autosavePending==='false'&&el.dataset.protectedThrough!=='0'&&el.textContent.includes('保存済み');},{timeout:30000});
  await persistent.close();
 persistent=await chromium.launchPersistentContext(profile,{...launch,viewport:{width:1024,height:768}});page=await persistent.newPage();await page.goto(base+'?backend=webgl2');await page.locator('#ihContinue').click();await page.locator('#ihApp').waitFor({state:'hidden'});assert.equal((await state(page)).documentId,saved.documentId);assert.equal((await state(page)).committedStrokes,'1');await persistent.close();record('BROWSER-PROCESS-RESTART');
 const context=await browser.newContext({viewport:{width:1200,height:900},serviceWorkers:'block',acceptDownloads:true});await context.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true}));
 await context.route('**/assets/persistence.worker-*.js',async route=>{const response=await route.fetch(),source=await response.text();
 const prefix=`Object.defineProperty(navigator.storage,'getDirectory',{value:async()=>{throw new Error('OPFS disabled for fallback test');}});let testFail=false;const bc=new BroadcastChannel('illustro-test-fault');bc.onmessage=e=>{testFail=e.data===true;bc.postMessage('ready');};const originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){const request=originalPut.apply(this,args);if(testFail&&this.name==='works')this.transaction.abort();return request;};`;
 await route.fulfill({response,body:prefix+source});});
 page=await context.newPage();page.on('dialog',d=>d.accept());await page.goto(base+'?backend=webgl2');const a=await create(page,'失敗を検査');await draw(page);await home(page);await works(page,1);await open(page,a.documentId);const revision=(await state(page)).revisionId;
 async function fault(value){await page.evaluate(value=>new Promise(resolve=>{const c=new BroadcastChannel('illustro-test-fault');c.onmessage=e=>{if(e.data==='ready'){c.close();resolve();}};c.postMessage(value);}),value);}
 await fault(true);await draw(page,2);await page.waitForFunction(()=>document.getElementById('saveState').textContent.includes('保存できません'),{timeout:15000});
 const catalog=await page.evaluate(()=>new Promise(resolve=>{const request=indexedDB.open('illustro-work-library-v1');request.onsuccess=()=>{const tx=request.result.transaction('works'),r=tx.objectStore('works').getAll();r.onsuccess=()=>resolve(r.result.map(x=>({revision:x.revisionId})));};}));assert.equal(catalog[0].revision,revision,'failed publication retains prior verified artwork');
 await page.locator('#home').click();await page.locator('#ihApp').waitFor({state:'visible',timeout:2000});
  // Navigation remains fast even if a save failed. But creating/switching artwork must fail safely.
  await page.locator('#ihStart').click();await page.locator('#ihNewCreate').click();
  await page.waitForFunction(()=>document.getElementById('ihNewError').textContent.includes('作成できません')||document.getElementById('ihNotice').textContent.includes('保存できません'),{timeout:20000});
  assert.equal(await page.locator('#ihApp').isVisible(),true,'failed save prevents destructive artwork replacement');
  await page.locator('#ihNewCancel').click();await page.locator('#ihReturnEditor').click();
  assert.equal((await state(page)).documentId,a.documentId,'failed save keeps active artwork available');
 await fault(false);
  // The save queue may automatically recover when the fault is lifted; retry only if needed.
  await page.waitForFunction(()=>document.getElementById('retryWorkSave')?.hidden===false||document.getElementById('saveState')?.textContent.includes('保存済み'),null,{timeout:20000});
  if(await page.locator('#retryWorkSave').isVisible())await page.locator('#retryWorkSave').click();
  await page.waitForFunction(()=>document.getElementById('saveState').textContent.includes('保存済み')&&document.getElementById('saveState').dataset.autosavePending==='false',null,{timeout:20000});await home(page);await works(page,1);await open(page,a.documentId);assert.equal((await state(page)).committedStrokes,'2');record('INDEXEDDB-FALLBACK-QUOTA-FAILURE-RETRY-PREVIOUS-INTACT');
 await home(page);await page.locator('#ihNavHome').click();const white=await create(page,'白い背景',128,96,'white');await draw(page);const output=await download(page,async()=>{await page.evaluate(()=>document.getElementById('exportImage').click());await page.locator('#exportFormat').selectOption('png');await page.locator('#exportRun').click();});
 const pixel=await page.evaluate(async bytes=>{const b=await createImageBitmap(new Blob([new Uint8Array(bytes)])),c=new OffscreenCanvas(b.width,b.height),ctx=c.getContext('2d');ctx.drawImage(b,0,0);b.close();return Array.from(ctx.getImageData(1,1,1,1).data);},Array.from(output.buffer));assert.deepEqual(pixel,[255,255,255,255]);await home(page);await page.reload();await works(page,2);await open(page,white.documentId);assert.equal((await state(page)).layerCount,'2');record('BACKGROUND-REAL-RASTER-SAVE-REOPEN-EXPORT');
 await context.close();
}catch(error){report.errors.push(String(error.stack??error));throw error;}finally{await fs.writeFile(path.join(evidence,'safety-report.json'),JSON.stringify(report,null,2));await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
