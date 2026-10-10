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

async function startFrameCapture(page){
  await page.evaluate(()=>{
    window.__m07FrameIntervals=[];window.__m07FrameSampling=true;
    let previous=0;
    const next=(time)=>{
      if(previous)window.__m07FrameIntervals.push(time-previous);
      previous=time;
      if(window.__m07FrameSampling&&window.__m07FrameIntervals.length<900)requestAnimationFrame(next);
    };
    requestAnimationFrame(next);
  });
}
async function stopFrameCapture(page){
  return page.evaluate(()=>{
    window.__m07FrameSampling=false;
    const arr=(window.__m07FrameIntervals??[]).filter(x=>Number.isFinite(x)).sort((a,b)=>a-b);
    const at=p=>arr.length?arr[Math.min(arr.length-1,Math.floor(arr.length*p))]:null;
    return {frameSamples:arr.length,p50FrameMs:at(.5),p95FrameMs:at(.95),
      heapBytes:performance.memory?.usedJSHeapSize??null,
      domNodes:document.querySelectorAll('*').length};
  });
}
async function penStroke(page){
  const box=await page.locator('#canvas').boundingBox();assert.ok(box);
  const x=box.x+box.width*.19,y=box.y+box.height*.64;
  const x2=box.x+box.width*.73,y2=box.y+box.height*.7;
  const session=await page.context().newCDPSession(page);
  await session.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,pointerType:'pen'});
  await session.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1,pointerType:'pen'});
  for(let i=1;i<=16;i++)await session.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+(x2-x)*i/16,y:y+(y2-y)*i/16,button:'left',buttons:1,pointerType:'pen'});
  await session.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:x2,y:y2,button:'left',buttons:0,clickCount:1,pointerType:'pen'});
  await session.detach();
}
async function touchStroke(page){
  const box=await page.locator('#canvas').boundingBox();assert.ok(box);
  const x=box.x+box.width*.14,y=box.y+box.height*.27;
  const x2=box.x+box.width*.61,y2=box.y+box.height*.31;
  const session=await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=15;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(x2-x)*i/15,y:y+(y2-y)*i/15}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await session.detach();
}
async function boxScrollCost(page){
  return page.evaluate(()=>{
    const box=document.getElementById('boxStack');
    const before=performance.now();let range=0;
    for(let i=0;i<25;i++){box.scrollTop=i%2?0:box.scrollHeight;range=Math.max(range,box.scrollHeight-box.clientHeight);void box.getBoundingClientRect().height;}
    const elapsed=performance.now()-before;return {scrollRangePx:range,layoutAndScroll25ChangesMs:elapsed};
  });
}

