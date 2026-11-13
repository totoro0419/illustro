import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const root=path.resolve('apps/editor/dist');
const evidence=process.env.C01_DOCUMENT_BROWSER_EVIDENCE??'/tmp/c01-c02-evidence/document-creation.json';
const checks=[],errors=[];
let server,browser;
await fs.mkdir(path.dirname(evidence),{recursive:true});
try{
 server=http.createServer(async(req,res)=>{
  try{
   const url=decodeURIComponent((req.url??'/').split('?')[0]),file=path.resolve(root,'.'+(url==='/'?'/index.html':url));
   if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
   const data=await fs.readFile(file);
   res.setHeader('content-type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'}[path.extname(file)]??'application/octet-stream');
   res.end(data);
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
 for(const backend of ['webgl2','webgpu']){
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1400,height:850},deviceScaleFactor:2});
  const page=await context.newPage(),pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  try{
   await page.addInitScript(()=>{Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true});});
   await page.goto('http://127.0.0.1:'+server.address().port+'/?backend='+backend);
   await page.locator('#ihStart').click();
   await page.locator('#ihNewDpi').fill('100');
   await page.locator('#ihNewUnit').selectOption('mm');
   await page.locator('#ihNewWidth').fill('25.4');
   await page.locator('#ihNewHeight').fill('38.1');
   await page.locator('#ihNewName').fill('Unit test artwork');
   await page.locator('#ihNewAuthor').fill('Sample author');
   await page.locator('#ihNewDescription').fill('Printed at 100 DPI');
   assert.match(await page.locator('#ihPixelPreview').textContent(),/100 × 150 px · 100 DPI/);
   await page.locator('#ihTemplateName').fill('Test size 100x150');
   await page.locator('#ihTemplateSave').click();
   assert.equal(await page.locator('#ihTemplateSelect').inputValue(),'Test size 100x150');
   await page.locator('#ihNewCreate').click();
   try{await page.waitForFunction(()=>!document.getElementById('brush')?.disabled&&document.getElementById('canvas')?.dataset.documentWidth==='100',null,{timeout:90000});}
   catch(error){throw Error('Failed document creation: '+JSON.stringify({backend,error:String(error),status:await page.locator('#status').textContent(),pageErrors}));}
   const initial=await page.locator('#canvas').evaluate(canvas=>({width:canvas.dataset.documentWidth,height:canvas.dataset.documentHeight,dpi:canvas.dataset.documentDpi,name:canvas.dataset.documentName,backend:canvas.dataset.backend}));
   assert.equal(initial.width,'100');assert.equal(initial.height,'150');assert.equal(initial.dpi,'100');assert.equal(initial.name,'Unit test artwork');
   const downloadTask=page.waitForEvent('download',{timeout:60000});
   await page.locator('#save').click();
   const download=await downloadTask,content=await fs.readFile(await download.path());
   assert.ok(content.byteLength>100,'Native project file was empty');
   await page.reload();
   await page.locator('#ihStart').click();
   assert.ok((await page.locator('#ihTemplateSelect option').allTextContents()).includes('Test size 100x150'),'template must persist after reload');
   await page.locator('#ihNewUnit').selectOption('mm');
   await page.locator('#ihTemplateSelect').selectOption('Test size 100x150');
   assert.equal(await page.locator('#ihNewUnit').inputValue(),'px','loading a template should preserve exact pixel dimensions');
   assert.equal(await page.locator('#ihNewWidth').inputValue(),'100');
   assert.equal(await page.locator('#ihNewHeight').inputValue(),'150');
   await page.locator('#ihNewClose').click();
   await page.locator('#openFile').setInputFiles({name:'Unit test artwork.illustro',mimeType:'application/octet-stream',buffer:content});
   await page.waitForFunction(()=>!document.getElementById('brush')?.disabled&&document.getElementById('canvas')?.dataset.documentName==='Unit test artwork',null,{timeout:90000});
   const restored=await page.locator('#canvas').evaluate(canvas=>({width:canvas.dataset.documentWidth,height:canvas.dataset.documentHeight,dpi:canvas.dataset.documentDpi,name:canvas.dataset.documentName}));
   assert.deepEqual(restored,{width:'100',height:'150',dpi:'100',name:'Unit test artwork'});
   assert.deepEqual(pageErrors,[],'no unhandled browser errors on '+backend);
   checks.push({backend,created:initial,restored,nativeBytes:content.byteLength,templatePersisted:true,pageErrors});
  }finally{await context.close();}
 }
}catch(error){errors.push(error.stack??String(error));}
finally{
 if(browser)await browser.close();
 if(server)server.close();
 await fs.writeFile(evidence,JSON.stringify({status:errors.length?'FAIL':'PASS',commit:process.env.EXPECTED_COMMIT_SHA??'',checks,errors,limitations:'Chromium simulation only. Physical pen/tablet response, ICC color handling and full C01/C02 compliance were not tested.'},null,2));
}
if(errors.length)throw Error(errors.join('\n'));
console.log('C01_DOCUMENT_CREATION '+JSON.stringify(checks));
