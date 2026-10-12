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
 if(await p.locator('#colorPage').isVisible())await p.locator('#colorPage').click();
 else await p.locator('#workspaceToggle').click();
 assert.ok(await p.locator('#colorPicker').isVisible(),'Primary color picker must be reachable with one action');
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
  await showColor(p);await p.locator('#colorPrecision summary').click();
  await p.locator('input[name="colorModel"][value="RGB"]').check();
  assert.ok(Math.abs(Number(await p.locator('#colorNumber0').inputValue())-255)<0.5,'RGB numeric sync');
  await p.locator('input[name="colorModel"][value="HSL"]').check();
  assert.ok(Math.abs(Number(await p.locator('#colorNumber1').inputValue())-100)<.5,'HSL numeric sync');
  await p.locator('input[name="colorModel"][value="HSV"]').check();
  assert.ok(Math.abs(Number(await p.locator('#colorNumber2').inputValue())-100)<.5,'HSV numeric sync');
  await p.locator('#colorPrecision summary').click();
  const wheel=await p.locator('#colorPicker').boundingBox();
  const picker=await p.locator('#colorPlane').boundingBox();assert.ok(picker);
  assert.ok(wheel&&picker,'picker geometry exists');
  const pickerGeometry=await p.locator('#colorPicker').evaluate(el=>{
    const ring=el.querySelector('#colorRing'),plane=el.querySelector('#colorPlane');
    const a=ring.getBoundingClientRect(),b=plane.getBoundingClientRect(),style=getComputedStyle(el),c=document.getElementById('colorBox');
    const outer=c.getBoundingClientRect(),offenders=[...c.querySelectorAll('*')].map(x=>({el:(x.id?'#'+x.id:x.className?.toString().slice(0,40)||x.tagName),right:Math.round(x.getBoundingClientRect().right-outer.right),left:Math.round(outer.left-x.getBoundingClientRect().left)})).filter(x=>x.right>3||x.left>3).sort((a,b)=>b.right-a.right).slice(0,8);return {wheel:a.width,square:b.width,roundingClearance:(a.width/2-30)-(Math.hypot(b.width/2,b.height/2)+9),horizontalOverflow:c?.scrollWidth-c?.clientWidth,clientWidth:c.clientWidth,scrollWidth:c.scrollWidth,offenders,hasPeerTabs:!!document.querySelector('.color-tabs'),precisionOpened:document.getElementById('colorPrecision').open};
  });
  assert.ok(pickerGeometry.roundingClearance>=2,'SV square and marker must not collide with hue ring');
  assert.ok(pickerGeometry.horizontalOverflow<=3,'Color Box must have no horizontal overflow: '+JSON.stringify(pickerGeometry));
  assert.equal(pickerGeometry.hasPeerTabs,false,'advanced and palette controls are not peer tabs');
  await p.mouse.move(picker.x+picker.width*.35,picker.y+picker.height*.15);await p.mouse.down();
  await p.mouse.move(picker.x+picker.width*.75,picker.y+picker.height*.65,{steps:8});await p.mouse.up();
  const valueAfterPicker=await current(p);assert.notEqual(valueAfterPicker,'#FF0000');
  assert.ok((await state(p)).currentRevision===rev2);
  await p.locator('#colorPaletteTools summary').click();
  await p.locator('[data-color-action="new-palette"]').click();
  await p.locator('#colorPaletteName').fill('検証パレット');
  await p.locator('#colorPaletteConfirm').click();
  assert.equal(await p.locator('#colorPaletteSelect').inputValue(),await p.locator('#colorPaletteSelect option').last().getAttribute('value'));
  await p.locator('[data-color-action="add-current"]').click();
  assert.equal(await p.locator('#colorPaletteList .color-swatch').count(),1);
  await changeHex(p,'#0000FF');
  await p.locator('[data-color-action="add-current"]').last().click();
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
  assert.ok(await p.locator('#colorHistoryList').isVisible(),'history is accessible without a tab');
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
