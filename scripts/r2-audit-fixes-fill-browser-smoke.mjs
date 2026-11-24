import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const {PNG}=require(process.env.PREP_PNG_PATH??'pngjs');

const base=(process.env.R2_AUDIT_FIX_URL??'https://totoro0419.github.io/illustro/r2-audit-fixes/').replace(/\/$/,'')+'/';
const sha=process.env.EXPECTED_COMMIT_SHA??'';
const report={url:base,commit:sha,checks:[],status:'RUNNING',errors:[]};
const record=message=>{report.checks.push(message);console.log('PASS '+message)};
const browser=await chromium.launch({headless:true,...(process.env.R2_CHROME_CHANNEL?{channel:process.env.R2_CHROME_CHANNEL}:{}),args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let page;
const state=async()=>page.evaluate(()=>{
  const c=document.querySelector('#canvas'),panel=document.querySelector('[data-tool-panel="smartFill"]');
  return {revision:c?.dataset.revisionId,strokes:c?.dataset.committedStrokes,layers:c?.dataset.layerCount,
    historyBusy:c?.dataset.historyBusy,canUndo:c?.dataset.canUndo,canRedo:c?.dataset.canRedo,
    mainStatus:document.querySelector('#status')?.textContent,
    fillStatus:panel?.lastElementChild?.textContent,
    tool:document.querySelector('#smartFill')?.getAttribute('aria-pressed'),
    errors:[...document.querySelectorAll('[role="alert"]')].map(e=>e.textContent).filter(Boolean)};
});
const readPixels=async()=>PNG.sync.read(await page.locator('#canvas').screenshot());
function rgb(png,x,y){
  const px=Math.max(0,Math.min(png.width-1,Math.round(x*png.width)));
  const py=Math.max(0,Math.min(png.height-1,Math.round(y*png.height)));
  const o=(py*png.width+px)*4;
  return [png.data[o],png.data[o+1],png.data[o+2],png.data[o+3]];
}
const brightness=p=>p[0]+p[1]+p[2];
async function verify(condition,message){
  if(!condition)throw Error(message+' '+JSON.stringify(await state()));
}
try{
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  const release=await (await page.request.get(base+'release.json')).json();
  assert.equal(release.sourceCommit,sha);
  record('EXACT-PUBLIC-COMMIT');

  await page.goto(base+'?backend=webgl2&r2-fill-smoke=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#ihStart').click();
  await page.locator('#ihNewCreate').click();
  await page.waitForFunction(()=>!document.querySelector('#brush')?.disabled,undefined,{timeout:45000});
  const box=await page.locator('#canvas').boundingBox();
  assert.ok(box&&box.width>100&&box.height>100,'painting viewport is missing');
  const point=(x,y)=>[box.x+box.width*x,box.y+box.height*y];
  async function drawRectangle(x0,y0,x1,y1){
    const a=point(x0,y0),b=point(x1,y0),c=point(x1,y1),d=point(x0,y1);
    await page.mouse.move(...a);await page.mouse.down();
    for(const vertex of [b,c,d,a])await page.mouse.move(...vertex,{steps:10});
    await page.mouse.up();
  }
  for(const [x0,x1] of [[.11,.27],[.41,.57],[.71,.87]])
    await drawRectangle(x0,.27,x1,.59);
  await page.waitForFunction(()=>Number(document.querySelector('#canvas')?.dataset.committedStrokes)===3&&document.querySelector('#canvas')?.dataset.historyBusy==='false',undefined,{timeout:60000});
  record('THREE-CLOSED-REGIONS-DRAWN');
  await page.mouse.move(box.x+8,box.y+8);
  const before=await readPixels();
  const sampleX=[.19,.49,.79],centerY=.43,initialColors=sampleX.map(x=>rgb(before,x,centerY));
  console.log('BEFORE_FILL_COLORS',JSON.stringify(initialColors));

  await page.locator('#smartFill').click();
  const panel=page.locator('[data-tool-panel="smartFill"]');
  await page.waitForFunction(()=>document.querySelector('[data-tool-panel="smartFill"]')?.open,undefined,{timeout:10000});
  const mode=panel.locator('select').first();
  assert.equal(await mode.inputValue(),'color');
  await panel.getByRole('button',{name:'キャンバスで塗る',exact:true}).click();
  // Submit three taps before awaiting results. Each should retain its own input
  // despite slow GPU reference captures, even on the same selected layer.
  for(const x of sampleX)await page.mouse.click(...point(x,centerY),{delay:35});
  await page.mouse.move(box.x+8,box.y+8);
  await page.waitForFunction(()=>{
    const panel=document.querySelector('[data-tool-panel="smartFill"]');
    const message=panel?.lastElementChild?.textContent??'';
    return message.includes('連続塗りを反映しました。')||message.includes('漏れる可能性')||message.includes('できません');
  },undefined,{timeout:90000});
  const fillState=await state();
  console.log('FILL_STATE',JSON.stringify(fillState));
  await verify(fillState.fillStatus?.includes('連続塗りを反映しました。'),'Three fills did not finish');
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.historyBusy==='false',undefined,{timeout:30000});
  const after=await readPixels(),filledColors=sampleX.map(x=>rgb(after,x,centerY));
  console.log('AFTER_FILL_COLORS',JSON.stringify(filledColors));
  for(let i=0;i<3;i++)
    assert.ok(brightness(filledColors[i])<brightness(initialColors[i])-80,'Region '+(i+1)+' remained unfilled');
  record('D-006-THREE-RAPID-TAPS-PRESERVE-ALL-REGIONS');

  // Check both keyboard and on-screen history buttons after direct fills.
  assert.equal(await page.locator('#undo').isDisabled(),false);
  const filledRevision=await page.locator('#canvas').getAttribute('data-revision-id');
  await page.keyboard.press('Control+z');
  await page.waitForFunction(before=>document.querySelector('#canvas')?.dataset.revisionId!==before,filledRevision,{timeout:20000});
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.historyBusy==='false',undefined,{timeout:30000});
  const undo=await readPixels();
  assert.ok(sampleX.some((x,i)=>brightness(rgb(undo,x,centerY))>brightness(filledColors[i])+80),'Ctrl+Z did not restore a filled region');
  assert.equal(await page.locator('#redo').isDisabled(),false);
  await page.locator('#redo').evaluate(el=>el.click());
  await page.waitForFunction(revision=>document.querySelector('#canvas')?.dataset.revisionId===revision,filledRevision,{timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.historyBusy==='false',undefined,{timeout:30000});
  const redone=await readPixels();
  for(let i=0;i<3;i++)
    assert.ok(Math.abs(brightness(rgb(redone,sampleX[i],centerY))-brightness(filledColors[i]))<25,'Redo did not recover region '+(i+1));
  record('D-009-CTRL-Z-AND-BUTTON-REDO-MATCH-PIXELS');

  // D-007 uses an actual 1200x900 work, a 10px millipen stroke and a separate
  // paint layer. Convert document coordinates using the public canvas view.
  await page.close();
  page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(base+'?backend=webgl2&r2-gap-smoke=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#ihStart').click();
  await page.locator('#ihCanvasSetup summary').click();
  await page.locator('#ihNewWidth').fill('1200');
  await page.locator('#ihNewHeight').fill('900');
  await page.locator('#ihNewBackground').selectOption('transparent');
  await page.locator('#ihNewCreate').click();
  await page.waitForFunction(()=>!document.querySelector('#brush')?.disabled&&document.querySelector('#canvas')?.dataset.documentWidth==='1200'&&document.querySelector('#canvas')?.dataset.documentHeight==='900',undefined,{timeout:60000});
  const canvas=page.locator('#canvas');
  const coords=async(x,y)=>{
    const b=await canvas.boundingBox(),v=JSON.parse(await canvas.getAttribute('data-view'));
    assert.ok(b&&v&&v.zoom>0,'Missing canvas view');
    assert.equal(v.rotation,0);assert.equal(v.flipX,false);assert.equal(v.flipY,false);
    return {x:b.x+v.cssWidth/2+v.panX+(x-v.documentWidth/2)*v.zoom,
      y:b.y+v.cssHeight/2+v.panY+(y-v.documentHeight/2)*v.zoom,box:b};
  };
  const screen=async(x,y)=>{const p=await coords(x,y);return [p.x,p.y];};
  const documentPixel=async(png,x,y)=>{
    const p=await coords(x,y);
    return rgb(png,(p.x-p.box.x)/p.box.width,(p.y-p.box.y)/p.box.height);
  };
  const pen=await page.locator('#brush option').evaluateAll(opts=>opts.find(o=>o.textContent.trim()==='ミリペン')?.value);
  assert.ok(pen,'Millipen preset is missing');
  await page.locator('#brush').selectOption(pen,{force:true});
  await page.locator('#sizeNumber').fill('10');
  await page.locator('#sizeNumber').press('Enter');
  assert.equal(Number(await page.locator('#sizeNumber').inputValue()),10);
  // The open corner is at (500,200). Round caps leave approximately
  // 18 source pixels between the two ends, depending on raster coverage.
  await page.mouse.move(...await screen(482,200));await page.mouse.down();
  for(const [x,y] of [[200,200],[200,500],[500,500],[500,218]])
    await page.mouse.move(...await screen(x,y),{steps:24});
  await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.committedStrokes==='1'&&document.querySelector('#canvas')?.dataset.historyBusy==='false',undefined,{timeout:60000});
  const lineLayer=await canvas.getAttribute('data-selected-layer-id');
  await page.locator('#addLayer').evaluate(el=>el.click());
  await page.waitForFunction(id=>document.querySelector('#canvas')?.dataset.selectedLayerId!==id&&document.querySelector('#canvas')?.dataset.layerCount==='2'&&document.querySelector('#canvas')?.dataset.historyBusy==='false',lineLayer,{timeout:30000});
  await page.locator('#smartFill').click();
  const gapPanel=page.locator('[data-tool-panel="smartFill"]');
  await gapPanel.getByLabel('参照する絵',{exact:true}).selectOption('layer');
  await gapPanel.getByLabel('参照するレイヤー',{exact:true}).selectOption(lineLayer);
  await gapPanel.getByLabel('埋める隙間（px）',{exact:true}).fill('18');
  await gapPanel.getByLabel('埋める隙間（px）',{exact:true}).press('Tab');
  await page.mouse.move(4,4);
  const gapBefore=await readPixels(),gapRevision=await canvas.getAttribute('data-revision-id');
  const samples=[[350,350],[100,100],[600,300],[350,600],[1000,700]];
  const gapBeforeColors=await Promise.all(samples.map(([x,y])=>documentPixel(gapBefore,x,y)));
  await gapPanel.getByRole('button',{name:'キャンバスで塗る',exact:true}).click();
  await page.mouse.click(...await screen(350,350));
  await page.mouse.move(4,4);
  await page.waitForFunction(()=>{
    const text=document.querySelector('[data-tool-panel="smartFill"]')?.lastElementChild?.textContent??'';
    return text.includes('連続塗りを反映しました。')||text.includes('漏れる可能性')||text.includes('できません');
  },undefined,{timeout:90000});
  await verify((await state()).fillStatus?.includes('連続塗りを反映しました。'),'D-007 thick corner did not fill safely');
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.historyBusy==='false',undefined,{timeout:30000});
  const gapAfter=await readPixels();
  const gapColors=await Promise.all(samples.map(([x,y])=>documentPixel(gapAfter,x,y)));
  assert.ok(brightness(gapColors[0])<brightness(gapBeforeColors[0])-80,'D-007 inside remained unfilled');
  for(let i=1;i<samples.length;i++)assert.deepEqual(gapColors[i],gapBeforeColors[i],'D-007 changed exterior sample '+i);
  record('D-007-1200x900-MILLIPEN-10PX-GAP-18PX-SEPARATE-LAYER');
  await page.locator('#undo').evaluate(el=>el.click());
  await page.waitForFunction(revision=>document.querySelector('#canvas')?.dataset.revisionId===revision&&document.querySelector('#canvas')?.dataset.historyBusy==='false',gapRevision,{timeout:30000});
  const gapUndo=await readPixels();
  for(let i=0;i<samples.length;i++)assert.deepEqual(await documentPixel(gapUndo,...samples[i]),gapBeforeColors[i],'D-007 Undo failed at sample '+i);
  record('D-007-UNDO-RESTORES-PIXELS');

  report.status='PASS';
}catch(error){
  report.status='FAIL';
  report.failure=String(error?.stack??error);
  if(page)try{report.finalState=await state();}catch{}
  throw error;
}finally{console.log(JSON.stringify(report,null,2));await browser.close();}
