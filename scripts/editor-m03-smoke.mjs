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
function pageUrl(backend){if(publicBase)return base+`?backend=${backend}&m03-public-check=1&build=${encodeURIComponent(expectedCommit)}`;return base+`?qa=1&backend=${backend}`;}
try{
  for(const backend of ['webgl2','webgpu']){
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(pageUrl(backend),{waitUntil:'networkidle',timeout:45000});
    assert.equal(await page.locator('#qaPanel').count(),1,'M03 QA panel missing');await page.locator('#qaPanel > summary').click();
    await page.getByRole('button',{name:'新規キャンバス',exact:true}).click();await page.waitForFunction(()=>!(document.getElementById('brush')?.disabled),{timeout:45000});
    const canvas=page.locator('canvas'),box=await canvas.boundingBox();assert.ok(box);
    await canvas.evaluate(el=>el.style.background='#000');await page.waitForTimeout(80);assert.ok(lightRatio(await canvas.screenshot())>.92,'blank renderer paper regressed to dark canvas');
    assert.equal(await page.locator('#undo').isDisabled(),true);assert.equal(await page.locator('#redo').isDisabled(),true);
    const start=await qa(page);assert.equal(start.milestone,'M03');assert.equal(start.layerCount,1);assert.equal(start.canUndo,false);assert.equal(start.canRedo,false);assert.ok(String(start.backend).toLowerCase().includes(backend));if(expectedCommit)assert.equal(start.commit,expectedCommit);

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
    state=await qa(page);assert.ok(state.layers.some(x=>x.id===state.selectedLayerId),'rapid History left invalid selected layer');assert.ok(state.historyPatchHits>=4,'normal Stroke Undo/Redo did not use direct GPU tile patches');assert.equal(state.historyReplayFallbacks,0,'normal Stroke Undo/Redo fell back to Stroke replay');assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(evidence,`${backend}-m03-${publicBase?'public':'local'}.png`),fullPage:true});

    // Compact direct Undo/Redo and Android-black regression on same backend.
    const mobileErrors=[],mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36'});
    mobile.on('pageerror',e=>mobileErrors.push(e.message));mobile.on('console',m=>{if(m.type()==='error')mobileErrors.push(m.text());});await mobile.goto(pageUrl(backend),{waitUntil:'networkidle',timeout:45000});await mobile.locator('#qaPanel > summary').click();await mobile.getByRole('button',{name:'新規キャンバス',exact:true}).click();await mobile.waitForFunction(()=>!(document.getElementById('brush')?.disabled),{timeout:45000});
    const mc=mobile.locator('canvas'),mb=await mc.boundingBox();assert.ok(mb);await mc.evaluate(el=>el.style.background='#000');await mobile.waitForTimeout(80);assert.ok(lightRatio(await mc.screenshot())>.92,'compact blank presentation is dark');
    await mobile.locator('#drawer').click();assert.equal(await mobile.locator('#workspace').evaluate(el=>el.classList.contains('open')),true,'compact Workspace did not open');
    await mobile.locator('#close').click();assert.equal(await mobile.locator('#workspace').evaluate(el=>el.classList.contains('open')),false,'compact Workspace did not close');
    assert.equal(await mobile.locator('#workspace').evaluate(el=>getComputedStyle(el).display),'block','closing Workspace removed its compositor subtree');
    assert.equal(await mobile.locator('#workspace').evaluate(el=>getComputedStyle(el).visibility),'hidden','closed Workspace remained visually active');
    assert.equal(await mobile.locator('#workspace').evaluate(el=>getComputedStyle(el).opacity),'0','closed Workspace still covered Canvas');
    assert.equal(await mobile.locator('#workspace').evaluate(el=>el.inert),true,'closed compact Workspace remained interactive');
    await mobile.waitForTimeout(80);assert.ok(lightRatio(await mc.screenshot())>.92,'closing Workspace invalidated canvas presentation');
    const held=await touchStroke(mobile,mc,mb,[.15,.35],[.82,.55]);assert.ok(lightRatio(held)>.72,'compact live stroke after Workspace close did not update');await mobile.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='1',{timeout:15000});await waitIdle(mobile);
    assert.equal(await mobile.locator('#compactUndo').isDisabled(),false);await mobile.locator('#compactUndo').click();await mobile.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='0');await waitIdle(mobile);assert.ok(darkIn(await mc.screenshot(),{x0:.08,y0:.20,x1:.90,y1:.70})<8,'compact Undo left stroke visible');
    assert.equal(await mobile.locator('#compactRedo').isDisabled(),false);await mobile.locator('#compactRedo').click();await mobile.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='1');await waitIdle(mobile);assert.ok(darkIn(await mc.screenshot(),{x0:.08,y0:.20,x1:.90,y1:.70})>25,'compact Redo did not restore stroke');
    assert.deepEqual(mobileErrors,[]);await mobile.screenshot({path:path.join(evidence,`${backend}-m03-${publicBase?'public':'local'}-compact.png`),fullPage:true});await mobile.close();

    report.backends.push({backend,status:'PASS',strokeUndoRedo:true,layerUndoRedo:true,identityStable:true,selectionValid:true,redoBranchDiscard:true,keyboard:true,activeStrokeBlocked:true,pointerCancelNoHistory:true,rapidHistorySafe:true,compactUndoRedo:true,historyPatchHits:state.historyPatchHits,historyReplayFallbacks:state.historyReplayFallbacks,workspaceCloseDrawing:true,androidPresentationRegression:true,commit:state.commit,consoleErrors:errors});
    await page.close();
  }
  report.status='PASS';
}catch(e){report.failure=e?.stack??String(e);throw e;
}finally{
  await fs.writeFile(path.join(evidence,`m03-${publicBase?'public':'local'}-smoke.json`),JSON.stringify(report,null,2));await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify(report,null,2));if(report.status!=='PASS')process.exitCode=1;
