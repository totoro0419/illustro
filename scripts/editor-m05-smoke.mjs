import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const publicBase=(process.env.M05_PUBLIC_URL??'').trim();
const expectedCommit=(process.env.EXPECTED_COMMIT_SHA??'').trim();
const evidence=path.resolve(process.env.M05_EVIDENCE_DIRECTORY??'/tmp/illustro-m05');
await fs.mkdir(evidence,{recursive:true});

let server=null,base=publicBase;
if(!publicBase){
  const root=path.resolve(import.meta.dirname,'../apps/editor/dist');
  server=http.createServer(async(req,res)=>{
    try{
      const pathname=decodeURIComponent((req.url??'/').split('?')[0]);
      const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
      if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
      const data=await fs.readFile(file);
      const type=file.endsWith('.js')||file.endsWith('.mjs')?'text/javascript':
        file.endsWith('.css')?'text/css':
        file.endsWith('.html')?'text/html; charset=utf-8':
        file.endsWith('.webmanifest')||file.endsWith('.json')?'application/manifest+json':
        'application/octet-stream';
      res.setHeader('Content-Type',type);
      if(file.endsWith('/sw.js')||file.endsWith('sw.js'))res.setHeader('Cache-Control','no-store');
      res.end(data);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base=`http://127.0.0.1:${server.address().port}/`;
}

const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface']});
const report={milestone:'M05',mode:publicBase?'public':'local',url:base,status:'FAIL',backends:[],recovery:null,gap:null,lastGood:null,offline:null};

function pageUrl(backend='webgl2'){const suffix=publicBase?`?backend=${backend}&build=${encodeURIComponent(expectedCommit)}&m05-public-check=1`:`?qa=1&backend=${backend}`;return base+suffix;}
async function qa(page){return JSON.parse((await page.locator('#qaAuto').textContent())??'{}');}
async function waitReady(page){await page.waitForFunction(()=>!(document.getElementById('brush')?.disabled),{timeout:45000});}
async function waitIdle(page){await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.historyBusy==='false',{timeout:15000});}
async function waitStroke(page,count){await page.waitForFunction(n=>document.querySelector('canvas')?.dataset.committedStrokes===String(n),count,{timeout:20000});await waitIdle(page);}
async function waitProtected(page,min){await page.waitForFunction(n=>{try{const raw=document.querySelector('#qaAuto')?.textContent;if(!raw)return false;const p=JSON.parse(raw).persistence;return BigInt(p?.protectedThrough??'0')>=BigInt(n)&&p?.queueLength===0&&!p?.protectionPending&&!p?.storageError;}catch{return false;}},String(min),{timeout:30000});}
async function draw(page,a=[.16,.35],b=[.84,.35],steps=20){const canvas=page.locator('#canvas'),box=await canvas.boundingBox();assert.ok(box);await page.mouse.move(box.x+a[0]*box.width,box.y+a[1]*box.height);await page.mouse.down();await page.mouse.move(box.x+b[0]*box.width,box.y+b[1]*box.height,{steps});await page.mouse.up();}
async function freshContext(){const context=await browser.newContext({acceptDownloads:true});await context.addInitScript(()=>{try{Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true});}catch{}});return context;}
async function init(page,backend='webgl2'){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(pageUrl(backend),{waitUntil:'networkidle',timeout:45000});
  const qaPanel=page.locator('#qaPanel');if(await qaPanel.count())await qaPanel.evaluate(el=>{el.open=false;});
  await page.getByRole('button',{name:'新規キャンバス',exact:true}).click();await waitReady(page);
  const state=await qa(page);assert.equal(state.milestone,'M05');assert.equal(state.backendSelection.requested,backend);assert.equal(state.backendSelection.selected,backend);assert.equal(state.backendSelection.fallbackUsed,false);if(expectedCommit)assert.equal(state.commit,expectedCommit);
  assert.match(state.persistence.backend,/^opfs-(sync|async)$/,'Chromium M05 did not use OPFS Working Store');
  return errors;
}
async function saveDownload(page){
  const [download]=await Promise.all([page.waitForEvent('download',{timeout:30000}),page.locator('#save').click()]);
  const filePath=await download.path();assert.ok(filePath);await page.waitForFunction(()=>document.getElementById('saveState')?.dataset.saving==='false',{timeout:30000});
  return {download,filePath};
}
async function removeOpfsEntry(page,doc,epoch,relative){
  await page.evaluate(async({doc,epoch,relative})=>{
    let dir=await navigator.storage.getDirectory();
    for(const name of ['m05','sessions',doc,epoch])dir=await dir.getDirectoryHandle(name);
    const parts=relative.split('/'),name=parts.pop();if(!name)throw new Error('bad test path');
    for(const part of parts)dir=await dir.getDirectoryHandle(part);
    await dir.removeEntry(name);
  },{doc,epoch,relative});
}
async function corruptOpfsFile(page,doc,epoch,relative){
  await page.evaluate(async({doc,epoch,relative})=>{
    let dir=await navigator.storage.getDirectory();
    for(const name of ['m05','sessions',doc,epoch])dir=await dir.getDirectoryHandle(name);
    const parts=relative.split('/'),name=parts.pop();if(!name)throw new Error('bad test path');
    for(const part of parts)dir=await dir.getDirectoryHandle(part);
    const file=await dir.getFileHandle(name),w=await file.createWritable();await w.write(new Uint8Array([0,1,2,3]));await w.truncate(4);await w.close();
  },{doc,epoch,relative});
}

