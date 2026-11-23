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
  report.status='PASS';
}catch(error){
  report.status='FAIL';
  report.failure=String(error?.stack??error);
  if(page)try{report.finalState=await state();}catch{}
  throw error;
}finally{console.log(JSON.stringify(report,null,2));await browser.close();}
