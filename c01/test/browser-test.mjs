import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
const files={'/':'index.html','/index.html':'index.html','/input-test.html':'input-test.html','/app/main.mjs':'app/main.mjs','/app/color-pickers.mjs':'app/color-pickers.mjs','/app/input-diagnostics.mjs':'app/input-diagnostics.mjs','/app/model.mjs':'app/model.mjs','/app/style.css':'app/style.css','/app/aurora-frost.css':'app/aurora-frost.css','/app/ui-icons.mjs':'app/ui-icons.mjs','/app/raster-worker.mjs':'app/raster-worker.mjs'};
for(const name of ['brush-engine.mjs','brush-raster.mjs','brush-ui.mjs','stroke-input.mjs','c02.css','preview-worker.mjs','preview-stroke.mjs','preview-ink.mjs','preview-composite.mjs','presentation.mjs','retained-scene.mjs','layer-tree.mjs','layered-manifest.mjs','raster-layers.mjs','blend-kernels.mjs','blend-if.mjs','recovery-store.mjs'])files['/app/'+name]='app/'+name;
const server=createServer(async(req,res)=>{
  try {const path=files[new URL(req.url,'http://localhost').pathname];if(!path){res.writeHead(404).end();return}const content=await readFile(path);res.writeHead(200,{'content-type':path.endsWith('.mjs')?'text/javascript':path.endsWith('.css')?'text/css':'text/html'});res.end(content)}
  catch(err){res.writeHead(500).end(String(err))}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.ILLUSTRO_CHROMIUM||undefined,args:process.env.ILLUSTRO_CHROMIUM?['--no-sandbox','--disable-dev-shm-usage']:[]});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:'+port+'/?pixelMirror=1',{waitUntil:'load'});
 await page.waitForFunction(()=>document.querySelector('#art')?.width===1600);
 // Aurora Frost: local visual assets must load and buttons retain semantics.
 const theme=await page.evaluate(()=>({
  stylesheet:[...document.styleSheets].some(s=>s.href?.endsWith('/app/aurora-frost.css')),
  railIcons:document.querySelectorAll('.rail button .ui-icon').length,
  undoIcon:!!document.querySelector('[data-action=undo] .ui-icon'),
  gradient:getComputedStyle(document.querySelector('.accent')).backgroundImage,
  classic:!!document.getElementById('classic-picker'),
  orbit:!!document.getElementById('orbit-picker')
 }));
 assert.ok(theme.stylesheet&&theme.railIcons===8&&theme.undoIcon,'Aurora Frost and SVG icons must load');
 assert.ok(theme.gradient.includes('gradient'),'Primary actions must use a controlled gradient');
 assert.ok(theme.classic&&theme.orbit,'Both legacy color pickers must survive the design skin');

 const pixels=()=>page.evaluate(()=>{const c=document.querySelector('#art');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0;for(let i=3;i<d.length;i+=4)if(d[i])pixels++;return pixels});
 const b=await page.locator('#stage').boundingBox();const x=b.x+b.width*.45,y=b.y+b.height*.4;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+100,y+45,{steps:12});await page.mouse.up();
 try{
  await page.waitForFunction(()=>document.getElementById('stage').dataset.rasterPending==='0' && document.querySelector('#art').getContext('2d').getImageData(0,0,1600,1200).data.some((v,i)=>i%4===3&&v>0),{},{timeout:18000});
 }catch(error){
  const diagnosis=await page.evaluate(()=>{
   const stage=document.getElementById('stage'),art=document.getElementById('art'),pixels=art.getContext('2d').getImageData(0,0,art.width,art.height).data;
   return {rasterError:stage.dataset.rasterError,ready:stage.dataset.presentationReady,rasterPending:stage.dataset.rasterPending,
    presentationSeq:stage.dataset.presentationSeq,displaySeq:stage.dataset.presentationSeq,
    inkPixels:pixels.filter((v,i)=>i%4===3&&v>0).length,toast:document.getElementById('toast').textContent};
  });
  throw new Error('C03 legacy first stroke diagnostic: '+JSON.stringify({diagnosis,errors,cause:String(error)}));
 }
 assert.ok(await pixels()>0,'Stroke must change alpha');
 await page.locator('[data-action=undo]').first().click();
 await page.waitForFunction(()=>!document.querySelector('#art').getContext('2d').getImageData(0,0,1600,1200).data.some((v,i)=>i%4===3&&v>0));
 assert.equal(await pixels(),0,'Undo clears stroke');
 await page.locator('[data-action=redo]').first().click();
 await page.waitForFunction(()=>document.querySelector('#art').getContext('2d').getImageData(0,0,1600,1200).data.some((v,i)=>i%4===3&&v>0));
 assert.ok(await pixels()>0,'Redo restores stroke');
 const pixelChecks=await page.evaluate(async()=>{
  const [{preset},{composite,rasterize,tileBox}]=await Promise.all([
   import('/app/brush-engine.mjs'),import('/app/brush-raster.mjs')
  ]);
  const pixels=new OffscreenCanvas(24,24),context=pixels.getContext('2d');
  const point=(x,y,t)=>({x,y,t,p:1,tiltX:null,tiltY:null,azimuth:null,twist:null});
  const marker=preset('marker');
  const stroke={brush:marker,points:[point(-4,11,0),point(30,11,40)],seed:'0011223344556677',size:12,
   opacity:marker.opacityFactor,flow:1,colorAlpha:1,color:[40,60,100],pen:false,curve:1,correction:{mode:'off'},wrap:true};
  const draw=s=>{
   const {ink}=rasterize(s,24,24);
   for(const [key,image] of ink.tiles){const b=tileBox(key,24,24);composite(context,s,image,b.x,b.y)}
  };
  const alpha=(x,y)=>context.getImageData(x,y,1,1).data[3];
  draw(stroke);
  const seam=[alpha(0,11),alpha(23,11)];
  draw(stroke);
  const twice=alpha(0,11);
  context.clearRect(0,0,24,24);
  draw({...stroke,size:62,points:[point(-1,-1,0)]});
  return {seam,twice,large:[alpha(0,0),alpha(12,12),alpha(23,23)]};
 });
 assert.deepEqual(pixelChecks.seam,[128,128],'Wrapped marker must have equal stroke cap across the seam');
 assert.ok(Math.abs(pixelChecks.twice-192)<=1,'Another stroke composites independently');
 assert.deepEqual(pixelChecks.large,[128,128,128],'Overlapping copies of one large dab must not double the cap');
 // Regression: eraser must never paint a black transient stroke before pen-up.
 for(const eraser of ['hardEraser','softEraser']){
  // Each eraser gets fresh ink: a soft brush entirely inside a previous hard
  // eraser hole has no additional alpha to remove.
  await page.locator('[data-tool=round]').click();await page.locator('#size-n').fill('48');await page.locator('#size-n').dispatchEvent('change');
  await page.mouse.move(x+28,y+12);await page.mouse.down();await page.mouse.move(x+60,y+30,{steps:3});await page.mouse.up();
  await page.waitForFunction(()=>document.getElementById('stage').dataset.rasterPending==='0');
  await page.locator('#size-n').fill('12');await page.locator('#size-n').dispatchEvent('change');
  await page.locator('[data-tool='+eraser+']').click();
  await page.mouse.move(x+30,y+14);await page.mouse.down();
  await page.mouse.move(x+48,y+24,{steps:2});
  await page.waitForFunction(()=>{
   const alpha=id=>{const c=document.getElementById(id);return c.getContext('2d').getImageData(0,0,c.width,c.height).data};
   const visible=alpha('preview'),formal=alpha('art');
   for(let i=3;i<visible.length;i+=4)if(visible[i]<formal[i])return true;
   return false;
  },{},{timeout:5000});
  await page.mouse.up();
  await page.waitForFunction(()=>document.getElementById('stage').dataset.rasterPending==='0');
 }
 await page.locator('[data-tool=gpen]').click();
 page.on('dialog',dialog=>dialog.accept());
 await page.locator('[data-action=new]').first().click();await page.locator('#new-width').fill('320');await page.locator('#new-height').fill('240');await page.locator('#new-dialog [type=submit]').click();
 assert.equal(await page.locator('#art').evaluate(el=>el.width),320);
 assert.deepEqual(errors,[],'No JS exceptions');
 const mobile=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(String(e)));await mobile.goto('http://127.0.0.1:'+port);
 assert.ok(await mobile.locator('.mobilebar').isVisible(),'Mobile main bar must be visible');
 await mobile.locator('#mobile-tools').click();assert.ok(await mobile.locator('.workspace').isVisible(),'Mobile workspace must open');
 assert.deepEqual(mobileErrors,[]);

 // Independent diagnostic deliberately imports no production painting/gesture modules.
 const probe=await browser.newPage({viewport:{width:393,height:851},isMobile:true,hasTouch:true});
 const probeErrors=[];probe.on('pageerror',e=>probeErrors.push(String(e)));
 const probeResponse=await probe.goto('http://127.0.0.1:'+port+'/input-test.html');
 assert.equal(probeResponse.status(),200);
 const count=await probe.evaluate(()=>{
  const z=document.getElementById('zone');
  const event=(name,kind,id)=>z.dispatchEvent(new PointerEvent(name,{bubbles:true,pointerType:kind,pointerId:id,clientX:140,clientY:200}));
  event('pointerdown','pen',10);event('pointerup','pen',10);
  event('pointerdown','touch',11);event('pointermove','touch',11);
  z.dispatchEvent(new Event('touchstart',{bubbles:true}));
  return ['pen-up','touch-start','pointer-touch','finger-move'].map(id=>Number(document.getElementById(id).textContent));
 });
 assert.deepEqual(count,[1,1,1,1],'Isolated pen/touch diagnostic must count events');
 assert.deepEqual(probeErrors,[],'Standalone diagnostic must not throw');

 // Old-Illustro color controls must own touch gestures rather than Workspace scroll.
 const colorMode=page.locator('#color-picker-mode');
 await colorMode.selectOption('classic');
 await page.locator('#classic-picker').waitFor({state:'visible'});
 await page.locator('#classic-plane').scrollIntoViewIfNeeded();
 const plane=await page.locator('#classic-plane').boundingBox();
 await page.mouse.move(plane.x+plane.width*.5,plane.y+plane.height*.5);
 await page.mouse.down();await page.mouse.move(plane.x+plane.width*.68,plane.y+plane.height*.46,{steps:5});await page.mouse.up();
 const hexClassic=await page.locator('#hex').inputValue();
 await colorMode.selectOption('orbit');
 await page.locator('#orbit-picker').waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('#orbit-wheel').width>0);
 const orbitPixels=()=>page.locator('#orbit-wheel').evaluate(c=>{
  const ctx=c.getContext('2d'),angles=[-90,-45,0,45,60,135,180],samples=[];
  for(const deg of angles){
   const a=deg*Math.PI/180,px=Math.round((160+121.5*Math.cos(a))*c.width/320),py=Math.round((73+41*Math.sin(a))*c.height/160);
   samples.push({deg,rgba:[...ctx.getImageData(px,py,1,1).data]});
  }
  const src=ctx.getImageData(0,0,c.width,c.height).data;
  let colored=0;for(let k=0;k<src.length;k+=4)if(src[k+3]>230&&Math.max(src[k],src[k+1],src[k+2])-Math.min(src[k],src[k+1],src[k+2])>75)colored++;
  return {width:c.width,height:c.height,samples,colored};
 });
 await page.locator('#hex').fill('#FF0000');await page.locator('#hex').press('Tab');
 await page.waitForTimeout(125);
 const renderedRed=await orbitPixels();
 await page.locator('#hex').fill('#00FF00');await page.locator('#hex').press('Tab');
 await page.waitForTimeout(125);
 const renderedGreen=await orbitPixels();
 console.log('ORBIT VISUAL DIAGNOSTIC '+JSON.stringify({renderedRed,renderedGreen}));
 assert.ok(renderedRed.colored>500&&renderedGreen.colored>500,'Orbit hue ring must render colored opaque pixels');
 assert.notDeepEqual(renderedRed.samples,renderedGreen.samples,'Orbit hue paint must follow current HSV hue');
 
 await page.locator('#orbit-plane').scrollIntoViewIfNeeded();
 const orbitPlane=await page.locator('#orbit-plane').boundingBox();
 const scrollBefore=await page.locator('.workspace-scroll').evaluate(el=>el.scrollTop);
 await page.mouse.move(orbitPlane.x+orbitPlane.width*.5,orbitPlane.y+orbitPlane.height*.5);
 await page.mouse.down();await page.mouse.move(orbitPlane.x+orbitPlane.width*.67,orbitPlane.y+orbitPlane.height*.58,{steps:7});await page.mouse.up();
 assert.notEqual(await page.locator('#hex').inputValue(),hexClassic,'Classic/Orbit SV should update shared foreground color');
 assert.equal(await page.locator('.workspace-scroll').evaluate(el=>el.scrollTop),scrollBefore,'Color drag must not scroll Workspace');
 // A view-only flip must keep the canvas centre at the same screen point.
 await page.locator('[data-action=fit]').first().click();
 await page.waitForTimeout(80);
 const transformBefore=await page.locator('#paper').evaluate(el=>{const m=new DOMMatrix(getComputedStyle(el).transform);return {a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f}});
 const centreBefore={x:transformBefore.a*160+transformBefore.c*120+transformBefore.e,y:transformBefore.b*160+transformBefore.d*120+transformBefore.f};
 await page.locator('[data-action=flipx]').click();await page.waitForTimeout(80);
 const transformAfter=await page.locator('#paper').evaluate(el=>{const m=new DOMMatrix(getComputedStyle(el).transform);return {a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f}});
 const centreAfter={x:transformAfter.a*160+transformAfter.c*120+transformAfter.e,y:transformAfter.b*160+transformAfter.d*120+transformAfter.f};
 assert.ok(Math.hypot(centreBefore.x-centreAfter.x,centreBefore.y-centreAfter.y)<.05,'Flip must keep visible artwork centre fixed');

 // Real touch scroll routing: inactive portions of both pickers must pan Workspace.
 // The colored annulus/HSV plane alone may own a color-drag gesture.
 const tablet=await browser.newPage({viewport:{width:900,height:700},hasTouch:true,isMobile:true});
 const tabletErrors=[];tablet.on('pageerror',e=>tabletErrors.push(String(e)));
 await tablet.goto('http://127.0.0.1:'+port+'/?pixelMirror=1',{waitUntil:'load'});
 const session=await tablet.context().newCDPSession(tablet);
 const workspaceScroll=tablet.locator('.workspace-scroll');
 const touchSwipe=async (x0,y0,x1,y1)=>{
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}]});
  for(let i=1;i<=9;i++){
   await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/9,y:y0+(y1-y0)*i/9}]});
   await tablet.waitForTimeout(8);
  }
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await tablet.waitForTimeout(130);
 };
 for(const pickerMode of ['classic','orbit']){
  await tablet.locator('#color-picker-mode').selectOption(pickerMode);
  const picker=tablet.locator(pickerMode==='classic'?'#classic-picker':'#orbit-picker');
  await picker.evaluate(el=>el.scrollIntoView({block:'center'}));
  const rect=await picker.boundingBox();
  const start={x:rect.x+12,y:rect.y+22};
  const before=await workspaceScroll.evaluate(el=>el.scrollTop);
  await touchSwipe(start.x,start.y,start.x,start.y-95);
  const after=await workspaceScroll.evaluate(el=>el.scrollTop);
  assert.ok(after-before>20,pickerMode+' blank corner must scroll Workspace by touch: '+before+' -> '+after);
 }
 // The unpainted hole between the Classic ring and HSV diamond must also scroll.
 await tablet.locator('#color-picker-mode').selectOption('classic');
 await tablet.locator('#classic-picker').evaluate(el=>el.scrollIntoView({block:'center'}));
 const holeBox=await tablet.locator('#classic-picker').boundingBox();
 const holeX=holeBox.x+holeBox.width*.88,holeY=holeBox.y+holeBox.height*.5;
 const holeTarget=await tablet.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id||'',{x:holeX,y:holeY});
 assert.notEqual(holeTarget,'classic-ring-hit','Unpainted hole must not hit the SVG overlay');
 const holeBefore=await workspaceScroll.evaluate(el=>el.scrollTop);
 await touchSwipe(holeX,holeY,holeX,holeY-90);
 assert.ok((await workspaceScroll.evaluate(el=>el.scrollTop))-holeBefore>20,'Classic inner hole should be usable for scrolling');

 // After a scroll gesture, touching the actual Classic hue band must still choose color.
 await tablet.locator('#color-picker-mode').selectOption('classic');
 await tablet.locator('#classic-picker').scrollIntoViewIfNeeded();
 const colorBox=await tablet.locator('#classic-picker').boundingBox();
 const hexBefore=await tablet.locator('#hex').inputValue();
 const scBefore=await workspaceScroll.evaluate(el=>el.scrollTop);
 const debugStart=await tablet.evaluate(pt=>{const el=document.elementFromPoint(pt.x,pt.y);return {tag:el?.tagName,html:el?.outerHTML.slice(0,280),touchAction:el?getComputedStyle(el).touchAction:null,coords:pt}}, {x:colorBox.x+colorBox.width*.95,y:colorBox.y+colorBox.height*.5});
 const recorded=[];await tablet.evaluate(()=>{window.__testEvents=[];const root=document.getElementById('classic-picker');for(const type of ['pointerdown','pointermove','pointerup','pointercancel','touchstart','touchmove'])root.addEventListener(type,e=>window.__testEvents.push({type,target:e.target.tagName,button:e.button,id:e.pointerId,action:getComputedStyle(e.target).touchAction}),{capture:true,passive:true})});
 await touchSwipe(colorBox.x+colorBox.width*.95,colorBox.y+colorBox.height*.5,
   colorBox.x+colorBox.width*.82,colorBox.y+colorBox.height*.78);
 const debugEvents=await tablet.evaluate(()=>window.__testEvents);

 const hexAfter=await tablet.locator('#hex').inputValue();
 const scAfter=await workspaceScroll.evaluate(el=>el.scrollTop);
 assert.notEqual(hexBefore,hexAfter,'Touching visible Classic hue ring must change the color');
 assert.ok(Math.abs(scAfter-scBefore)<2,'Dragging visible Classic hue ring must not scroll Workspace');
 // Orbit front hue arc is a thin interactive hit shape: drag changes color but not scroll.
 await tablet.locator('#color-picker-mode').selectOption('orbit');
 await tablet.locator('#orbit-picker').scrollIntoViewIfNeeded();
 const wheelBox=await tablet.locator('#orbit-wheel').boundingBox();
 const orbitStartX=wheelBox.x+wheelBox.width/2;
 const orbitStartY=wheelBox.y+wheelBox.height*113/160;
 const orbitHit=await tablet.evaluate(({x,y})=>document.elementFromPoint(x,y)?.getAttribute('data-orbit-hue')||null,{x:orbitStartX,y:orbitStartY});
 assert.equal(orbitHit,'slide','Orbit visible front ring must receive the touch start');
 const orbitScrollBefore=await workspaceScroll.evaluate(el=>el.scrollTop);
 const orbitHexBefore=await tablet.locator('#hex').inputValue();
 await touchSwipe(orbitStartX,orbitStartY,orbitStartX+50,orbitStartY);
 const orbitHexAfter=await tablet.locator('#hex').inputValue();
 const orbitScrollAfter=await workspaceScroll.evaluate(el=>el.scrollTop);
 assert.notEqual(orbitHexAfter,orbitHexBefore,'Orbit front ring drag should change shared hue');
 assert.ok(Math.abs(orbitScrollAfter-orbitScrollBefore)<2,'Orbit ring drag should not scroll Workspace');

 assert.deepEqual(tabletErrors,[],'Touch scrolling and hue gestures must have no JS exceptions');
 console.log('PASS: real touch scroll through both picker blank regions, hue drag ownership');

 console.log('PASS: basic painting, legacy dual color modes, scroll ownership, centre-anchored flip');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
