import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const base=(process.env.R2_AUDIT_FIX_URL??'https://totoro0419.github.io/illustro/r2-audit-fixes/').replace(/\/$/,'')+'/';
const expected=process.env.EXPECTED_COMMIT_SHA??'';
const results={url:base,expected,checks:[],status:'RUNNING'};
const pass=name=>{results.checks.push(name);console.log('PASS '+name);};
const browser=await chromium.launch({headless:true,...(process.env.R2_CHROME_CHANNEL?{channel:process.env.R2_CHROME_CHANNEL}:{}),args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let page;
try{
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  page=await context.newPage();
  const release=await (await page.request.get(base+'release.json')).json();
  assert.equal(release.sourceCommit,expected,'wrong public app revision');
  await page.goto(base+'?backend=webgl2&r2-speck-smoke=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#ihStart').click();
  await page.locator('#ihNewCreate').click();
  await page.waitForFunction(()=>!document.querySelector('#brush')?.disabled,undefined,{timeout:45000});
  // Encode a real PNG in Chrome: exactly 2 isolated one-pixel marks and one
  // large intended square that must not be removed by a <=6px cleanup limit.
  const png=Buffer.from(await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=96;c.height=96;
    const ctx=c.getContext('2d');ctx.fillStyle='#101010';
    ctx.fillRect(10,10,1,1);ctx.fillRect(75,14,1,1);
    ctx.fillRect(43,43,10,10);
    return c.toDataURL('image/png').split(',')[1];
  }),'base64');
  await page.locator('#c06ClipboardFile').setInputFiles({name:'specks.png',mimeType:'image/png',buffer:png});
  await page.waitForFunction(()=>!document.querySelector('#c06Paste')?.disabled,undefined,{timeout:14000});
  await page.locator('#c06Paste').evaluate(el=>el.click());
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.layerCount==='2'&&document.querySelector('#canvas')?.dataset.historyBusy==='false',undefined,{timeout:35000});
  pass('SPECKS-IMAGE-LOADED-IN-EDITABLE-LAYER');
  await page.locator('#effectsBoxBody button').filter({hasText:'画像から候補を出す'}).first().evaluate(el=>el.click());
  const dialog=page.locator('dialog.export-dialog[aria-label="画像から候補を出す"]');
  await dialog.waitFor({timeout:12000});
  // The custom-choice control keeps its native select hidden; set the exact
  // source select and dispatch its change event without depending on its CSS.
  await dialog.locator('select:has(option[value="specks"])').first().selectOption('specks',{force:true});
  const run=dialog.getByRole('button',{name:'候補を計算',exact:true});
  await page.waitForFunction(()=>{const d=document.querySelector('dialog.export-dialog[aria-label="画像から候補を出す"]');return !!d&&![...d.querySelectorAll('button')].find(b=>b.textContent==='候補を計算')?.disabled;},undefined,{timeout:20000});
  await run.click();
  await dialog.locator('label:has(input[type=checkbox])').filter({hasText:/ごみ候補\s+\d/}).first().waitFor({timeout:30000});
  const snapshot=await dialog.evaluate(d=>({
    selects:[...d.querySelectorAll('select')].map(el=>({value:el.value,options:[...el.options].map(o=>o.value)})),
    status:[...d.querySelectorAll('[role=status]')].map(el=>el.textContent?.slice(0,600)),
    candidates:[...d.querySelectorAll('label')].map(el=>el.textContent?.trim()).filter(text=>text?.includes('ごみ候補')),
    buttons:[...d.querySelectorAll('button')].filter(el=>el.textContent==='候補を計算').map(el=>({disabled:el.disabled})),
    canvases:[...d.querySelectorAll('figure canvas')].map(el=>({width:el.width,height:el.height,hidden:el.hidden})),
  }));
  console.log('SPECK_DIAGNOSTICS',JSON.stringify(snapshot));
  const candidates=dialog.locator('label:has(input[type=checkbox])').filter({hasText:/ごみ候補\s+\d/});
  assert.equal(await candidates.count(),2,'two isolated specks should be candidates: '+JSON.stringify(snapshot));
  const labels=await candidates.allTextContents();
  console.log('SPECK_CANDIDATES',JSON.stringify(labels));
  assert.ok(labels.every(label=>label.includes('1画素')),'large intended square was incorrectly proposed');
  pass('ASSIST-TWO-TINY-CANDIDATES-WITHOUT-LARGE-ARTWORK');

  const boxes=candidates.locator('input[type=checkbox]');
  await boxes.first().check();await boxes.nth(1).uncheck();
  assert.equal(await boxes.first().isChecked(),true);assert.equal(await boxes.nth(1).isChecked(),false);
  const inspect=await dialog.locator('figure canvas').evaluateAll(canvases=>canvases.slice(0,2).map(canvas=>{
    const ctx=canvas.getContext('2d'),data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let pink=0,yellow=0;
    for(let i=0;i<data.length;i+=4){
      const [r,g,b,a]=data.slice(i,i+4);
      if(a>0&&r>220&&g<110&&b>60&&b<175)pink++;
      if(a>0&&r>180&&g>120&&g<215&&b<105)yellow++;
    }
    return {width:canvas.width,height:canvas.height,pink,yellow,hidden:canvas.hidden};
  }));
  console.log('SPECK_MARKERS',JSON.stringify(inspect));
  assert.equal(inspect.length,2);
  for(const image of inspect){
    assert.equal(image.hidden,false);
    assert.ok(image.pink>0&&image.yellow>0,'selected/excluded candidates not distinguished on both previews');
  }
  pass('ASSIST-PINK-AND-YELLOW-OVERLAYS-ON-BOTH-CANVASES');

  const {PNG}=require(process.env.PREP_PNG_PATH??'pngjs');
  const canvas=page.locator('#canvas');
  const points=labels.map(label=>{const m=label.match(/ごみ候補\s+(\d+),\s*(\d+)/);assert.ok(m);return [Number(m[1]),Number(m[2])];});
  const capture=async()=>{await page.mouse.move(3,3);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));return PNG.sync.read(await canvas.screenshot());};
  const view=JSON.parse(await canvas.getAttribute('data-view')),box=await canvas.boundingBox();
  function sample(png,[x,y]){const px=Math.round((view.cssWidth/2+view.panX+(x+.5-view.documentWidth/2)*view.zoom)*png.width/box.width),py=Math.round((view.cssHeight/2+view.panY+(y+.5-view.documentHeight/2)*view.zoom)*png.height/box.height);const out=[];for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const i=((py+dy)*png.width+px+dx)*4;out.push(...png.data.subarray(i,i+4));}return out;}
  const before=await canvas.getAttribute('data-revision-id');
  // Close the modal only after adoption; capture original pixels by using the
  // pre-adoption canvas screenshot (a modal may cover the canvas). The Undo
  // image below supplies the restored original for exact pixel comparison.
  await dialog.getByRole('button',{name:'選んだ内容を採用する',exact:true}).click();
  await dialog.waitFor({state:'hidden',timeout:30000});
  await page.waitForFunction(previous=>document.querySelector('#canvas')?.dataset.revisionId!==previous,before,{timeout:15000});
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.historyBusy==='false',undefined,{timeout:20000});
  const after=await page.locator('#canvas').getAttribute('data-revision-id');
  assert.notEqual(before,after);
  const removed=await capture();
  await page.waitForFunction(()=>!document.querySelector('#undo')?.disabled&&document.querySelector('#canvas')?.dataset.historyBusy==='false');
  await page.locator('#undo').evaluate(el=>el.click());
  await page.waitForFunction(original=>document.querySelector('#canvas')?.dataset.revisionId===original&&document.querySelector('#canvas')?.dataset.historyBusy==='false',before,{timeout:30000});
  const restored=await capture();
  assert.notDeepEqual(sample(restored,points[0]),sample(removed,points[0]),'chosen speck did not change');
  assert.deepEqual(sample(restored,points[1]),sample(removed,points[1]),'excluded speck changed');
  const art=[points[0][0]+37,points[0][1]+37];assert.deepEqual(sample(restored,art),sample(removed,art),'large artwork changed');
  pass('ASSIST-SELECTIVE-REMOVAL-IS-ONE-UNDO-STEP');
  await page.waitForFunction(()=>!document.querySelector('#redo')?.disabled);
  await page.locator('#redo').evaluate(el=>el.click());
  await page.waitForFunction(expected=>document.querySelector('#canvas')?.dataset.revisionId===expected&&document.querySelector('#canvas')?.dataset.historyBusy==='false',after,{timeout:30000});
  const redone=await capture();for(const p of [...points,art])assert.deepEqual(sample(redone,p),sample(removed,p),'Redo changed pixels');pass('ASSIST-REDO-RESTORES-REMOVAL');
  results.status='PASS';
}catch(error){results.status='FAIL';results.failure=String(error?.stack??error);if(page)await page.screenshot({path:'r2-specks-failure.png',fullPage:true}).catch(()=>{});throw error;}
finally{console.log(JSON.stringify(results,null,2));await browser.close();}