async function verifyAuroraIconReview(page){
  const result=await page.evaluate(()=>{
    const qa=document.querySelector('#qaSummary'),panel=document.querySelector('#qaPanel');
    const svg=(selector)=>[...document.querySelectorAll(selector)].every(el=>!!el.querySelector('svg.ui-icon'));
    const root=getComputedStyle(document.documentElement);
    const selected=getComputedStyle(document.querySelector('#paint'));
    return {
      qaInitiallyOpen:qa?.open===true,
      checklistInitiallyOpen:panel?.open===true,
      checklistCount:panel?.querySelectorAll('ol>li').length,
      qaHeading:qa?.querySelector('summary')?.textContent?.trim(),
      toolVectors:svg('.rail .tool-button'),
      bottomVectors:svg('.commands button'),
      topVectors:svg('.topbar #home, .topbar #save, .topbar #workspaceToggle'),
      allFeatureVector:!!document.querySelector('#allFeatures svg.ui-icon'),
      boxHeaderVectors:document.querySelectorAll('.box-glyph svg.ui-icon').length,
      categoryVectors:document.querySelectorAll('.feature-category > svg.ui-icon').length,
      auroraBlue:root.getPropertyValue('--aurora-blue').trim().toLowerCase(),
      auroraViolet:root.getPropertyValue('--aurora-violet').trim().toLowerCase(),
      selectedGradient:selected.backgroundImage,
      qaVisible:!!qa&&qa.getBoundingClientRect().height>120,
    };
  });
  assert.ok(result.qaInitiallyOpen&&result.checklistInitiallyOpen,'QA checklist must be expanded immediately');
  assert.equal(result.checklistCount,12,'All 12 QA items must be visible by scrolling');
  assert.match(result.qaHeading,/実機確認.*12項目/);
  assert.ok(result.qaVisible,'QA card must be prominent on first visit');
  assert.ok(result.toolVectors&&result.bottomVectors&&result.topVectors&&result.allFeatureVector,'Every primary icon is an SVG motif');
  assert.equal(result.boxHeaderVectors,12);assert.equal(result.categoryVectors,12);
  assert.equal(result.auroraBlue,'#5ea8ff');assert.equal(result.auroraViolet,'#8b7cff');
  assert.match(result.selectedGradient,/gradient/i,'Active tool must carry restrained Aurora light');
  await page.locator('#qaSummary>summary').click();
  assert.equal(await page.locator('#qaSummary').getAttribute('open'),null,'QA can be folded before drawing');
  return result;
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
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(base+(publicBase?'?backend='+backend+'&build='+expectedCommit:'?qa=1&backend='+backend),{waitUntil:'networkidle',timeout:45000});
    const visual=await verifyAuroraIconReview(page);
    const structure=await checkPage(page,'pointer');
    await startFrameCapture(page);
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
    await penStroke(page);await waitCount(page,6);
    assert.equal((await qa(page)).lastInputType,'pen','Browser stylus-equivalent input must reach Canvas');
    assert.ok((await qa(page)).presentationFrames>=initFrames);
    assert.deepEqual(errors,[],'JS runtime errors');
    const perf=await stopFrameCapture(page);
    await page.locator('[data-box-id="right.brush"] .box-toggle').click();
    const scrolling=await boxScrollCost(page);
    assert.ok(perf.frameSamples>20,'Frame pacing capture had too few samples');
    assert.ok(scrolling.scrollRangePx>0,'Right Box stack must scroll independently');
    await page.screenshot({path:path.join(evidence,backend+'-1440.png')});
    report.cases.push({backend,auroraIconReview:visual,layout:structure,widthAfterResize:resized,drawAfterWorkspaceClosed:true,drawWithLayerPageOpen:true,drawAfterResize:true,stylusEquivalentDraw:true,layerSynced:true,performance:perf,scrolling,errors});
    await context.close();
  }
  for(const [name,width,height,touch] of [
    ['desktop-1920',1920,1080,false],['desktop-1366',1366,768,false],
    ['tablet-1280',1280,800,true],['tablet-1024',1024,768,true],['tablet-portrait',800,1100,true],
    ['compact',390,844,true]
  ]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:false,acceptDownloads:true});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(base+(publicBase?'?backend=webgl2&build='+expectedCommit:'?qa=1&backend=webgl2'),{waitUntil:'networkidle',timeout:45000});
    await verifyAuroraIconReview(page);
    const compact=width<=760;
    console.log('M07 viewport',name,width,height,touch);
    if(!compact)await checkPage(page,touch?'tablet':'pointer');
    await page.locator('#new').click();await page.waitForFunction(()=>!document.getElementById('brush')?.disabled,{timeout:45000});
    await draw(page);await waitCount(page,1);
    if(touch&&!compact&&name==='tablet-1280'){
      await page.locator('#finger').check();
      await touchStroke(page);await waitCount(page,2);
      assert.equal((await qa(page)).lastInputType,'touch','Touch input must reach Canvas when enabled');
    }
    const canvas=await page.locator('#canvas').boundingBox();assert.ok(canvas&&canvas.width>100);
    if(!compact){
      await page.locator('#layer').click();await draw(page);await waitCount(page,name==='tablet-1280'?3:2);
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
