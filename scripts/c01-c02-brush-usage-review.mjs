import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const root=path.resolve('apps/editor/dist');
const evidence=process.env.C01_C02_BROWSER_EVIDENCE??'/tmp/c01-c02-evidence/brush-usage.json';
let server,browser;
const checks=[],errors=[];
await fs.mkdir(path.dirname(evidence),{recursive:true});
try{
 server=http.createServer(async(req,res)=>{
  try{
   const input=decodeURIComponent((req.url??'/').split('?')[0]);
   const file=path.resolve(root,'.'+(input==='/'?'/index.html':input));
   if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
   const data=await fs.readFile(file);
   res.setHeader('content-type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json'}[path.extname(file)]??'application/octet-stream');
   res.end(data);
  }catch{res.writeHead(404).end();}
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
 for(const backend of ['webgl2','webgpu']){
  const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true,deviceScaleFactor:2});
  try{
   const page=await context.newPage(),pageErrors=[];
   page.on('pageerror',e=>pageErrors.push(e.message));
   const url='http://127.0.0.1:'+server.address().port+'/?qa=1&backend='+backend;
   await page.goto(url);
   await page.locator('#new').click();
   try{await page.waitForFunction(()=>!document.getElementById('brush')?.disabled,null,{timeout:90000});}catch(error){const state=await page.evaluate(()=>({status:document.getElementById('status')?.textContent,brushDisabled:document.getElementById('brush')?.disabled,appMode:document.body.dataset.appMode,canvas:document.getElementById('canvas')?.dataset.backend}));throw new Error('Editor not ready on '+backend+': '+JSON.stringify({state,pageErrors})+'; '+String(error));}
   await page.locator('#brush').selectOption('foundation-pencil');
   await page.locator('#brushFavorite').evaluate(el=>el.click());
   assert.equal(await page.locator('#brushFavorite').getAttribute('aria-pressed'),'true');
   const setGroup=async value=>page.locator('#brushGroup').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},value);
   await setGroup('favorites');
   assert.deepEqual(await page.locator('#brush option').evaluateAll(nodes=>nodes.map(n=>n.value)),['foundation-pencil']);
   await setGroup('all');
   await page.locator('#brush').selectOption('foundation-g-pen');
   await page.locator('#brush').selectOption('foundation-pencil');
   await setGroup('recent');
   assert.equal(await page.locator('#brush option').first().getAttribute('value'),'foundation-pencil');
   await page.reload();await page.locator('#new').click();
   try{await page.waitForFunction(()=>!document.getElementById('brush')?.disabled,null,{timeout:90000});}catch(error){const state=await page.evaluate(()=>({status:document.getElementById('status')?.textContent,brushDisabled:document.getElementById('brush')?.disabled,appMode:document.body.dataset.appMode,canvas:document.getElementById('canvas')?.dataset.backend}));throw new Error('Editor not ready on '+backend+': '+JSON.stringify({state,pageErrors})+'; '+String(error));}
   await setGroup('favorites');
   assert.ok((await page.locator('#brush option').evaluateAll(nodes=>nodes.map(n=>n.value))).includes('foundation-pencil'),'favorite must survive reload');
   // A held eraser key is a temporary tool, not a permanent brush change.
   await page.locator('#brushGroup').selectOption('all');
   await page.locator('#brush').selectOption('foundation-pencil');
   await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
   await page.keyboard.down('e');
   assert.equal(await page.locator('#brush').inputValue(),'foundation-hard-eraser','holding E selects temporary eraser');
   await page.keyboard.up('e');
   assert.equal(await page.locator('#brush').inputValue(),'foundation-pencil','releasing E restores previous brush');
   assert.deepEqual(pageErrors,[],'unhandled browser errors on '+backend);
   checks.push({backend,feature:'BRU-004',favorites:true,recent:true,reload:true,pageErrors});
  }finally{await context.close();}
 }
}catch(error){errors.push(error.stack??String(error));}
finally{
 if(browser)await browser.close();
 if(server)server.close();
 await fs.writeFile(evidence,JSON.stringify({status:errors.length?'FAIL':'PASS',commit:process.env.EXPECTED_COMMIT_SHA??'',checks,errors,limitations:'Emulated browser/SwiftShader; pen button, palm rejection, physical latency and overall 35-feature compliance are unverified.'},null,2));
}
if(errors.length)throw Error(errors.join('\n'));
console.log('C01_C02_BRUSH_USAGE '+JSON.stringify(checks));
