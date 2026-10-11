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
 const second=minimumStrokes>1;
 await page.mouse.move(b.x+b.width*(second?.28:.25),b.y+b.height*(second?.68:.34));
 await page.mouse.down();await page.mouse.move(b.x+b.width*(second?.64:.7),b.y+b.height*(second?.35:.62),{steps:9});await page.mouse.up();
 await page.waitForFunction(minimum=>Number(document.getElementById('canvas')?.dataset.committedStrokes??'0')>=minimum&&document.getElementById('canvas')?.dataset.historyBusy==='false',minimumStrokes,{timeout:45000});
}
async function getState(page){return page.evaluate(()=>{const c=document.getElementById('canvas'),r=c.getBoundingClientRect(),q=JSON.parse(document.getElementById('qaAuto')?.textContent||'{}');return {trace:window.__m08Trace??[],status:document.getElementById('status')?.textContent,cssWidth:r.width,cssHeight:r.height,backingWidth:c.width,backingHeight:c.height,dpr:devicePixelRatio,qa:q,revision:c.dataset.revisionId,strokes:c.dataset.committedStrokes,backend:q.backend,view:q.display?.view,document:q.display?.document}});}
async function geometrySmoke(page){
 // Document workspace box is initially collapsed by M07.
 await page.locator('#workspaceToggle').click();
 await page.locator('.box-toggle[aria-controls="documentBoxBody"]').click();
 let current=await getState(page),oldW=current.document.width,oldH=current.document.height;
 const apply=async()=>{await page.locator('#geometryApply').click();await page.waitForFunction(()=>!document.getElementById('geometryDialog').open&&document.getElementById('status')?.textContent?.includes('変更しました'),{timeout:90000});};
 const history=async(w,h,redoW,redoH)=>{
  await page.locator('#undo').click();await page.waitForFunction(([w,h])=>{const c=document.getElementById('canvas'),q=JSON.parse(document.getElementById('qaAuto').textContent||'{}');return q.display?.document?.width===w&&q.display?.document?.height===h&&c.dataset.historyBusy==='false';},[w,h],{timeout:90000});
  await page.locator('#redo').click();await page.waitForFunction(([w,h])=>{const c=document.getElementById('canvas'),q=JSON.parse(document.getElementById('qaAuto').textContent||'{}');return q.display?.document?.width===w&&q.display?.document?.height===h&&c.dataset.historyBusy==='false';},[redoW,redoH],{timeout:90000});
 };
 await page.locator('#canvasResizeStart').click();await page.locator('#geometryWidth').fill(String(oldW+32));await page.locator('#geometryHeight').fill(String(oldH+24));await apply();
 current=await getState(page);assert.equal(current.document.width,oldW+32);assert.equal(current.document.height,oldH+24);
 await history(oldW,oldH,oldW+32,oldH+24);
 await page.locator('#cropStart').click();await page.locator('#geometryX').fill('8');await page.locator('#geometryY').fill('8');
 await page.locator('#geometryWidth').fill(String(oldW));await page.locator('#geometryHeight').fill(String(oldH));
 assert.equal(await page.locator('#cropOverlay').isVisible(),true,'on-canvas crop handles must be visible');
 const handle=await page.locator('#cropOverlay .crop-handle[data-corner="br"]').boundingBox();
 assert.ok(handle&&handle.width>0,'crop handle must be an actual pointer target');
 await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();
 await page.mouse.move(handle.x+handle.width/2+20,handle.y+handle.height/2+12,{steps:4});await page.mouse.up();
 const dragged=Number(await page.locator('#geometryWidth').inputValue());
 assert.notEqual(dragged,oldW,'dragging crop corner must update numeric width');
 await page.locator('#geometryX').fill('8');await page.locator('#geometryY').fill('8');
 await page.locator('#geometryWidth').fill(String(oldW));await page.locator('#geometryHeight').fill(String(oldH));
 await apply();current=await getState(page);assert.equal(current.document.width,oldW);assert.equal(current.document.height,oldH);
 await history(oldW+32,oldH+24,oldW,oldH);
 await page.locator('#imageResizeStart').click();await page.locator('#geometryWidth').fill(String(Math.max(64,Math.floor(oldW/2))));
 await page.locator('#geometryHeight').fill(String(Math.max(64,Math.floor(oldH/2))));await page.locator('#geometryFilter').selectOption('bicubic');
 await apply();current=await getState(page);assert.equal(current.document.width,Math.max(64,Math.floor(oldW/2)));
 await history(oldW,oldH,Math.max(64,Math.floor(oldW/2)),Math.max(64,Math.floor(oldH/2)));
}
async function seamPixel(page,x,y){
 const screenshot=(await page.locator('#canvas').screenshot({type:'png',animations:'disabled'})).toString('base64');
 return page.evaluate(async ({png,x,y})=>{
  const c=document.getElementById('canvas'),q=JSON.parse(document.getElementById('qaAuto').textContent),v=q.display.view,r=c.getBoundingClientRect();
  const bytes=Uint8Array.from(atob(png),t=>t.charCodeAt(0)),bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
  const imageWidth=bitmap.width,imageHeight=bitmap.height,t=document.createElement('canvas');t.width=imageWidth;t.height=imageHeight;
  const ctx=t.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);bitmap.close();
  const cssX=v.cssWidth/2+(x-v.documentWidth/2)*v.zoom+v.panX,cssY=v.cssHeight/2+(y-v.documentHeight/2)*v.zoom+v.panY;
  const px=Math.max(0,Math.min(imageWidth-1,Math.floor(cssX*imageWidth/r.width)));
  const py=Math.max(0,Math.min(imageHeight-1,Math.floor(cssY*imageHeight/r.height)));
  return [...ctx.getImageData(px,py,1,1).data];
 },{png:screenshot,x,y});
}
async function previewFinalSmoke(page,kind){
 const before=await getState(page),count=Number(before.strokes);
 await page.evaluate(()=>{const brush=document.querySelector('#brush');brush.value='foundation-technical';brush.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.locator('#resetRotation').click();
 if(before.view.flipX)await page.locator('#flipH').click();
 if(before.view.flipY)await page.locator('#flipV').click();
 await page.locator('#fitView').click();
 const state=await getState(page),v=state.view,rect=await page.locator('#canvas').boundingBox();
 const x0=rect.x+v.cssWidth/2+(v.documentWidth*.2-v.documentWidth/2)*v.zoom+v.panX;
 const x1=rect.x+v.cssWidth/2+(v.documentWidth*.7-v.documentWidth/2)*v.zoom+v.panX;
 const y=rect.y+v.cssHeight/2+(v.documentHeight*.16-v.documentHeight/2)*v.zoom+v.panY;
 await page.evaluate(()=>{document.getElementById('qaSummary').style.visibility='hidden';});
 await page.mouse.move(x0,y);await page.mouse.down();await page.mouse.move(x1,y,{steps:22});
 let live=[255,255,255,255];for(let i=0;i<18;i++){live=await seamPixel(page,v.documentWidth*.5,v.documentHeight*.16);if(live[0]<140)break;await page.waitForTimeout(130);}
 await page.mouse.up();
 await page.waitForFunction(n=>{const c=document.querySelector('#canvas');return Number(c.dataset.committedStrokes)>=n&&c.dataset.historyBusy==='false';},count+1,{timeout:90000});
 const final=await seamPixel(page,v.documentWidth*.5,v.documentHeight*.16);
 await page.evaluate(()=>{document.getElementById('qaSummary').style.visibility='';});
 assert.ok(live[0]<140&&final[0]<140,'technical brush preview/final must both be visible '+JSON.stringify({live,final}));
 assert.ok(Math.abs(live[0]-final[0])<=22,'unchanged geometry must not change display brightness '+JSON.stringify({live,final}));
 return {kind,live,final,difference:Math.abs(live[0]-final[0])};
}
async function seamlessSmoke(page){
 const initial=await getState(page),w=initial.document.width,h=initial.document.height;
 await page.locator('#resetRotation').click();
 if(initial.view.flipX)await page.locator('#flipH').click();
 if(initial.view.flipY)await page.locator('#flipV').click();
 await page.locator('#view100').click();
 await page.evaluate(()=>{const c=document.querySelector('#seamless');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));});
 const before=await getState(page),rect=await page.locator('#canvas').boundingBox(),v=before.view;
 assert.ok(v.seamless,'seamless must be enabled');
 const sx=x=>rect.x+v.cssWidth/2+(x-w/2)*v.zoom+v.panX;
 const sy=y=>rect.y+v.cssHeight/2+(y-h/2)*v.zoom+v.panY;
 const oldCount=Number(before.strokes),beforePixel=await seamPixel(page,8,h*.52);
 await page.mouse.move(sx(w-12),sy(h*.52));await page.mouse.down();
 await page.mouse.move(sx(w+24),sy(h*.52),{steps:10});await page.mouse.up();
 await page.waitForFunction(expected=>{const c=document.querySelector('#canvas');return Number(c.dataset.committedStrokes)>=expected&&c.dataset.historyBusy==='false';},oldCount+1,{timeout:90000});
 const result=await getState(page);assert.equal(Number(result.strokes),oldCount+1);
 assert.ok(result.qa.seamlessCopyCount>=1,'edge crossing must produce an opposite-side raster operation');
 const afterPixel=await seamPixel(page,8,h*.52);assert.ok(beforePixel[0]-afterPixel[0]>35,'opposite edge should gain painted pixels '+JSON.stringify({beforePixel,afterPixel}));
 const committed=result.revision;
 await page.locator('#undo').click();
 await page.waitForFunction(expected=>{const c=document.querySelector('#canvas');return Number(c.dataset.committedStrokes)===expected&&c.dataset.historyBusy==='false';},oldCount,{timeout:90000});
 await page.locator('#redo').click();
 await page.waitForFunction(([expected,revision])=>{const c=document.querySelector('#canvas');return Number(c.dataset.committedStrokes)===expected&&c.dataset.revisionId===revision&&c.dataset.historyBusy==='false';},[oldCount+1,committed],{timeout:90000});
 const after=await getState(page);assert.ok(after.qa.seamlessCopyCount>=1,'atomic redo must restore seam copies');
 // Reload must reconstruct both the source stroke and wrapped copy from OPFS,
 // not leave only the on-screen preview or rely on an in-memory GPU texture.
 await page.waitForFunction(()=>{const q=JSON.parse(document.querySelector('#qaAuto')?.textContent||'{}'),p=q.persistence;return p&&BigInt(p.protectedThrough)>=BigInt(q.commitSequence)&&!p.protectionPending&&p.queueLength===0;},{timeout:90000});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const b=document.getElementById('recover');return b&&!b.disabled;},{timeout:45000});
 await page.locator('#recover').click();
 await page.waitForFunction(revision=>{
   const c=document.querySelector('#canvas'),q=JSON.parse(document.querySelector('#qaAuto')?.textContent||'{}');
   return c?.dataset.revisionId===revision&&q.persistence?.recovered===true&&q.seamlessCopyCount>=1&&c.dataset.historyBusy==='false';
 },committed,{timeout:90000});
 const recovered=await getState(page);
 assert.equal(Number(recovered.strokes),oldCount+1);assert.equal(recovered.document.width,w);assert.equal(recovered.document.height,h);
 const repairedPixel=await seamPixel(page,8,h*.52);
 assert.ok(repairedPixel[0]<150,'opposite-edge copy must survive reload '+JSON.stringify(repairedPixel));
 await page.evaluate(()=>{const c=document.querySelector('#seamless');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}));});
}
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
  if(dpr===2&&width===512){
    const original=initial.document,oldRevision=initial.revision;
    await page.setViewportSize({width:870,height:990});
    await page.waitForFunction(dpr=>{const c=document.querySelector('#canvas'),r=c.getBoundingClientRect();return Math.abs(c.width-r.width*dpr)<=2.1&&Math.abs(c.height-r.height*dpr)<=2.1;},dpr,{timeout:45000});
    const portrait=await getState(page);assert.deepEqual(portrait.document,original);assert.equal(portrait.revision,oldRevision);
    await page.setViewportSize({width:1250,height:900});
    await page.waitForFunction(dpr=>{const c=document.querySelector('#canvas'),r=c.getBoundingClientRect();return Math.abs(c.width-r.width*dpr)<=2.1&&Math.abs(c.height-r.height*dpr)<=2.1;},dpr,{timeout:45000});
    const restored=await getState(page);assert.deepEqual(restored.document,original);assert.equal(restored.revision,oldRevision);
    output.tests.push({kind,dpr,width,height,result:'VIEWPORT-RESIZE-PASS',portrait:{css:[portrait.cssWidth,portrait.cssHeight],backing:[portrait.backingWidth,portrait.backingHeight]}});
  }
  await page.locator('#view100').click();
  let v=await getState(page);assert.ok(Math.abs(v.view.zoom-1)<1e-8,'100% is 1 doc px to CSS px');
  const firstRev=v.revision;
  await page.locator('#qaEntry').click();await page.locator('#referencePattern').check();
  let pat=await getState(page);assert.equal(pat.view.reference,true);assert.equal(pat.revision,firstRev,'reference is view-only');
  if(dpr===2&&width===512){
    // The floating QA overlay must not obscure reference source pixels.
    await page.evaluate(()=>{document.getElementById('qaSummary').style.visibility='hidden';});
    const screenshotPixels=async()=>{
      const screenshot=(await page.locator('#canvas').screenshot({type:'png',animations:'disabled'})).toString('base64');
      return page.evaluate(async png=>{
        const canvas=document.querySelector('#canvas'),q=JSON.parse(document.querySelector('#qaAuto').textContent||'{}'),v=q.display.view;
        const rect=canvas.getBoundingClientRect(),bytes=Uint8Array.from(atob(png),ch=>ch.charCodeAt(0));
        const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
        const width=bitmap.width,height=bitmap.height,scratch=document.createElement('canvas');scratch.width=width;scratch.height=height;
        const ctx=scratch.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);bitmap.close();
        const sx=width/rect.width,sy=height/rect.height;
        return [[40,40],[41,40],[192,64],[193,64],[400,40]].map(([x,y])=>{
          const cssX=v.cssWidth/2+(x+.5-v.documentWidth/2)*v.zoom+v.panX,cssY=v.cssHeight/2+(y+.5-v.documentHeight/2)*v.zoom+v.panY;
          const px=Math.max(0,Math.min(width-1,Math.floor(cssX*sx))),py=Math.max(0,Math.min(height-1,Math.floor(cssY*sy)));
          return {x,y,rgba:[...ctx.getImageData(px,py,1,1).data]};
        });
      },screenshot);
    };
    // A GPU context can finish its setup after input is enabled. Require the
    // reference actually to be presented; a fixed 280ms timer is not a check.
    let pixels=[],referencePresentationMs=0,presentationStart=Date.now();
    for(let attempt=0;attempt<15;attempt++){
      pixels=await screenshotPixels();
      const c0=pixels[0]?.rgba?.[0],c1=pixels[1]?.rgba?.[0],gradient=pixels[4]?.rgba;
      const valid=(Math.abs(c0-20)<3||Math.abs(c0-245)<3)&&(Math.abs(c1-20)<3||Math.abs(c1-245)<3)
        &&Math.abs(c0-c1)>200&&Math.abs((gradient?.[0]??0)-32)<=2
        &&Math.abs((gradient?.[1]??0)-223)<=2&&Math.abs((gradient?.[2]??0)-128)<=2;
      if(valid){referencePresentationMs=Date.now()-presentationStart;break;}
      if(attempt<14)await page.waitForTimeout(160);
    }
    assert.ok(referencePresentationMs>0,'GPU reference pixels never reached expected displayed pattern '+kind+' '+JSON.stringify(pixels));
    assert.ok(pixels.every(p=>p.rgba[3]===255),'reference pixel alpha '+JSON.stringify(pixels));
    output.referencePixels??={};output.referencePixels[kind]=pixels.map(p=>p.rgba);
    output.referenceLatencyMs??={};output.referenceLatencyMs[kind]=referencePresentationMs;
    await page.evaluate(()=>{document.getElementById('qaSummary').style.visibility='';});
    output.tests.push({kind,dpr,width,height,result:'REFERENCE-PASS',pixels});
  }
  await page.locator('#referencePattern').uncheck();
  await page.locator('#flipH').click();await page.locator('#flipV').click();
  v=await getState(page);assert.equal(v.view.flipX,true);assert.equal(v.view.flipY,true);assert.equal(v.revision,firstRev,'flip must not change revision');
  await page.locator('#fitView').click();
  await page.locator('#angleDegree').fill('33');
  await page.locator('#angleDegree').press('Tab');
  v=await getState(page);assert.ok(Math.abs(v.view.rotation-33*Math.PI/180)<1e-5,'rotation state');
  await page.locator('#zoomPercent').fill('137');
  await page.locator('#zoomPercent').press('Tab');
  v=await getState(page);assert.ok(Math.abs(v.view.zoom-1.37)<1e-6,'fractional zoom');
  if(kind==='webgl2'&&dpr===2&&width===512){
    for(const percent of [12.5,25,33.3,50,66.7,75,100,125,150,200,243,400,800,1600]){
      await page.locator('#zoomPercent').fill(String(percent));await page.locator('#zoomPercent').press('Tab');
      const state=await getState(page);assert.ok(Math.abs(state.view.zoom-percent/100)<1e-5,'zoom sweep '+percent);
    }
    for(const degrees of [0,5,15,30,45,89,90,135,237]){
      await page.locator('#angleDegree').fill(String(degrees));await page.locator('#angleDegree').press('Tab');
      const state=await getState(page);assert.ok(Math.abs(state.view.rotation-degrees*Math.PI/180)<1e-5,'rotate sweep '+degrees);
    }
  }
  await page.locator('#resetRotation').click();
  await page.locator('#fitView').click();
  await draw(page);
  v=await getState(page);assert.ok(Number(v.strokes)>0,'stroke persisted');
  await page.locator('#undo').click();await page.waitForFunction(()=>document.getElementById('canvas')?.dataset.canRedo==='true'&&document.getElementById('canvas')?.dataset.historyBusy==='false',{timeout:45000});
  await page.locator('#redo').click();await page.waitForFunction(()=>Number(document.getElementById('canvas')?.dataset.committedStrokes)>0&&document.getElementById('canvas')?.dataset.historyBusy==='false',{timeout:45000});
  await page.locator('#workspaceToggle').click();
  await page.evaluate(()=>{window.__m08Trace=[];const c=document.getElementById('canvas');for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture'])c.addEventListener(type,e=>window.__m08Trace.push({type,button:e.button,id:e.pointerId,isTrusted:e.isTrusted,ts:performance.now()}),{capture:true});});
  await draw(page,2);
  v=await getState(page);assert.ok(Number(v.strokes)>=2,'workspace closed still draws');
  if(dpr===2&&width===512){
    const previewDiff=await previewFinalSmoke(page,kind);output.tests.push({kind,dpr,width,height,result:'PREVIEW-FINAL-PASS',...previewDiff});
    if(kind==='webgl2')await geometrySmoke(page);
    else await page.locator('#workspaceToggle').click();
    await seamlessSmoke(page);
  }
  assert.equal(errors.filter(e=>!e.includes('ERR_NAME_NOT_RESOLVED')).length,0,'console errors: '+JSON.stringify(errors));
  if(dpr===2&&width===3000)await page.screenshot({path:path.join(evidence,kind+'-3000-'+dpr+'.png')});
  output.tests.push({kind,dpr,width,height,result:'PASS',backing:[v.backingWidth,v.backingHeight],css:[v.cssWidth,v.cssHeight],view:v.view,backend:v.backend,errors});
 }catch(e){const snapshot=await getState(page).catch(x=>({error:String(x)}));output.errors.push({kind,dpr,width,height,error:String(e),console:errors,snapshot});output.tests.push({kind,dpr,width,height,result:'FAIL',error:String(e),snapshot});await page.screenshot({path:path.join(evidence,kind+'-failure-'+dpr+'-'+width+'.png')}).catch(()=>{});}
 finally{await context.close();}
}
try{
 for(const kind of (process.env.M08_SMOKE_QUICK?['webgl2']:['webgl2','webgpu'])){
  for(const dpr of (process.env.M08_SMOKE_QUICK?[2]:[1,1.25,1.5,2,2.5,2.75,3]))await run(kind,dpr,512,384);
  for(const [w,h] of (process.env.M08_SMOKE_QUICK?[[2048,1536]]:[[2048,1536],[2560,1440],[3000,2000]]))await run(kind,2,w,h);
 }
}finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
if(output.referencePixels?.webgl2&&output.referencePixels?.webgpu){
 for(let i=0;i<output.referencePixels.webgl2.length;i++)for(let c=0;c<4;c++)
  assert.ok(Math.abs(output.referencePixels.webgl2[i][c]-output.referencePixels.webgpu[i][c])<=2,
    'displayed WebGL2/WebGPU reference pixels differ: '+JSON.stringify(output.referencePixels));
}
await fs.writeFile(path.join(evidence,'m08-report.json'),JSON.stringify(output,null,2));
console.log(JSON.stringify(output));
assert.equal(output.errors.length,0,'M08 browser verification failures: '+JSON.stringify(output.errors));
