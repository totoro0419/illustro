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
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const wheelOpacity=await wheel.evaluate(el=>{
   const bg=getComputedStyle(el).backgroundColor;
   const ctx=el.getContext('2d');
   const pixel=ctx.getImageData(Math.round(el.width/2),Math.round(el.height*73/160),1,1).data;
   return {background:bg,holeAlpha:pixel[3]};
  });
  assert.ok(wheelOpacity.background==='rgba(0, 0, 0, 0)'||wheelOpacity.background==='transparent','Orbit canvas must have a transparent CSS background, not the global white canvas fill: '+JSON.stringify(wheelOpacity));
  assert.equal(wheelOpacity.holeAlpha,0,'Inner hole must stay transparent, never a shadow-filled gray disk');
  const b=await wheel.boundingBox();assert.ok(b?.width>210);
  const hitMap=await p.locator('#colorOrbitPicker').evaluate(root=>{
   const wheel=root.querySelector('#colorOrbitWheel'),svg=root.querySelector('#colorOrbitHueHit'),rear=root.querySelector('#colorOrbitHueBackHit');
   const r=root.getBoundingClientRect(),wr=wheel.getBoundingClientRect();
   const sample=(x,y)=>document.elementFromPoint(x,y)?.id||'anonymous';
   return {
    plainTarget:sample(r.left+r.width*.08,r.top+r.height*.26),
    upperTarget:sample(wr.left+wr.width*(160+121.5*Math.cos(-130*Math.PI/180))/320,wr.top+wr.height*(73+41*Math.sin(-130*Math.PI/180))/160),
    coveredRearTarget:sample(wr.left+wr.width/2,wr.top+wr.height*32/160),
    lowerTarget:sample(wr.left+wr.width/2,wr.top+wr.height*(114/160)),
    svgTouch:getComputedStyle(svg).touchAction,
    rootTouch:getComputedStyle(root).touchAction,
    canvasPointer:getComputedStyle(wheel).pointerEvents,
    upperTouch:getComputedStyle(rear.querySelector('#colorOrbitTopArc')).touchAction,
    rearSvgTouch:getComputedStyle(rear).touchAction,
    frontTouch:getComputedStyle(svg.querySelector('#colorOrbitFrontArc')).touchAction,
   };
  });
  assert.equal(hitMap.plainTarget,'colorOrbitPicker','A blank Orbit margin must not intercept workspace scrolling: '+JSON.stringify(hitMap));
  assert.equal(hitMap.upperTarget,'colorOrbitTopArc','Exposed upper ellipse arc must remain draggable: '+JSON.stringify(hitMap));
  assert.equal(hitMap.coveredRearTarget,'colorOrbitPlane','SV must cover the occluded back arc (true layer ordering): '+JSON.stringify(hitMap));
  assert.equal(hitMap.lowerTarget,'colorOrbitFrontArc','Front ellipse arc must have a real curved hit target: '+JSON.stringify(hitMap));
  assert.equal(hitMap.rootTouch,'pan-y','Blank Orbit must allow vertical workspace touch scrolling');
  assert.equal(hitMap.canvasPointer,'none','Rectangular canvas must never swallow gestures or scrolling');
  assert.equal(hitMap.svgTouch,'none','The front SVG must disable native scrolling on hue gestures');
  assert.equal(hitMap.rearSvgTouch,'none','The back SVG must disable native scrolling on hue gestures');
  assert.equal(hitMap.upperTouch,'none','Only the upper color arc disables native touch scroll');
  assert.equal(hitMap.frontTouch,'none','Only the front color arc disables native touch scroll');

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
  const upper={x:startRingBox.x+startRingBox.width*(160+121.5*Math.cos(-130*Math.PI/180))/320,y:startRingBox.y+startRingBox.height*(73+41*Math.sin(-130*Math.PI/180))/160};
  const lastHue=Number(await wheel.getAttribute('aria-valuenow'));
  assert.equal(lastHue,0,'Top rotation starts at red');
  await p.mouse.move(upper.x,upper.y);await p.mouse.down();
  await p.mouse.move(upper.x+55,upper.y,{steps:14});await p.mouse.up();
  const rotatedHue=Number(await wheel.getAttribute('aria-valuenow'));
  assert.ok(rotatedHue>305&&rotatedHue<359,'Upper wheel dragged right must rotate clockwise: '+rotatedHue);
  // Real curved gesture along the colored UPPER elliptical arc, not an
  // artificial horizontal mouse move outside the wheel. Drag the real arc from
  // upper-left through its top to upper-right and verify continuous rotation.
  await hex.fill('#FF0000');await hex.press('Enter');
  const upperArc=(degrees)=>{
   const rad=degrees*Math.PI/180,frame=startRingBox;
   return {x:frame.x+frame.width*(160+121.5*Math.cos(rad))/320,
           y:frame.y+frame.height*(73+41*Math.sin(rad))/160};
  };
  const arcStart=upperArc(-130),arcEnd=upperArc(-50);
  await p.mouse.move(arcStart.x,arcStart.y);await p.mouse.down();
  assert.equal(await p.locator('#colorOrbitPicker').getAttribute('data-orbit-gesture'),'rotate','Upper curved arc must grab hue wheel');
  for(let deg=-125;deg<=-50;deg+=5){
   const pt=upperArc(deg);await p.mouse.move(pt.x,pt.y,{steps:2});
  }
  await p.mouse.up();
  const arcHue=Number(await wheel.getAttribute('aria-valuenow'));
  assert.ok(arcHue>265&&arcHue<295,'Tracing the upper painted arc must rotate clockwise about 80°: '+arcHue);
  // Follow one COMPLETE ellipse, including the hidden SV-covered part and
  // the foreground half. The hue must keep rotating rather than switch into
  // SV, jump at the -180/+180 seam or stop when the finger crosses a layer.
  await hex.fill('#FF0000');await hex.press('Enter');
  await p.mouse.move(upperArc(-130).x,upperArc(-130).y);await p.mouse.down();
  const fullCircle=[];
  for(let degrees=-125;degrees<=230;degrees+=5){
   const pt=upperArc(degrees);await p.mouse.move(pt.x,pt.y);
   if([ -40,50,140,230 ].includes(degrees))
    fullCircle.push({degrees,hue:Number(await wheel.getAttribute('aria-valuenow')),
     mode:await p.locator('#colorOrbitPicker').getAttribute('data-orbit-gesture')});
  }
  await p.mouse.up();
  assert.equal(fullCircle.length,4,'Full-circle checkpoints must all be sampled');
  assert.ok(fullCircle.every(c=>c.mode==='rotate'),'One circular trace must keep its hue operation across SV and front rim: '+JSON.stringify(fullCircle));
  assert.ok(fullCircle.slice(0,3).every(c=>c.hue>30&&c.hue<340),'Full circle must change hue in every quadrant: '+JSON.stringify(fullCircle));
  assert.ok(fullCircle[3].hue<7||fullCircle[3].hue>353,'One lap must return to its original hue: '+JSON.stringify(fullCircle));
  // Starting on the front rim keeps a straight horizontal slide, but curved
  // tracing along the circumference must also turn the wheel from this side.
  await hex.fill('#FF0000');await hex.press('Enter');
  const frontStart=upperArc(90);
  await p.mouse.move(frontStart.x,frontStart.y);await p.mouse.down();
  const frontCircle=[];
  for(let degrees=95;degrees<=450;degrees+=5){
   const pt=upperArc(degrees);await p.mouse.move(pt.x,pt.y);
   if([150,240,330,450].includes(degrees))
    frontCircle.push({degrees,hue:Number(await wheel.getAttribute('aria-valuenow')),
     mode:await p.locator('#colorOrbitPicker').getAttribute('data-orbit-gesture')});
  }
  await p.mouse.up();
  assert.ok(frontCircle.some(c=>c.mode==='rotate'),'A circular trace beginning at the front must become a hue rotation: '+JSON.stringify(frontCircle));
  assert.ok(frontCircle[3].hue<10||frontCircle[3].hue>350,'Full front-origin circular trace should close at the initial color: '+JSON.stringify(frontCircle));
  await hex.fill('#FF0000');await hex.press('Enter');
  // A touch that starts at a pixel of the upper ring, where the SV diamond
  // overlaps its bounding box, must still capture the RING.
  await hex.fill('#FF0000');await hex.press('Enter');
  await p.mouse.move(upper.x,upper.y);await p.mouse.down();
  assert.equal(await p.locator('#colorOrbitPicker').getAttribute('data-orbit-gesture'),'rotate','Upper center must choose ring, not SV');
  await p.mouse.move(upper.x+25,upper.y-2,{steps:4});await p.mouse.up();
  const hsva=await p.locator('input[name="colorModel"][value="HSV"]').check().then(async()=>[
   Number(await p.locator('#colorNumber1').inputValue()),
   Number(await p.locator('#colorNumber2').inputValue())
  ]);
  assert.ok(hsva[0]>99&&hsva[1]>99,'Hue gesture must not change SV');
  // The ellipse bounding box has no blanket touch blockade. A drag initiated
  // on unused whitespace is not classified as an Orbit color gesture.
  const rootHit=p.locator('#colorOrbitPicker');
  const frameHit=await rootHit.boundingBox();assert.ok(frameHit);
  await rootHit.evaluate(el=>{el.dataset.orbitGesture='unset';});
  const blank={x:frameHit.x+frameHit.width*.08,y:frameHit.y+frameHit.height*.26};
  const blankColor=await color(p);
  await p.mouse.move(blank.x,blank.y);await p.mouse.down();
  await p.mouse.move(blank.x,blank.y-50,{steps:6});await p.mouse.up();
  assert.equal(await rootHit.getAttribute('data-orbit-gesture'),'unset','Whitespace drag must not acquire a color gesture');
  assert.equal(await color(p),blankColor,'Whitespace drag must leave hue and SV unchanged');

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
    overlapWithHueRing:rect.bottom-wheelTopColor,
    // The bottom tip must enter the transparent INNER opening, not merely
    // disappear behind the opaque colored upper band. The old top:9% layout
    // passed the outer-ring overlap check yet left the diamond visually
    // separated from the hole (it stopped 0.7 CSS px short).
    innerHoleTop:wheel.top+wheel.height*(73-31)/160,
    visibleIntoHole:rect.bottom-(wheel.top+wheel.height*(73-31)/160),
    diamondTipVisible:(()=>{
     const x=rect.left+rect.width/2;
     const y=wheel.top+wheel.height*(73-31)/160+Math.min(9,rect.width*.04);
     const hit=document.elementFromPoint(x,y);
     return hit===el||el.contains(hit);
    })(),
    topMargin:rect.top-el.parentElement.getBoundingClientRect().top,
    ringInFront:Number(getComputedStyle(el.parentElement.querySelector('#colorOrbitWheelFront')).zIndex)>Number(style.zIndex),
    backRimBehind:Number(getComputedStyle(el.parentElement.querySelector('#colorOrbitWheel')).zIndex)<Number(style.zIndex),
    frontHitAbove:Number(getComputedStyle(el.parentElement.querySelector('#colorOrbitHueHit')).zIndex)>Number(style.zIndex),
    backHitBehind:Number(getComputedStyle(el.parentElement.querySelector('#colorOrbitHueBackHit')).zIndex)<Number(style.zIndex),
    innerHoleBottom:wheel.top+wheel.height*(73+31)/160,
    tipBehindFront:rect.bottom-(wheel.top+wheel.height*(73+31)/160),
    relativeSide:el.offsetWidth/el.parentElement.getBoundingClientRect().width,
    overflow:outer.scrollWidth-outer.clientWidth
   };
  });
  assert.ok(Math.abs(svShape.naturalWidth-svShape.naturalHeight)<1,'Orbit SV diamond must originate from a true square: '+JSON.stringify(svShape));
  assert.ok(Math.abs(svShape.rotatedBoundsWidth-svShape.rotatedBoundsHeight)<1,'SV diamond rotated bounds must be symmetric');
  assert.notEqual(svShape.rotation,'none','SV square must be rotated into a diamond');
  assert.ok(svShape.clipPath==='none','Diamond uses genuine rotation without distorted clipping');
  assert.ok(svShape.relativeSide>=.435&&svShape.relativeSide<=.455,'SV diamond should remain readable without overpowering the ring: '+JSON.stringify(svShape));
  assert.ok(svShape.overlapWithHueRing>=58&&svShape.overlapWithHueRing<=76,'SV diamond should only partially overlap the rear ring: '+JSON.stringify(svShape));
  assert.ok(svShape.visibleIntoHole>=40&&svShape.visibleIntoHole<=59,'SV diamond must remain near the ring opening without penetrating too deeply: '+JSON.stringify(svShape));
  assert.ok(svShape.tipBehindFront>=-20&&svShape.tipBehindFront<=-3,'SV diamond tip must stop just short of the front rim (reduce excessive overlap): '+JSON.stringify(svShape));
  assert.equal(svShape.diamondTipVisible,true,'SV must remain directly visible and hit-testable inside the hue ring hole: '+JSON.stringify(svShape));
  assert.ok(svShape.topMargin>=9,'Enlarged diamond must remain inside picker, not clip its upper corner: '+JSON.stringify(svShape));
  assert.equal(svShape.ringInFront,true,'Front hue ring must retain its depth priority whenever surfaces overlap');
  assert.equal(svShape.backRimBehind,true,'Back ring must go behind the SV diamond');
  assert.equal(svShape.frontHitAbove,true,'Front ring hit surface must be above SV');
  assert.equal(svShape.backHitBehind,true,'Rear ring hit surface must not steal SV touches');
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
   return [[.22,.22],[.78,.22],[.22,.78],[.78,.78]].map(([s,v])=>test(s,v));
  });
  assert.ok(sampled.every(Boolean),'The visible main area of the enlarged diamond must be accessible');
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
   const t0=upperArc(-130);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:t0.x,y:t0.y}]});
   for(let deg=-125;deg<=-50;deg+=5){
    const pt=upperArc(deg);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pt.x,y:pt.y}]});
   }
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   const actualHue=Number(await wheel.getAttribute('aria-valuenow'));
   assert.ok(actualHue>265&&actualHue<295,'Touch must rotate on a curved path along the upper hue band: '+actualHue);
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
  result.tests.push({label,mode:'classic/orbit',menuGeometry,svShape,hitMap,hue,rotatedHue,arcHue,hsv,dragColor,overflow,homeRoundtrip:true});
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
