import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const publicUrl=process.env.M09_PUBLIC_URL??'';
const evidence=process.env.M09_EVIDENCE_DIRECTORY??'/tmp/m09-evidence';
await fs.mkdir(evidence,{recursive:true});
let server,base=publicUrl;
if(!base){
 const root=path.resolve(import.meta.dirname,'../apps/editor/dist');
 server=http.createServer(async(req,res)=>{try{
  const url=decodeURIComponent((req.url??'/').split('?')[0]),p=path.resolve(root,'.'+(url==='/'?'/index.html':url));
  if(!p.startsWith(root+path.sep))return res.writeHead(403).end();
  const bytes=await fs.readFile(p),ext=path.extname(p);
  res.setHeader('Content-Type',ext==='.js'?'application/javascript':ext==='.css'?'text/css':ext==='.html'?'text/html':ext==='.json'?'application/json':'application/octet-stream');res.end(bytes);
 }catch{res.writeHead(404).end();}});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));base='http://127.0.0.1:'+server.address().port+'/';
}
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report={commit:process.env.EXPECTED_COMMIT_SHA??'',target:publicUrl?'public':'local',cases:[],errors:[]};
const current=p=>p.locator('#colorCode').textContent();
const state=async p=>JSON.parse((await p.locator('#qaAuto').textContent())||'{}');
async function showColor(p){
 if(await p.locator('#colorPicker').isVisible())return;
 if(await p.locator('#colorShowColor').isVisible()){
  await p.locator('#colorShowColor').click();
 }else if(await p.locator('#colorPage').isVisible()){
  await p.locator('#colorPage').click();
  await p.locator('#colorShowColor').click();
 }else{
  await p.locator('#workspaceToggle').click();
  await p.locator('#colorShowColor').click();
 }
 assert.ok(await p.locator('#colorPicker').isVisible(),'ibis-style Color screen must be reachable');
}
async function changeHex(p,value){
 await showColor(p);const field=p.locator('#colorHex');await field.fill(value);await field.press('Enter');
 assert.equal(await current(p),value);
}
async function draw(p,offset=0){
 const b=await p.locator('#canvas').boundingBox();assert.ok(b?.width>100);
 const y=b.y+b.height/2+offset,x=b.x+b.width/2;
 await p.mouse.move(x-75,y);await p.mouse.down();
 await p.mouse.move(x+75,y,{steps:20});await p.mouse.up();
 await p.waitForFunction(()=>document.getElementById('canvas')?.dataset.historyBusy==='false'&&document.getElementById('canvas')?.dataset.committedStrokes!==undefined);
 await p.waitForTimeout(350);
 return {x,y};
}
async function test(kind,dpr,touch=false){
 const context=await browser.newContext({viewport:{width:touch?900:1440,height:touch?1120:900},deviceScaleFactor:dpr,hasTouch:touch,isMobile:false});
 const p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push('page: '+e.message));
 p.on('console',m=>{if(m.type()==='error'&&!/favicon/i.test(m.text()))errors.push('console: '+m.text());});
 const name=kind+'-'+dpr+'-'+(touch?'touch':'desktop');
 try{
  await p.goto(base+(base.includes('?')?'&':'?')+'m09=1&backend='+kind,{waitUntil:'domcontentloaded'});
  assert.equal(await p.locator('#colorPicker').count(),1,'Color picker visible in Right Box');
  assert.equal(await p.locator('.color-tabs').count(),0,'four peer tabs are removed');
  assert.equal(await p.locator('#colorShowPalette').count(),1,'dedicated Palette screen');
  assert.equal(await p.locator('#colorScreen[hidden]').count(),0,'Color is the default screen');
  assert.equal(await p.locator('#colorPaletteScreen[hidden]').count(),1,'Palette starts hidden');
  assert.ok(await p.locator('#colorValueChannels').isVisible(),'HSB sliders always visible without expansion');
  await p.locator('#new').click();
  await p.waitForFunction(()=>document.getElementById('status')?.textContent?.includes('描画できます'),{timeout:75000});
  const initial=await state(p);
  assert.equal(initial.milestone,'M09');assert.equal(initial.backend.toLowerCase(),kind,'requested renderer must initialize');
  assert.ok(initial.display?.backing?.width>=initial.display?.css?.width*dpr-3,'DPR presentation regression');
  const before=initial.currentRevision;
  await changeHex(p,'#FF0000');
  assert.equal((await state(p)).currentRevision,before,'color change must not create artwork revision');
  await p.locator('#sizeNumber').fill('64');await p.locator('#sizeNumber').dispatchEvent('input');
  const red=await draw(p,-25);
  await p.waitForFunction(()=>Number(document.getElementById('canvas').dataset.committedStrokes)>=1,{timeout:90000});
  const rev1=(await state(p)).currentRevision;assert.notEqual(rev1,before);
  await changeHex(p,'#0000FF');
  const blue=await draw(p,90);
  await p.waitForFunction(()=>Number(document.getElementById('canvas').dataset.committedStrokes)>=2,{timeout:90000});
  const rev2=(await state(p)).currentRevision;assert.notEqual(rev2,rev1);
  // Return to red with composite 1x1 GPU sample.
  await p.locator('#eyedropper').click();
  assert.equal(await p.locator('#eyedropper').getAttribute('aria-pressed'),'true');
  await p.mouse.click(red.x,red.y);
  await p.waitForFunction(()=>document.getElementById('colorCode')?.textContent==='#FF0000',{timeout:20000});
  assert.equal(await p.locator('#eyedropper').getAttribute('aria-pressed'),'false');
  assert.equal((await state(p)).currentRevision,rev2,'eyedropper must not create artwork revision');
  await showColor(p);
  await p.locator('input[name="colorModel"][value="RGB"]').check();
  assert.ok(Math.abs(Number(await p.locator('#colorNumber0').inputValue())-255)<0.5,'RGB numeric sync');
  await p.locator('input[name="colorModel"][value="HSL"]').check();
  assert.ok(Math.abs(Number(await p.locator('#colorNumber1').inputValue())-100)<.5,'HSL numeric sync');
  await p.locator('input[name="colorModel"][value="HSV"]').check();
  assert.ok(Math.abs(Number(await p.locator('#colorNumber2').inputValue())-100)<.5,'HSV numeric sync');
  await p.locator('#colorPlane').scrollIntoViewIfNeeded();
  const wheel=await p.locator('#colorPicker').boundingBox();
  const picker=await p.locator('#colorPlane').boundingBox();assert.ok(picker);
  assert.ok(wheel&&picker,'picker geometry exists');
  const pickerGeometry=await p.locator('#colorPicker').evaluate(el=>{
    const ring=el.querySelector('#colorRing'),plane=el.querySelector('#colorPlane');
    const a=ring.getBoundingClientRect(),b=plane.getBoundingClientRect(),style=getComputedStyle(el),c=el.closest('.workspace-box');
    const band=Number.parseFloat(getComputedStyle(ring).getPropertyValue('--hue-ring-width'));
    return {wheel:a.width,diamond:b.width,hueRingThickness:band,ringMask:getComputedStyle(ring).maskImage,roundingClearance:a.width/2-band-(plane.offsetWidth/Math.SQRT2+9),horizontalOverflow:c.scrollWidth-c.clientWidth,hasPeerTabs:!!document.querySelector('.color-tabs'),isRotated:getComputedStyle(plane).transform!=='none'};
  });
  assert.ok(pickerGeometry.roundingClearance>=2,'SV square and marker must not collide with hue ring');
  assert.ok(pickerGeometry.horizontalOverflow<=3,'Color Box must have no horizontal overflow: '+JSON.stringify(pickerGeometry));
  assert.equal(pickerGeometry.hasPeerTabs,false,'no four-peer tabs');
  assert.equal(pickerGeometry.isRotated,true,'square is rotated as an HSB diamond');
  assert.equal(pickerGeometry.hueRingThickness,22,'hue ring must be a thin 22px annulus');
  assert.match(pickerGeometry.ringMask,/closest-side/,'hue ring needs a radius-based circular cutout');
  // Verify rendered pixels: saturated hue on the outer band, neutral background in the center gap.
  const ringPng=await p.locator('#colorPicker').screenshot();
  const ringPixels=await p.evaluate(async(data)=>{
   const image=new Image();image.src=data;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const probe=(radiusPx)=>{const d=ctx.getImageData(Math.round(canvas.width/2),Math.round(canvas.height/2-radiusPx),1,1).data;return [d[0],d[1],d[2]];};
   const bandMid=(canvas.width/2-(22/2)*(canvas.width/252));
   const centerGap=(canvas.width/2-34*(canvas.width/252));
   return {ring:probe(bandMid),gap:probe(centerGap),width:canvas.width};
  },'data:image/png;base64,'+ringPng.toString('base64'));
  const chroma=c=>Math.max(...c)-Math.min(...c);
  assert.ok(chroma(ringPixels.ring)>80,'Hue ring must visibly contain bright hue color: '+JSON.stringify(ringPixels));
  assert.ok(chroma(ringPixels.gap)<40,'The space inside the hue ring must be visually empty: '+JSON.stringify(ringPixels));

  // Test unrotated S/B coordinates transformed into the visible diamond.
  const touchSource=await p.locator('#colorPlane').evaluate(el=>{
   const a=el.getBoundingClientRect();return {cx:a.left+a.width/2,cy:a.top+a.height/2,side:el.offsetWidth};
  });
  const diamondPos=(sat,bright)=>{
   const dx=(sat-.5)*touchSource.side,dy=(.5-bright)*touchSource.side;
   return {x:touchSource.cx+(dx-dy)/Math.SQRT2,y:touchSource.cy+(dx+dy)/Math.SQRT2};
  };
  const from=diamondPos(.25,.85),to=diamondPos(.75,.35);
  await p.mouse.move(from.x,from.y);await p.mouse.down();
  await p.mouse.move(to.x,to.y,{steps:8});await p.mouse.up();
  const valueAfterPicker=await current(p);
  assert.notEqual(valueAfterPicker,'#FF0000','ibis-style diamond drag updates current color');
  // Clicking the masked center gap may not silently change hue.
  const beforeGapClick=await current(p),circleCenter={x:wheel.x+wheel.width/2,y:wheel.y+wheel.height/2};
  await p.mouse.click(circleCenter.x,circleCenter.y-wheel.width/2+33);
  assert.equal(await current(p),beforeGapClick,'transparent hue-ring center is not a clickable hue');
  await p.mouse.click(circleCenter.x,circleCenter.y-wheel.width/2+11);
  assert.notEqual(await current(p),beforeGapClick,'hue changes when clicking the colored annulus');

  assert.ok((await state(p)).currentRevision===rev2);
  await p.locator('#colorShowPalette').click();
  assert.ok(await p.locator('#colorPaletteScreen').isVisible(),'palette toggle shows palette + history');
  await p.locator('#colorPaletteTools summary').click();
  await p.locator('[data-color-action="new-palette"]').click();
  await p.locator('#colorPaletteName').fill('検証パレット');
  await p.locator('#colorPaletteConfirm').click();
  assert.equal(await p.locator('#colorPaletteSelect').inputValue(),await p.locator('#colorPaletteSelect option').last().getAttribute('value'));
  await p.locator('[data-color-action="add-current"]').click();
  assert.equal(await p.locator('#colorPaletteList .color-swatch').count(),1);
  await changeHex(p,'#0000FF');
  await p.locator('#colorShowPalette').click();
  await p.locator('[data-color-action="add-current"]').click();
  assert.equal(await p.locator('#colorPaletteList .color-swatch').count(),2);
  const nameBefore=await p.locator('#colorPaletteSelect option:checked').textContent();
  const swatchesBefore=await p.locator('#colorPaletteList .color-swatch').evaluateAll(list=>list.map(x=>x.getAttribute('aria-label')));
  const file=await Promise.all([p.waitForEvent('download'),p.locator('[data-color-action="export-palette"]').click()]).then(async([download])=>fs.readFile(await download.path()));
  await p.locator('#colorPaletteFile').setInputFiles({name:'palette.json',mimeType:'application/json',buffer:file});
  assert.equal(await p.locator('#colorPaletteSelect option:checked').textContent(),nameBefore);
  assert.deepEqual(await p.locator('#colorPaletteList .color-swatch').evaluateAll(list=>list.map(x=>x.getAttribute('aria-label'))),swatchesBefore);
  await p.locator('#colorPaletteManageList .color-swatch-move[aria-label="前へ移動"]').last().click();
  await p.locator('#colorPaletteManageList .color-swatch-move[aria-label="色を削除"]').first().click();
  assert.equal(await p.locator('#colorPaletteList .color-swatch').count(),1);
  assert.ok(await p.locator('#colorHistoryList .color-swatch').count()>=2);
  assert.ok(await p.locator('#colorHistoryList').isVisible(),'history shares the Palette screen');
  if(touch){
    await p.locator('#colorShowColor').click();
    await p.locator('#colorPicker').scrollIntoViewIfNeeded();
    const box=await p.locator('#colorPicker').boundingBox();assert.ok(box);
    const beforeTouch=await current(p);
    await p.touchscreen.tap(box.x+box.width*.5,box.y+box.height*.06);
    assert.notEqual(await current(p),beforeTouch,'touch hue ring changes color');
  }
  await p.screenshot({path:path.join(evidence,name+'-color.png')});
 }catch(e){report.errors.push({name,error:String(e),stack:e.stack,console:errors});await p.screenshot({path:path.join(evidence,name+'-failure.png')}).catch(()=>{});}
 finally{report.cases.push({name,console:errors,qa:await state(p).catch(()=>null)});if(errors.length)report.errors.push({name,console:errors});await context.close();}
}
// The first pass covers both backends and a touch-capable projection.
// Other M09 palette and keyboard controls are covered by unit + additional browser assertions.
try{for(const kind of ['webgl2','webgpu'])await test(kind,2);await test('webgl2',2,true);}
finally{await browser.close();if(server)await new Promise(ok=>server.close(ok));}
await fs.writeFile(path.join(evidence,publicUrl?'m09-public.json':'m09-local.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({cases:report.cases.map(c=>c.name),errors:report.errors}));
assert.equal(report.errors.length,0,'M09 browser checks failed');
