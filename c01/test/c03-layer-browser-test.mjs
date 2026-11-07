/** C03 alpha end-to-end test. Exercises actual Raster Worker, not pure mock semantics. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const root=resolve('.');
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+sep))throw Error('outside test folder');
  const bytes=await readFile(file);
  res.setHeader('content-type',extname(file)==='.mjs'?'text/javascript':extname(file)==='.css'?'text/css':'text/html');
  res.end(bytes);
 }catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:'+server.address().port+'/?pixelMirror=1');
 await page.waitForFunction(()=>document.querySelector('#art')?.width===1600);
 await page.locator('[data-action=new]').first().click();
 await page.locator('#new-width').fill('320');
 await page.locator('#new-height').fill('240');
 await page.locator('#new-dialog [type=submit]').click();
 await page.waitForFunction(()=>document.getElementById('stage').dataset.presentationReady==='true');
 assert.equal(await page.locator('#c03-layer-list .c03-row').count(),1,'Start with one raster layer');
 await page.locator('#c03-add-layer').click();
 assert.equal(await page.locator('#c03-layer-list .c03-row').count(),2,'Add a real new raster layer');
 await page.locator('#c03-layer-name').fill('主線');
 await page.locator('#c03-layer-name').dispatchEvent('change');
 await page.locator('#c03-layer-tag').selectOption('blue');
 assert.equal(await page.locator('#c03-layer-list .c03-row').first().locator('button').last().textContent(),'主線');
 await page.locator('#c03-layer-search').fill('存在しない');
 assert.equal(await page.locator('#c03-layer-list .c03-row').count(),0,'Filtered list must hide nonmatches');
 await page.locator('#c03-layer-search').fill('');
 assert.equal(await page.locator('#c03-layer-list .c03-row').count(),2);
 const coords=await page.locator('#stage').boundingBox();
 const x=coords.x+coords.width*.5,y=coords.y+coords.height*.5;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+55,y+17,{steps:8});await page.mouse.up();
 const hasInk=()=>page.locator('#art').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0));
 await page.waitForFunction(()=>document.getElementById('stage').dataset.rasterPending==='0',{},{timeout:30000});
 await page.waitForFunction(()=>document.getElementById('art').getContext('2d').getImageData(0,0,320,240).data.some((v,i)=>i%4===3&&v>0));
 assert.equal(await hasInk(),true,'Selected raster layer must receive stroke');
 await page.locator('#c03-layer-list .c03-row').first().locator('button').first().click();
 await page.waitForFunction(()=>!document.getElementById('art').getContext('2d').getImageData(0,0,320,240).data.some((v,i)=>i%4===3&&v>0),{},{timeout:30000});
 await page.locator('[data-action=undo]').first().click();
 await page.waitForFunction(()=>document.getElementById('art').getContext('2d').getImageData(0,0,320,240).data.some((v,i)=>i%4===3&&v>0),{},{timeout:30000});
 await page.evaluate(()=>{
  window.c03Writes=[];
  window.showSaveFilePicker=async()=>({createWritable:async()=>({
   write:async data=>window.c03Writes.push(typeof data==='string'?data:new TextDecoder().decode(data)),
   close:async()=>{},abort:async()=>{}
  })});
 });
 await page.locator('[data-action=save]').first().click();
 await page.waitForFunction(()=>window.c03Writes.length===1,{},{timeout:30000});
 const archive=await page.evaluate(()=>JSON.parse(window.c03Writes[0]));
 assert.equal(archive.formatVersion,3);
 assert.equal(archive.layers.length,2);
 assert.equal(archive.layers[1].visible,true);
 assert.equal(archive.layers[1].name,'主線');
 assert.equal(archive.layers[1].tag,'blue');
 assert.ok(archive.layers[1].png.startsWith('data:image/png;base64,'));
 const pngPixels=await page.evaluate(async native=>{
  const decode=async png=>{
   const image=await createImageBitmap(await (await fetch(png)).blob());
   const c=new OffscreenCanvas(image.width,image.height);const ctx=c.getContext('2d');ctx.drawImage(image,0,0);image.close();
   const pixels=ctx.getImageData(0,0,c.width,c.height).data;
   return Array.from(pixels).filter((v,i)=>i%4===3&&v>0).length;
  };
  return Promise.all(native.layers.map(l=>decode(l.png)));
 },archive);
 assert.equal(pngPixels[0],0,'Untouched base layer must remain empty');
 assert.ok(pngPixels[1]>0,'Selected second layer must own the raster content');
 await page.locator('#open-file').setInputFiles({name:'roundtrip.illustro',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archive))});
 await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('Native作品を開きました'));
 assert.equal(await page.locator('#c03-layer-list .c03-row').count(),2);
 assert.deepEqual(errors,[],'No unhandled page exception');
 console.log('C03_BROWSER_PASS: real 2-layer stroke, visibility, Undo, Native v3 PNG separation and reload');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
