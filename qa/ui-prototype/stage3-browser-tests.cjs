'use strict';
// E2E tests for the review-only UI. A simulated viewport is NOT a physical device test.
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'index.html'));
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(html);});
let browser,passed=0;
async function run(label,fn){
 const page=await browser.newPage({viewport:{width:1180,height:820}});
 try{
  const runtime=[];
  page.on('pageerror',e=>runtime.push(e.message));
  await page.goto('http://127.0.0.1:43879/',{waitUntil:'load'});
  assert.equal(runtime.length,0,'Script errors: '+runtime.join(';'));
  await fn(page);
  assert.equal(runtime.length,0,'Script errors after interaction: '+runtime.join(';'));
  passed++;console.log('PASS (Chromium DOM): '+label);
 }finally{await page.close();}
}
async function rect(page,selector){return await page.locator(selector).first().boundingBox();}
async function assertHit(page,selector){
 const box=await rect(page,selector);
 assert(box,selector+' has no rendered box');
 assert(box.width>0&&box.height>0,selector+' empty box');
 const hit=await page.evaluate(({selector,x,y})=>{
  const target=document.querySelector(selector),el=document.elementFromPoint(x,y);
  return {isHit:!!(target&&(target===el||target.contains(el))),under:el?.id||el?.className?.toString()||el?.tagName||null};
 },{selector,x:box.x+box.width/2,y:box.y+box.height/2});
 assert(hit.isHit,selector+' blocked by '+hit.under);
}
async function main(){
 await new Promise(r=>server.listen(43879,'127.0.0.1',r));
 browser=await chromium.launch({headless:true});
 await run('Layer add / Undo / Redo actual DOM rendering',async p=>{
  assert.equal(await p.locator('#layerRows .layerrow').count(),3);
  await p.locator('#addLayer').click();assert.equal(await p.locator('#layerRows .layerrow').count(),4);
  await p.locator('#fixed [data-undo]').click();assert.equal(await p.locator('#layerRows .layerrow').count(),3);
  await p.locator('#fixed [data-redo]').click();assert.equal(await p.locator('#layerRows .layerrow').count(),4);
 });
 await run('Layer keyboard focus survives rerender',async p=>{
  await p.locator('#layerRows [data-layer="layer-2"]').focus();
  await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(()=>document.activeElement?.dataset.layer),'layer-2');
  await p.locator('#layerRows [data-eye="layer-1"]').focus();
  await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(()=>document.activeElement?.dataset.eye),'layer-1');
 });
 await run('Visibility survives layer selection and is reversible',async p=>{
  const first=p.locator('#layerRows .eye').first();
  await first.click();assert.equal(await p.locator('#layerRows .eye').first().getAttribute('aria-pressed'),'false');
  await p.locator('#layerRows .select-layer').nth(1).click();
  assert.equal(await p.locator('#layerRows .eye').first().getAttribute('aria-pressed'),'false');
  await p.locator('#fixed [data-undo]').click();
  assert.equal(await p.locator('#layerRows .eye').first().getAttribute('aria-pressed'),'true');
 });
 await run('Feature search Undo executes Undo without fake edit',async p=>{
  await p.locator('#addLayer').click();
  await p.locator('#search').click();
  await p.locator('#query').fill('HIS-001');
  await p.locator('#libraryContent [data-feature="HIS-001"]').click();
  await p.locator('[data-start="HIS-001"]').click();
  await p.locator('#fields-HIS-001 [data-undo]').click();
  assert.equal(await p.locator('#layerRows .layerrow').count(),3);
 });
 await run('Document Undo remains available while editing transform Session',async p=>{
  await p.locator('#addLayer').click();
  await p.locator('#tools [data-tool="transform"]').click();
  assert.equal(await p.locator('#sessionbar').isVisible(),true);
  await p.locator('#sessionDocumentUndo').click();
  assert.equal(await p.locator('#layerRows .layerrow').count(),3);
  assert.equal(await p.locator('#sessionbar').isVisible(),true);
  await p.locator('#sessionCancel').click();
  assert.equal(await p.locator('#sessionbar').isVisible(),false);
 });
 await run('Focus quick color panel is visible',async p=>{
  await p.locator('#focus').click();
  await p.locator('#quickTrigger').click();
  await p.locator('#quickGrid [data-open-panel="color"]').click();
  assert.equal(await p.locator('#dock').isVisible(),true);
  assert.equal(await p.locator('#box-color').isVisible(),true);
 });
 await run('SV color surface changes color',async p=>{
  const before=await p.locator('#colorPicker').inputValue();
  await p.locator('.color-plane').click({position:{x:25,y:25}});
  assert.notEqual(await p.locator('#colorPicker').inputValue(),before);
 });
 await run('Detail close restores discoverability and focus',async p=>{
  await p.locator('#search').click();
  await p.locator('#query').fill('COL-001');
  await p.locator('#libraryContent [data-feature="COL-001"]').click();
  await p.locator('[data-detail-close="color"]').click();
  assert.equal(await p.locator('#library').isVisible(),true);
  assert.equal(await p.evaluate(()=>document.activeElement?.dataset.feature),'COL-001');
 });
 for(const [w,h] of [[390,844],[740,360],[320,568]]){
  await run('Session apply/cancel hit target at '+w+'x'+h,async p=>{
   await p.setViewportSize({width:w,height:h});
   await p.locator('#tools [data-tool="transform"]').click();
   await assertHit(p,'#sessionApply');await assertHit(p,'#sessionCancel');
  });
 }
 console.log(JSON.stringify({kind:'Chromium simulated viewport E2E',passed,real_device:false,physical_pen:false,gpu_performance:false}));
}
main().then(()=>{browser?.close().finally(()=>server.close());}).catch(e=>{console.error(e);process.exitCode=1;browser?.close().finally(()=>server.close());});
