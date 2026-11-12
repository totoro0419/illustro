import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const {PNG}=require(process.env.PREP_PNG_PATH??'pngjs');
const publicBase=(process.env.M04_PUBLIC_URL??'').trim();
const expectedCommit=(process.env.EXPECTED_COMMIT_SHA??'').trim();
const evidence=path.resolve(process.env.M04_EVIDENCE_DIRECTORY??'/tmp/illustro-m04');
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
const report={milestone:'M04',mode:publicBase?'public':'local',url:base,status:'FAIL',backends:[]};

function pageUrl(backend){return publicBase?base+`?backend=${backend}&m04-public-check=1&build=${encodeURIComponent(expectedCommit)}`:base+`?qa=1&backend=${backend}`;}
async function qa(page){return JSON.parse((await page.locator('#qaAuto').textContent())??'{}');}
async function waitIdle(page){await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.historyBusy==='false',{timeout:15000});}
async function waitStroke(page,count){await page.waitForFunction(n=>document.querySelector('canvas')?.dataset.committedStrokes===String(n),count,{timeout:15000});await waitIdle(page);}
async function draw(page,box,a,b,steps=24){await page.mouse.move(box.x+a[0]*box.width,box.y+a[1]*box.height);await page.mouse.down();await page.mouse.move(box.x+b[0]*box.width,box.y+b[1]*box.height,{steps});await page.mouse.up();}
async function diag(page){
  await page.locator('#qaPanel').evaluate(el=>el.open=true);await page.locator('#qaDiagInitial').evaluate(el=>el.closest('details').open=true);await page.locator('#qaDiagInitial').click();
  await page.waitForFunction(()=>document.querySelector('#qaGpuReport')?.textContent?.includes('"selectedRasterSurface"'),{timeout:10000});
  const value=JSON.parse((await page.locator('#qaGpuReport').textContent())??'{}');await page.locator('#qaPanel').evaluate(el=>el.open=false);return value;
}
function center(buffer){const png=PNG.sync.read(buffer),x=Math.floor(png.width/2),y=Math.floor(png.height/2),i=(y*png.width+x)*4;return Array.from(png.data.slice(i,i+4));}
function darkCount(buffer,rect){const png=PNG.sync.read(buffer);let n=0;const x0=Math.floor(rect.x0*png.width),x1=Math.ceil(rect.x1*png.width),y0=Math.floor(rect.y0*png.height),y1=Math.ceil(rect.y1*png.height);for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*png.width+x)*4;if(png.data[i]<160&&png.data[i+1]<160&&png.data[i+2]<160)n++;}return n;}
async function selectPreset(page,id){await page.locator('#brush').selectOption(id);await page.waitForFunction(id=>document.querySelector('canvas')?.dataset.selectedPresetId===id,id);}
async function setSize(page,value){await page.locator('#sizeNumber').fill(String(value));await page.locator('#sizeNumber').dispatchEvent('input');}
async function penStroke(page,canvas,box,a,b){
  const cdp=await page.context().newCDPSession(page),sx=box.x+a[0]*box.width,sy=box.y+a[1]*box.height,ex=box.x+b[0]*box.width,ey=box.y+b[1]*box.height;
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:sx,y:sy,pointerType:'pen'});
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:sx,y:sy,button:'left',buttons:1,clickCount:1,force:.65,pointerType:'pen'});
  for(let i=1;i<=12;i++){const t=i/12;await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:sx+(ex-sx)*t,y:sy+(ey-sy)*t,button:'left',buttons:1,force:.65,pointerType:'pen'});}
  await page.waitForTimeout(90);const held=await canvas.screenshot();
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:ex,y:ey,button:'left',buttons:0,clickCount:1,pointerType:'pen'});await cdp.detach();return held;
}
async function touchStroke(page,canvas,box,a,b){
  await page.locator('#finger').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
  const cdp=await page.context().newCDPSession(page),start={x:box.x+a[0]*box.width,y:box.y+a[1]*box.height,id:1,radiusX:2,radiusY:2,force:.65},end={x:box.x+b[0]*box.width,y:box.y+b[1]*box.height,id:1,radiusX:2,radiusY:2,force:.65};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});for(let i=1;i<=10;i++){const t=i/10;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...start,x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t}]});}
  await page.waitForTimeout(90);const held=await canvas.screenshot();await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();return held;
}

