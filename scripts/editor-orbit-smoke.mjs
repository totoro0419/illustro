/** Integrated-app-only acceptance for Classic / Orbit color display modes. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const publicUrl=process.env.ORBIT_PUBLIC_URL??'';
const evidence=process.env.ORBIT_EVIDENCE_DIRECTORY??'/tmp/orbit-evidence';
await fs.mkdir(evidence,{recursive:true});
let server,base=publicUrl;
if(!base){
 const root=path.resolve(import.meta.dirname,'../apps/editor/dist');
 server=http.createServer(async(req,res)=>{
  try{
   const loc=decodeURIComponent((req.url??'/').split('?')[0]);
   const full=path.resolve(root,'.'+(loc==='/'?'/index.html':loc));
   if(!full.startsWith(root+path.sep))return res.writeHead(403).end();
   const data=await fs.readFile(full),ext=path.extname(full);
   res.setHeader('Content-Type',ext==='.js'?'text/javascript':ext==='.css'?'text/css':ext==='.html'?'text/html; charset=utf-8':ext==='.png'?'image/png':'application/octet-stream');
   res.end(data);
  }catch{res.writeHead(404).end();}
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 base='http://127.0.0.1:'+server.address().port+'/';
}
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const result={target:publicUrl?'integrated-public':'integrated-local',commit:process.env.EXPECTED_COMMIT_SHA||'',tests:[],errors:[]};
const color=p=>p.locator('#colorCode').textContent();
async function openEditor(p){
 await p.waitForSelector('#ihApp:not([hidden]) [data-ih-screen="home"]:not([hidden])',{timeout:40000});
 await p.locator('#ihStart').click();
 await p.locator('#ihNewDialog[open]').waitFor();
 await p.locator('#ihChoiceBlank').click();
 await p.locator('[data-ih-preset="512x384"]').click();
 await p.locator('#ihNewCreate').click();
 await p.locator('#ihApp').waitFor({state:'hidden',timeout:45000});
 await p.waitForFunction(()=>document.getElementById('status')?.textContent?.includes('描画できます'),null,{timeout:70000});
 if(!(await p.locator('#colorShowColor').isVisible())){
  const colorPage=p.locator('#colorPage');
  if(await colorPage.isVisible())await colorPage.click();
  else await p.locator('#workspaceToggle').click();
 }
 await p.locator('#colorShowColor').click();
 await p.locator('#colorScreen').waitFor({state:'visible'});
}
async function run(kind,touch=false){
 const label=kind+(touch?'-touch':'-desktop');
 const context=await browser.newContext({viewport:touch?{width:900,height:1120}:{width:1440,height:900},deviceScaleFactor:2,hasTouch:touch,isMobile:false});
 const p=await context.newPage(),logs=[];
 p.on('pageerror',e=>logs.push('page '+e.message));
 p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))logs.push('console '+m.text());});
 try{
  await p.goto(base+(base.includes('?')?'&':'?')+'backend='+kind,{waitUntil:'domcontentloaded',timeout:55000});
  await openEditor(p);
  const rev=await p.locator('#canvas').getAttribute('data-current-revision');
  const mode=p.locator('#colorPickerMode');
  assert.ok(await mode.isVisible(),'Compact picker mode dropdown is visible');
  const menuGeometry=await p.locator('.color-mode-switch').evaluate(el=>{
   const a=el.getBoundingClientRect(),b=el.querySelector('#colorPickerMode').getBoundingClientRect();
   return {height:a.height,menuWidth:b.width,menuHeight:b.height,menuWithinNav:b.top>=a.top-1&&b.bottom<=a.bottom+1};
  });
  assert.ok(menuGeometry.menuWithinNav&&menuGeometry.menuWidth<=100,'Picker mode dropdown fits within Color/Palette row: '+JSON.stringify(menuGeometry));
  assert.equal(await p.locator('.color-picker-modes').count(),0,'No extra mode row should consume editor height');
  await mode.selectOption('classic');
  assert.ok(await p.locator('#colorPicker').isVisible(),'Classic wheel remains intact');
  assert.equal(await p.locator('#colorOrbitPicker').isVisible(),false,'Orbit starts hidden');
  const hex=p.locator('#colorHex');
  await hex.fill('#FF0000');await hex.press('Enter');
  assert.equal(await color(p),'#FF0000');
  await mode.selectOption('orbit');
  assert.ok(await p.locator('#colorOrbitPicker').isVisible());
  assert.equal(await p.locator('#colorPicker').isVisible(),false,'Classic is hidden in Orbit');
  assert.equal(await mode.inputValue(),'orbit');
  assert.equal(await color(p),'#FF0000','Color state survives mode change');
  assert.ok(await p.locator('#colorValueChannels').isVisible(),'HSB/RGB controls remain visible in Orbit');
  const wheel=p.locator('#colorOrbitWheel');
  const b=await wheel.boundingBox();assert.ok(b?.width>210);
  const x=b.x+b.width/2,y=b.y+b.height*114/160;
  await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+86,y,{steps:12});await p.mouse.up();
  const dragColor=await color(p);
  assert.notEqual(dragColor,'#FF0000','Horizontal Orbit drag must change hue');
  const hue=Number(await wheel.getAttribute('aria-valuenow'));
  assert.ok(hue>88&&hue<115,'Horizontal drag moves hue about 99 degrees: '+hue);
  // Drag the wheel backward; no new artwork transaction is created.
  await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x-53,y,{steps:8});await p.mouse.up();
  assert.notEqual(await color(p),dragColor,'Reverse horizontal drag changes hue the other direction');
  await wheel.focus();await wheel.press('ArrowRight');
  assert.ok(Number(await wheel.getAttribute('aria-valuenow'))>=0,'Keyboard hue slider remains operable');
  const plane=p.locator('#colorOrbitPlane'),q=await plane.boundingBox();assert.ok(q?.width>100);
  const svShape=await plane.evaluate(el=>{
   const pane=el.getBoundingClientRect(),wheel=el.parentElement.querySelector('#colorOrbitWheel').getBoundingClientRect();
   const wheelTopColor=wheel.top+wheel.height*(73-51)/160;
   const style=getComputedStyle(el),outer=el.closest('.workspace-box');
   return {width:pane.width,height:pane.height,borderRadius:style.borderRadius,clipPath:style.clipPath,transform:style.transform,gapToHueRing:wheelTopColor-pane.bottom,overflow:outer.scrollWidth-outer.clientWidth};
  });
  assert.ok(Math.abs(svShape.width-svShape.height)<1,'Orbit SV area must be a true 1:1 square: '+JSON.stringify(svShape));
  assert.ok(svShape.transform==='none','SV panel must not be skewed or rotated');
  assert.ok(svShape.clipPath==='none','SV panel must not be clipped into a trapezoid');
  assert.ok(svShape.gapToHueRing>=2,'Orbit SV area must not overlap colored hue ring: '+JSON.stringify(svShape));
  assert.ok(svShape.overflow<=3,'Orbit must not overflow narrow dock');
  // All four SV corners remain physically within the colored panel.
  const hitCorners=await plane.evaluate(el=>{
   const r=el.getBoundingClientRect();return [[12,12],[r.width-12,12],[12,r.height-12],[r.width-12,r.height-12]].map(([x,y])=>{
    const t=document.elementFromPoint(r.left+x,r.top+y);return t===el||el.contains(t);
   });
  });
  assert.ok(hitCorners.every(Boolean),'SV panel corners must be available, without polygon clipping');
  await p.screenshot({path:path.join(evidence,label+'-orbit.png')});
  if(touch)await p.touchscreen.tap(q.x+q.width*.28,q.y+q.height*.36);
  else await p.mouse.click(q.x+q.width*.28,q.y+q.height*.36);
  const hsv=await p.locator('input[name="colorModel"][value="HSV"]').check().then(async()=>[
   Number(await p.locator('#colorNumber1').inputValue()),
   Number(await p.locator('#colorNumber2').inputValue())
  ]);
  assert.ok(hsv[0]>15&&hsv[0]<50&&hsv[1]>50&&hsv[1]<83,'Orbit SV area updates shared HSB inputs: '+hsv);
  const prior=await color(p);
  await mode.selectOption('classic');
  assert.equal(await color(p),prior,'Classic and Orbit use the exact same foreground color');
  assert.ok(await p.locator('#colorRing').isVisible());
  await p.locator('#colorShowPalette').click();
  assert.ok(await p.locator('#colorPaletteScreen').isVisible(),'palette is unchanged in Orbit workflow');
  await p.locator('[data-color-action="add-current"]').click();
  assert.ok(await p.locator('#colorPaletteList .color-swatch').count()>0);
  await p.locator('#colorShowColor').click();
  await mode.selectOption('orbit');
  assert.equal(await color(p),prior,'Palette and mode changes must not reset the color');
  assert.equal(await p.evaluate(()=>localStorage.getItem('illustro-color-picker-mode')),'orbit','Display selection persists in local storage');
  const revisionNow=await p.locator('#canvas').getAttribute('data-current-revision');
  assert.equal(revisionNow,rev,'Changing color modes must not create an artwork transaction');
  const overflow=await p.locator('#colorOrbitPicker').evaluate(el=>({
   own:el.scrollWidth-el.clientWidth,
   dock:el.closest('.workspace-box')?.scrollWidth-el.closest('.workspace-box')?.clientWidth
  }));
  assert.ok(overflow.own<=2&&overflow.dock<=3,'No horizontal overflow '+JSON.stringify(overflow));
  await p.screenshot({path:path.join(evidence,label+'.png')});
  // The Home button must still lead back to the integrated app's Home.
  await p.locator('#home').click();
  await p.locator('#ihApp:not([hidden]) [data-ih-screen="home"]:not([hidden])').waitFor({timeout:30000});
  await p.locator('#ihReturnEditor').click();
  await p.locator('#ihApp').waitFor({state:'hidden',timeout:45000});
  // On touch screens the workspace may be collapsed after navigation.
  // Use the same visible UI control the user would use to reopen Color.
  if(!(await p.locator('#colorShowColor').isVisible())){
   if(await p.locator('#colorPage').isVisible())await p.locator('#colorPage').click();
   else await p.locator('#workspaceToggle').click();
  }
  await p.locator('#colorShowColor').click();
  assert.equal(await mode.inputValue(),'orbit','Mode persists across editor/Home roundtrip');
  assert.equal(await color(p),prior,'Color survives Home roundtrip');
  result.tests.push({label,mode:'classic/orbit',menuGeometry,svShape,hue,hsv,dragColor,overflow,homeRoundtrip:true});
 }catch(e){
  result.errors.push({label,error:String(e),stack:e.stack,console:logs});
  await p.screenshot({path:path.join(evidence,label+'-FAIL.png')}).catch(()=>{});
 }finally{
  if(logs.length)result.errors.push({label,console:logs});
  await context.close();
 }
}
try{
 await run('webgl2');
 await run('webgpu');
 await run('webgl2',true);
}finally{await browser.close();if(server)await new Promise(ok=>server.close(ok));}
await fs.writeFile(path.join(evidence,'orbit-report.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
assert.equal(result.errors.length,0,'Integrated Orbit browser acceptance failed');
