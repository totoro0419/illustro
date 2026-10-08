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
async function delayedPickerContext(staleReads=3){
  const context=await browser.newContext({acceptDownloads:true});
  await context.addInitScript(({staleReads})=>{
    const state={bytes:new Uint8Array(),reads:0,writes:0,staleReads};
    Object.defineProperty(window,'__m05PickerState',{value:state,configurable:true});
    const handle={
      async getFile(){
        state.reads++;
        const data=state.reads<=state.staleReads?new Uint8Array(state.bytes.byteLength):state.bytes.slice();
        return new File([data], 'Illustro作品.illustro',{type:'application/octet-stream',lastModified:1000+state.writes});
      },
      async createWritable(){
        let buffer=new Uint8Array();
        return {
          async write(value){
            let bytes;
            if(value instanceof Blob)bytes=new Uint8Array(await value.arrayBuffer());
            else if(typeof value==='string')bytes=new TextEncoder().encode(value);
            else if(ArrayBuffer.isView(value))bytes=new Uint8Array(value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength));
            else if(value instanceof ArrayBuffer)bytes=new Uint8Array(value.slice(0));
            else throw new Error('unsupported mock write');
            buffer=bytes;
          },
          async truncate(size){
            const next=new Uint8Array(size);next.set(buffer.subarray(0,Math.min(size,buffer.byteLength)));buffer=next;
          },
          async close(){state.bytes=buffer.slice();state.writes++;state.reads=0;},
          async abort(){},
        };
      },
    };
    Object.defineProperty(window,'showSaveFilePicker',{value:async()=>handle,configurable:true});
  },{staleReads});
  return context;
}
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
  const stat=await fs.stat(filePath);assert.ok(stat.size>128,`saved .illustro unexpectedly tiny: ${stat.size} bytes`);
  return {download,filePath,size:stat.size};
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
async function waitForOpfsEntry(page,doc,epoch,relative,timeout=15000){
  await page.waitForFunction(async({doc,epoch,relative})=>{
    try{
      let dir=await navigator.storage.getDirectory();
      for(const name of ['m05','sessions',doc,epoch])dir=await dir.getDirectoryHandle(name);
      const parts=relative.split('/'),name=parts.pop();if(!name)return false;
      for(const part of parts)dir=await dir.getDirectoryHandle(part);
      await dir.getFileHandle(name);return true;
    }catch{return false;}
  },{doc,epoch,relative},{timeout});
}
async function corruptDocumentSave(page,doc,relative){
  await page.evaluate(async({doc,relative})=>{
    let dir=await navigator.storage.getDirectory();
    for(const name of ['m05','documents',doc,'saves'])dir=await dir.getDirectoryHandle(name);
    const parts=relative.split('/'),name=parts.pop();if(!name)throw new Error('bad test path');
    for(const part of parts)dir=await dir.getDirectoryHandle(part);
    const file=await dir.getFileHandle(name),w=await file.createWritable();await w.write(new Uint8Array([0,1,2,3]));await w.truncate(4);await w.close();
  },{doc,relative});
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
    await waitProtected(page,4);await page.waitForTimeout(1200);
    const beforeSave=await qa(page),savedRevision=beforeSave.currentRevision,protectedBeforeFile=beforeSave.persistence.protectedThrough;assert.equal(beforeSave.autosaveCheckpoint.fullSeedPending,false);assert.equal(await page.locator('#saveState').textContent(),'自動保存済み');
    const saved=await saveDownload(page),afterSave=await qa(page);assert.equal(afterSave.persistence.savedRevision,null);assert.equal(afterSave.persistence.protectedThrough,protectedBeforeFile);assert.equal(afterSave.persistence.lastGood,false);
    await fs.copyFile(saved.filePath,path.join(evidence,`${backend}-roundtrip.illustro`));
    const restart=await context.newPage({viewport:{width:820,height:700}}),restartErrors=[];
    restart.on('pageerror',e=>restartErrors.push(e.message));restart.on('console',m=>{if(m.type()==='error')restartErrors.push(m.text());});
    await restart.goto(pageUrl(backend),{waitUntil:'networkidle',timeout:45000});
    await restart.waitForFunction(()=>!(document.getElementById('recover')?.disabled),{timeout:30000});
    await restart.locator('#recover').click();await restart.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('自動保存された最新の作業状態へ戻しました'),{timeout:30000});await waitReady(restart);
    const restarted=await qa(restart);assert.equal(restarted.currentRevision,savedRevision);assert.equal(restarted.totalStrokeCount,3);assert.equal(restarted.projectionRestoreMode,'cache');assert.deepEqual(restartErrors,[]);await restart.close();
    await page.locator('#paint').click();await draw(page,[.15,.72],[.85,.72]);await waitStroke(page,4);await waitProtected(page,5);await page.waitForTimeout(900);
    const changed=await qa(page);assert.notEqual(changed.currentRevision,savedRevision);assert.equal(changed.persistence.savedRevision,null);assert.equal(await page.locator('#saveState').textContent(),'自動保存済み');
    await page.locator('#openFile').setInputFiles(saved.filePath);await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('作品ファイルを開きました。自動保存を開始しました。'),{timeout:30000});await waitReady(page);
    const opened=await qa(page);assert.equal(opened.currentRevision,savedRevision);assert.equal(opened.layerCount,2);assert.equal(opened.totalStrokeCount,3);assert.equal(opened.projectionRestoreMode,'cache');assert.deepEqual(errors,[]);
    report.backends.push({backend,status:'PASS',opfs:opened.persistence.backend,autosaveIndependentFromPortable:true,roundTrip:true,snapshotIsolation:true,saveDurationMs:afterSave.persistence.saveDurationMs,snapshotCaptureMs:afterSave.persistence.snapshotCaptureMs});
    await page.screenshot({path:path.join(evidence,`${backend}-m05.png`),fullPage:true});await context.close();
  }

  // Direct File System Access save: Android/storage providers can briefly return stale
  // bytes immediately after close(). The app must retry verification instead of reporting
  // a false save failure.
  {
    const context=await delayedPickerContext(3),page=await context.newPage({viewport:{width:900,height:700}});const errors=await init(page);
    await draw(page,[.15,.35],[.85,.35]);await waitStroke(page,1);await waitProtected(page,1);
    await page.locator('#save').click();await page.waitForFunction(()=>document.getElementById('saveState')?.dataset.saving==='false',{timeout:30000});
    const firstStatus=await page.locator('#status').textContent(),first=await qa(page),picker1=await page.evaluate(()=>{const s=window.__m05PickerState;return {size:s?.bytes?.byteLength??0,reads:s?.reads??0,writes:s?.writes??0};});
    assert.match(firstStatus??'',/作品ファイルを保存しました（.+ (?:B|KB|MB)）。自動保存状態には影響しません。/);assert.ok(!firstStatus?.includes('保存できませんでした'));assert.equal(first.persistence.lastGood,false);assert.equal(first.persistence.savedRevision,null);assert.ok(picker1.size>128);assert.equal(picker1.writes,1);assert.ok(picker1.reads>3,'direct-save verifier did not retry stale readback');
    await page.locator('#paint').click();await draw(page,[.15,.65],[.85,.65]);await waitStroke(page,2);await waitProtected(page,2);
    await page.locator('#save').click();await page.waitForFunction(()=>document.getElementById('saveState')?.dataset.saving==='false',{timeout:30000});
    const secondStatus=await page.locator('#status').textContent(),picker2=await page.evaluate(()=>{const s=window.__m05PickerState;return {size:s?.bytes?.byteLength??0,reads:s?.reads??0,writes:s?.writes??0};});
    assert.match(secondStatus??'',/作品ファイルを保存しました（.+ (?:B|KB|MB)）。自動保存状態には影響しません。/);assert.equal(picker2.writes,2);assert.ok(picker2.size>picker1.size);assert.deepEqual(errors,[]);
    report.directPicker={status:'PASS',staleReadsSimulated:3,verificationRetried:true,firstBytes:picker1.size,secondBytes:picker2.size,autosaveIndependent:true};await context.close();
  }

  // Portable .illustro output is deliberately independent from internal autosave.
  // Saving a brand-new untouched document must not create a fake recovery commit.
  {
    const context=await freshContext(),page=await context.newPage({viewport:{width:900,height:700}});await init(page);
    const before=await qa(page);assert.equal(before.persistence.protectedThrough,'0');assert.equal(await page.locator('#reloadSaved').count(),0);
    const saved=await saveDownload(page),after=await qa(page);assert.ok(saved.size>128);assert.equal(after.persistence.protectedThrough,'0');assert.equal(after.persistence.savedRevision,null);assert.equal(after.persistence.lastGood,false);await page.close();
    const reopened=await context.newPage({viewport:{width:900,height:700}});await reopened.goto(pageUrl(),{waitUntil:'networkidle',timeout:45000});
    assert.equal(await reopened.locator('#recover').isDisabled(),true);report.explicitSaveWithoutRecovery={status:'PASS',protectedThrough:'0',fileBytes:saved.size,createdRecoveryCommit:false};await context.close();
  }

  // Checkpoint policy: every operation is journaled; finished-state checkpoint is forced
  // at 12 operations even without an idle gap.
  {
    const context=await freshContext(),page=await context.newPage({viewport:{width:1000,height:760}});await init(page);
    for(let i=0;i<12;i++){const y=.10+(i%10)*.075;await draw(page,[.12,y],[.82,y],2);await waitStroke(page,i+1);}
    await waitProtected(page,12);await page.waitForFunction(()=>{try{const q=JSON.parse(document.querySelector('#qaAuto')?.textContent??'{}');return q.autosaveCheckpoint?.fullSeedPending===false&&q.autosaveCheckpoint?.lastCheckpointAt!==null;}catch{return false;}},{timeout:30000});
    const state=await qa(page);assert.equal(state.autosaveCheckpoint.operationInterval,12);assert.equal(state.autosaveCheckpoint.idleMs,800);assert.equal(state.autosaveCheckpoint.opsSinceLast,0);report.checkpointCadence={status:'PASS',operationInterval:12,idleMs:800,protectedThrough:state.persistence.protectedThrough};await context.close();
  }

  // Normal crash/reload recovery must restore a finished artwork checkpoint, not redraw every stroke.
  {
    const context=await freshContext(),page=await context.newPage({viewport:{width:1100,height:800}}),errors=await init(page),strokeTotal=180;
    for(let i=0;i<strokeTotal;i++){const y=.06+(i%14)*.062,x0=.08+(i%5)*.018,x1=.90-(i%7)*.016;await draw(page,[x0,y],[x1,y],3);await waitStroke(page,i+1);}
    await waitProtected(page,strokeTotal);await page.waitForTimeout(1400);
    const before=await qa(page),doc=before.documentId,head=before.currentRevision;await page.close();
    const restoredPage=await context.newPage({viewport:{width:1100,height:800}});restoredPage.on('pageerror',e=>errors.push(e.message));await restoredPage.goto(pageUrl(),{waitUntil:'networkidle',timeout:45000});
    await restoredPage.waitForFunction(()=>!(document.getElementById('recover')?.disabled),{timeout:30000});const clickAt=Date.now();await restoredPage.locator('#recover').click();await restoredPage.waitForFunction(()=>{const text=document.querySelector('#status')?.textContent??'';return text.includes('自動保存された最新の作業状態へ戻しました')||text.includes('作業途中の状態を戻せませんでした');},{timeout:30000});await waitReady(restoredPage);
    const recovered=await qa(restoredPage),wallMs=Date.now()-clickAt;assert.equal(recovered.documentId,doc);assert.equal(recovered.currentRevision,head);assert.equal(recovered.persistence.recovered,true);assert.equal(recovered.totalStrokeCount,strokeTotal);assert.equal(recovered.projectionRestoreMode,'cache');assert.equal(recovered.projectionCacheRevision,head);assert.ok(recovered.projectionRestoreMs<500,`cached projection restore too slow: ${recovered.projectionRestoreMs}ms`);assert.deepEqual(errors,[]);
    report.recovery={status:'PASS',strategy:'finished-state-cache',protectedThrough:before.persistence.protectedThrough,recoveredRevision:recovered.currentRevision,workerDurationMs:recovered.persistence.recoveryDurationMs,projectionRestoreMs:recovered.projectionRestoreMs,wallMs,strokeTotal};await context.close();
  }

  // If the finished-state cache is damaged, the journal/stroke history is the repair fallback.
  {
    const context=await freshContext(),page=await context.newPage({viewport:{width:1000,height:760}});await init(page);
    await draw(page,[.14,.25],[.84,.25],5);await waitStroke(page,1);await draw(page,[.14,.50],[.84,.50],5);await waitStroke(page,2);await draw(page,[.14,.75],[.84,.75],5);await waitStroke(page,3);await waitProtected(page,3);await page.waitForTimeout(1200);
    const state=await qa(page),doc=state.documentId,epoch=state.writerEpoch,head=state.currentRevision;await waitForOpfsEntry(page,doc,epoch,'projection-v2.frame');await corruptOpfsFile(page,doc,epoch,'projection-v2.frame');await page.close();
    const restoredPage=await context.newPage({viewport:{width:1000,height:760}});await restoredPage.goto(pageUrl(),{waitUntil:'networkidle',timeout:45000});await restoredPage.waitForFunction(()=>!(document.getElementById('recover')?.disabled),{timeout:30000});await restoredPage.locator('#recover').click();await restoredPage.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('自動保存された最新の作業状態へ戻しました'),{timeout:30000});await waitReady(restoredPage);
    const repaired=await qa(restoredPage);assert.equal(repaired.currentRevision,head);assert.equal(repaired.totalStrokeCount,3);assert.equal(repaired.projectionRestoreMode,'replay-fallback');report.repairFallback={status:'PASS',cacheCorrupted:true,strategy:'stroke-replay',strokeCount:3};await context.close();
  }

  // Missing sequence 2 must stop protection at sequence 1; sequence 3 cannot be skipped over.
  {
    const context=await freshContext(),page=await context.newPage({viewport:{width:1000,height:760}});await init(page);
    await draw(page,[.12,.25],[.82,.25]);await waitStroke(page,1);await draw(page,[.12,.50],[.82,.50]);await waitStroke(page,2);await draw(page,[.12,.75],[.82,.75]);await waitStroke(page,3);await waitProtected(page,3);
    const state=await qa(page),doc=state.documentId,epoch=state.writerEpoch;await removeOpfsEntry(page,doc,epoch,'commits/00000000000000000002.frame');await page.close();
    const restoredPage=await context.newPage({viewport:{width:1000,height:760}});await restoredPage.goto(pageUrl(),{waitUntil:'networkidle',timeout:45000});await restoredPage.waitForFunction(()=>!(document.getElementById('recover')?.disabled),{timeout:30000});await restoredPage.locator('#recover').click();await restoredPage.waitForFunction(()=>{const text=document.querySelector('#status')?.textContent??'';return text.includes('自動保存された最新の作業状態へ戻しました')||text.includes('作業途中の状態を戻せませんでした');},{timeout:30000});await waitReady(restoredPage);
    const recovered=await qa(restoredPage);assert.equal(recovered.totalStrokeCount,1);assert.equal(recovered.persistence.recovered,true);
    report.gap={status:'PASS',deletedSequence:2,recoveredStrokeCount:1};await context.close();
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
    const offlineSave=await saveDownload(page);assert.ok(offlineSave.filePath);await page.locator('#openFile').setInputFiles(onlineSave.filePath);await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('作品ファイルを開きました。自動保存を開始しました。'),{timeout:30000});await waitReady(page);
    assert.deepEqual(errors,[],'Offline app operations produced a browser error before the intentional network probe');
    const networkUnavailable=await page.evaluate(async()=>{try{await fetch('./__m05_network_probe__?t='+Date.now(),{cache:'no-store'});return false;}catch{return true;}});
    const navigatorOnline=await page.evaluate(()=>navigator.onLine),offlineState=await qa(page);assert.equal(networkUnavailable,true);
    report.offline={status:'PASS',serviceWorker:true,networkUnavailable,draw:true,recoveryStore:true,save:true,open:true,navigatorOnline,backend:offlineState.persistence.backend};await context.setOffline(false);await context.close();
  }

  report.status='PASS';
}catch(error){report.failure=error?.stack??String(error);throw error;
}finally{
  await fs.writeFile(path.join(evidence,`m05-${publicBase?'public':'local'}-smoke.json`),JSON.stringify(report,null,2));
  await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify(report,null,2));if(report.status!=='PASS')process.exitCode=1;
