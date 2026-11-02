'use strict';
// Every feature's search route is driven through actual DOM. This certifies detail
// discovery only, never its production action or user discoverability.
const {chromium}=require('playwright'),fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
require('./routes.js');const R=globalThis.ILLUSTRO_ROUTES,html=fs.readFileSync(__dirname+'/index.html');
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(html);});
let browser;const rows=[];
async function main(){
 await new Promise(r=>server.listen(43881,'127.0.0.1',r));browser=await chromium.launch();
 for(const start of ['initial','closed','focus','phone']){
  const p=await browser.newPage({viewport:start==='phone'?{width:390,height:844}:{width:1180,height:820}});p.setDefaultTimeout(5000);await p.goto('http://127.0.0.1:43881/');
  for(const f of R.features){
   const classes=await p.locator('#frame').getAttribute('class')||'';
   if(start==='closed'&&!classes.includes('closed'))await p.locator('#workspaceToggle').click();
   if(start==='focus'&&!classes.includes('focused'))await p.locator('#focus').click();
   await p.locator('#search').click();await p.locator('#query').fill(f.id);await p.locator('#libraryContent [data-feature="'+f.id+'"]').click();
   assert(await p.locator('[data-reached="'+f.id+'"]').isVisible());
   const executable=await p.locator('[data-start="'+f.id+'"]').count();assert.equal(executable,f.availability.executable?1:0);
   rows.push({id:f.id,start,goal:'detail-visible',path:['search','enter-ID','result'],actions:3,production_action_verified:false});
  }
  await p.close();
 }
 // Independent real-DOM category navigation: starts without knowing a feature ID.
 // The category itself is known (not a human first-use/optimal path study).
 const categoryPage=await browser.newPage({viewport:{width:1180,height:820}});
 categoryPage.setDefaultTimeout(6000);await categoryPage.goto('http://127.0.0.1:43881/');
 for(const f of R.features){
  await categoryPage.locator('#allFeatures').click();
  await categoryPage.locator('#libraryContent [data-category="'+f.category+'"]').click();
  await categoryPage.locator('#libraryContent [data-feature="'+f.id+'"]').click();
  assert(await categoryPage.locator('[data-reached="'+f.id+'"]').isVisible());
  rows.push({id:f.id,start:'category-known',goal:'detail-visible',path:['allFeatures','category','result'],actions:3,production_action_verified:false});
 }
 await categoryPage.close();
 fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/catalog-routes.json',JSON.stringify({rows,passed:rows.length,real_device:false,limit:'988 known-ID routes plus 247 category-known routes; not first-use discovery or shortest primary route'},null,2));
 console.log(JSON.stringify({passed:rows.length,scope:'247x4 known-ID + 247 known-category actual DOM detail routes; not first-use'}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