try{
  for(const backend of ['webgl2','webgpu']){
    const errors=[],page=await browser.newPage({viewport:{width:1280,height:900}});
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(pageUrl(backend),{waitUntil:'networkidle',timeout:45000});await page.locator('#qaPanel > summary').click();
    await page.getByRole('button',{name:'新規キャンバス',exact:true}).click();await page.waitForFunction(()=>!(document.getElementById('brush')?.disabled),{timeout:45000});
    const canvas=page.locator('#canvas'),box=await canvas.boundingBox();assert.ok(box);
    let state=await qa(page);assert.equal(state.milestone,'M04');assert.equal(state.backendSelection.requested,backend);assert.equal(state.backendSelection.selected,backend);assert.equal(state.backendSelection.fallbackUsed,false);assert.equal(state.rendererArtworkAlpha,true);assert.equal(state.presentationOpaque,true);assert.equal(state.presentationMode,'direct-gpu');if(expectedCommit)assert.equal(state.commit,expectedCommit);

    // Lower Layer: paint through center, then add a new Layer and paint the same path.
    await setSize(page,72);await draw(page,box,[.15,.50],[.85,.50]);await waitStroke(page,1);
    const lowerBefore=await diag(page);assert.ok(lowerBefore.selectedRasterSurface.center[3]>180,'Layer 1 center did not contain paint');
    const lowerRgb=lowerBefore.selectedRasterSurface.center.slice(0,3);assert.ok(lowerRgb.some(v=>v>0),'test paint did not retain a non-zero RGB value');
    await page.locator('#addLayer').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.layerCount==='2');
    state=await qa(page);const layer1=state.layers.find(x=>x.name==='Layer 1'),layer2=state.layers.find(x=>x.name==='Layer 2');assert.ok(layer1?.id&&layer2?.id&&layer1.surfaceId!==layer2.surfaceId);
    await draw(page,box,[.15,.50],[.85,.50]);await waitStroke(page,2);
    const upperBefore=await diag(page);assert.ok(upperBefore.selectedRasterSurface.center[3]>180,'Layer 2 center did not contain paint');
    const upperRgb=upperBefore.selectedRasterSurface.center.slice(0,3);

    // Hard Eraser: real alpha erase, hidden RGB preserved, lower Layer still visible.
    await selectPreset(page,'foundation-hard-eraser');state=await qa(page);assert.equal(state.selectedTool,'eraser');assert.equal(state.blendMode,'erase');assert.equal(state.eraserType,'hard');
    await setSize(page,160);await draw(page,box,[.42,.50],[.58,.50]);await waitStroke(page,3);
    state=await qa(page);assert.equal(state.eraserCommittedStrokeCount,1);assert.equal(state.totalStrokeCount,3);
    const upperErased=await diag(page);assert.equal(upperErased.selectedRasterSurface.center[3],0,'Hard Eraser did not fully erase Layer 2 center alpha');
    assert.deepEqual(upperErased.selectedRasterSurface.center.slice(0,3),upperRgb,'erase-to-zero destroyed hidden RGB');
    assert.ok(center(await canvas.screenshot()).slice(0,3).some(v=>v<160),'erasing Layer 2 did not reveal the painted lower Layer');

    // Layer 1 formal pixels must be unchanged.
    await page.locator(`.layer-row[data-layer-id="${layer1.id}"]`).click();const lowerAfter=await diag(page);
    assert.equal(lowerAfter.selectedRasterSurface.center[3],lowerBefore.selectedRasterSurface.center[3],'Layer 2 erase changed Layer 1 alpha');
    assert.deepEqual(lowerAfter.selectedRasterSurface.center.slice(0,3),lowerRgb,'Layer 2 erase changed Layer 1 RGB');
    await page.locator(`.layer-row[data-layer-id="${layer2.id}"]`).click();

    // M03 hot History path applies to Eraser.
    await page.locator('#undo').click();await waitIdle(page);let restored=await diag(page);assert.ok(restored.selectedRasterSurface.center[3]>180,'Undo did not restore erased Layer 2 pixels');
    await page.locator('#redo').click();await waitIdle(page);let erasedAgain=await diag(page);assert.equal(erasedAgain.selectedRasterSurface.center[3],0,'Redo did not reapply Eraser');
    state=await qa(page);assert.ok(state.historyPatchHits>=2,'recent Eraser Undo/Redo missed hot tile cache');assert.equal(state.historyReplayFallbacks,0,'recent Eraser Undo/Redo fell back to replay');

    // Undo Hard erase, then Soft erase: old Redo is discarded; soft eraser is gradual.
    await page.locator('#undo').click();await waitIdle(page);await selectPreset(page,'foundation-soft-eraser');assert.equal((await qa(page)).eraserType,'soft');await setSize(page,160);
    await draw(page,box,[.42,.50],[.58,.50]);await waitStroke(page,3);state=await qa(page);assert.equal(state.canRedo,false,'new Soft Eraser stroke did not discard old Redo branch');
    const soft1=await diag(page),a1=soft1.selectedRasterSurface.center[3];assert.ok(a1>0&&a1<upperBefore.selectedRasterSurface.center[3],'Soft Eraser was not partial on first pass');
    await draw(page,box,[.42,.50],[.58,.50]);await waitStroke(page,4);const soft2=await diag(page),a2=soft2.selectedRasterSurface.center[3];assert.ok(a2<a1,'second Soft Eraser pass did not erase further');

    // Tool switching remembers the last Brush and last Eraser by stable IDs.
    await page.locator('#paint').click();state=await qa(page);assert.equal(state.selectedTool,'brush');const rememberedBrush=state.selectedPresetId;assert.notEqual(rememberedBrush,'foundation-soft-eraser');
    await page.locator('#erase').click();state=await qa(page);assert.equal(state.selectedPresetId,'foundation-soft-eraser');await page.locator('#paint').click();assert.equal((await qa(page)).selectedPresetId,rememberedBrush);

    // pointercancel must not create a formal erase Revision.
    await page.locator('#erase').click();const revBeforeCancel=await canvas.getAttribute('data-revision-id'),countBeforeCancel=await canvas.getAttribute('data-committed-strokes');
    await page.mouse.move(box.x+.20*box.width,box.y+.78*box.height);await page.mouse.down();await page.mouse.move(box.x+.32*box.width,box.y+.78*box.height,{steps:5});await page.waitForTimeout(30);
    await canvas.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',button:0,bubbles:true,cancelable:true});await page.mouse.up();await waitIdle(page);await page.waitForTimeout(100);
    assert.equal(await canvas.getAttribute('data-revision-id'),revBeforeCancel);assert.equal(await canvas.getAttribute('data-committed-strokes'),countBeforeCancel);

    // Large Eraser: no full-history fallback and operation completes.
    await selectPreset(page,'foundation-hard-eraser');await setSize(page,1000);const count=Number(await canvas.getAttribute('data-committed-strokes'));
    await draw(page,box,[.08,.20],[.92,.80],36);await waitStroke(page,count+1);state=await qa(page);assert.equal(state.historyReplayFallbacks,0);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(evidence,`${backend}-m04-${publicBase?'public':'local'}.png`),fullPage:true});

    // Compact/Android: Workspace closed, pen and touch erase stay live on the same direct GPU Canvas.
    const mobileErrors=[],mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36'});
    mobile.on('pageerror',e=>mobileErrors.push(e.message));mobile.on('console',m=>{if(m.type()==='error')mobileErrors.push(m.text());});
    await mobile.goto(pageUrl(backend),{waitUntil:'networkidle',timeout:45000});await mobile.locator('#qaPanel > summary').click();await mobile.getByRole('button',{name:'新規キャンバス',exact:true}).click();await mobile.waitForFunction(()=>!(document.getElementById('brush')?.disabled),{timeout:45000});
    const mc=mobile.locator('#canvas'),mb=await mc.boundingBox();assert.ok(mb);await mobile.locator('#paint').click();await setSize(mobile,140);await penStroke(mobile,mc,mb,[.12,.45],[.88,.45]);await waitStroke(mobile,1);
    const beforePenErase=await mc.screenshot();await mobile.locator('#erase').click();await setSize(mobile,180);await mobile.locator('#drawer').click();await mobile.locator('#close').click();
    assert.equal(await mobile.locator('#workspace').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
    const closedBox=await mc.boundingBox();assert.ok(closedBox);const heldPen=await penStroke(mobile,mc,closedBox,[.35,.45],[.65,.45]);assert.ok(darkCount(heldPen,{x0:.35,y0:.38,x1:.65,y1:.52})<darkCount(beforePenErase,{x0:.35,y0:.38,x1:.65,y1:.52}),'live pen Eraser did not visibly update within 90ms with Workspace closed');
    await waitStroke(mobile,2);assert.equal(await mc.getAttribute('data-last-pointer-target'),'canvas');assert.equal(await mc.getAttribute('data-last-pointer-type'),'pen');
    await mobile.locator('#paint').click();const lowerPaintBox=await mc.boundingBox();assert.ok(lowerPaintBox);await penStroke(mobile,mc,lowerPaintBox,[.12,.72],[.88,.72]);await waitStroke(mobile,3);const beforeTouchErase=await mc.screenshot();await mobile.locator('#erase').click();
    const framesBeforeTouch=await mobile.evaluate(()=>document.querySelector('#canvas')?.__illustroPresentationFrames??0),touchBox=await mc.boundingBox();assert.ok(touchBox);
    const heldTouch=await touchStroke(mobile,mc,touchBox,[.35,.72],[.65,.72]);
    const touchRect={x0:.35,y0:.65,x1:.65,y1:.79},touchBeforeDark=darkCount(beforeTouchErase,touchRect),touchHeldDark=darkCount(heldTouch,touchRect);
    const touchDebug={beforeDark:touchBeforeDark,heldDark:touchHeldDark,framesBefore:framesBeforeTouch,framesHeld:await mobile.evaluate(()=>document.querySelector('#canvas')?.__illustroPresentationFrames??0),lastPointerTarget:await mc.getAttribute('data-last-pointer-target'),lastPointerType:await mc.getAttribute('data-last-pointer-type'),committedStrokes:await mc.getAttribute('data-committed-strokes'),historyBusy:await mc.getAttribute('data-history-busy')};
    await fs.writeFile(path.join(evidence,`${backend}-touch-debug.json`),JSON.stringify(touchDebug,null,2));await fs.writeFile(path.join(evidence,`${backend}-touch-before.png`),beforeTouchErase);await fs.writeFile(path.join(evidence,`${backend}-touch-held.png`),heldTouch);
    assert.ok(touchHeldDark<touchBeforeDark,'live touch Eraser did not visibly update within 90ms with Workspace closed');
    await waitStroke(mobile,4);const ms=await qa(mobile);assert.equal(ms.eraserCommittedStrokeCount,2);assert.equal(await mc.getAttribute('data-last-pointer-target'),'canvas');assert.equal(await mc.getAttribute('data-last-pointer-type'),'touch');assert.equal(ms.presentationMode,'direct-gpu');assert.equal(await mobile.locator('.latency-preview').count(),0);assert.deepEqual(mobileErrors,[]);
    await mobile.screenshot({path:path.join(evidence,`${backend}-m04-${publicBase?'public':'local'}-compact.png`),fullPage:true});await mobile.close();

    report.backends.push({backend,status:'PASS',alphaErase:true,hiddenRgb:true,layerIsolation:true,hardEraser:true,softEraser:true,undoRedoHot:true,redoBranchDiscard:true,pointerCancel:true,toolMemory:true,largeEraser:true,workspaceClosedPen:true,workspaceClosedTouch:true,androidBlackRegression:true,commit:state.commit});
    await page.close();
  }

  // Production auto route: usable WebGPU wins; otherwise reasoned WebGL2 fallback.
  const autoErrors=[],auto=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36'});
  auto.on('pageerror',e=>autoErrors.push(e.message));auto.on('console',m=>{if(m.type()==='error')autoErrors.push(m.text());});
  const autoUrl=publicBase?base+`?m04-public-check=1&build=${encodeURIComponent(expectedCommit)}`:base+'?qa=1';
  await auto.goto(autoUrl,{waitUntil:'networkidle',timeout:45000});await auto.locator('#qaPanel > summary').click();await auto.getByRole('button',{name:'新規キャンバス',exact:true}).click();await auto.waitForFunction(()=>!(document.getElementById('brush')?.disabled),{timeout:45000});
  const autos=await qa(auto);assert.equal(autos.backendSelection.requested,'auto');if(autos.backendSelection.webgpu.usable){assert.equal(autos.backendSelection.selected,'webgpu');assert.equal(autos.backendSelection.fallbackUsed,false);}else{assert.equal(autos.backendSelection.selected,'webgl2');assert.equal(autos.backendSelection.fallbackUsed,true);assert.ok(autos.backendSelection.webgpu.error);}
  assert.equal(autos.presentationMode,'direct-gpu');assert.deepEqual(autoErrors,[]);report.productionAuto={status:'PASS',backend:autos.backend,selection:autos.backendSelection};await auto.close();

  report.status='PASS';
}catch(e){report.failure=e?.stack??String(e);throw e;
}finally{
  await fs.writeFile(path.join(evidence,`m04-${publicBase?'public':'local'}-smoke.json`),JSON.stringify(report,null,2));await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify(report,null,2));if(report.status!=='PASS')process.exitCode=1;
