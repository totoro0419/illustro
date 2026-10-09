import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const publicBase=(process.env.M07_PUBLIC_URL??'').trim(),expectedCommit=process.env.EXPECTED_COMMIT_SHA??'';
const evidence=path.resolve(process.env.M07_EVIDENCE_DIRECTORY??'/tmp/m07-evidence');
await fs.mkdir(evidence,{recursive:true});
let server=null,base=publicBase;
if(!base){
  const root=path.resolve(import.meta.dirname,'../apps/editor/dist');
  server=http.createServer(async(req,res)=>{
    try{
      const name=decodeURIComponent((req.url??'/').split('?')[0]),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
      if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
      const data=await fs.readFile(file),ext=path.extname(file);
      res.setHeader('Content-Type',ext==='.js'?'text/javascript':ext==='.css'?'text/css':ext==='.html'?'text/html;charset=utf-8':ext==='.json'?'application/json':ext==='.webmanifest'?'application/manifest+json':'application/octet-stream');
      res.end(data);
    }catch{res.writeHead(404);res.end();}
  });await new Promise(ok=>server.listen(0,'127.0.0.1',ok));base='http://127.0.0.1:'+server.address().port+'/';
}
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan','--enable-precise-memory-info']});
const report={source:expectedCommit,mode:publicBase?'public':'local',status:'FAIL',cases:[],errors:[]};
const qa=async p=>JSON.parse((await p.locator('#qaAuto').textContent())||'{}');
async function draw(page){
  const box=await page.locator('#canvas').boundingBox();assert.ok(box&&box.width>100,'Canvas not visible');
  await page.mouse.move(box.x+box.width*.22,box.y+box.height*.4);
  await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.53,{steps:16});await page.mouse.up();
}
async function waitCount(page,n){
  await page.waitForFunction(x=>document.getElementById('canvas')?.dataset.committedStrokes===String(x)&&document.getElementById('canvas')?.dataset.historyBusy==='false',n,{timeout:45000});
}
async function checkPage(page,profile){
  const structure=await page.evaluate(()=>{
    const boxes=[...document.querySelectorAll('[data-box-id]')].map(x=>x.getAttribute('data-box-id'));
    return {
      rail:[...document.querySelectorAll('.rail .tool-button')].map(x=>x.id),
      allLast:document.querySelector('.rail')?.lastElementChild?.id,
      boxes,
      categories:document.querySelectorAll('#featuresCategories [data-category]').length,
      buttons:[...document.querySelectorAll('.commands button')].map(x=>x.id),
      top:[...document.querySelectorAll('.topbar>button')].map(x=>x.id),
      layers:[...document.querySelectorAll('#layerPage')].length,
      width:getComputedStyle(document.documentElement).getPropertyValue('--workspace').trim(),
      stackScrollable:getComputedStyle(document.querySelector('.box-stack')).overflowY==='auto',
      stripDocked:!!document.querySelector('.right-dock>.commands'),
      flipDisabled:document.getElementById('flipH').disabled&&document.getElementById('flipV').disabled,
      canvasPresent:!!document.getElementById('canvas'),
      bodyScrollX:document.documentElement.scrollWidth>innerWidth+1
    };
  });
  assert.deepEqual(structure.rail,['paint','erase','smudge','eyedropper','smartFill','selection','transform','move']);
  assert.equal(structure.allLast,'allFeatures');
  assert.equal(structure.boxes.length,12);assert.equal(new Set(structure.boxes).size,12);
  assert.deepEqual(structure.buttons,['layer','undo','redo','flipH','flipV']);
  assert.equal(structure.categories,12);assert.equal(structure.layers,1);
  assert.ok(structure.top.includes('home')&&structure.top.includes('save'));
  assert.ok(structure.stackScrollable&&structure.stripDocked&&structure.flipDisabled&&structure.canvasPresent);
  assert.equal(structure.bodyScrollX,false);
  const expected=profile==='tablet'?360:344;assert.equal(structure.width,expected+'px');
  return structure;
}
try{
  for(const backend of ['webgl2','webgpu']){
    const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+(publicBase?'?backend='+backend+'&build='+expectedCommit:'?qa=1&backend='+backend),{waitUntil:'networkidle',timeout:45000});
    const structure=await checkPage(page,'pointer');
    await page.locator('#new').click();
    await page.waitForFunction(()=>!document.getElementById('brush')?.disabled,{timeout:45000});
    const state=await qa(page);assert.equal(state.milestone,'M07');assert.equal(state.backendSelection.selected,backend);if(expectedCommit)assert.equal(state.commit,expectedCommit);
    const initFrames=state.presentationFrames;
    await draw(page);await waitCount(page,1);
    // Box state is independent of renderer lifecycle.
    await page.locator('#brushBoxBody').evaluate(el=>el.closest('.workspace-box')?.querySelector('.box-toggle')?.click());
    assert.equal(await page.locator('#brushBoxBody').getAttribute('hidden'),'');
    await page.locator('#workspaceToggle').click();
    await draw(page);await waitCount(page,2);
    await page.locator('#workspaceToggle').click();
    await page.locator('#layer').click();
    assert.equal(await page.locator('#layerPage').isVisible(),true);
    assert.equal(await page.locator('#workspace').isVisible(),false);
    assert.ok(await page.locator('#canvas').isVisible());
    await page.locator('#addLayerPage').click();
    await page.waitForFunction(()=>document.getElementById('canvas')?.dataset.layerCount==='2',{timeout:20000});
    await page.locator('#layerPageList .layer-row').first().click();
    assert.equal(await page.locator('#layerPageList .layer-row[aria-pressed=true]').count(),1);
    await draw(page);await waitCount(page,3);
    await page.locator('#layer').click();
    assert.equal(await page.locator('#layerPage').isVisible(),false);
    assert.equal(await page.locator('#layerList .layer-row[aria-pressed=true]').count(),1);
    await draw(page);await waitCount(page,4);
    const b=page.locator('#splitter .resize-grip');const rect=await b.boundingBox();assert.ok(rect);
    await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();
    await page.mouse.move(rect.x-70,rect.y+rect.height/2,{steps:7});await page.mouse.up();
    const resized=await page.evaluate(()=>Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--workspace')));
    assert.ok(resized>344,'Workspace width did not increase');await draw(page);await waitCount(page,5);
    await page.locator('#allFeatures').click();
    assert.equal(await page.locator('#allFeaturesPanel').isVisible(),true);
    await page.locator('[data-category="document-output"]').click();
    await page.locator('#featuresClose').click();
    await page.locator('#undo').click();
    await page.waitForFunction(()=>document.getElementById('canvas')?.dataset.committedStrokes==='4',{timeout:20000});
    await page.locator('#redo').click();await waitCount(page,5);
    assert.ok((await qa(page)).presentationFrames>=initFrames);
    assert.deepEqual(errors,[],'JS runtime errors');
    await page.screenshot({path:path.join(evidence,backend+'-1440.png')});
    report.cases.push({backend,layout:structure,widthAfterResize:resized,drawAfterWorkspaceClosed:true,drawWithLayerPageOpen:true,drawAfterResize:true,layerSynced:true,errors});
    await context.close();
  }
  for(const [name,width,height,touch] of [
    ['desktop-1920',1920,1080,false],['desktop-1366',1366,768,false],
    ['tablet-1280',1280,800,true],['tablet-1024',1024,768,true],['tablet-portrait',800,1100,true],
    ['compact',390,844,true]
  ]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:false,acceptDownloads:true});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+(publicBase?'?backend=webgl2&build='+expectedCommit:'?qa=1&backend=webgl2'),{waitUntil:'networkidle',timeout:45000});
    const compact=width<=760;
    console.log('M07 viewport',name,width,height,touch);
    if(!compact)await checkPage(page,touch?'tablet':'pointer');
    await page.locator('#new').click();await page.waitForFunction(()=>!document.getElementById('brush')?.disabled,{timeout:45000});
    await draw(page);await waitCount(page,1);
    const canvas=await page.locator('#canvas').boundingBox();assert.ok(canvas&&canvas.width>100);
    if(!compact){
      await page.locator('#layer').click();await draw(page);await waitCount(page,2);
      const x=await page.evaluate(()=>({bodyOverflow:document.documentElement.scrollWidth>innerWidth+1,overlay:document.body.classList.contains('right-overlay')}));
      assert.equal(x.bodyOverflow,false);
      await page.screenshot({path:path.join(evidence,name+'.png')});
    }else{
      assert.equal((await qa(page)).workspaceOpen,false);
      await page.locator('#drawer').click();
      await page.locator('#drawer').click();await draw(page);await waitCount(page,2);
      await page.screenshot({path:path.join(evidence,name+'.png')});
    }
    assert.deepEqual(errors,[]);
    report.cases.push({name,viewport:width+'x'+height,touch,canvasWidth:canvas.width,errors});
    await context.close();
  }
  report.status='PASS';console.log('M07 QA PASS '+JSON.stringify({cases:report.cases.length}));
}catch(e){report.errors.push(e.stack||String(e));console.error('M07 QA FAIL',e);process.exitCode=1;}
finally{
  await fs.writeFile(path.join(evidence,publicBase?'m07-public.json':'m07-local.json'),JSON.stringify(report,null,2));
  await browser.close();if(server)await new Promise(ok=>server.close(ok));
}
