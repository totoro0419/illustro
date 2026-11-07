/** Synthetic pen/touch regression for C01. Not a substitute for Android physical stylus testing. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
// Explicit allow-list keeps the local test server independent of file system paths.
const allow={'/':'index.html','/index.html':'index.html','/app/main.mjs':'app/main.mjs','/app/color-pickers.mjs':'app/color-pickers.mjs','/app/input-diagnostics.mjs':'app/input-diagnostics.mjs','/app/model.mjs':'app/model.mjs','/app/raster-worker.mjs':'app/raster-worker.mjs','/app/style.css':'app/style.css','/app/aurora-frost.css':'app/aurora-frost.css','/app/ui-icons.mjs':'app/ui-icons.mjs'};
for(const name of ['brush-engine.mjs','brush-raster.mjs','brush-ui.mjs','stroke-input.mjs','c02.css','preview-worker.mjs','preview-stroke.mjs','preview-ink.mjs','preview-composite.mjs','presentation.mjs','retained-scene.mjs','layer-tree.mjs','layered-manifest.mjs','raster-layers.mjs','blend-kernels.mjs','blend-if.mjs'])allow['/app/'+name]='app/'+name;
const server=createServer(async(req,res)=>{try{
 const path=allow[new URL(req.url,'http://localhost').pathname];if(!path){res.writeHead(404).end();return}
 const data=await readFile(path);res.writeHead(200,{'content-type':path.endsWith('.mjs')?'text/javascript':path.endsWith('.css')?'text/css':'text/html'});res.end(data);
}catch(e){res.writeHead(500).end(String(e))}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.ILLUSTRO_CHROMIUM||undefined,args:process.env.ILLUSTRO_CHROMIUM?['--no-sandbox','--disable-dev-shm-usage']:[]});
 const page=await browser.newPage({viewport:{width:1100,height:820}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',msg=>{if(msg.type()==='error')errors.push('console: '+msg.text())});
 await page.goto('http://127.0.0.1:'+server.address().port+'/?inputDebug=1&pixelMirror=1');
 await page.waitForFunction(()=>document.querySelector('#art')?.width===1600);
 const report=await page.evaluate(async()=>{
  const stage=document.getElementById('stage'),r=stage.getBoundingClientRect(),paper=document.getElementById('paper');
  const pose=()=>paper.style.transform+'|'+document.getElementById('retained-scene').style.transform;
  const pause=()=>new Promise(resolve=>setTimeout(resolve,35));
  const pixelCount=()=>{const c=document.getElementById('art'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)count++;return count};
  const until=async test=>{const start=performance.now();while(!test()){if(performance.now()-start>20000)throw Error('Raster worker timeout');await pause()}};
  const dispatch=(type,kind,id,x,y,n=1)=>{const options={pointerId:id,pointerType:kind,clientX:r.left+x,clientY:r.top+y,pressure:.65,buttons:type==='pointerup'?0:1,bubbles:true};
   const event=new PointerEvent(type,options);
   if(n>1)event.getCoalescedEvents=()=>Array.from({length:n},(_,j)=>new PointerEvent('pointermove',{...options,clientX:options.clientX+j*.14,clientY:options.clientY+j*.15}));
   const start=performance.now();stage.dispatchEvent(event);return performance.now()-start;
  };
  // A: pen with high-density coalesced events, finger navigation before pen-up.
  dispatch('pointerdown','pen',40,160,200);
  let maxMove=0;for(let i=0;i<180;i++)maxMove=Math.max(maxMove,dispatch('pointermove','pen',40,160+i*.9,200+Math.sin(i/12)*25,8));
  const firstPose=pose();
  dispatch('pointerdown','touch',41,340,300);
  dispatch('pointermove','touch',41,380,315);
  await until(()=>pose()!==firstPose);
  const navigated=pose()!==firstPose;
  const up=dispatch('pointerup','pen',40,325,200);
  dispatch('pointerup','touch',41,380,315);
  await until(()=>document.getElementById('stage').dataset.rasterPending==='0' && pixelCount()>0);
  const aPixels=pixelCount();
  // B is accepted then immediately undone. Save fences on A even if B job remains pending.
  dispatch('pointerdown','pen',42,160,300);
  dispatch('pointermove','pen',42,360,320,8);
  dispatch('pointerup','pen',42,360,320);
  document.querySelector('[data-action=undo]').click();
  const writes=[];window.showSaveFilePicker=async()=>({createWritable:async()=>({write:async text=>writes.push(typeof text==='string'?text:new TextDecoder().decode(text)),close:async()=>{},abort:async()=>{}})});
  document.querySelector('[data-action=save]').click();
  document.querySelector('[data-action=redo]').click();
  await until(()=>writes.length>0);
  await until(()=>document.getElementById('stage').dataset.rasterPending==='0' && pixelCount()>aPixels);
  const afterRedo=pixelCount();
  const native=JSON.parse(writes[0]);
  const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=native.layers[0].png});
  const copy=document.createElement('canvas');copy.width=image.width;copy.height=image.height;
  const context=copy.getContext('2d');context.drawImage(image,0,0);
  const d=context.getImageData(0,0,copy.width,copy.height).data;let savedPixels=0;for(let i=3;i<d.length;i+=4)if(d[i])savedPixels++;
  // Immediately after pen-up, the app must accept the first delivered touch.
  const pose0=pose();
  dispatch('pointerdown','pen',70,190,190);
  dispatch('pointermove','pen',70,200,200);
  dispatch('pointerup','pen',70,200,200);
  dispatch('pointerdown','touch',71,390,350);
  dispatch('pointermove','touch',71,430,385);
  await until(()=>pose()!==pose0);
  const immediateTouch=pose()!==pose0;
  dispatch('pointerup','touch',71,430,385);
  // An OS cancellation/lost capture must not leave stale stroke/navigation state.
  const pose1=pose();
  dispatch('pointerdown','pen',72,210,220);
  dispatch('lostpointercapture','pen',72,210,220);
  dispatch('pointerdown','touch',73,360,310);
  dispatch('pointermove','touch',73,400,345);
  await until(()=>pose()!==pose1);
  const touchAfterLost=pose()!==pose1;
  dispatch('pointerup','touch',73,400,345);
  if(document.getElementById('interrupted-stroke').hidden)throw Error('Lost capture must offer explicit recovery');
  document.getElementById('discard-stroke').click();
  await until(()=>stage.dataset.rasterPending==='0');
  const stablePixels=pixelCount();
  dispatch('pointerdown','pen',80,190,280);
  dispatch('pointermove','pen',80,240,280);
  document.querySelector('[data-action=saveas]').click();
  await until(()=>writes.length===2);
  const saveDuringStroke=JSON.parse(writes[1]);
  if(!document.getElementById('interrupted-stroke').hidden)throw Error('Saving must not interrupt the active writer');
  dispatch('pointerup','pen',80,250,290);
  await until(()=>stage.dataset.rasterPending==='0');
  const savedDuringBeforeActive=saveDuringStroke.brushArchive.strokes.length===3&&pixelCount()>stablePixels;
  const diagnostic=document.getElementById('input-diagnostic-summary')?.textContent||'';
  return {maxMove,up,navigated,aPixels,afterRedo,savedPixels,savedRevision:native.savedRevision,notice:document.getElementById('toast').textContent,immediateTouch,touchAfterLost,savedDuringBeforeActive,diagnostic};
 });
 assert.ok(report.navigated,'Touch must navigate while pen is down');
 assert.ok(report.immediateTouch&&report.touchAfterLost,'First delivered touch must navigate after pen up or capture loss');
 assert.ok(report.savedDuringBeforeActive,'Save As must fence the accepted prefix and allow the active stroke to finish');
 assert.ok(report.diagnostic.includes('Canvas指開始'),'Input delivery diagnostic must report stage touch events');
 assert.ok(report.maxMove<100&&report.up<100,'Pen processing must not block input synchronously (>100ms)');
 assert.ok(report.aPixels>0&&report.afterRedo>report.aPixels,'Stroke A and Redo B must render');
 assert.equal(report.savedPixels,report.aPixels,'Save must fence A after undo of pending B');
 assert.equal(report.savedRevision,3,'Save must retain the revision accepted before Redo');
 assert.deepEqual(errors,[],'Browser and Worker must not throw');
 assert.ok(!report.notice.includes('失敗'),'UI must not report a raster failure');
 console.log('PASS synthetic pen + concurrent touch; bounded input handling; worker stroke, pending Undo, Save fence, Redo',report);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
