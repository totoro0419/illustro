/** Run from the C03 built output; proves offline reload and actual Worker editing. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=resolve('dist');
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://local').pathname;
  const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+sep))throw Error('Invalid path');
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.writeHead(404).end('Not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({serviceWorkers:'allow'});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(url,{waitUntil:'load'});
 await page.evaluate(async()=>{
  await navigator.serviceWorker.ready;
  if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
 });
 const details=await page.evaluate(async()=>{
  const cacheNames=(await caches.keys()).filter(x=>x.startsWith('illustro-c03-'));
  const cache=await caches.open(cacheNames.at(-1));
  return {cacheNames,count:(await cache.keys()).length};
 });
 assert.equal(details.cacheNames.length,1);
 assert.ok(details.count>=10,'Offline shell must cache all required assets');
 await context.setOffline(true);
 const response=await page.reload({waitUntil:'load'});
 assert.equal(response.status(),200,'Offline root reload must use precached index');
 await page.waitForFunction(()=>document.querySelector('#art')?.width===1600,{},{timeout:15000});
 await page.waitForFunction(()=>document.querySelector('#stage')?.dataset.presentationReady==='true',{},{timeout:15000});
 await page.locator('#c03-add-layer').click();
 assert.equal(await page.locator('#c03-layer-list .c03-row').count(),2);
 const box=await page.locator('#stage').boundingBox();
 await page.mouse.move(box.x+box.width*.4,box.y+box.height*.4);
 await page.mouse.down();await page.mouse.move(box.x+box.width*.4+40,box.y+box.height*.4+20,{steps:6});await page.mouse.up();
 await page.waitForFunction(()=>document.querySelector('#stage').dataset.rasterPending==='0',{},{timeout:25000});
 assert.deepEqual(errors,[],'Offline app must not throw JS exceptions');
 const invalid=await page.evaluate(()=>document.getElementById('stage').dataset.rasterError||'');
 assert.equal(invalid,'','Raster Worker must remain alive offline');
 console.log('C03_OFFLINE_PASS: SW install, cache contents, offline root reload, raster add, offline stroke, stable Worker');
 await context.setOffline(false);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