try{
  for(const backend of ['webgl2','webgpu']){
    const context=await freshContext(),page=await context.newPage({viewport:{width:1280,height:900}}),errors=await init(page,backend);
    await draw(page,[.12,.28],[.82,.28]);await waitStroke(page,1);
    await page.locator('#addLayer').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.layerCount==='2');
    await draw(page,[.12,.52],[.82,.52]);await waitStroke(page,2);
    await page.locator('#erase').click();await page.locator('#brush').selectOption('foundation-hard-eraser');await draw(page,[.43,.52],[.57,.52],10);await waitStroke(page,3);
    await waitProtected(page,4);
    const beforeSave=await qa(page),savedRevision=beforeSave.currentRevision;
    const saved=await saveDownload(page),afterSave=await qa(page);assert.equal(afterSave.persistence.savedRevision,savedRevision);assert.equal(afterSave.persistence.dirty,false);assert.equal(afterSave.persistence.lastGood,true);
    await fs.copyFile(saved.filePath,path.join(evidence,`${backend}-roundtrip.illustro`));
    await page.locator('#paint').click();await draw(page,[.15,.72],[.85,.72]);await waitStroke(page,4);
    const changed=await qa(page);assert.equal(changed.persistence.savedRevision,savedRevision);assert.notEqual(changed.currentRevision,savedRevision);assert.equal(changed.persistence.dirty,true);assert.match(await page.locator('#saveState').textContent(),/保存後の変更あり/);
    await page.locator('#reloadSaved').click();await page.waitForFunction(()=>{const text=document.querySelector('#status')?.textContent??'';return text.includes('最後に正常保存できた状態を開き直しました')||text.includes('保存版を開き直せませんでした');},{timeout:30000});await waitReady(page);
    const reloaded=await qa(page),reloadStatus=await page.locator('#status').textContent();await fs.writeFile(path.join(evidence,`${backend}-reload-debug.json`),JSON.stringify({savedRevision,reloadStatus,reloaded},null,2));assert.match(reloadStatus??'',/最後に正常保存できた状態を開き直しました/);assert.equal(reloaded.currentRevision,savedRevision);assert.equal(reloaded.persistence.savedRevision,savedRevision);assert.equal(reloaded.layerCount,2);assert.equal(reloaded.totalStrokeCount,3);assert.equal(reloaded.persistence.dirty,false);
    await page.locator('#openFile').setInputFiles(saved.filePath);await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('保存した作品を開きました'),{timeout:30000});await waitReady(page);
    const opened=await qa(page);assert.equal(opened.currentRevision,savedRevision);assert.equal(opened.layerCount,2);assert.equal(opened.totalStrokeCount,3);assert.deepEqual(errors,[]);
    report.backends.push({backend,status:'PASS',opfs:opened.persistence.backend,roundTrip:true,snapshotIsolation:true,saveDurationMs:afterSave.persistence.saveDurationMs,snapshotCaptureMs:afterSave.persistence.snapshotCaptureMs});
    await page.screenshot({path:path.join(evidence,`${backend}-m05.png`),fullPage:true});await context.close();
  }

  // Crash/reload equivalent: recover the last fully protected sequence from OPFS.
  {
    const context=await freshContext(),page=await context.newPage({viewport:{width:1100,height:800}}),errors=await init(page);
    await draw(page,[.15,.25],[.80,.25]);await waitStroke(page,1);await draw(page,[.15,.45],[.80,.45]);await waitStroke(page,2);await draw(page,[.15,.65],[.80,.65]);await waitStroke(page,3);await waitProtected(page,3);
    const before=await qa(page),doc=before.documentId,head=before.currentRevision;await page.close();
    const restoredPage=await context.newPage({viewport:{width:1100,height:800}});restoredPage.on('pageerror',e=>errors.push(e.message));await restoredPage.goto(pageUrl(),{waitUntil:'networkidle',timeout:45000});
    await restoredPage.waitForFunction(()=>!(document.getElementById('recover')?.disabled),{timeout:30000});await restoredPage.locator('#recover').click();await restoredPage.waitForFunction(()=>{const text=document.querySelector('#status')?.textContent??'';return text.includes('作業途中の保護状態から戻しました')||text.includes('作業途中の状態を戻せませんでした');},{timeout:30000});await waitReady(restoredPage);
    const recovered=await qa(restoredPage);assert.equal(recovered.documentId,doc);assert.equal(recovered.currentRevision,head);assert.equal(recovered.persistence.recovered,true);assert.equal(recovered.totalStrokeCount,3);assert.deepEqual(errors,[]);
    report.recovery={status:'PASS',protectedThrough:before.persistence.protectedThrough,recoveredRevision:recovered.currentRevision,durationMs:recovered.persistence.recoveryDurationMs};await context.close();
  }

  // Missing sequence 2 must stop protection at sequence 1; sequence 3 cannot be skipped over.
  {
    const context=await freshContext(),page=await context.newPage({viewport:{width:1000,height:760}});await init(page);
    await draw(page,[.12,.25],[.82,.25]);await waitStroke(page,1);await draw(page,[.12,.50],[.82,.50]);await waitStroke(page,2);await draw(page,[.12,.75],[.82,.75]);await waitStroke(page,3);await waitProtected(page,3);
    const state=await qa(page),doc=state.documentId,epoch=state.writerEpoch;await removeOpfsEntry(page,doc,epoch,'commits/00000000000000000002.frame');await page.close();
    const restoredPage=await context.newPage({viewport:{width:1000,height:760}});await restoredPage.goto(pageUrl(),{waitUntil:'networkidle',timeout:45000});await restoredPage.waitForFunction(()=>!(document.getElementById('recover')?.disabled),{timeout:30000});await restoredPage.locator('#recover').click();await restoredPage.waitForFunction(()=>{const text=document.querySelector('#status')?.textContent??'';return text.includes('作業途中の保護状態から戻しました')||text.includes('作業途中の状態を戻せませんでした');},{timeout:30000});await waitReady(restoredPage);
    const recovered=await qa(restoredPage);assert.equal(recovered.totalStrokeCount,1);assert.equal(recovered.persistence.recovered,true);
    report.gap={status:'PASS',deletedSequence:2,recoveredStrokeCount:1};await context.close();
  }

  // A corrupted Last Good must not replace a valid Previous Good.
  {
    const context=await freshContext(),page=await context.newPage({viewport:{width:1000,height:760}});await init(page);
    await draw(page,[.15,.30],[.85,.30]);await waitStroke(page,1);await waitProtected(page,1);const saveA=await saveDownload(page);void saveA;
    await draw(page,[.15,.60],[.85,.60]);await waitStroke(page,2);await waitProtected(page,2);const saveB=await saveDownload(page);void saveB;
    const state=await qa(page);assert.equal(state.persistence.previousGood,true);const doc=state.documentId,epoch=state.writerEpoch;await corruptOpfsFile(page,doc,epoch,'saves/last.illustro');
    await page.locator('#reloadSaved').click();await page.waitForFunction(()=>{const text=document.querySelector('#status')?.textContent??'';return text.includes('最後に正常保存できた状態を開き直しました')||text.includes('保存版を開き直せませんでした');},{timeout:30000});await waitReady(page);const fallback=await qa(page);assert.equal(fallback.totalStrokeCount,1);
    report.lastGood={status:'PASS',corruptedLastRejected:true,previousGoodRecovered:true};await context.close();
  }

  // Service Worker app shell + dynamic brush/worker assets remain usable offline after normal online use.
  {
    const context=await freshContext(),page=await context.newPage({viewport:{width:1000,height:760}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(pageUrl(),{waitUntil:'networkidle',timeout:45000});await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,{timeout:15000});
    const qaPanel=page.locator('#qaPanel');if(await qaPanel.count())await qaPanel.evaluate(el=>{el.open=false;});
    await page.getByRole('button',{name:'新規キャンバス',exact:true}).click();await waitReady(page);await draw(page);await waitStroke(page,1);await waitProtected(page,1);
    const onlineSave=await saveDownload(page);await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded',timeout:45000});assert.ok((await page.locator('body').innerText()).includes('Illustro'));
    const offlineQaPanel=page.locator('#qaPanel');if(await offlineQaPanel.count())await offlineQaPanel.evaluate(el=>{el.open=false;});
    await page.getByRole('button',{name:'新規キャンバス',exact:true}).click();await waitReady(page);await draw(page,[.18,.45],[.82,.45]);await waitStroke(page,1);await waitProtected(page,1);
    const offlineSave=await saveDownload(page);assert.ok(offlineSave.filePath);await page.locator('#openFile').setInputFiles(onlineSave.filePath);await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('保存した作品を開きました'),{timeout:30000});await waitReady(page);
    const networkUnavailable=await page.evaluate(async()=>{try{await fetch('./__m05_network_probe__?t='+Date.now(),{cache:'no-store'});return false;}catch{return true;}});
    const offlineState=await qa(page);assert.equal(networkUnavailable,true);assert.deepEqual(errors,[]);
    report.offline={status:'PASS',serviceWorker:true,networkUnavailable,draw:true,recoveryStore:true,save:true,open:true,navigatorOnline:navigator.onLine,backend:offlineState.persistence.backend};await context.setOffline(false);await context.close();
  }

  report.status='PASS';
}catch(error){report.failure=error?.stack??String(error);throw error;
}finally{
  await fs.writeFile(path.join(evidence,`m05-${publicBase?'public':'local'}-smoke.json`),JSON.stringify(report,null,2));
  await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify(report,null,2));if(report.status!=='PASS')process.exitCode=1;
