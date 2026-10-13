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
  // Top/back of the tilted ellipse is rotatable: moving the finger right
  // turns the visible colored ring CLOCKWISE. Front/lower arc keeps the
  // existing horizontal-slider behavior tested above.
  await hex.fill('#FF0000');await hex.press('Enter');
  const startRingBox=await wheel.boundingBox();assert.ok(startRingBox);
  const upper={x:startRingBox.x+startRingBox.width*.5,y:startRingBox.y+startRingBox.height*32/160};
  const lastHue=Number(await wheel.getAttribute('aria-valuenow'));
  assert.equal(lastHue,0,'Top rotation starts at red');
  await p.mouse.move(upper.x,upper.y);await p.mouse.down();
  await p.mouse.move(upper.x+55,upper.y,{steps:14});await p.mouse.up();
  const rotatedHue=Number(await wheel.getAttribute('aria-valuenow'));
  assert.ok(rotatedHue>305&&rotatedHue<359,'Upper wheel dragged right must rotate clockwise: '+rotatedHue);
  const hsva=await p.locator('input[name="colorModel"][value="HSV"]').check().then(async()=>[
   Number(await p.locator('#colorNumber1').inputValue()),
   Number(await p.locator('#colorNumber2').inputValue())
  ]);
  assert.ok(hsva[0]>99&&hsva[1]>99,'Hue gesture must not change SV');
  // Externally visible SV diamond must have its actual four corners and
  // separate controls: no polygon clipping or touch area stealing.
  const plane=p.locator('#colorOrbitPlane'),q=await plane.boundingBox();assert.ok(q?.width>100);
  const svShape=await plane.evaluate(el=>{
   const rect=el.getBoundingClientRect(),wheel=el.parentElement.querySelector('#colorOrbitWheel').getBoundingClientRect();
   const wheelTopColor=wheel.top+wheel.height*(73-51)/160;
   const style=getComputedStyle(el),outer=el.closest('.workspace-box');
   return {
    naturalWidth:el.offsetWidth,naturalHeight:el.offsetHeight,
    rotatedBoundsWidth:rect.width,rotatedBoundsHeight:rect.height,
    rotation:style.transform,clipPath:style.clipPath,
    gapToHueRing:wheelTopColor-rect.bottom,
    overflow:outer.scrollWidth-outer.clientWidth
   };
  });
  assert.ok(Math.abs(svShape.naturalWidth-svShape.naturalHeight)<1,'Orbit SV diamond must originate from a true square: '+JSON.stringify(svShape));
  assert.ok(Math.abs(svShape.rotatedBoundsWidth-svShape.rotatedBoundsHeight)<1,'SV diamond rotated bounds must be symmetric');
  assert.notEqual(svShape.rotation,'none','SV square must be rotated into a diamond');
  assert.ok(svShape.clipPath==='none','Diamond uses genuine rotation without distorted clipping');
  assert.ok(svShape.gapToHueRing>=2&&svShape.gapToHueRing<=12,'Diamond should connect visually to the ring without stealing touches: '+JSON.stringify(svShape));
  assert.ok(svShape.overflow<=3,'Orbit must not overflow narrow dock');
  const svCoordinate=(s,v)=>{
   const dx=(s-.5)*svShape.naturalWidth,dy=(.5-v)*svShape.naturalHeight;
   return {x:q.x+q.width/2+(dx-dy)/Math.SQRT2,y:q.y+q.height/2+(dx+dy)/Math.SQRT2};
  };
  // Actual colored diamond corners are individually hit-testable (not a
  // rectangular click mask over the upper hue ring).
  const sampled=await plane.evaluate(el=>{
   const rect=el.getBoundingClientRect(),side=el.offsetWidth,cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
   const test=(s,v)=>{
    const dx=(s-.5)*side,dy=(.5-v)*side;
    const x=cx+(dx-dy)/Math.SQRT2,y=cy+(dx+dy)/Math.SQRT2;
    const elAt=document.elementFromPoint(x,y);
    return elAt===el||el.contains(elAt);
   };
   return [[.08,.08],[.92,.08],[.08,.92],[.92,.92]].map(([s,v])=>test(s,v));
  });
  assert.ok(sampled.every(Boolean),'Diamond must be accessible near all 4 corners');
  await p.screenshot({path:path.join(evidence,label+'-orbit.png')});
  // Dragging from the upper ring into the diamond must stay a hue gesture,
  // preserving saturation and brightness all the way until release.
  await hex.fill('#FF0000');await hex.press('Enter');
  await p.mouse.move(upper.x,upper.y);await p.mouse.down();
  await p.mouse.move(q.x+q.width/2,q.y+q.height/2,{steps:14});await p.mouse.up();
  const crossHSV=[Number(await p.locator('#colorNumber1').inputValue()),Number(await p.locator('#colorNumber2').inputValue())];
  assert.ok(crossHSV[0]>99&&crossHSV[1]>99,'Ring drag crossing the SV diamond must NOT change SV: '+crossHSV);
  // SV gesture uses inverse rotation, not its rectangular bounding box.
  const svFrom=svCoordinate(.28,.64);
  if(touch)await p.touchscreen.tap(svFrom.x,svFrom.y);
  else await p.mouse.click(svFrom.x,svFrom.y);
  const hsv=[
   Number(await p.locator('#colorNumber1').inputValue()),
   Number(await p.locator('#colorNumber2').inputValue())
  ];
  assert.ok(hsv[0]>24&&hsv[0]<33&&hsv[1]>60&&hsv[1]<68,'Diamond SV controls must map to true saturation and brightness: '+hsv);
  // SV gestures remain SV even after dragging across the ring. Hue is fixed.
  const hueBeforeSV=Number(await wheel.getAttribute('aria-valuenow'));
  const svStart=svCoordinate(.5,.5);
  await p.mouse.move(svStart.x,svStart.y);await p.mouse.down();
  await p.mouse.move(upper.x,upper.y,{steps:9});await p.mouse.up();
  assert.equal(Number(await wheel.getAttribute('aria-valuenow')),hueBeforeSV,'SV drag crossing ring must not rotate hue');
  if(touch){
   // Native touchscreen starts in the upper band; the ring, not the diamond,
   // owns the gesture. This is also important for Android tablet input.
   await hex.fill('#FF0000');await hex.press('Enter');
   const cdp=await context.newCDPSession(p);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:upper.x,y:upper.y}]});
   for(let i=1;i<=9;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:upper.x+55*i/9,y:upper.y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   const actualHue=Number(await wheel.getAttribute('aria-valuenow'));
   assert.ok(actualHue>305&&actualHue<359,'Touch: upper-ring right swipe rotates clockwise: '+actualHue);
   await cdp.detach();
  }
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
  result.tests.push({label,mode:'classic/orbit',menuGeometry,svShape,hue,rotatedHue,hsv,dragColor,overflow,homeRoundtrip:true});
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
