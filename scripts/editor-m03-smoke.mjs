import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const {PNG}=require(process.env.PREP_PNG_PATH??'pngjs');
const publicBase=(process.env.M03_PUBLIC_URL??'').trim();
const expectedCommit=(process.env.EXPECTED_COMMIT_SHA??'').trim();
const evidence=path.resolve(process.env.M03_EVIDENCE_DIRECTORY??'/tmp/illustro-m03');
await fs.mkdir(evidence,{recursive:true});
let server=null,base=publicBase;
if(!publicBase){
  const root=path.resolve(import.meta.dirname,'../apps/editor/dist');
  server=http.createServer(async(q,r)=>{
    try{const relative=decodeURIComponent((q.url??'/').split('?')[0]),file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));
      if(!file.startsWith(root+path.sep)){r.writeHead(403);r.end();return;}
      const data=await fs.readFile(file);r.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');r.end(data);
    }catch{r.writeHead(404);r.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}/`;
}
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface']});
const report={milestone:'M03',mode:publicBase?'public':'local',url:base,status:'FAIL',backends:[]};
function darkIn(buffer,rect){const png=PNG.sync.read(buffer);let n=0;const x0=Math.max(0,Math.floor(rect.x0*png.width)),x1=Math.min(png.width,Math.ceil(rect.x1*png.width)),y0=Math.max(0,Math.floor(rect.y0*png.height)),y1=Math.min(png.height,Math.ceil(rect.y1*png.height));for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*png.width+x)*4;if(png.data[i]<170&&png.data[i+1]<170&&png.data[i+2]<170&&png.data[i+3]>0)n++;}return n;}
function lightRatio(buffer){const png=PNG.sync.read(buffer);let light=0,total=png.width*png.height;for(let i=0;i<png.data.length;i+=4)if(png.data[i]>225&&png.data[i+1]>225&&png.data[i+2]>225)light++;return total?light/total:0;}
async function draw(page,box,a,b,steps=24){await page.mouse.move(box.x+a[0]*box.width,box.y+a[1]*box.height);await page.mouse.down();await page.mouse.move(box.x+b[0]*box.width,box.y+b[1]*box.height,{steps});await page.mouse.up();}
async function qa(page){return JSON.parse((await page.locator('#qaAuto').textContent())??'{}');}
async function waitIdle(page){await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.historyBusy==='false',{timeout:15000});}
async function touchStroke(page,canvas,box,a,b){
  await page.locator('#finger').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
  const cdp=await page.context().newCDPSession(page),start={x:box.x+a[0]*box.width,y:box.y+a[1]*box.height,id:1,radiusX:2,radiusY:2,force:.5},end={x:box.x+b[0]*box.width,y:box.y+b[1]*box.height,id:1,radiusX:2,radiusY:2,force:.5};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[end]});await page.waitForTimeout(90);const held=await canvas.screenshot();await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();return held;
}
async function penStroke(page,canvas,box,a,b){
  const cdp=await page.context().newCDPSession(page),sx=box.x+a[0]*box.width,sy=box.y+a[1]*box.height,ex=box.x+b[0]*box.width,ey=box.y+b[1]*box.height;
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:sx,y:sy,pointerType:'pen'});
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:sx,y:sy,button:'left',buttons:1,clickCount:1,force:.5,pointerType:'pen'});
  for(let i=1;i<=12;i++){const t=i/12;await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:sx+(ex-sx)*t,y:sy+(ey-sy)*t,button:'left',buttons:1,force:.5,pointerType:'pen'});}
  await page.waitForTimeout(90);const held=await canvas.screenshot();
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:ex,y:ey,button:'left',buttons:0,clickCount:1,pointerType:'pen'});
  await cdp.detach();return held;
}
function pageUrl(backend){if(publicBase)return base+`?backend=${backend}&m03-public-check=1&build=${encodeURIComponent(expectedCommit)}`;return base+`?qa=1&backend=${backend}`;}
try{
  for(const backend of ['webgl2','webgpu']){
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(pageUrl(backend),{waitUntil:'networkidle',timeout:45000});
    assert.equal(await page.locator('#qaPanel').count(),1,'M03 QA panel missing');await page.locator('#qaPanel > summary').click();
    await page.getByRole('button',{name:'新規キャンバス',exact:true}).click();await page.waitForFunction(()=>!(document.getElementById('brush')?.disabled),{timeout:45000});
    const canvas=page.locator('canvas'),box=await canvas.boundingBox();assert.ok(box);
    const start=await qa(page);assert.equal(start.milestone,'M03');assert.equal(start.layerCount,1);assert.equal(start.canUndo,false);assert.equal(start.canRedo,false);assert.ok(String(start.backend).toLowerCase().includes(backend));assert.equal(start.backendSelection.requested,backend);assert.equal(start.backendSelection.selected,backend);assert.equal(start.backendSelection.fallbackUsed,false);if(backend==='webgpu'){assert.equal(start.backendSelection.webgpu.usable,true,'explicit WebGPU initialized but was not marked usable');assert.equal(start.backendSelection.webgpu.stage,'ready');}else{assert.equal(start.backendSelection.webgpu.attempted,false,'explicit WebGL2 unexpectedly probed WebGPU');}assert.equal(start.rendererArtworkAlpha,true,'internal artwork alpha must remain preserved');assert.equal(start.presentationOpaque,true,'visible GPU presentation must be opaque');assert.equal(start.rendererAlpha,false,'visible GPU Canvas must not depend on browser alpha compositing');assert.equal(start.presentationAlpha,false,'visible presentation alpha contract must be opaque');if(expectedCommit)assert.equal(start.commit,expectedCommit);
    await canvas.evaluate(el=>el.style.background='#000');await page.waitForTimeout(80);assert.ok(lightRatio(await canvas.screenshot())>.92,'visible paper incorrectly depends on CSS/transparent Canvas compositing');
    await page.locator('#qaPanel').evaluate(el=>el.open=true);await page.locator('#qaDiagInitial').evaluate(el=>el.closest('details').open=true);await page.locator('#qaDiagInitial').click();await page.waitForFunction(()=>document.querySelector('#qaGpuReport')?.textContent?.includes('"gpuArtwork"'),{timeout:10000});
    const initialGpu=JSON.parse((await page.locator('#qaGpuReport').textContent())??'{}');assert.equal(initialGpu.gpuArtwork.corner[3],0,'blank internal artwork is not transparent');
    // createImageBitmap(Canvas) is a backing-store readback, not an authoritative
    // observation of the browser-composited presentation. The black-CSS screenshot
    // above is the presentation contract: if Canvas alpha leaked, it would be black.
    await page.locator('#qaPanel').evaluate(el=>el.open=false);
    await canvas.evaluate(el=>el.style.background='#fff');
    assert.equal(await page.locator('#undo').isDisabled(),true);assert.equal(await page.locator('#redo').isDisabled(),true);

    // Stroke A -> Undo -> Redo
    await draw(page,box,[.12,.20],[.36,.28]);await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='1',{timeout:15000});await waitIdle(page);
    const revA=await canvas.getAttribute('data-revision-id'),aShot=await canvas.screenshot();assert.ok(darkIn(aShot,{x0:.08,y0:.12,x1:.42,y1:.35})>25,'Stroke A not visible');
    assert.equal(await page.locator('#undo').isDisabled(),false);assert.equal(await page.locator('#redo').isDisabled(),true);
    await page.locator('#undo').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='0');await waitIdle(page);
    const aUndo=await canvas.screenshot();assert.ok(darkIn(aUndo,{x0:.08,y0:.12,x1:.42,y1:.35})<8,'Undo left Stroke A visible');assert.equal(await page.locator('#redo').isDisabled(),false);
    await page.locator('#redo').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='1');await waitIdle(page);
    assert.equal(await canvas.getAttribute('data-revision-id'),revA,'Redo did not return to identical Stroke revision');assert.ok(darkIn(await canvas.screenshot(),{x0:.08,y0:.12,x1:.42,y1:.35})>25,'Redo did not restore Stroke A');

    // Layer 2 add + Stroke B, then exact reverse/forward sequence.
    await page.locator('#addLayer').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.layerCount==='2');const added=await qa(page),layer2=added.layers.find(x=>x.name==='Layer 2');assert.ok(layer2?.id&&layer2?.surfaceId);
    await draw(page,box,[.62,.20],[.86,.30]);await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='2',{timeout:15000});await waitIdle(page);
    const both=await canvas.screenshot();assert.ok(darkIn(both,{x0:.08,y0:.12,x1:.42,y1:.35})>25);assert.ok(darkIn(both,{x0:.56,y0:.12,x1:.92,y1:.36})>25,'Stroke B not visible');
    await page.locator('#undo').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='1');await waitIdle(page);
    let shot=await canvas.screenshot();assert.ok(darkIn(shot,{x0:.08,y0:.12,x1:.42,y1:.35})>25,'Undo B damaged Stroke A');assert.ok(darkIn(shot,{x0:.56,y0:.12,x1:.92,y1:.36})<8,'Undo B did not remove only B');
    await page.locator('#undo').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.layerCount==='1');await waitIdle(page);
    let state=await qa(page);assert.ok(state.layers.some(x=>x.id===state.selectedLayerId),'selectedLayer became dangling after layer Undo');assert.ok(!state.layers.some(x=>x.id===layer2.id),'Layer 2 remained after add-layer Undo');
    shot=await canvas.screenshot();assert.ok(darkIn(shot,{x0:.08,y0:.12,x1:.42,y1:.35})>25,'Layer Undo damaged Layer 1 artwork');
    await page.locator('#redo').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.layerCount==='2');await waitIdle(page);
    state=await qa(page);const restored=state.layers.find(x=>x.name==='Layer 2');assert.equal(restored.id,layer2.id,'LayerId changed on Redo');assert.equal(restored.surfaceId,layer2.surfaceId,'SurfaceId changed on Redo');assert.ok(state.layers.some(x=>x.id===state.selectedLayerId),'selection invalid after layer Redo');
    await page.locator('#redo').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='2');await waitIdle(page);
    shot=await canvas.screenshot();assert.ok(darkIn(shot,{x0:.08,y0:.12,x1:.42,y1:.35})>25);assert.ok(darkIn(shot,{x0:.56,y0:.12,x1:.92,y1:.36})>25,'Redo B did not restore B on Layer 2');

    // Undo B then draw C: old Redo must disappear.
    await page.locator('#undo').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='1');await waitIdle(page);
    await draw(page,box,[.15,.66],[.42,.76]);await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='2',{timeout:15000});await waitIdle(page);
    assert.equal(await canvas.getAttribute('data-can-redo'),'false','new Stroke after Undo kept old Redo route');assert.equal(await page.locator('#redo').isDisabled(),true,'Redo button stayed enabled after new branch');

    // Keyboard Undo/Redo and text-edit protection.
    const revC=await canvas.getAttribute('data-revision-id');await page.keyboard.press('Control+z');await waitIdle(page);assert.notEqual(await canvas.getAttribute('data-revision-id'),revC,'Ctrl+Z did not Undo');
    await page.keyboard.press('Control+Shift+z');await waitIdle(page);assert.equal(await canvas.getAttribute('data-revision-id'),revC,'Ctrl+Shift+Z did not Redo');
    await page.keyboard.press('Control+z');await waitIdle(page);await page.keyboard.press('Control+y');await waitIdle(page);assert.equal(await canvas.getAttribute('data-revision-id'),revC,'Ctrl+Y did not Redo');
    const beforeText=await canvas.getAttribute('data-revision-id');await page.locator('#sizeNumber').focus();await page.locator('#sizeNumber').fill('27');await page.keyboard.press('Control+z');await page.waitForTimeout(100);assert.equal(await canvas.getAttribute('data-revision-id'),beforeText,'text input Ctrl+Z stole artwork history');

    // Active stroke: History controls must be blocked; pointercancel must not add History.
    await canvas.focus();const beforeActive=await canvas.getAttribute('data-revision-id'),beforeCount=await canvas.getAttribute('data-committed-strokes');
    await page.mouse.move(box.x+.46*box.width,box.y+.48*box.height);await page.mouse.down();await page.mouse.move(box.x+.52*box.width,box.y+.53*box.height,{steps:5});await page.waitForTimeout(40);
    assert.equal(await page.locator('#undo').isDisabled(),true,'Undo remained enabled during active stroke');await page.keyboard.press('Control+z');assert.equal(await canvas.getAttribute('data-revision-id'),beforeActive,'History changed during active stroke');
    await canvas.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',button:0,bubbles:true,cancelable:true});await page.mouse.up();await waitIdle(page);await page.waitForTimeout(120);
    assert.equal(await canvas.getAttribute('data-revision-id'),beforeActive,'pointercancel created artwork history');assert.equal(await canvas.getAttribute('data-committed-strokes'),beforeCount,'pointercancel changed stroke count');

    // Rapid button attempts must serialize instead of throwing or corrupting state.
    await page.locator('#undo').evaluate(el=>{for(let i=0;i<8;i++)el.click();});await waitIdle(page);await page.locator('#redo').evaluate(el=>{for(let i=0;i<8;i++)el.click();});await waitIdle(page);
    state=await qa(page);assert.ok(state.layers.some(x=>x.id===state.selectedLayerId),'rapid History left invalid selected layer');assert.ok(state.historyPatchHits>=4,'recent Stroke Undo/Redo missed bounded hot tile cache');assert.equal(state.historyReplayFallbacks,0,'recent Stroke Undo/Redo replayed strokes instead of using hot cache');assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(evidence,`${backend}-m03-${publicBase?'public':'local'}.png`),fullPage:true});

    // Compact direct Undo/Redo and Android-black regression on same backend.
    const mobileErrors=[],mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36'});
    mobile.on('pageerror',e=>mobileErrors.push(e.message));mobile.on('console',m=>{if(m.type()==='error')mobileErrors.push(m.text());});await mobile.goto(pageUrl(backend),{waitUntil:'networkidle',timeout:45000});await mobile.locator('#qaPanel > summary').click();await mobile.getByRole('button',{name:'新規キャンバス',exact:true}).click();await mobile.waitForFunction(()=>!(document.getElementById('brush')?.disabled),{timeout:45000});
    const mc=mobile.locator('#canvas'),preview=mobile.locator('.latency-preview'),mb=await mc.boundingBox();assert.ok(mb);const compactStart=await qa(mobile);assert.equal(compactStart.rendererArtworkAlpha,true,'compact internal artwork alpha must remain preserved');assert.equal(compactStart.presentationOpaque,true,'compact visible presentation must be opaque');assert.equal(compactStart.rendererAlpha,false,'compact visible GPU Canvas must not expose compositor alpha');assert.equal(compactStart.presentationMode,'direct-gpu','all devices must use the same authoritative DOM GPU canvas');assert.equal(compactStart.presentationAlpha,false,'compact visible presentation must be opaque');assert.equal(await preview.count(),0,'compact route must not create any secondary latency canvas');assert.equal(compactStart.browserPredictionSamples,0,'prediction counter must start empty');await mobile.waitForTimeout(80);assert.ok(lightRatio(await mc.screenshot())>.92,'compact direct GPU Canvas is not white before drawing');
    await mobile.locator('#drawer').click();assert.equal(await mobile.locator('#workspace').evaluate(el=>el.classList.contains('open')),true,'compact Workspace did not open');
    await mobile.locator('#close').click();assert.equal(await mobile.locator('#workspace').evaluate(el=>el.classList.contains('open')),false,'compact Workspace did not close');
    assert.equal(await mobile.locator('#workspace').evaluate(el=>getComputedStyle(el).display),'block','closed Workspace was removed from the compact compositor tree');
    assert.equal(await mobile.locator('#workspace').evaluate(el=>getComputedStyle(el).pointerEvents),'none','closed compact Workspace can still receive pointer input');
    assert.equal(await mobile.locator('#workspace').evaluate(el=>getComputedStyle(el).opacity),'0','closed compact Workspace is still visibly covering the editor');
    assert.equal(await mobile.locator('#workspace').evaluate(el=>el.inert),true,'closed compact Workspace remained interactive');
    const workspaceCoversCenter=await mobile.evaluate(()=>{const c=document.querySelector('#canvas'),w=document.getElementById('workspace');if(!c||!w)return true;const r=c.getBoundingClientRect();return document.elementsFromPoint(r.left+r.width*.5,r.top+r.height*.5).some(el=>el===w||w.contains(el));});
    assert.equal(workspaceCoversCenter,false,'closed compact Workspace still participates in Canvas hit testing');
    await mobile.waitForTimeout(80);assert.ok(lightRatio(await mc.screenshot())>.92,'closing Workspace invalidated direct GPU canvas presentation');
    await mobile.evaluate(()=>{Object.defineProperty(PointerEvent.prototype,'getPredictedEvents',{configurable:true,value:function(){if(this.type!=='pointermove')return[];return[new PointerEvent('pointermove',{pointerId:this.pointerId,pointerType:this.pointerType,clientX:this.clientX+2,clientY:this.clientY+1,pressure:this.pressure,tiltX:this.tiltX,tiltY:this.tiltY,twist:this.twist})];}});});
    const framesBeforePen=await mobile.evaluate(()=>document.querySelector('#canvas')?.__illustroPresentationFrames??0);const penHeld=await penStroke(mobile,mc,mb,[.15,.35],[.82,.55]);assert.ok(lightRatio(penHeld)>.75,'compact direct GPU canvas turned mostly black while pen was held');assert.equal(await mc.getAttribute('data-last-pointer-target'),'canvas','pen pointerdown after Workspace close did not target Canvas');assert.equal(await mc.getAttribute('data-last-pointer-type'),'pen','pen route changed pointer type');assert.ok(darkIn(penHeld,{x0:.10,y0:.28,x1:.88,y1:.62})>20,'compact live pen stroke was not visible within 90ms while Workspace was closed');await mobile.waitForFunction(f=>(document.querySelector('canvas')?.__illustroPresentationFrames??0)>f,framesBeforePen,{timeout:2000});await mobile.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='1',{timeout:15000});await waitIdle(mobile);assert.ok((await qa(mobile)).browserPredictionSamples>0,'browser predicted events were not routed into the GPU brush engine');
    assert.equal(await mobile.locator('#compactUndo').isDisabled(),false);
    const ghostBefore=await qa(mobile);await mobile.locator('#drawer').click();await mobile.locator('#close').dispatchEvent('pointerdown',{pointerId:77,pointerType:'touch',button:0,bubbles:true});await mobile.locator('#close').dispatchEvent('click',{detail:1,bubbles:true});await mobile.locator('#compactUndo').dispatchEvent('click',{detail:1,bubbles:true});await mobile.waitForTimeout(80);const ghostAfter=await qa(mobile);assert.equal(ghostAfter.committedStrokeCount,ghostBefore.committedStrokeCount,'closing Workspace leaked a touch click into compact Undo');assert.equal(ghostAfter.undoCount,ghostBefore.undoCount,'closing Workspace unexpectedly executed Undo');assert.equal(ghostAfter.blockedHistoryGhostClicks,ghostBefore.blockedHistoryGhostClicks+1,'close-originated history ghost click was not rejected');
    await mobile.locator('#compactUndo').click();await mobile.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='0');await waitIdle(mobile);assert.ok(darkIn(await mc.screenshot(),{x0:.08,y0:.20,x1:.90,y1:.70})<8,'compact Undo left stroke visible');
    assert.equal(await mobile.locator('#compactRedo').isDisabled(),false);await mobile.locator('#compactRedo').click();await mobile.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='1');await waitIdle(mobile);assert.ok(darkIn(await mc.screenshot(),{x0:.08,y0:.20,x1:.90,y1:.70})>25,'compact Redo did not restore stroke');
    const framesBeforeTouch=await mobile.evaluate(()=>document.querySelector('#canvas')?.__illustroPresentationFrames??0);const touchHeld=await touchStroke(mobile,mc,mb,[.12,.70],[.42,.76]);assert.ok(lightRatio(touchHeld)>.75,'finger drawing turned the compact direct GPU canvas mostly black');assert.equal(await mc.getAttribute('data-last-pointer-target'),'canvas','touch pointerdown after Workspace close was retargeted to UI');assert.equal(await mc.getAttribute('data-last-pointer-type'),'touch','touch route changed pointer type');assert.ok(darkIn(touchHeld,{x0:.08,y0:.64,x1:.48,y1:.82})>20,'compact live touch stroke was not visible within 90ms while Workspace was closed');await mobile.waitForFunction(f=>(document.querySelector('canvas')?.__illustroPresentationFrames??0)>f,framesBeforeTouch,{timeout:2000});await mobile.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='2',{timeout:15000});await waitIdle(mobile);
    const heldMore=await touchStroke(mobile,mc,mb,[.52,.70],[.82,.76]);assert.equal(await mc.getAttribute('data-last-pointer-target'),'canvas','later touch pointerdown after Workspace close was retargeted to UI');assert.ok(darkIn(heldMore,{x0:.48,y0:.64,x1:.88,y1:.82})>20,'later compact live stroke was not visible within 90ms while Workspace was closed');await mobile.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='3',{timeout:15000});await waitIdle(mobile);
    // QA exposes the authoritative GPU artwork/front-buffer state. Production
    // compact must have no latency overlay at all.
    await mobile.locator('#qaPanel > summary').click();
    await mobile.locator('#qaDiagInitial').evaluate(el=>(el.closest('details')).open=true);
    await mobile.locator('#qaDiagInitial').click();
    await mobile.waitForFunction(()=>document.querySelector('#qaGpuReport')?.textContent?.includes('"gpuArtwork"'),{timeout:10000});
    const beforeDiagnostic=await mobile.locator('#qaGpuReport').textContent();
    assert.ok(beforeDiagnostic?.includes('"gpuVisibleCanvas"'),'GPU front-buffer diagnostics are missing');
    assert.ok(beforeDiagnostic?.includes('"previewPresent": false'),'production diagnostics report a forbidden secondary preview canvas');
    await mobile.locator('#qaPanel > summary').click();
    assert.deepEqual(mobileErrors,[]);await mobile.screenshot({path:path.join(evidence,`${backend}-m03-${publicBase?'public':'local'}-compact.png`),fullPage:true});await mobile.close();

    report.backends.push({backend,status:'PASS',strokeUndoRedo:true,layerUndoRedo:true,identityStable:true,selectionValid:true,redoBranchDiscard:true,keyboard:true,activeStrokeBlocked:true,pointerCancelNoHistory:true,rapidHistorySafe:true,compactUndoRedo:true,historyPatchHits:state.historyPatchHits,historyReplayFallbacks:state.historyReplayFallbacks,workspaceCloseDrawing:true,directGpuPresentation:true,gpuPredictionPath:true,canvasViewPaper:true,androidPresentationRegression:true,historyGhostClickGuard:true,commit:state.commit,consoleErrors:errors});
    await page.close();
  }

  // Production route with no backend query. Backend selection is capability-based:
  // fully usable WebGPU wins; otherwise the recorded failure falls back to WebGL2.
  {
    const autoErrors=[],auto=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36'});
    auto.on('pageerror',e=>autoErrors.push(e.message));auto.on('console',m=>{if(m.type()==='error')autoErrors.push(m.text());});
    const autoUrl=publicBase?base+`?m03-public-check=1&build=${encodeURIComponent(expectedCommit)}`:base+'?qa=1';
    await auto.goto(autoUrl,{waitUntil:'networkidle',timeout:45000});await auto.locator('#qaPanel > summary').click();await auto.getByRole('button',{name:'新規キャンバス',exact:true}).click();await auto.waitForFunction(()=>!(document.getElementById('brush')?.disabled),{timeout:45000});
    const canvas=auto.locator('#canvas'),preview=auto.locator('.latency-preview'),box=await canvas.boundingBox();assert.ok(box);
    const state=await qa(auto);assert.equal(state.backendSelection.requested,'auto','production route did not use capability-based auto selection');assert.equal(state.backendSelection.selected,String(state.backend).toLowerCase().includes('webgpu')?'webgpu':'webgl2');if(state.backendSelection.webgpu.usable){assert.ok(String(state.backend).toLowerCase().includes('webgpu'),'usable WebGPU was incorrectly bypassed');assert.equal(state.backendSelection.fallbackUsed,false,'usable WebGPU incorrectly fell back');assert.equal(state.backendSelection.webgpu.stage,'ready');}else{assert.ok(String(state.backend).toLowerCase().includes('webgl2'),'unusable WebGPU did not fall back to WebGL2');assert.equal(state.backendSelection.fallbackUsed,true,'WebGPU failure was not recorded as fallback');assert.ok(state.backendSelection.webgpu.error,'WebGPU fallback has no recorded reason');}assert.equal(state.presentationMode,'direct-gpu','production route must use the same direct DOM GPU presentation on every device');assert.equal(state.rendererArtworkAlpha,true,'production internal artwork must preserve alpha');assert.equal(state.presentationOpaque,true,'production visible presentation must be opaque');assert.equal(state.presentationAlpha,false,'production GPU Canvas must not depend on compositor transparency');assert.equal(state.rendererAlpha,false);assert.equal(await preview.count(),0,'production compact route must not create any secondary latency canvas');assert.ok(lightRatio(await canvas.screenshot())>.92,'production compact direct GPU Canvas starts black');await auto.locator('#drawer').click();await auto.locator('#close').click();assert.equal(await auto.locator('#workspace').evaluate(el=>getComputedStyle(el).display),'block','production compact close removed Workspace from compositor tree');assert.ok(lightRatio(await canvas.screenshot())>.92,'production compact Workspace close blackened Canvas');
    const framesBefore=await auto.evaluate(()=>document.querySelector('#canvas')?.__illustroPresentationFrames??0);const held=await penStroke(auto,canvas,box,[.18,.32],[.78,.50]);assert.ok(lightRatio(held)>.75,'production compact direct GPU Canvas turned mostly black while drawing');assert.equal(await canvas.getAttribute('data-last-pointer-target'),'canvas');assert.ok(darkIn(held,{x0:.12,y0:.25,x1:.84,y1:.58})>20,'production compact stroke was not visible within 90ms while Workspace was closed');await auto.waitForFunction(f=>(document.querySelector('canvas')?.__illustroPresentationFrames??0)>f,framesBefore,{timeout:2000});await auto.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='1',{timeout:15000});await waitIdle(auto);
    assert.deepEqual(autoErrors,[]);report.compactProductionRoute={backend:state.backend,presentationMode:state.presentationMode,presentationAlpha:state.presentationAlpha,presentationDesynchronized:state.presentationDesynchronized,rendererDesynchronized:state.rendererDesynchronized,workspaceCloseDrawing:true,gpuPredictionPath:true,directGpuPresentation:true,stableWorkspaceCompositor:true};await auto.close();
  }

  // Desktop and compact share the same capability decision; viewport size must not
  // force a backend or bypass a WebGPU implementation that actually initializes.
  {
    const desktop=await browser.newPage({viewport:{width:1280,height:900}});
    const url=publicBase?base+'?m03-public-check=1&build='+encodeURIComponent(expectedCommit):base+'?qa=1';
    await desktop.goto(url,{waitUntil:'networkidle',timeout:45000});
    await desktop.locator('#qaPanel > summary').click();
    await desktop.getByRole('button',{name:'新規キャンバス',exact:true}).click();
    await desktop.waitForFunction(()=>!(document.getElementById('brush')?.disabled),{timeout:45000});
    const desktopState=await qa(desktop);
    assert.equal(desktopState.backendSelection.requested,'auto','desktop production route did not use auto selection');
    if(desktopState.backendSelection.webgpu.usable){assert.ok(String(desktopState.backend).toLowerCase().includes('webgpu'),'desktop bypassed usable WebGPU');assert.equal(desktopState.backendSelection.fallbackUsed,false);}else{assert.ok(String(desktopState.backend).toLowerCase().includes('webgl2'),'desktop failed to fall back from unusable WebGPU');assert.equal(desktopState.backendSelection.fallbackUsed,true);assert.ok(desktopState.backendSelection.webgpu.error);}
    assert.equal(desktopState.presentationMode,'direct-gpu','desktop production route is not direct GPU');
    assert.equal(desktopState.rendererArtworkAlpha,true,'desktop internal artwork lost alpha');
    assert.equal(desktopState.presentationOpaque,true,'desktop visible presentation is not opaque');
    assert.equal(desktopState.presentationAlpha,false,'desktop visible Canvas still depends on alpha compositing');
    assert.equal(await desktop.locator('.latency-preview').count(),0,'desktop production route created a secondary canvas');
    assert.ok(lightRatio(await desktop.locator('#canvas').screenshot())>.92,'desktop production canvas starts black');
    report.productionBackendPolicy={desktop:desktopState.backend,compact:'auto-capability',capabilityBased:true,usableWebGpuNeverBypassed:true};
    await desktop.close();
  }
  // Capability fallback: navigator.gpu exists, but no adapter can be acquired.
  // This must fall back in auto mode, and only in this case.
  {
    const fallback=await browser.newPage({viewport:{width:900,height:700}});
    await fallback.addInitScript(()=>{Object.defineProperty(navigator,'gpu',{configurable:true,value:{requestAdapter:async()=>null}});});
    const url=publicBase?base+'?m03-public-check=1&build='+encodeURIComponent(expectedCommit):base+'?qa=1';
    await fallback.goto(url,{waitUntil:'networkidle',timeout:45000});
    await fallback.locator('#qaPanel').evaluate(el=>el.open=true);
    await fallback.getByRole('button',{name:'新規キャンバス',exact:true}).click();
    await fallback.waitForFunction(()=>!(document.getElementById('brush')?.disabled),{timeout:45000});
    const fallbackState=await qa(fallback);
    assert.ok(String(fallbackState.backend).toLowerCase().includes('webgl2'),'auto mode did not fall back when requestAdapter returned null');
    assert.equal(fallbackState.backendSelection.requested,'auto');
    assert.equal(fallbackState.backendSelection.selected,'webgl2');
    assert.equal(fallbackState.backendSelection.fallbackUsed,true);
    assert.equal(fallbackState.backendSelection.webgpu.apiAvailable,true);
    assert.equal(fallbackState.backendSelection.webgpu.attempted,true);
    assert.equal(fallbackState.backendSelection.webgpu.usable,false);
    assert.equal(fallbackState.backendSelection.webgpu.stage,'request-adapter');
    assert.match(fallbackState.backendSelection.webgpu.error,/requestAdapter returned null/);
    assert.ok(lightRatio(await fallback.locator('#canvas').screenshot())>.92,'fallback WebGL2 canvas is not usable');
    report.webGpuFallbackProbe={status:'PASS',apiVisible:true,adapterUnavailable:true,selected:'webgl2',reasonRecorded:true};
    await fallback.close();
  }

  // Explicit WebGPU is diagnostic/strict: failure must be surfaced, never hidden by fallback.
  {
    const forced=await browser.newPage({viewport:{width:900,height:700}});
    await forced.addInitScript(()=>{Object.defineProperty(navigator,'gpu',{configurable:true,value:{requestAdapter:async()=>null}});});
    const url=(publicBase?base+'?m03-public-check=1&build='+encodeURIComponent(expectedCommit)+'&':base+'?qa=1&')+'backend=webgpu';
    await forced.goto(url,{waitUntil:'networkidle',timeout:45000});
    await forced.locator('#qaPanel').evaluate(el=>el.open=true);
    await forced.getByRole('button',{name:'新規キャンバス',exact:true}).click();
    await forced.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('WebGPU unavailable at request-adapter'),{timeout:10000});
    assert.equal(await forced.locator('#brush').isDisabled(),true,'forced unusable WebGPU silently fell back instead of failing');
    const forcedText=await forced.locator('#status').textContent();
    assert.match(forcedText??'',/request-adapter/);
    report.webGpuForcedFailure={status:'PASS',fallbackForbidden:true,stageVisible:'request-adapter'};
    await forced.close();
  }

  // Historical regression: even an old latency query must not be able to
  // resurrect the removed secondary Canvas.
  {
    const clean=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    const url=(publicBase?base+'?m03-public-check=1&':base+'?qa=1&')+'latency=legacy';
    await clean.goto(url,{waitUntil:'networkidle',timeout:45000});
    await clean.locator('#qaPanel > summary').click();
    await clean.getByRole('button',{name:'新規キャンバス',exact:true}).click();
    await clean.waitForFunction(()=>!(document.getElementById('brush')?.disabled),{timeout:45000});
    assert.equal(await clean.locator('.latency-preview').count(),0,'obsolete latency query resurrected the removed 2D overlay');
    const box=await clean.locator('#canvas').boundingBox();assert.ok(box);
    const held=await touchStroke(clean,clean.locator('#canvas'),box,[.14,.38],[.82,.59]);
    assert.ok(lightRatio(held)>.75,'overlay-off route turned black during finger drawing');
    await clean.waitForFunction(()=>document.querySelector('#canvas')?.dataset.committedStrokes==='1',{timeout:15000});
    assert.equal((await qa(clean)).presentationMode,'direct-gpu');
    report.removedOverlayRegression={status:'PASS',legacyQueryCannotReenableOverlay:true,fingerDrawing:true,blackCanvas:false,committedStrokeCount:1};
    await clean.close();
  }
  report.status='PASS';
}catch(e){report.failure=e?.stack??String(e);throw e;
}finally{
  await fs.writeFile(path.join(evidence,`m03-${publicBase?'public':'local'}-smoke.json`),JSON.stringify(report,null,2));await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify(report,null,2));if(report.status!=='PASS')process.exitCode=1;
