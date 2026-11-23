import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const base=(process.env.R2_AUDIT_FIX_URL??'https://totoro0419.github.io/illustro/r2-audit-fixes/').replace(/\/$/,'')+'/';
const expected=(process.env.EXPECTED_COMMIT_SHA??'').trim();
const report={url:base,expectedCommit:expected,checks:[],errors:[],status:'RUNNING'};
const mark=(id)=>{report.checks.push(id);console.log('PASS '+id);};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  const response=await page.request.get(base+'release.json');
  assert.equal(response.ok(),true,'isolated release metadata unavailable');
  const release=await response.json();
  assert.equal(release.sourceCommit,expected,'public release does not match source');
  assert.equal(release.isolatedStorage,true);
  mark('PREVIEW-RELEASE-MATCH');
  await page.goto(base+'?backend=webgl2&r2-fix-smoke=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#ihStart').waitFor({timeout:45000});
  await page.locator('#ihStart').click();
  // The current new-work UI intentionally holds the name in a hidden field.
  // Configure that actual form control without requiring it to be visible.
  await page.locator('#ihNewName').evaluate(input=>{
    input.value='R2 audit fixes - browser smoke';
    input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  // The default canvas is already 512x384; its advanced size fields are collapsed.
  await page.locator('#ihNewCreate').click();
  await page.waitForFunction(()=>document.getElementById('brush')&&!document.getElementById('brush').disabled,{timeout:45000});
  const canvas=page.locator('#canvas'),box=await canvas.boundingBox();
  assert.ok(box,'drawing surface not visible');
  await page.mouse.move(box.x+box.width*.25,box.y+box.height*.25);
  await page.mouse.down();await page.mouse.move(box.x+box.width*.55,box.y+box.height*.45,{steps:12});await page.mouse.up();
  await page.waitForFunction(()=>Number(document.querySelector('#canvas')?.dataset.committedStrokes)>0,{timeout:45000});
  mark('BRUSH-DRAWS-ON-PUBLIC-PREVIEW');

  await page.evaluate(()=>{
    const zoom=document.getElementById('zoomPercent');
    zoom.value='1200';zoom.dispatchEvent(new Event('change',{bubbles:true}));
    const toggle=document.getElementById('pixelGridToggle');
    toggle.checked=true;toggle.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForFunction(()=>!document.querySelector('#pixelGrid')?.hasAttribute('hidden'),{timeout:6000});
  await page.evaluate(()=>{
    const toggle=document.getElementById('pixelGridToggle');
    toggle.checked=false;toggle.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForFunction(()=>{const grid=document.querySelector('#pixelGrid');return !!grid?.hasAttribute('hidden')&&getComputedStyle(grid).display==='none';},{timeout:6000});
  mark('D-001-HIGH-ZOOM-GRID-OFF');

  await page.locator('#fileActionsOpen').click();
  await page.locator('#fileDocumentInfo').click();
  assert.equal(await page.locator('#documentInfoDialog').evaluate(el=>el.open),true);
  await page.locator('#documentInfoDpi').fill('300');
  await page.locator('#documentInfoForm button[type=submit]').click();
  await page.waitForFunction(()=>!document.getElementById('documentInfoDialog').open,{timeout:6000});
  mark('D-004-DOCUMENT-INFO-ENTRY-AND-DPI');

  const padButton=page.locator('#brushBoxBody button').filter({hasText:'このブラシを試し描き'}).first();
  assert.equal(await padButton.count(),1);
  await padButton.evaluate(el=>el.click());
  assert.equal(await page.locator('#sharedBrushTestPad').evaluate(el=>el.open),true);
  const revisionBefore=await canvas.getAttribute('data-revision-id');
  const padCanvas=page.locator('#sharedBrushTestPad canvas').first(),pad=await padCanvas.boundingBox();
  assert.ok(pad,'independent brush pad not visible');
  await page.mouse.move(pad.x+pad.width*.2,pad.y+pad.height*.3);await page.mouse.down();
  await page.mouse.move(pad.x+pad.width*.7,pad.y+pad.height*.65,{steps:8});await page.mouse.up();
  assert.equal(await canvas.getAttribute('data-revision-id'),revisionBefore);
  mark('D-005-INDEPENDENT-BRUSH-PAD');

  const hint=await page.locator('p').filter({hasText:'文字のパス化は'}).count();
  assert.ok(hint>=1,'text outline conversion requirement missing');
  mark('D-014-TEXT-OUTLINE-REQUIREMENT');

  const nameField=page.locator('#selectedLayerName');
  await nameField.evaluate(input=>{
    input.value='監査用レイヤー';
    input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForTimeout(350);
  const renamed=await page.evaluate(()=>{
    const canvas=document.getElementById('canvas'),name=document.getElementById('selectedLayerName');
    return {displayedLayer:canvas?.dataset.selectedLayerName,selectedLayerId:canvas?.dataset.selectedLayerId,
      inputName:name?.value,inputTargetId:name?.dataset.layerId,inputDisabled:name?.disabled,
      status:document.getElementById('status')?.textContent,
      layerTitle:document.getElementById('layerPageSelected')?.textContent,
      ready:!document.getElementById('brush')?.disabled};
  });
  console.log('D011_RenameDiagnostics',JSON.stringify(renamed));
  assert.equal(renamed.displayedLayer,'監査用レイヤー','D-011 rename did not persist: '+JSON.stringify(renamed));
  mark('D-011-RENAME-SELECTED-LAYER');

  const tinyPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z9sAAAAASUVORK5CYII=','base64');
  await page.locator('#c06ClipboardFile').setInputFiles({name:'one.png',mimeType:'image/png',buffer:tinyPng});
  await page.waitForFunction(()=>!document.querySelector('#c06PastePreview')?.disabled,{timeout:8000});
  await page.locator('#c06PastePreview').evaluate(button=>button.click());
  await page.locator('.c06-placement-preview').waitFor({timeout:8000});
  const label=page.locator('.c06-placement-toolbar output');
  const beforePlacement=await label.textContent();
  const revisionBeforePaste=await canvas.getAttribute('data-revision-id');
  const canvasBox=await canvas.boundingBox();
  await page.mouse.click(canvasBox.x+canvasBox.width*.77,canvasBox.y+canvasBox.height*.72);
  await page.waitForFunction(before=>document.querySelector('.c06-placement-toolbar output')?.textContent!==before,beforePlacement,{timeout:8000});
  assert.equal(await canvas.getAttribute('data-revision-id'),revisionBeforePaste,'moving paste preview edited the artwork');
  await page.locator('.c06-placement-toolbar button').last().click();
  await page.waitForFunction(()=>!document.querySelector('.c06-placement-preview'),{timeout:5000});
  mark('D-012-TAP-TO-POSITION-PASTE-PREVIEW');
  // R2 D-010: a UI merge is a single history operation, not a compound edit.
  await page.locator('#addLayer').evaluate(el=>el.click());
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.layerCount==='2',{timeout:10000});
  await page.locator('#mergeLayerDown').evaluate(el=>el.click());
  await page.locator('.illustro-app-dialog-primary').waitFor({timeout:8000});
  await page.locator('.illustro-app-dialog-primary').click();
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.layerCount==='1'&&
    !document.querySelector('#undo')?.disabled,{timeout:20000});
  await page.locator('#undo').evaluate(el=>el.click());
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.layerCount==='2'&&
    !document.querySelector('#redo')?.disabled,{timeout:20000});
  await page.locator('#redo').evaluate(el=>el.click());
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.layerCount==='1',{timeout:20000});
  mark('D-010-MERGE-UNDO-REDO-ON-PUBLIC-PREVIEW');
  report.status='PASS';
  await context.close();
}catch(error){
  report.status='FAIL';report.failure=error.stack??String(error);
  throw error;
}finally{console.log(JSON.stringify(report,null,2));await browser.close();}
