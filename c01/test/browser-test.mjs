import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
const files={'/':'index.html','/index.html':'index.html','/input-test.html':'input-test.html','/app/main.mjs':'app/main.mjs','/app/color-pickers.mjs':'app/color-pickers.mjs','/app/input-diagnostics.mjs':'app/input-diagnostics.mjs','/app/model.mjs':'app/model.mjs','/app/style.css':'app/style.css','/app/raster-worker.mjs':'app/raster-worker.mjs'};
const server=createServer(async(req,res)=>{
  try {const path=files[new URL(req.url,'http://localhost').pathname];if(!path){res.writeHead(404).end();return}const content=await readFile(path);res.writeHead(200,{'content-type':path.endsWith('.mjs')?'text/javascript':path.endsWith('.css')?'text/css':'text/html'});res.end(content)}
  catch(err){res.writeHead(500).end(String(err))}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:'+port,{waitUntil:'load'});
 await page.waitForFunction(()=>document.querySelector('#art')?.width===1600);
 const pixels=()=>page.evaluate(()=>{const c=document.querySelector('#art');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0;for(let i=3;i<d.length;i+=4)if(d[i])pixels++;return pixels});
 const b=await page.locator('#stage').boundingBox();const x=b.x+b.width*.45,y=b.y+b.height*.4;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+100,y+45,{steps:12});await page.mouse.up();
 await page.waitForFunction(()=>document.querySelectorAll('.stroke-preview').length===0 && document.querySelector('#art').getContext('2d').getImageData(0,0,1600,1200).data.some((v,i)=>i%4===3&&v>0));
 assert.ok(await pixels()>0,'Stroke must change alpha');
 await page.locator('[data-action=undo]').first().click();
 await page.waitForFunction(()=>!document.querySelector('#art').getContext('2d').getImageData(0,0,1600,1200).data.some((v,i)=>i%4===3&&v>0));
 assert.equal(await pixels(),0,'Undo clears stroke');
 await page.locator('[data-action=redo]').first().click();
 await page.waitForFunction(()=>document.querySelector('#art').getContext('2d').getImageData(0,0,1600,1200).data.some((v,i)=>i%4===3&&v>0));
 assert.ok(await pixels()>0,'Redo restores stroke');
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
 console.log('PASS: basic painting, legacy dual color modes, scroll ownership, centre-anchored flip');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
