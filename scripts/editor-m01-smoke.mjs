import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const {PNG}=require(process.env.PREP_PNG_PATH??'pngjs');
const root=path.resolve(import.meta.dirname,'../apps/editor/dist');
const evidence=path.resolve(process.env.M01_EVIDENCE_DIRECTORY??'/tmp/illustro-m01');
await fs.mkdir(evidence,{recursive:true});

const server=http.createServer(async(q,r)=>{
  try{
    const relative=decodeURIComponent((q.url??'/').split('?')[0]);
    const file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));
    if(!file.startsWith(root+path.sep)){r.writeHead(403);r.end();return;}
    const data=await fs.readFile(file);
    r.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');
    r.end(data);
  }catch{r.writeHead(404);r.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface']});
const report={milestone:'M01',scope:'automated browser integration; physical pen feel requires user review',backends:[],qaIsolation:false};

function image(buffer){return PNG.sync.read(buffer);}
function darkIn(buffer,rect){
  const png=image(buffer);let n=0;
  const x0=Math.max(0,Math.floor(rect.x0*png.width)),x1=Math.min(png.width,Math.ceil(rect.x1*png.width));
  const y0=Math.max(0,Math.floor(rect.y0*png.height)),y1=Math.min(png.height,Math.ceil(rect.y1*png.height));
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*png.width+x)*4;if(png.data[i]<170&&png.data[i+1]<170&&png.data[i+2]<170&&png.data[i+3]>0)n++;}
  return n;
}
async function draw(page,box,a,b,steps=24){
  await page.mouse.move(box.x+a[0]*box.width,box.y+a[1]*box.height);
  await page.mouse.down();
  await page.mouse.move(box.x+b[0]*box.width,box.y+b[1]*box.height,{steps});
  await page.mouse.up();
}
try{
  {
    const page=await browser.newPage({viewport:{width:1100,height:780}});
    await page.goto(url+'/?backend=webgl2');await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('#qaPanel').count(),0,'QA UI leaked into normal mode');
    report.qaIsolation=true;await page.close();
  }
  for(const backend of ['webgl2','webgpu']){
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(url+`/?qa=1&backend=${backend}`);await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('#qaPanel').count(),1,'QA panel missing in qa mode');
    assert.equal(await page.locator('#qaState option').count(),3);
    await page.locator('#qaPanel > summary').click();
    await page.getByRole('button',{name:'新規キャンバス',exact:true}).click();
    await page.waitForFunction(()=>!document.getElementById('brush').disabled,{timeout:45000});
    assert.equal(await page.getByRole('button',{name:'Save',exact:true}).isDisabled(),true);
    assert.equal(await page.locator('button').filter({hasText:'レイヤー追加'}).isDisabled(),true);
    assert.equal(await page.locator('.commands').getByRole('button',{name:'Undo',exact:true}).isDisabled(),true);
    const canvas=page.locator('canvas'),box=await canvas.boundingBox();assert.ok(box);
    assert.equal(await canvas.getAttribute('data-committed-strokes'),'0');

    // A formal Document commit must not happen before pointer-up.
    await page.mouse.move(box.x+.12*box.width,box.y+.23*box.height);await page.mouse.down();
    await page.mouse.move(box.x+.78*box.width,box.y+.31*box.height,{steps:30});
    assert.equal(await canvas.getAttribute('data-committed-strokes'),'0','stroke committed before pointer-up');
    await page.mouse.up();
    await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='1',{timeout:15000});
    const firstRevision=await canvas.getAttribute('data-revision-id');assert.ok(firstRevision);
    const afterFirst=await canvas.screenshot();
    const firstRegionBefore=darkIn(afterFirst,{x0:.08,y0:.15,x1:.85,y1:.40});
    assert.ok(firstRegionBefore>40,'first formal stroke is not visibly present after pen-up');

    // A second stroke must create exactly one further formal commit and preserve the first.
    await draw(page,box,[.18,.62],[.82,.72],28);
    await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='2',{timeout:15000});
    const secondRevision=await canvas.getAttribute('data-revision-id');assert.ok(secondRevision&&secondRevision!==firstRevision,'second stroke did not advance Revision');
    const afterSecond=await canvas.screenshot();
    const firstRegionAfter=darkIn(afterSecond,{x0:.08,y0:.15,x1:.85,y1:.40});
    const secondRegion=darkIn(afterSecond,{x0:.12,y0:.54,x1:.88,y1:.80});
    assert.ok(firstRegionAfter>=Math.max(30,firstRegionBefore*.7),'first stroke disappeared after second stroke');
    assert.ok(secondRegion>40,'second stroke not visible');

    // A canonical tile boundary crossing must commit once and touch multiple dirty tiles.
    await page.locator('#sizeNumber').fill('12');
    await draw(page,box,[.47,.44],[.55,.47],18);
    await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='3',{timeout:15000});
    const dirtyTiles=Number(await canvas.getAttribute('data-dirty-tiles'));assert.ok(dirtyTiles>=2,'tile-boundary stroke did not cover multiple canonical tiles');

    // pointercancel must not publish a formal stroke.
    await page.mouse.move(box.x+.25*box.width,box.y+.48*box.height);await page.mouse.down();
    await page.mouse.move(box.x+.36*box.width,box.y+.50*box.height,{steps:8});
    await canvas.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',button:0,bubbles:true,cancelable:true});
    await page.mouse.up();await page.waitForTimeout(200);
    assert.equal(await canvas.getAttribute('data-committed-strokes'),'3','pointercancel became formal artwork');

    const autoText=await page.locator('#qaAuto').textContent();assert.ok(autoText?.includes(backend==='webgpu'?'WebGPU':'WebGL2'));
    assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(evidence,`${backend}-m01-qa.png`),fullPage:true});
    report.backends.push({backend,status:'PASS',commitAfterPointerUp:true,twoStrokesPersist:true,tileBoundaryDirtyTiles:dirtyTiles,pointerCancelNoCommit:true,consoleErrors:errors});
    await page.close();
  }
  report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}
finally{
  await fs.writeFile(path.join(evidence,'m01-editor-smoke.json'),JSON.stringify(report,null,2));
  await browser.close();await new Promise(r=>server.close(r));
}
console.log(JSON.stringify(report,null,2));
