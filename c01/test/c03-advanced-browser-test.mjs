/** End-to-end C03 feature smoke: actual module Workers, IDB and Native data. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=resolve('.');
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://x'),filename=resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!filename.startsWith(root+sep))throw Error('Not in repository');
  const contents=await readFile(filename);
  res.setHeader('content-type',extname(filename)==='.mjs'?'text/javascript':extname(filename)==='.css'?'text/css':'text/html');
  res.end(contents);
 }catch{res.writeHead(404).end()}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:'+server.address().port+'/?pixelMirror=1');
 await page.waitForFunction(()=>document.querySelector('#art')?.width===1600);
 await page.locator('[data-action=new]').first().click();
 await page.locator('#new-width').fill('320');await page.locator('#new-height').fill('240');
 await page.locator('#new-dialog [type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#stage')?.dataset.presentationReady==='true');
 await page.locator('#c03-add-layer').click();
 assert.equal(await page.locator('#c03-layer-list .c03-row').count(),2);
 await page.locator('#c03-layer-blend').selectOption('linear-burn');
 await page.locator('#c03-alpha-lock').check();
 await page.locator('#c03-alpha-lock').uncheck();
 await page.locator('#c03-add-mask').click();
 await page.locator('#c03-mask-enabled').uncheck();
 await page.locator('#c03-mask-enabled').check();
 await page.locator('#c03-layer-search').fill('');await page.locator('#c03-filter-type').selectOption('raster');
 assert.equal(await page.locator('#c03-layer-list .c03-row').count(),2);
 await page.locator('#c03-filter-type').selectOption('');
 await page.locator('#c03-add-group').click();
 assert.equal(await page.locator('#c03-layer-list .c03-row').count(),3);
 await page.locator('#c03-layer-list .c03-row').nth(1).locator('button').last().click();
 await page.locator('#c03-duplicate').click();
 assert.equal(await page.locator('#c03-layer-list .c03-row').count(),4);
 await page.locator('#c03-comp-name').evaluate(el=>el.closest('details').open=true);
 await page.locator('#c03-comp-name').fill('Before');
 await page.locator('#c03-comp-create').click();
 assert.equal(await page.locator('#c03-comp-list option').count(),1);
 await page.locator('#c03-crop-x').evaluate(el=>el.closest('details').open=true);
 await page.locator('#c03-crop-x').fill('10');
 await page.locator('#c03-crop-y').fill('15');
 await page.locator('#c03-crop-w').fill('200');
 await page.locator('#c03-crop-h').fill('150');
 await page.locator('#c03-crop-set').click();
 assert.equal(await page.locator('#c03-crop-border').isVisible(),true);
 await page.evaluate(()=>{window.testWrites=[];window.showSaveFilePicker=async()=>({createWritable:async()=>({
  write:async v=>window.testWrites.push(typeof v==='string'?v:new TextDecoder().decode(v)),close:async()=>{},abort:async()=>{}
 })})});
 await page.locator('[data-action=save]').first().click();
 await page.waitForFunction(()=>window.testWrites?.length===1,{},{timeout:30000});
 const native=await page.evaluate(()=>JSON.parse(window.testWrites[0]));
 assert.equal(native.formatVersion,3);
 assert.equal(native.layers.length,4);
 assert.deepEqual(native.document.cropFrame,[10,15,200,150]);
 assert.equal(native.history.layerComps[0].name,'Before');
 assert.ok(native.layers.some(l=>l.type==='group'));
 assert.ok(native.layers.some(l=>l.mask?.png?.startsWith('data:image/png;base64,')));
 await page.locator('#c03-protect-now').click();
 await page.waitForFunction(()=>document.getElementById('c03-protect-status')?.textContent.includes('検証済み保護'),{},{timeout:30000});
 const protectedCount=await page.locator('#c03-protected-list option').count();
 assert.ok(protectedCount>=1,'IndexedDB protected recovery option should appear');
 await page.locator('#c03-crop-clear').click();
 await page.locator('[data-action=undo]').first().click();
 assert.equal(await page.locator('#c03-crop-border').isVisible(),true);
 assert.deepEqual(errors,[],'No browser or Worker errors');
 assert.ok(!((await page.locator('#stage').getAttribute('data-raster-error'))||''),'No raster worker failure');
 console.log('C03_ADVANCED_PASS: 25-mode UI, mask, group, duplicate, comp, crop Native, verified IDB protection and Undo');
}finally{await browser?.close();await new Promise(ok=>server.close(ok))}
