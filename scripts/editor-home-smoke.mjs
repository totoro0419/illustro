/** Public/local Home skeleton acceptance: real Chromium, mouse, touch and existing QA isolation. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const publicBase=process.env.HOME_PUBLIC_URL??'';
const expected=process.env.EXPECTED_COMMIT_SHA??'';
const evidence=process.env.HOME_EVIDENCE_DIRECTORY??'/tmp/home-evidence';
await fs.mkdir(evidence,{recursive:true});
let server,base=publicBase;
if(!base){
 const root=path.resolve(import.meta.dirname,'../apps/editor/dist');
 server=http.createServer(async(req,res)=>{
  try{
   const pathname=decodeURIComponent((req.url??'/').split('?')[0]);
   const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
   const bytes=await fs.readFile(file),ext=path.extname(file);
   res.setHeader('Content-Type',ext==='.js'?'text/javascript':ext==='.css'?'text/css':ext==='.html'?'text/html; charset=utf-8':ext==='.json'?'application/json':ext==='.png'?'image/png':'application/octet-stream');
   res.end(bytes);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 base='http://127.0.0.1:'+server.address().port+'/';
}
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report={commit:expected,mode:publicBase?'public':'local',tests:[],errors:[]};
function record(name,extra={}){report.tests.push({name,status:'PASS',...extra});}
const errors=[];
const connectErrors=page=>page.on('pageerror',error=>errors.push(error.message));
async function click(page,selector){await page.locator(selector).click({timeout:20000});}
async function home(page){
 await page.waitForSelector('#ihApp:not([hidden]) [data-ih-screen="home"]:not([hidden])',{timeout:20000});
 assert.equal(await page.locator('#ihApp .ih-brand-name').textContent(),'Illustro.');
 const labels=await page.locator('#ihApp .ih-home-actions .ih-action strong').allTextContents();
 assert.deepEqual(labels,['新しい作品','マイ作品','前回の作業を続ける']);
 assert.equal(await page.locator('#ihApp .ih-home-actions .ih-action-icon svg.ui-icon').count(),3,'original Aurora icon system');
 assert.equal(await page.locator('#ihApp #ihNavSettings svg.ui-icon').count(),1,'matching settings icon');
 // Public GitHub Pages can load the logo after DOMContentLoaded, especially
 // on a new tablet/mobile context. Wait for decode, not just DOM insertion.
 await page.waitForFunction(()=>{
   const img=document.querySelector('#ihApp .ih-logo img');
   return img instanceof HTMLImageElement&&img.complete&&img.naturalWidth>0;
 },null,{timeout:20000});
 const brand=await page.locator('#ihApp .ih-logo img').evaluate(el=>({complete:el.complete,naturalWidth:el.naturalWidth}));
 assert.ok(brand.complete&&brand.naturalWidth>0,'actual logo loaded');
 record('HOME-APPROVED-ACTIONS');
}
try{
 const desktop=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1.5});
 connectErrors(desktop);
 await desktop.goto(base,{waitUntil:'networkidle',timeout:55000});
 await home(desktop);
 assert.equal(await desktop.locator('#ihContinue').isDisabled(),true,'no fictitious recovery on first visit');
 await desktop.screenshot({path:path.join(evidence,'home-desktop.png'),fullPage:true});
 const style=await desktop.locator('#ihApp').evaluate(el=>({
  bg:getComputedStyle(el).backgroundColor,
  width:el.clientWidth,
  scrollWidth:el.scrollWidth,
  canvasHidden:document.querySelector('#app')?.inert,
  heroGrid:getComputedStyle(document.querySelector('.ih-main-grid')).gridTemplateColumns,
  prodButtons:getComputedStyle(document.querySelector('.canvas-top .document-actions')).display,
 }));
 assert.ok(style.canvasHidden,'editor inert on Home');assert.equal(style.prodButtons,'none');
 assert.ok(style.heroGrid.split(' ').length>=2,'desktop has distinct left and right columns');
 record('DESKTOP-LAYOUT-AND-PRODUCTION-QA-SEPARATION',style);

 await click(desktop,'#ihWorks');
 await desktop.waitForSelector('[data-ih-screen="works"]:not([hidden])');
 assert.match(await desktop.locator('.ih-empty-works').innerText(),/一覧機能を開発中/);
 assert.equal(await desktop.locator('.ih-works-bar').count(),1);
 assert.equal(await desktop.locator('.ih-works-card').count(),0,'no fake cards');
 await desktop.screenshot({path:path.join(evidence,'my-works-empty.png'),fullPage:true});
 record('MY-WORKS-REAL-EMPTY-STATE');

 await click(desktop,'#ihNavHome');
 await desktop.waitForSelector('[data-ih-screen="home"]:not([hidden])');
 await click(desktop,'#ihFeatureNext');
 assert.match(await desktop.locator('#ihFeatureTitle').innerText(),/一本の線/);
 await click(desktop,'#ihFeatureMore');
 await desktop.waitForSelector('[data-ih-screen="feature"]:not([hidden])');
 assert.equal(await desktop.locator('#ihDetailSteps li').count(),3);
 await desktop.goBack({waitUntil:'domcontentloaded'});
 await desktop.waitForSelector('[data-ih-screen="home"]:not([hidden])');
 record('TRIVIA-DETAIL-AND-BROWSER-BACK');

 await click(desktop,'#ihStart');
 await desktop.waitForSelector('#ihNewDialog[open]');
 await click(desktop,'#ihChoiceFile');
 assert.equal(await desktop.locator('#ihFileOptions').isVisible(),true);
 assert.equal(await desktop.locator('#ihBlankForm').isVisible(),false);
 await click(desktop,'#ihChoiceBlank');
 await click(desktop,'[data-ih-preset="2048x1536"]');
 assert.equal(await desktop.locator('#ihNewWidth').inputValue(),'2048');
 assert.equal(await desktop.locator('#ihNewHeight').inputValue(),'1536');
 await click(desktop,'[data-ih-preset="512x384"]');
 await desktop.screenshot({path:path.join(evidence,'new-document.png')});
 await click(desktop,'#ihNewCreate');
 await desktop.locator('#ihApp').waitFor({state:'hidden',timeout:45000});
 assert.equal(await desktop.locator('#home').isEnabled(),true);
 assert.equal(await desktop.locator('.canvas-top .document-actions').isVisible(),false);
 assert.equal(await desktop.locator('#canvas').isVisible(),true);
 record('NEW-DOCUMENT-PRESET-AND-REAL-EDITOR');

 await click(desktop,'#home');
 await desktop.waitForSelector('#ihApp:not([hidden]) [data-ih-screen="home"]:not([hidden])',{timeout:25000});
 assert.equal(await desktop.locator('#ihReturnEditor').isVisible(),true);
 await click(desktop,'#ihReturnEditor');
 await desktop.locator('#ihApp').waitFor({state:'hidden'});
 assert.equal(await desktop.locator('#canvas').isVisible(),true);
 record('HOME-EDITOR-ROUNDTRIP-NO-RECREATE');

 const tablet=await browser.newPage({viewport:{width:820,height:1180},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 connectErrors(tablet);
 await tablet.goto(base,{waitUntil:'domcontentloaded',timeout:45000});await home(tablet);
 const tabMetrics=await tablet.locator('#ihApp').evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,header:document.querySelector('.ih-header').getBoundingClientRect().height}));
 assert.ok(tabMetrics.scrollWidth<=tabMetrics.width+1,'tablet horizontal overflow');
 await tablet.screenshot({path:path.join(evidence,'home-tablet.png'),fullPage:true});
 record('TABLET-RESPONSIVE',tabMetrics);
 await tablet.close();

 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 connectErrors(mobile);await mobile.goto(base,{waitUntil:'domcontentloaded',timeout:45000});await home(mobile);
 const mobileMetrics=await mobile.locator('#ihApp').evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,columns:getComputedStyle(document.querySelector('.ih-main-grid')).gridTemplateColumns}));
 assert.ok(mobileMetrics.scrollWidth<=mobileMetrics.width+1,'mobile horizontal overflow');
 const points=await mobile.locator('#ihStart').boundingBox();assert.ok(points&&points.height>=44,'touch target');
 await mobile.screenshot({path:path.join(evidence,'home-mobile.png'),fullPage:true});
 await click(mobile,'#ihWorks');assert.equal(await mobile.locator('[data-ih-screen="works"]').isVisible(),true);
 await click(mobile,'#ihNavHome');await click(mobile,'#ihStart');
 assert.equal(await mobile.locator('#ihNewDialog').isVisible(),true);
 await mobile.screenshot({path:path.join(evidence,'new-mobile.png')});
 record('MOBILE-TOUCH-NAVIGATION-AND-NO-OVERFLOW',mobileMetrics);
 await mobile.close();

 if(!publicBase){
  const legacy=await browser.newPage({viewport:{width:980,height:720}});
  connectErrors(legacy);
  await legacy.goto(base+'?qa=1&m08=1&backend=webgl2',{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(await legacy.locator('#ihApp').count(),0,'old QA must start editor');
  assert.equal(await legacy.locator('#new').isVisible(),true);
  assert.equal(await legacy.locator('#home').isDisabled(),true);
  await legacy.close();record('LEGACY-M08-QA-UNCHANGED');
 }
 assert.deepEqual(errors,[],'no uncaught browser errors');
} catch(error){report.errors.push(String(error?.stack||error));throw error;}
finally{
 report.errors.push(...errors);
 await fs.writeFile(path.join(evidence,'report.json'),JSON.stringify(report,null,2));
 await browser.close();if(server)await new Promise(ok=>server.close(ok));
 console.log(JSON.stringify(report,null,2));
}
