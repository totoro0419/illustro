import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const base=(process.env.R2_AUDIT_FIX_URL??'https://totoro0419.github.io/illustro/r2-audit-fixes/').replace(/\/$/,'')+'/';
const expected=(process.env.EXPECTED_COMMIT_SHA??'').trim();
const report={url:base,expectedCommit:expected,checks:[],errors:[],status:'RUNNING'};
const mark=(id)=>{report.checks.push(id);console.log('PASS '+id);};
const browser=await chromium.launch({headless:true,...(process.env.R2_CHROME_CHANNEL?{channel:process.env.R2_CHROME_CHANNEL}:{}),args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
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
  await page.waitForFunction(()=>document.getElementById('brush')&&!document.getElementById('brush').disabled,undefined,{timeout:45000});
  const canvas=page.locator('#canvas'),box=await canvas.boundingBox();
  assert.ok(box,'drawing surface not visible');
  await page.mouse.move(box.x+box.width*.25,box.y+box.height*.25);
  await page.mouse.down();await page.mouse.move(box.x+box.width*.55,box.y+box.height*.45,{steps:12});await page.mouse.up();
  await page.waitForFunction(()=>Number(document.querySelector('#canvas')?.dataset.committedStrokes)>0,undefined,{timeout:45000});
  mark('BRUSH-DRAWS-ON-PUBLIC-PREVIEW');

  await page.evaluate(()=>{
    const zoom=document.getElementById('zoomPercent');
    zoom.value='1200';zoom.dispatchEvent(new Event('change',{bubbles:true}));
    const toggle=document.getElementById('pixelGridToggle');
    toggle.checked=true;toggle.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForFunction(()=>!document.querySelector('#pixelGrid')?.hasAttribute('hidden'),undefined,{timeout:6000});
  await page.evaluate(()=>{
    const toggle=document.getElementById('pixelGridToggle');
    toggle.checked=false;toggle.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForFunction(()=>{const grid=document.querySelector('#pixelGrid');return !!grid?.hasAttribute('hidden')&&getComputedStyle(grid).display==='none';},undefined,{timeout:6000});
  mark('D-001-HIGH-ZOOM-GRID-OFF');

  await page.locator('#fileActionsOpen').click();
  await page.locator('#fileDocumentInfo').click();
  assert.equal(await page.locator('#documentInfoDialog').evaluate(el=>el.open),true);
  await page.locator('#documentInfoDpi').fill('300');
  await page.locator('#documentInfoForm button[type=submit]').click();
  await page.waitForFunction(()=>!document.getElementById('documentInfoDialog').open,undefined,{timeout:6000});
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

  await page.locator('#layer').click();
  await page.locator('#layerSettingsTrigger').click();
  const nameField=page.locator('#selectedLayerName');
  await nameField.fill('監査用レイヤー');
  await nameField.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.selectedLayerName==='監査用レイヤー',undefined,{timeout:11000}).catch(()=>{});
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
  await page.locator('#closeLayerPage').click();

  // Browser-encode a small, valid source so its paste preview leaves empty
  // canvas space for a genuine tap-to-position interaction.
  const pngForPaste=Buffer.from(await page.evaluate(()=>{
    const source=document.createElement('canvas');
    source.width=source.height=24;
    const ctx=source.getContext('2d');
    ctx.fillStyle='#c34ed2';ctx.fillRect(0,0,24,24);
    return source.toDataURL('image/png').split(',')[1];
  }),'base64');
  await page.locator('#c06ClipboardFile').setInputFiles({name:'audit-source.png',mimeType:'image/png',buffer:pngForPaste});
  await page.waitForFunction(()=>!document.querySelector('#c06PastePreview')?.disabled,undefined,{timeout:12000}).catch(async error=>{
    const diagnostics=await page.evaluate(()=>({
      status:document.getElementById('status')?.textContent,
      clipboardMessage:document.querySelector('#documentBoxBody .c06-clipboard-panel output')?.textContent,
      pastePreviewDisabled:document.getElementById('c06PastePreview')?.disabled,
      documentReady:!document.getElementById('brush')?.disabled
    }));
    throw new Error('Clipboard image load failed: '+JSON.stringify(diagnostics),{cause:error});
  });
  await page.locator('#c06PastePreview').evaluate(button=>button.click());
  await page.locator('.c06-placement-preview').waitFor({timeout:8000});
  const label=page.locator('.c06-placement-toolbar output');
  const beforePlacement=await label.textContent();
  const revisionBeforePaste=await canvas.getAttribute('data-revision-id');
  const strokesBeforePaste=await canvas.getAttribute('data-committed-strokes');
  const canvasBox=await canvas.boundingBox();
  await page.mouse.click(canvasBox.x+canvasBox.width*.77,canvasBox.y+canvasBox.height*.72);
  await page.waitForFunction(before=>document.querySelector('.c06-placement-toolbar output')?.textContent!==before,beforePlacement, {timeout:8000});
  // A queued accidental stroke may publish *after* pointerup; verify it did
  // not commit even after the normal asynchronous completion window.
  await page.waitForTimeout(250);
  const revisionAfterPaste=await canvas.getAttribute('data-revision-id');
  const strokesAfterPaste=await canvas.getAttribute('data-committed-strokes');
  assert.deepEqual({revision:revisionAfterPaste,strokes:strokesAfterPaste},
    {revision:revisionBeforePaste,strokes:strokesBeforePaste},
    'moving paste preview edited the artwork');
  await page.locator('.c06-placement-toolbar button').last().click();
  await page.waitForFunction(()=>!document.querySelector('.c06-placement-preview'),undefined,{timeout:5000});
  mark('D-012-TAP-TO-POSITION-PASTE-PREVIEW');
  // R2 D-010: a UI merge is a single history operation, not a compound edit.
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.historyBusy==='false',undefined,{timeout:12000});
  await page.locator('#addLayer').evaluate(el=>el.click());
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.layerCount==='2',undefined,{timeout:10000}).catch(async error=>{
    const details=await page.evaluate(()=>({
      count:document.querySelector('#canvas')?.dataset.layerCount,
      historyBusy:document.querySelector('#canvas')?.dataset.historyBusy,
      status:document.querySelector('#status')?.textContent,
      addLayerDisabled:document.querySelector('#addLayer')?.disabled,
      tool:document.querySelector('#canvas')?.dataset.selectedTool,
      chosenLayer:document.querySelector('#canvas')?.dataset.selectedLayerId
    }));
    throw new Error('D-010 setup failed: '+JSON.stringify(details),{cause:error});
  });
  await page.locator('#mergeLayerDown').evaluate(el=>el.click());
  await page.locator('.illustro-app-dialog-primary').waitFor({timeout:8000});
  await page.locator('.illustro-app-dialog-primary').click();
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.layerCount==='1'&&
    !document.querySelector('#undo')?.disabled,undefined,{timeout:20000});
  await page.locator('#undo').evaluate(el=>el.click());
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.layerCount==='2'&&
    !document.querySelector('#redo')?.disabled,undefined,{timeout:20000});
  await page.locator('#redo').evaluate(el=>el.click());
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.layerCount==='1',undefined,{timeout:20000});
  mark('D-010-MERGE-UNDO-REDO-ON-PUBLIC-PREVIEW');
  report.status='PASS';
  await context.close();
}catch(error){
  report.status='FAIL';report.failure=error.stack??String(error);
  throw error;
}finally{console.log(JSON.stringify(report,null,2));await browser.close();}
