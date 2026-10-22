import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const evidence=process.env.M10_EDITOR_EVIDENCE??'/tmp/m10-brush-editor/report.json';
const root=path.resolve('apps/editor/dist');
let server,browser;const checks=[],errors=[];
await fs.mkdir(path.dirname(evidence),{recursive:true});
try{
 server=http.createServer(async(req,res)=>{
  try{
   const input=decodeURIComponent((req.url??'/').split('?')[0]);
   const file=path.resolve(root,'.'+(input==='/'?'/index.html':input));
   if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
   const data=await fs.readFile(file);
   res.setHeader('content-type',{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(file)]??'application/octet-stream');
   res.end(data);
  }catch{res.writeHead(404).end();}
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
 for(const backend of ['webgl2','webgpu']){
  const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true,deviceScaleFactor:2});
  const page=await context.newPage(),pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/?qa=1&backend='+backend);
  await page.locator('#new').click();
  await page.waitForFunction(()=>!document.getElementById('brush')?.disabled,null,{timeout:90000});
  await page.locator('.brush-editor-section').evaluateAll(items=>items.forEach(item=>item.open=true));
  assert.equal(await page.locator('#brushModifiedStatus').textContent(),'保存済み');
  await page.locator('#brushFadeStartNumber').fill('30');
  await page.locator('#brushFadeStartNumber').press('Tab');
  assert.equal(await page.locator('#brushFadeStart').inputValue(),'30');
  assert.match(await page.locator('#brushModifiedStatus').textContent(),/未保存/);
  await page.locator('#brush').selectOption('foundation-pencil');
  await page.locator('#brush').selectOption('foundation-g-pen');
  assert.equal(await page.locator('#brushFadeStartNumber').inputValue(),'30','switching brushes retains an unsaved draft');
  await page.locator('#brushReset').click();
  assert.equal(await page.locator('#brushFadeStartNumber').inputValue(),'12','reset restores the shipped preset');
  await page.locator('#brushFadeStartNumber').fill('30');
  await page.locator('#brushFadeStartNumber').press('Tab');
  await page.locator('#brushCurveAdd').click();
  assert.equal(await page.locator('#brushCurvePoint option').count(),3,'G pen curve inserts a midpoint');
  await page.locator('#brushCurveY').fill('70');
  await page.locator('#brushCurveY').press('Tab');
  assert.equal(await page.locator('#brushCurveY').inputValue(),'70','numeric curve coordinates update preset');
  await page.locator('#brushTexture').evaluate(el=>{el.value='20';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#brushTextureKind').selectOption('hatch');
  await page.locator('#brushTipShape').selectOption('ellipse');
  await page.locator('#brushSave').click();
  const id=await page.locator('#brush').inputValue();
  assert.ok(id.startsWith('user-brush-'));
  assert.equal(await page.locator('#brushModifiedStatus').textContent(),'保存済み');
  await page.reload();
  await page.locator('#new').click();
  await page.waitForFunction(()=>!document.getElementById('brush')?.disabled,null,{timeout:90000});
  await page.locator('#brush').selectOption(id);
  await page.locator('.brush-editor-section').evaluateAll(items=>items.forEach(item=>item.open=true));
  assert.equal(await page.locator('#brushFadeStartNumber').inputValue(),'30','saved fade start survived reload');
  assert.equal(await page.locator('#brushTextureKind').inputValue(),'hatch');
  assert.equal(await page.locator('#brushTipShape').inputValue(),'ellipse');
  assert.equal(await page.locator('#brushCurvePoint option').count(),3);
  assert.deepEqual(pageErrors,[],backend+' browser exceptions');
  checks.push({backend,drafts:true,reset:true,curve:true,tipAndTexture:true,persist:true,pageErrors});
  await context.close();
 }
}catch(error){errors.push(error.stack??String(error));}
finally{
 if(browser)await browser.close();
 if(server)server.close();
 await fs.writeFile(evidence,JSON.stringify({status:errors.length?'FAIL':'PASS',commit:process.env.EXPECTED_COMMIT_SHA??'',checks,errors,limitations:'SwiftShader automated browser; physical stylus/GPU not tested'},null,2));
}
if(errors.length)throw Error(errors.join('\n'));
console.log('M10_BRUSH_EDITOR '+JSON.stringify(checks));
