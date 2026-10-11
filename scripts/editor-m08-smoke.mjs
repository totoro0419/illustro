import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const target=process.env.M08_PUBLIC_URL??'',expected=process.env.EXPECTED_COMMIT_SHA??'';
const evidence=process.env.M08_EVIDENCE_DIRECTORY??'/tmp/m08-evidence';
await fs.mkdir(evidence,{recursive:true});
let server,base=target;
if(!base){
 const root=path.resolve(import.meta.dirname,'../apps/editor/dist');
 server=http.createServer(async(req,res)=>{try{
   const q=decodeURIComponent((req.url??'/').split('?')[0]),p=path.resolve(root,'.'+(q==='/'?'/index.html':q));
   if(!p.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
   const buf=await fs.readFile(p),ext=path.extname(p);
   res.setHeader('Content-Type',ext==='.js'?'text/javascript':ext==='.css'?'text/css':ext==='.html'?'text/html; charset=utf-8':ext==='.json'?'application/json':'application/octet-stream');res.end(buf);
 }catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 base='http://127.0.0.1:'+server.address().port+'/';
}
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const output={commit:expected,mode:target?'public':'local',tests:[],errors:[]};
async function draw(page,minimumStrokes=1){
 const b=await page.locator('#canvas').boundingBox();assert.ok(b&&b.width>100&&b.height>100,'canvas visible');
 await page.mouse.move(b.x+b.width*.25,b.y+b.height*.34);
 await page.mouse.down();await page.mouse.move(b.x+b.width*.7,b.y+b.height*.62,{steps:9});await page.mouse.up();
 await page.waitForFunction(minimum=>Number(document.getElementById('canvas')?.dataset.committedStrokes??'0')>=minimum&&document.getElementById('canvas')?.dataset.historyBusy==='false',minimumStrokes,{timeout:45000});
}
async function getState(page){return page.evaluate(()=>{const c=document.getElementById('canvas'),r=c.getBoundingClientRect(),q=JSON.parse(document.getElementById('qaAuto')?.textContent||'{}');return {cssWidth:r.width,cssHeight:r.height,backingWidth:c.width,backingHeight:c.height,dpr:devicePixelRatio,qa:q,revision:c.dataset.revisionId,strokes:c.dataset.committedStrokes,backend:q.backend,view:q.display?.view,document:q.display?.document}});}
async function run(kind,dpr,width,height){
 const context=await browser.newContext({viewport:{width:1250,height:900},deviceScaleFactor:dpr,hasTouch:dpr>=2});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push('page: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
 try{
  await page.goto(base+(base.includes('?')?'&':'?')+'qa=1&m08=1&backend='+kind,{waitUntil:'domcontentloaded',timeout:50000});
  await page.waitForSelector('#canvas');
  await page.evaluate(([w,h])=>{document.getElementById('newCanvasWidth').value=String(w);document.getElementById('newCanvasHeight').value=String(h);},[width,height]);
  await page.locator('#new').click();
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('描画できます'),{timeout:90000});
  await page.waitForTimeout(350);
  let initial=await getState(page);
  assert.equal(initial.document.width,width);assert.equal(initial.document.height,height);
  assert.ok(Math.abs(initial.backingWidth-initial.cssWidth*dpr)<=2.1,'backing device-pixel width');
  assert.ok(Math.abs(initial.backingHeight-initial.cssHeight*dpr)<=2.1,'backing device-pixel height');
  assert.ok(initial.backend===kind.toUpperCase()||initial.backend.toLowerCase()===kind,'requested renderer mismatch '+initial.backend);
  assert.ok(initial.view?.zoom>0,'fit zoom positive');
  await page.locator('#view100').click();
  let v=await getState(page);assert.ok(Math.abs(v.view.zoom-1)<1e-8,'100% is 1 doc px to CSS px');
  const firstRev=v.revision;
  await page.locator('#referencePattern').check();let pat=await getState(page);assert.equal(pat.view.reference,true);assert.equal(pat.revision,firstRev,'reference is view-only');await page.locator('#referencePattern').uncheck();
  await page.locator('#flipH').click();await page.locator('#flipV').click();
  v=await getState(page);assert.equal(v.view.flipX,true);assert.equal(v.view.flipY,true);assert.equal(v.revision,firstRev,'flip must not change revision');
  await page.locator('#fitView').click();
  await page.locator('#angleDegree').fill('33');
  await page.locator('#angleDegree').press('Tab');
  v=await getState(page);assert.ok(Math.abs(v.view.rotation-33*Math.PI/180)<1e-5,'rotation state');
  await page.locator('#zoomPercent').fill('137');
  await page.locator('#zoomPercent').press('Tab');
  v=await getState(page);assert.ok(Math.abs(v.view.zoom-1.37)<1e-6,'fractional zoom');
  await page.locator('#resetRotation').click();
  await page.locator('#fitView').click();
  await draw(page);
  v=await getState(page);assert.ok(Number(v.strokes)>0,'stroke persisted');
  await page.locator('#undo').click();await page.waitForFunction(()=>document.getElementById('canvas')?.dataset.canRedo==='true'&&document.getElementById('canvas')?.dataset.historyBusy==='false',{timeout:45000});
  await page.locator('#redo').click();await page.waitForFunction(()=>Number(document.getElementById('canvas')?.dataset.committedStrokes)>0,{timeout:45000});
  await page.locator('#workspaceToggle').click();
  await draw(page,2);
  v=await getState(page);assert.ok(Number(v.strokes)>=2,'workspace closed still draws');
  assert.equal(errors.filter(e=>!e.includes('ERR_NAME_NOT_RESOLVED')).length,0,'console errors: '+JSON.stringify(errors));
  if(dpr===2&&width===3000)await page.screenshot({path:path.join(evidence,kind+'-3000-'+dpr+'.png')});
  output.tests.push({kind,dpr,width,height,result:'PASS',backing:[v.backingWidth,v.backingHeight],css:[v.cssWidth,v.cssHeight],view:v.view,backend:v.backend,errors});
 }catch(e){const snapshot=await getState(page).catch(x=>({error:String(x)}));output.errors.push({kind,dpr,width,height,error:String(e),console:errors,snapshot});output.tests.push({kind,dpr,width,height,result:'FAIL',error:String(e),snapshot});await page.screenshot({path:path.join(evidence,kind+'-failure-'+dpr+'-'+width+'.png')}).catch(()=>{});}
 finally{await context.close();}
}
try{
 for(const kind of (process.env.M08_SMOKE_QUICK?['webgl2']:['webgl2','webgpu'])){
  for(const dpr of (process.env.M08_SMOKE_QUICK?[2]:[1,1.5,2,2.5,3]))await run(kind,dpr,512,384);
  for(const [w,h] of (process.env.M08_SMOKE_QUICK?[[2048,1536]]:[[2048,1536],[2560,1440],[3000,2000]]))await run(kind,2,w,h);
 }
}finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
await fs.writeFile(path.join(evidence,'m08-report.json'),JSON.stringify(output,null,2));
console.log(JSON.stringify(output));
assert.equal(output.errors.length,0,'M08 browser verification failures: '+JSON.stringify(output.errors));
