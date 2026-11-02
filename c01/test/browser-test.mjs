import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
const files={'/':'index.html','/index.html':'index.html','/app/main.mjs':'app/main.mjs','/app/model.mjs':'app/model.mjs','/app/style.css':'app/style.css'};
const server=createServer(async(req,res)=>{
  try {const path=files[new URL(req.url,'http://localhost').pathname];if(!path){res.writeHead(404).end();return}const content=await readFile(path);res.writeHead(200,{'content-type':path.endsWith('.mjs')?'text/javascript':path.endsWith('.css')?'text/css':'text/html'});res.end(content)}
  catch(err){res.writeHead(500).end(String(err))}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:'+port,{waitUntil:'load'});
 await page.waitForFunction(()=>document.querySelector('#art')?.width===1600);
 const pixels=()=>page.evaluate(()=>{const c=document.querySelector('#art');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0;for(let i=3;i<d.length;i+=4)if(d[i])pixels++;return pixels});
 const b=await page.locator('#stage').boundingBox();const x=b.x+b.width*.45,y=b.y+b.height*.4;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+100,y+45,{steps:12});await page.mouse.up();
 assert.ok(await pixels()>0,'Stroke must change alpha');
 await page.locator('[data-action=undo]').first().click();assert.equal(await pixels(),0,'Undo clears stroke');
 await page.locator('[data-action=redo]').first().click();assert.ok(await pixels()>0,'Redo restores stroke');
 page.on('dialog',dialog=>dialog.accept());
 await page.locator('[data-action=new]').first().click();await page.locator('#new-width').fill('320');await page.locator('#new-height').fill('240');await page.locator('#new-dialog [type=submit]').click();
 assert.equal(await page.locator('#art').evaluate(el=>el.width),320);
 assert.deepEqual(errors,[],'No JS exceptions');
 const mobile=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(String(e)));await mobile.goto('http://127.0.0.1:'+port);
 assert.ok(await mobile.locator('.mobilebar').isVisible(),'Mobile main bar must be visible');
 await mobile.locator('#mobile-tools').click();assert.ok(await mobile.locator('.workspace').isVisible(),'Mobile workspace must open');
 assert.deepEqual(mobileErrors,[]);
 console.log('PASS: browser draw/undo/redo/new/phone entry');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
