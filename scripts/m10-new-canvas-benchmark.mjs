import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const {chromium}=createRequire(import.meta.url)(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const directory=path.resolve('apps/editor/dist');
const destination=process.env.M10_CANVAS_STARTUP_EVIDENCE??'/tmp/illustro-m10-quality/initial-canvas.json';
const configurations=[
 {width:512,height:384,background:'transparent',backend:'webgl2'},
 {width:2048,height:1536,background:'white',backend:'webgpu'},
 {width:4000,height:4000,background:'transparent',backend:'webgl2'}
];
const results=[];
await fs.mkdir(path.dirname(destination),{recursive:true});
const server=http.createServer(async(req,res)=>{
 try{
  const uri=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(directory,'.'+(uri==='/'?'/index.html':uri));
  if(!file.startsWith(directory+path.sep))throw Error('invalid path');
  const value=await fs.readFile(file);
  res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(file)]??'application/octet-stream');
  res.end(value);
 }catch{res.writeHead(404).end();}
});
let browser;
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
 for(const item of configurations){
  const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true,deviceScaleFactor:2});
  const page=await context.newPage(),pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  try{
   await page.goto('http://127.0.0.1:'+server.address().port+'/?perf=1&backend='+item.backend);
   // A typical artist spends time on Home choosing a document. Verify that
   // the EXACT prepared GPU host survives the Create button, not just a spare
   // unrelated warmup context or an early fake "ready" label.
   let prewarmed=false;
   if(item.width===512&&item.height===384&&item.background==='transparent'){
    await page.waitForFunction(()=>['ready','failed','skipped'].includes(window.__illustroWarmup?.state),null,{timeout:45000});
    const progress=await page.evaluate(()=>window.__illustroWarmup);
    assert.equal(progress.state,'ready','Home prewarm status: '+JSON.stringify(progress));
    assert.ok(await page.evaluate(()=>performance.getEntriesByName('illustro-canvas:home-gpu-prewarm').length>0));
    prewarmed=true;
   }
   await page.locator('#ihStart').click();
   if(item.width===4000&&item.height===4000){
    const option=page.locator('[data-ih-preset="4000x4000"]');
    assert.equal(await option.textContent(),'超高画質（4000×4000）','the high-resolution preset must be visible and correctly labeled');
    await option.click();
    assert.equal(await page.locator('#ihNewWidth').inputValue(),'4000','the preset must apply the width');
    assert.equal(await page.locator('#ihNewHeight').inputValue(),'4000','the preset must apply the height');
    assert.equal(await option.getAttribute('aria-pressed'),'true','the preset must indicate selection');
    // Verify the real 4000px drawing host is prepared while the dialog is open.
    await page.waitForFunction(()=>window.__illustroWarmup?.state==='ready'&&window.__illustroWarmup?.detail==='4000x4000',
      null,{timeout:60000});
    prewarmed=true;
   }
   await page.locator('#ihNewWidth').fill(String(item.width));
   await page.locator('#ihNewHeight').fill(String(item.height));
   await page.locator('#ihNewBackground').selectOption(item.background);
   if(item.background==='white'){
    // White must be the actual preinitialized drawing document, not a CSS
    // imitation while a large replay continues after Create.
    await page.waitForFunction(
      size=>window.__illustroWarmup?.state==='ready'&&window.__illustroWarmup?.detail===size,
      item.width+'x'+item.height,{timeout:90000});
    prewarmed=true;
   }
   const start=Date.now();
   await page.locator('#ihNewCreate').click();
   await page.waitForFunction(()=>{
    const app=document.getElementById('app'),brush=document.getElementById('brush'),status=document.getElementById('status');
    return app&&!app.inert&&brush&&!brush.disabled&&status?.textContent?.includes('描画できます');
   },null,{timeout:120000});
   const wallClockMs=Date.now()-start;
   const data=await page.evaluate(()=>({
    measures:performance.getEntriesByType('measure').filter(e=>e.name.startsWith('illustro-canvas:')).map(e=>({stage:e.name.slice('illustro-canvas:'.length),ms:Math.round(e.duration*10)/10})),
    backend:document.getElementById('canvas')?.dataset.backend??'',
    gpuWarmupMs:window.__illustroPerformance?.probe?.()?.renderer?.info?.preparationWallMs??null,
    gpuPreparationPaths:window.__illustroPerformance?.probe?.()?.renderer?.info?.preparationPaths??null,
    hasDrawingSurface:!!document.getElementById('canvas')?.getBoundingClientRect().width,
    errorText:document.getElementById('status')?.textContent??'',
    documentSize:window.__illustroPerformance?.probe?.()?.controller?.document?.root?
     {width:window.__illustroPerformance.probe().controller.document.root.width,
      height:window.__illustroPerformance.probe().controller.document.root.height}:null
   }));
   assert.ok(data.hasDrawingSurface,'canvas must be visible and editable');
   if(item.width===4000)assert.deepEqual(data.documentSize,{width:4000,height:4000},
      'the opened document must really be 4000×4000, not only the selected controls');
   assert.equal(data.gpuPreparationPaths,0,'no startup trial strokes are permitted');
   assert.equal(data.gpuWarmupMs,0,'trial drawing phase must be absent');
   if(prewarmed){
    assert.ok(data.measures.some(m=>m.stage==='home-gpu-prewarm'),'the GPU should have initialized on Home');
    assert.ok(!data.measures.some(m=>m.stage==='gpu-and-worker-init'),'Create must not initialize the GPU a second time');
   }else{
    assert.ok(data.measures.some(m=>m.stage==='gpu-and-worker-init'),'cold path GPU timing must be captured');
   }
   assert.ok(data.measures.some(m=>m.stage==='storage-init'),'storage timing must be captured');
   assert.ok(data.measures.some(m=>m.stage==='click-to-editable'),'draw-ready measurement must exist');
   assert.ok(!data.measures.some(m=>m.stage==='projection-restore'),
     'a fresh canvas must not run a full document projection replay');
   if(item.background==='white'){
    const pixels=await page.evaluate(async()=>{
     const {controller,renderer}=window.__illustroPerformance.probe(),document=controller.document;
     const bottom=document.root.rootLayerIds[0],surfaceId=document.root.getLayer(bottom).surface.descriptor.surfaceId;
     return {
      layerCount:controller.layers.length,
      selectedIsBackground:controller.selectedLayerId===bottom,
      topTransparent:document.readPixel(controller.selectedLayerId,0,0),
      coreTopLeft:document.readPixel(bottom,0,0),
      coreBottomRight:document.readPixel(bottom,document.root.width-1,document.root.height-1),
      gpuTopLeft:await renderer.readPixel(0,0,surfaceId),
      gpuBottomRight:await renderer.readPixel(document.root.width-1,document.root.height-1,surfaceId)
     };
    });
    assert.equal(pixels.layerCount,2,'white work must have an editable background plus drawing layer');
    assert.equal(pixels.selectedIsBackground,false,'first drawing layer must be selected');
    assert.deepEqual(pixels.topTransparent,[0,0,0,0],'top drawing layer starts transparent');
    for(const kind of ['coreTopLeft','coreBottomRight','gpuTopLeft','gpuBottomRight'])
     assert.deepEqual(pixels[kind],[255,255,255,255],kind+' must contain actual opaque white pixels');
   }
   // Being editable means that a real pointer path can reach a canonical commit.
   const rect=await page.locator('#canvas').boundingBox();
   assert.ok(rect&&rect.width>120&&rect.height>100,'visible drawing surface');
   await page.mouse.move(rect.x+rect.width*.38,rect.y+rect.height*.45);
   await page.mouse.down();
   await page.mouse.move(rect.x+rect.width*.62,rect.y+rect.height*.54,{steps:14});
   await page.mouse.up();
   await page.waitForFunction(()=>Number(document.getElementById('canvas')?.dataset.committedStrokes)>0,null,{timeout:40000});
   assert.deepEqual(pageErrors,[],'no browser exceptions');
   if(prewarmed)assert.ok(await page.evaluate(()=>performance.getEntriesByName('illustro-canvas:reused-home-gpu').length>0),
     'a prepared Home drawing host must be reused by the first new document');
   // A second pristine work must not replay pixels from the previous inked work.
   // Its display worker is new, so a restore/clear round trip is unnecessary.
   if(item.width===512){
    // Work switching must preserve the first stroke and wait for its real
    // formal draw and auto-save before abandoning that active document.
    await page.waitForFunction(()=>!window.__illustroPerformance.isDrawingBusy()&&
      document.getElementById('saveState')?.dataset.autosavePending==='false',null,{timeout:90000});
    const priorRestores=await page.evaluate(()=>performance.getEntriesByName('illustro-canvas:projection-restore').length);
    await page.locator('#home').click();
    await page.locator('#ihStart').click();
    await page.locator('#ihNewWidth').fill('1024');
    await page.locator('#ihNewHeight').fill('768');
    await page.locator('#ihNewCreate').click();
    await page.waitForFunction(()=>{
      const ready=document.querySelector('#status')?.textContent?.includes('描画できます')&&
        !document.getElementById('app')?.inert&&window.__illustroPerformance?.probe?.()?.controller?.document?.root?.width===1024;
      const error=document.getElementById('ihNewError')?.textContent??'';
      return ready||(error&&error!=='キャンバスを準備しています。');
    },null,{timeout:60000});
    const result=await page.evaluate(()=>({
      width:window.__illustroPerformance?.probe?.()?.controller?.document?.root?.width,
      error:document.getElementById('ihNewError')?.textContent,
      notice:document.getElementById('ihNotice')?.textContent,
    }));
    assert.equal(result.width,1024,'second blank must open: '+JSON.stringify(result));
    assert.equal(await page.evaluate(()=>performance.getEntriesByName('illustro-canvas:projection-restore').length),
       priorRestores,'later pristine documents must not replay nonexistent canvas pixels');
    assert.equal(await page.evaluate(()=>window.__illustroPerformance.probe().controller.committedStrokeCount),0,
       'new work must not inherit prior ink');
    const rect2=await page.locator('#canvas').boundingBox();
    await page.mouse.move(rect2.x+rect2.width*.4,rect2.y+rect2.height*.4);
    await page.mouse.down();await page.mouse.move(rect2.x+rect2.width*.6,rect2.y+rect2.height*.6,{steps:10});await page.mouse.up();
    await page.waitForFunction(()=>document.getElementById('canvas')?.dataset.committedStrokes==='1',null,{timeout:40000});
   }
   results.push({...item,wallClockMs,...data,prewarmed,firstStrokeCommitted:true,secondBlankVerified:item.width===512});
   console.log('M10_FIRST_CANVAS',JSON.stringify(results.at(-1)));
  }finally{await context.close();}
 }
}finally{
 await fs.writeFile(destination,JSON.stringify({commit:process.env.EXPECTED_COMMIT_SHA??null,mode:'software-Chromium-not-physical-Android',results},null,2));
 await browser?.close();await new Promise(resolve=>server.close(resolve));
}
