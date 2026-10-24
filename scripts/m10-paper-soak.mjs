import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const out=path.join(process.env.PAPER_EVIDENCE??'/tmp/illustro-paper-evidence','soak');
await fs.mkdir(out,{recursive:true});
const root=path.resolve('apps/editor/dist');
const server=http.createServer(async(req,res)=>{
  try {
    const u=new URL(req.url,'http://localhost');
    const f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));
    if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
    res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(f)]??'application/octet-stream');
    res.end(await fs.readFile(f));
  } catch {res.writeHead(404).end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const report={sourceCommit:process.env.EXPECTED_COMMIT_SHA??'UNVERIFIED',physicalDevices:'UNVERIFIED',durationPerBackendMs:600000,
  memoryMethod:'Linux /proc for Chrome processes from SystemInfo.getProcessInfo. RSS includes shared pages more than once; PSS apportions shared pages. Natural and explicitly collected main-thread JS heaps are separate. GPU-process RAM is not VRAM.',
  limitations:['Physical input-to-photon, hardware GPU drivers, thermal behavior, hours-long sessions and fully painted 8192px many-layer peaks remain UNVERIFIED.','Canonical history and persisted work can grow with authored content. Resource counters and repeated-document lifetimes are checked separately from this legitimate growth.'],
  cases:[]};
const save=()=>fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
let browser,activePage;
async function newDocument(page,size) {
  await page.evaluate(n=>{for(const key of ['newCanvasWidth','newCanvasHeight'])document.getElementById(key).value=String(n);document.getElementById('new').click();},size);
  await page.waitForFunction(n=>{const p=window.__illustroPerformance?.probe();return p?.controller.document.root.width===n&&document.getElementById('status')?.textContent.includes('描画できます');},size,{timeout:90000});
  await page.waitForFunction(()=>document.querySelectorAll('.illustro-paper-world').length===1);
}
async function settled(page) {
  // Drain the admitted application history first. A renderer-only drain can run
  // before HistoryNavigation.prepare() has submitted the requested Undo/Redo.
  await page.waitForFunction(()=>{
    const d=window.__illustroPerformance.read();
    if(d.historyNavigation?.fault)throw Error(d.historyNavigation.fault);
    return !d.historyNavigation?.pending&&!d.frameState.historySyncing&&!d.frameState.inputBarrier;
  },null,{timeout:120000});
  const target=await page.evaluate(async()=>{
    const p=window.__illustroPerformance.probe();await p.renderer.drain();
    return (await p.renderer.inspect()).display;
  });
  await page.waitForFunction(t=>{
    const d=window.__illustroPerformance.read(),m=d.paper.metrics;
    return !d.historyNavigation?.pending&&!d.frameState.historySyncing&&!d.frameState.inputBarrier&&
      !d.handoff.pendingLogical&&!d.handoff.pendingGpu&&!m.overlays&&!m.retainedOverlays&&
      m.formalEpoch===t.epoch&&m.formalSerial>=t.serial&&d.paper.frames>0;
  },target,{timeout:120000}).catch(async error=>{const detail=await page.evaluate(()=>{const d=window.__illustroPerformance.read();return {status:document.getElementById('status')?.textContent,paper:d.paper?.metrics,history:d.historyNavigation,frame:d.frameState,handoff:{pendingLogical:d.handoff.pendingLogical,pendingGpu:d.handoff.pendingGpu}};});console.log('DISPLAY SETTLE FAILURE',JSON.stringify({target,detail}));throw error;});
}
async function state(page) {
  return page.evaluate(async()=>{
    const p=window.__illustroPerformance.probe(),d=window.__illustroPerformance.read(),r=await p.renderer.inspect();
    return {at:Date.now(),historyNavigation:d.historyNavigation,frameState:d.frameState,displayTarget:r.display,frames:d.paper.frames,metrics:d.paper.metrics,handoff:{accepted:d.handoff.accepted,rejected:d.handoff.rejected,pendingLogical:d.handoff.pendingLogical,pendingGpu:d.handoff.pendingGpu},
      formalSubmissions:r.performance.formalRender.count,formalJobs:r.document.jobs,formalInflight:r.inflight,
      worlds:document.querySelectorAll('.illustro-paper-world').length,pages:p.paper.world.querySelectorAll(':scope > canvas').length,
      oldOverlays:document.querySelectorAll('.illustro-stroke-overlay').length,fault:d.paper.fault};
  });
}
function check(s,size,drained=false) {
  assert.equal(s.worlds,1);assert.equal(s.oldOverlays,0);assert.equal(s.fault,null);assert.equal(s.handoff.rejected,0);
  assert.ok((s.metrics.rasterBytes??0)<=64*1024*1024,'preview shared budget must remain bounded');
  assert.ok((s.metrics.journalBytes??0)<=16*1024*1024,'display journal must remain bounded');
  if(drained){assert.equal(s.metrics.rasterBytes,0);assert.equal(s.metrics.retainedOverlays,0);assert.equal(s.handoff.pendingLogical,0);assert.equal(s.handoff.pendingGpu,0);
    assert.ok(s.pages<=Math.ceil(size/512)**2,'accepted pages must have one current version per document cell');}
}
async function brush(page,id,size) {
  await page.evaluate(({id,size})=>{
    const b=document.getElementById('brush');b.value=id;b.dispatchEvent(new Event('change',{bubbles:true}));
    const s=document.getElementById('size');s.value=String(size);s.dispatchEvent(new Event('input',{bubbles:true}));
    const f=document.getElementById('force');f.checked=false;f.dispatchEvent(new Event('change',{bubbles:true}));
    document.getElementById('resetRotation').click();document.getElementById('fitView').click();
  },{id,size});
}
async function pen(page,cdp,offset) {
  const b=await page.locator('#canvas').boundingBox(),start={x:b.x+b.width*.28,y:b.y+b.height*offset};
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...start,button:'left',buttons:1,clickCount:1,pointerType:'pen',force:.7});
  for(let i=1;i<=28;i++)await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:b.x+b.width*(.28+.42*i/28),y:b.y+b.height*(offset+.045*Math.sin(i/28*Math.PI*2)),button:'left',buttons:1,pointerType:'pen',force:.4+.5*i/28});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:b.x+b.width*.7,y:b.y+b.height*offset,button:'left',buttons:0,pointerType:'pen',force:0});
}
async function gesture(page,cdp) {
  const b=await page.locator('.surface').boundingBox(),x=b.x+b.width*.5,y=b.y+b.height*.57;
  const points=i=>{const a=.22*Math.sin(i/12*Math.PI),r=90+30*Math.sin(i/12*Math.PI),dx=24*i/12,dy=12*i/12;return [{id:11,x:x+dx-r*Math.cos(a),y:y+dy-r*Math.sin(a)},{id:12,x:x+dx+r*Math.cos(a),y:y+dy+r*Math.sin(a)}];};
  const before=await state(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(0)});
  for(let i=1;i<=12;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(i)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const after=await state(page);return {before:before.formalSubmissions,after:after.formalSubmissions};
}
async function memory(page,cdp,bcdp,label) {
  const natural=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
  const dom=await cdp.send('Memory.getDOMCounters');
  await cdp.send('HeapProfiler.collectGarbage');
  const collected=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
  const processes=[];
  for(const p of (await bcdp.send('SystemInfo.getProcessInfo')).processInfo){
    const record={type:p.type,id:p.id,cpuSeconds:p.cpuTime};
    try {const status=await fs.readFile('/proc/'+p.id+'/status','utf8');record.rssBytes=Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1]??0)*1024;}catch(e){record.rssError=e.code;}
    try {const smaps=await fs.readFile('/proc/'+p.id+'/smaps_rollup','utf8');record.pssBytes=Number(smaps.match(/^Pss:\s+(\d+)/m)?.[1]??0)*1024;}catch(e){record.pssError=e.code;}
    processes.push(record);
  }
  const targets=(await bcdp.send('Target.getTargets')).targetInfos;
  const sample={label,at:Date.now(),naturalHeapBytes:natural.JSHeapUsedSize,collectedHeapBytes:collected.JSHeapUsedSize,dom,workerTargets:targets.filter(t=>t.type==='worker').length,processes,rssBytes:processes.reduce((n,p)=>n+(p.rssBytes??0),0),pssBytes:processes.reduce((n,p)=>n+(p.pssBytes??0),0)};
  assert.ok(processes.some(p=>p.rssBytes>0),'actual Chrome RSS must be measured');assert.ok(processes.some(p=>p.pssBytes>0),'actual apportioned Chrome memory must be measured');
  return sample;
}
async function pixels(page) {
  return page.evaluate(async()=>{
    const p=window.__illustroPerformance.probe(),w=p.controller.document.root.width,h=p.controller.document.root.height;
    if(p.controller.layers.length!==1)throw Error('Single layer exact comparator required');
    const formal=await p.renderer.read(p.controller.selectedLayer.surface.descriptor.surfaceId),c=new OffscreenCanvas(w,h),ctx=c.getContext('2d',{willReadFrequently:true});
    for(const q of p.paper.world.querySelectorAll(':scope > canvas')){const g=Number(q.dataset.paperGutter??0),pw=q.width-g*2,ph=q.height-g*2;ctx.drawImage(q,g,g,pw,ph,parseFloat(q.style.left)+g,parseFloat(q.style.top)+g,pw,ph);}
    const actual=ctx.getImageData(0,0,w,h).data;let alphaDifferent=0,premultipliedDifferent=0;
    for(let i=0;i<formal.length;i+=4){if(Math.abs(actual[i+3]-formal[i+3])>1)alphaDifferent++;for(let k=0;k<3;k++)if(Math.abs(actual[i+k]*actual[i+3]/255-formal[i+k]*formal[i+3]/255)>1.01)premultipliedDifferent++;}
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',formal))).map(x=>x.toString(16).padStart(2,'0')).join('');
    return {hash,alphaDifferent,premultipliedDifferent,bytes:formal.length};
  });
}
try {
  for(const backend of ['webgl2','webgpu']){
    browser=await chromium.launch({executablePath:process.env.PAPER_CHROME??'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
    const record={backend,browser:browser.version(),gpu:'SwiftShader software GPU',samples:[],checkpoints:[],lifecycle:[],errors:[],strokes:0,gestureFormalSubmissions:0};report.cases.push(record);await save();
    const context=await browser.newContext({viewport:{width:1024,height:800},hasTouch:true});
    await context.addInitScript(()=>{window.showSaveFilePicker=undefined;});
    const page=activePage=await context.newPage();page.on('pageerror',e=>record.errors.push(e.message));
    const cdp=await context.newCDPSession(page),bcdp=await browser.newBrowserCDPSession();await cdp.send('Performance.enable');
    await page.goto('http://127.0.0.1:'+server.address().port+'/?m09=1&perf=1&backend='+backend);
    await newDocument(page,1024);await brush(page,'foundation-g-pen',48);await pen(page,cdp,.4);await settled(page);
    record.samples.push(await memory(page,cdp,bcdp,'warm-1024'));
    await newDocument(page,4000);
    const start=Date.now();record.startedAt=start;let round=0;
    while(Date.now()-start<report.durationPerBackendMs){
      const kind=round%3===0?'foundation-pencil':round%3===1?'foundation-g-pen':'foundation-marker';
      await brush(page,kind,round%3===2?256:512);
      const before=await state(page);
      for(let i=0;i<3;i++){await pen(page,cdp,.35+i*.11);record.strokes++;}
      const overlap=await gesture(page,cdp);record.gestureFormalSubmissions+=Math.max(0,overlap.after-overlap.before);
      const pending=await state(page);check(pending,4000);record.peakRasterBytes=Math.max(record.peakRasterBytes??0,pending.metrics.rasterBytes??0);
      await settled(page);const drained=await state(page);check(drained,4000,true);assert.equal(drained.handoff.accepted-before.handoff.accepted,3,'all consecutive native pen strokes must be accepted');
      if(round%8===0){
        const beforeUndo=await pixels(page);assert.equal(beforeUndo.alphaDifferent,0);assert.equal(beforeUndo.premultipliedDifferent,0);
        await page.locator('#undo').evaluate(e=>e.click());await settled(page);
        await page.locator('#redo').evaluate(e=>e.click());await settled(page);
        const afterRedo=await pixels(page);assert.deepEqual(afterRedo,beforeUndo,'history after long repeated drawing must remain exact');
        record.checkpoints.push({round,elapsedMs:Date.now()-start,state:await state(page),pixels:afterRedo});
        record.samples.push(await memory(page,cdp,bcdp,'4000-round-'+round));
        await page.screenshot({path:path.join(out,backend+'-latest.png')});
        console.log('SOAK progress',JSON.stringify({backend,round,strokes:record.strokes,elapsedMs:Date.now()-start,lastMemory:record.samples.at(-1),state:drained}));await save();
      }
      round++;
    }
    record.elapsedMs=Date.now()-start;record.rounds=round;assert.ok(record.strokes>=24);assert.ok(record.gestureFormalSubmissions>0,'real formal drawing must advance during native gestures');
    await settled(page);record.finalPixels=await pixels(page);assert.equal(record.finalPixels.alphaDifferent,0);assert.equal(record.finalPixels.premultipliedDifferent,0);
    const downloadPromise=page.waitForEvent('download');await page.locator('#save').evaluate(e=>e.click());const download=await downloadPromise;
    const bytes=await fs.readFile(await download.path());record.savedBytes=bytes.length;
    await newDocument(page,512);
    await page.locator('#openFile').setInputFiles({name:'soak-roundtrip.illustro',mimeType:'application/octet-stream',buffer:bytes});
    await page.waitForFunction(()=>document.getElementById('status')?.textContent?.includes('開きました'),null,{timeout:120000});await settled(page);
    record.reloadedPixels=await pixels(page);assert.deepEqual(record.reloadedPixels,record.finalPixels,'large saved formal bytes and displayed pixels must survive reload');
    for(let i=0;i<12;i++){
      const size=[512,1024,2048][i%3];await newDocument(page,size);await brush(page,'foundation-g-pen',48);await pen(page,cdp,.45);await settled(page);
      const s=await state(page);check(s,size,true);const m=await memory(page,cdp,bcdp,'new-document-'+i);
      record.lifecycle.push({i,size,state:s,memory:m});
      if(i===0)record.expectedWorkerTargets=m.workerTargets;
      assert.equal(m.workerTargets,record.expectedWorkerTargets,'document replacement must not accumulate worker targets');
      console.log('SOAK lifecycle',JSON.stringify({backend,i,size,workers:m.workerTargets,rssBytes:m.rssBytes,pssBytes:m.pssBytes,heap:m.collectedHeapBytes}));await save();
    }
    assert.deepEqual(record.errors,[]);record.status='PASS';console.log('SOAK PASS',JSON.stringify({backend,strokes:record.strokes,rounds:record.rounds,elapsedMs:record.elapsedMs,gestureFormalSubmissions:record.gestureFormalSubmissions,finalPixels:record.finalPixels,savedBytes:record.savedBytes,lifecycleReplacements:record.lifecycle.length}));await save();
    await context.close();await browser.close();browser=null;activePage=null;
  }
  report.status='PASS';
} catch(error) {
  report.status='FAIL';report.failure=String(error.stack??error);
  if(activePage){report.failureState=await state(activePage).catch(e=>String(e));console.log('SOAK FAILURE STATE',JSON.stringify(report.failureState));await activePage.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
  throw error;
} finally {await save();await browser?.close();await new Promise(ok=>server.close(ok));}
