import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const {PNG}=require(process.env.PREP_PNG_PATH??'pngjs');
const publicBase=(process.env.M02_PUBLIC_URL??'').trim();
const expectedCommit=(process.env.EXPECTED_COMMIT_SHA??'').trim();
const evidence=path.resolve(process.env.M02_EVIDENCE_DIRECTORY??'/tmp/illustro-m02');
await fs.mkdir(evidence,{recursive:true});
let server=null,base=publicBase;
if(!publicBase){
  const root=path.resolve(import.meta.dirname,'../apps/editor/dist');
  server=http.createServer(async(q,r)=>{
    try{
      const relative=decodeURIComponent((q.url??'/').split('?')[0]),file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));
      if(!file.startsWith(root+path.sep)){r.writeHead(403);r.end();return;}
      const data=await fs.readFile(file);r.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');r.end(data);
    }catch{r.writeHead(404);r.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}/`;
}
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface']});
const report={milestone:'M02',mode:publicBase?'public':'local',url:base,status:'FAIL',backends:[]};
function darkIn(buffer,rect){const png=PNG.sync.read(buffer);let n=0;const x0=Math.max(0,Math.floor(rect.x0*png.width)),x1=Math.min(png.width,Math.ceil(rect.x1*png.width)),y0=Math.max(0,Math.floor(rect.y0*png.height)),y1=Math.min(png.height,Math.ceil(rect.y1*png.height));for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*png.width+x)*4;if(png.data[i]<170&&png.data[i+1]<170&&png.data[i+2]<170&&png.data[i+3]>0)n++;}return n;}
function lightRatio(buffer){const png=PNG.sync.read(buffer);let light=0,total=png.width*png.height;for(let i=0;i<png.data.length;i+=4)if(png.data[i]>225&&png.data[i+1]>225&&png.data[i+2]>225)light++;return total?light/total:0;}
async function draw(page,box,a,b,steps=24){await page.mouse.move(box.x+a[0]*box.width,box.y+a[1]*box.height);await page.mouse.down();await page.mouse.move(box.x+b[0]*box.width,box.y+b[1]*box.height,{steps});await page.mouse.up();}
function pageUrl(backend){if(publicBase)return base+`?backend=${backend}&qa-public-check=1`;return base+`?qa=1&backend=${backend}`;}
try{
  for(const backend of ['webgl2','webgpu']){
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(pageUrl(backend),{waitUntil:'networkidle',timeout:45000});
    assert.equal(await page.locator('#qaPanel').count(),1,'M02 QA panel missing');await page.locator('#qaPanel > summary').click();
    assert.equal(await page.locator('.layer-row').count(),1,'initial Layer list is not one row');
    const layer1=page.locator('.layer-row').filter({hasText:'Layer 1'});assert.equal(await layer1.getAttribute('aria-pressed'),'true','initial Layer is not selected');
    await page.getByRole('button',{name:'新規キャンバス',exact:true}).click();await page.waitForFunction(()=>!(document.getElementById('brush')?.disabled),{timeout:45000});
    const add=page.getByRole('button',{name:'レイヤー追加',exact:true});assert.equal(await add.isDisabled(),false,'Layer add is unavailable after canvas start');
    const canvas=page.locator('canvas'),box=await canvas.boundingBox();assert.ok(box);const blankShot=await canvas.screenshot();assert.ok(lightRatio(blankShot)>.92,'blank canvas is globally dark instead of white');const initialRevision=await canvas.getAttribute('data-revision-id');assert.ok(initialRevision);
    assert.equal(await canvas.getAttribute('data-layer-count'),'1');assert.equal(await canvas.getAttribute('data-selected-layer-name'),'Layer 1');

    await draw(page,box,[.12,.20],[.36,.28],22);await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='1',{timeout:15000});
    const afterLayer1=await canvas.getAttribute('data-revision-id');assert.ok(afterLayer1&&afterLayer1!==initialRevision,'Layer 1 stroke did not advance Revision');
    const firstShot=await canvas.screenshot();assert.ok(darkIn(firstShot,{x0:.08,y0:.12,x1:.42,y1:.35})>25,'Layer 1 stroke is not visible');

    await add.click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.layerCount==='2');
    const afterAdd=await canvas.getAttribute('data-revision-id');assert.ok(afterAdd&&afterAdd!==afterLayer1,'Layer add did not advance Revision');assert.equal(await canvas.getAttribute('data-committed-strokes'),'1','Layer add changed stroke count');
    assert.equal(await page.locator('.layer-row').count(),2);const layer2=page.locator('.layer-row').filter({hasText:'Layer 2'});
    assert.equal(await layer2.getAttribute('aria-pressed'),'true','new Layer was not selected');assert.equal(await layer1.getAttribute('aria-pressed'),'false');assert.equal(await canvas.getAttribute('data-selected-layer-name'),'Layer 2');

    await draw(page,box,[.62,.20],[.86,.30],22);await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='2',{timeout:15000});
    const afterLayer2=await canvas.getAttribute('data-revision-id');assert.ok(afterLayer2&&afterLayer2!==afterAdd,'Layer 2 stroke did not advance Revision');

    await layer1.click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.selectedLayerName==='Layer 1');
    assert.equal(await canvas.getAttribute('data-revision-id'),afterLayer2,'selection alone changed Artwork Revision');
    assert.equal(await layer1.getAttribute('aria-pressed'),'true');assert.equal(await layer2.getAttribute('aria-pressed'),'false');

    await draw(page,box,[.14,.66],[.40,.76],22);await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='3',{timeout:15000});
    const afterThird=await canvas.getAttribute('data-revision-id');assert.ok(afterThird&&afterThird!==afterLayer2,'return stroke on Layer 1 did not advance Revision');
    const finalShot=await canvas.screenshot();assert.ok(lightRatio(finalShot)>.75,'canvas became globally dark after drawing');assert.ok(darkIn(finalShot,{x0:.08,y0:.12,x1:.42,y1:.35})>25,'first Layer 1 stroke disappeared');assert.ok(darkIn(finalShot,{x0:.56,y0:.12,x1:.92,y1:.36})>25,'Layer 2 stroke disappeared');assert.ok(darkIn(finalShot,{x0:.08,y0:.58,x1:.46,y1:.82})>25,'second Layer 1 stroke is not visible');

    await layer2.click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.selectedLayerName==='Layer 2');
    assert.equal(await canvas.getAttribute('data-revision-id'),afterThird,'second selection changed Artwork Revision');

    await page.mouse.move(box.x+.48*box.width,box.y+.52*box.height);await page.mouse.down();await page.mouse.move(box.x+.55*box.width,box.y+.54*box.height,{steps:6});
    await canvas.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',button:0,bubbles:true,cancelable:true});await page.mouse.up();await page.waitForTimeout(200);
    assert.equal(await canvas.getAttribute('data-committed-strokes'),'3','pointercancel became formal artwork');

    const auto=JSON.parse((await page.locator('#qaAuto').textContent())??'{}');assert.equal(auto.milestone,'M02');assert.equal(auto.layerCount,2);assert.equal(auto.selectedLayerName,'Layer 2');assert.equal(auto.committedStrokeCount,3);
    assert.deepEqual(auto.layers.map(x=>[x.name,x.committedStrokes]),[['Layer 1',2],['Layer 2',1]]);
    assert.ok(String(auto.backend).toLowerCase().includes(backend),'reported backend does not match requested backend');
    if(expectedCommit)assert.equal(auto.commit,expectedCommit,'public QA is not the expected commit');
    assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(evidence,`${backend}-m02-${publicBase?'public':'local'}.png`),fullPage:true});
    const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(e.message));mobile.on('console',m=>{if(m.type()==='error')mobileErrors.push(m.text());});await mobile.goto(pageUrl(backend),{waitUntil:'networkidle',timeout:45000});await mobile.getByRole('button',{name:'新規キャンバス',exact:true}).click();await mobile.waitForFunction(()=>!(document.getElementById('brush')?.disabled),{timeout:45000});const mobileCanvas=mobile.locator('canvas'),mobileBlank=await mobileCanvas.screenshot();assert.ok(lightRatio(mobileBlank)>.92,'compact/mobile blank canvas is globally dark');const mobileBox=await mobileCanvas.boundingBox();assert.ok(mobileBox);await draw(mobile,mobileBox,[.15,.35],[.82,.55],18);await mobile.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='1',{timeout:15000});const mobileDrawn=await mobileCanvas.screenshot();assert.ok(lightRatio(mobileDrawn)>.72,'compact/mobile canvas became globally dark after drawing');assert.ok(darkIn(mobileDrawn,{x0:.08,y0:.20,x1:.90,y1:.70})>25,'compact/mobile stroke is not visible');assert.deepEqual(mobileErrors,[]);await mobile.screenshot({path:path.join(evidence,`${backend}-m02-${publicBase?'public':'local'}-compact.png`),fullPage:true});await mobile.close();
    report.backends.push({backend,status:'PASS',layerCount:2,selectedLayer:'Layer 2',strokesByLayer:{'Layer 1':2,'Layer 2':1},selectionRevisionStable:true,pointerCancelNoCommit:true,blankCanvasLight:true,compactCanvasLight:true,commit:auto.commit,consoleErrors:errors});
    await page.close();
  }
  report.status='PASS';
}finally{
  await fs.writeFile(path.join(evidence,`m02-${publicBase?'public':'local'}-smoke.json`),JSON.stringify(report,null,2));
  await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify(report,null,2));if(report.status!=='PASS')process.exitCode=1;
