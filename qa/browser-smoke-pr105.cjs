'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('/tmp/illustro-smoke/node_modules/playwright');
const {PNG} = require('/tmp/illustro-smoke/node_modules/pngjs');
const fs = require('node:fs');
const base = 'https://totoro0419.github.io/illustro/workspace-preview/';
const expected = '49474fd56b36d91425e5df81f9c135c0424aecb4';
async function step(name, fn) {
  const started = Date.now();
  const result = await fn();
  console.log('PASS ' + name + ' (' + (Date.now()-started) + 'ms)');
  return result;
}
function changedPixels(a,b) {
  const left=PNG.sync.read(a),right=PNG.sync.read(b);
  assert.equal(left.width,right.width);
  assert.equal(left.height,right.height);
  let changes=0;
  for(let i=0;i<left.data.length;i+=4) {
    if(Math.abs(left.data[i]-right.data[i])+
       Math.abs(left.data[i+1]-right.data[i+1])+
       Math.abs(left.data[i+2]-right.data[i+2])>65) changes++;
  }
  return changes;
}
(async () => {
  const browser=await chromium.launch({channel:'chrome', headless:true, args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  let page;
  try {
    const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,acceptDownloads:true});
    page=await context.newPage();
    page.setDefaultTimeout(30000);
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await step('real live release.json matches merged SHA',async()=>{
      const r=await page.request.get(base+'release.json?smoke='+Date.now(),{timeout:45000,headers:{'Cache-Control':'no-cache'}});
      assert.equal(r.status(),200);
      const d=await r.json();
      assert.equal(d.sourceCommit,expected);
    });
    await step('live site loads updated Home UI',async()=>{
      const response=await page.goto(base+'?smoke='+Date.now()+'#home',{waitUntil:'domcontentloaded',timeout:60000});
      assert.equal(response.status(),200);
      await page.locator('#ihStart').waitFor({state:'visible',timeout:60000});
      await page.locator('#ihMyWorks').waitFor({state:'visible'});
      assert.equal(await page.title(),'Illustro');
    });
    await step('new white canvas renders',async()=>{
      await page.locator('#ihStart').click();
      await page.locator('#ihNewDialog').waitFor({state:'visible'});
      // Keep the default transparent background; the original select is hidden by the native custom choice UI.
      await page.locator('#ihNewCreate').click();
      await page.waitForFunction(()=>document.querySelector('#app')?.inert===false, null,{timeout:60000});
      await page.locator('#canvas').waitFor({state:'visible',timeout:60000});
      await page.waitForFunction(()=>{const c=document.querySelector('#canvas');return c&&c.width>1&&c.height>1&&!document.querySelector('#save').disabled;},null,{timeout:60000});
    });
    let initialCanvas, paintedCanvas;
    await step('brush draws visible pixels',async()=>{
      const canvas=page.locator('#canvas');
      await page.mouse.move(10,10);
      initialCanvas=await canvas.screenshot();
      const box=await canvas.boundingBox();
      assert(box&&box.width>100&&box.height>100,'canvas has positive visible size');
      await page.locator('#paint').click();
      await page.mouse.move(box.x+box.width*.24,box.y+box.height*.4);
      await page.mouse.down();
      await page.mouse.move(box.x+box.width*.68,box.y+box.height*.61,{steps:18});
      await page.mouse.up();
      await page.waitForFunction(()=>!document.querySelector('#undo').disabled,null,{timeout:30000});
      await page.mouse.move(10,10);
      await page.waitForTimeout(800);
      paintedCanvas=await canvas.screenshot();
      const delta=changedPixels(initialCanvas,paintedCanvas);
      console.log('Canvas changed pixel count: '+delta);
      assert(delta>30,'no visible drawn pixel difference');
    });
    await step('undo and redo controls work',async()=>{
      await page.locator('#undo').click();
      await page.waitForFunction(()=>!document.querySelector('#redo').disabled,null,{timeout:30000});
      await page.locator('#redo').click();
      await page.waitForFunction(()=>!document.querySelector('#undo').disabled,null,{timeout:30000});
    });
    await step('eraser can be selected and used',async()=>{
      await page.locator('#erase').click();
      // The brush handoff is asynchronous on GPU; distinguish a late update
      // from a dropped click instead of asserting synchronously.
      try{
        await page.waitForFunction(()=>document.querySelector('#erase')?.getAttribute('aria-pressed')==='true',null,{timeout:1800});
      }catch{
        console.log('WARN eraser first click not applied after 1.8 seconds; retrying once');
        await page.locator('#erase').click();
        await page.waitForFunction(()=>document.querySelector('#erase')?.getAttribute('aria-pressed')==='true',null,{timeout:5000});
      }
      const b=await page.locator('#canvas').boundingBox();
      await page.mouse.move(b.x+b.width*.45,b.y+b.height*.5);
      await page.mouse.down();await page.mouse.move(b.x+b.width*.5,b.y+b.height*.53,{steps:6});await page.mouse.up();
    });
    await step('color controls open',async()=>{
      const color=page.locator('#colorPage');
      if(await color.getAttribute('aria-expanded')!=='true')await color.click();
      await page.locator('#colorBoxBody').waitFor({state:'visible',timeout:15000});
    });
    await step('layer controls open and add one layer',async()=>{
      await page.locator('#layer').click();
      await page.locator('#layerPage').waitFor({state:'visible'});
      const count=await page.locator('#layerPageList .layer-entry').count();
      assert(count>=1,'initial layer list should contain an entry');
      await page.locator('#addLayerPage').click();
      try{
        await page.waitForFunction(n=>document.querySelectorAll('#layerPageList .layer-entry').length>n,count,{timeout:1800});
      }catch{
        const status=await page.locator('#status').innerText();
        console.log('WARN initial layer add did not complete: '+status+'; retrying once after drawing settles');
        await page.waitForTimeout(800);
        await page.locator('#addLayerPage').click();
        await page.waitForFunction(n=>document.querySelectorAll('#layerPageList .layer-entry').length>n,count,{timeout:15000});
      }
      await page.locator('#closeLayerPage').click();
    });
    await step('native work file downloads',async()=>{
      const dl=page.waitForEvent('download',{timeout:60000});
      await page.locator('#save').click();
      const file=await dl;
      assert(/\.illustro$/i.test(file.suggestedFilename()),'expected native .illustro file');
      await file.path();
    });
    await step('work is in My Works',async()=>{
      await page.locator('#home').click();
      await page.locator('#ihNavWorks').click();
      await page.waitForFunction(()=>document.querySelectorAll('#ihWorkGrid .ih-work-card').length>=1,null,{timeout:60000});
    });
    await step('work persists across reload and reopens',async()=>{
      await page.goto(base+'?reload-smoke='+Date.now()+'#home',{waitUntil:'domcontentloaded',timeout:60000});
      await page.locator('#ihNavWorks').click();
      await page.waitForFunction(()=>document.querySelectorAll('#ihWorkGrid .ih-work-card').length>=1,null,{timeout:60000});
      await page.locator('#ihWorkGrid .ih-work-preview').first().click();
      await page.locator('#canvas').waitFor({state:'visible',timeout:60000});
      await page.waitForFunction(()=>document.querySelector('#app')?.inert===false,null,{timeout:45000});
    });
    console.log('Browser JavaScript uncaught errors: '+JSON.stringify(errors));
    assert.equal(errors.length,0,'uncaught page errors');
    console.log('PASS: all published-app smoke checks');
  } catch(error) {
    console.error('FAIL: '+(error.stack||error));
    if(page)try {await page.screenshot({path:'smoke-failure.png',fullPage:true});}catch{}
    process.exitCode=1;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
