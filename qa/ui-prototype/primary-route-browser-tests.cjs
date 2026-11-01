'use strict';
/* Stage ③ audit of primary-entry *prototype* pathways, not actual editor engines or
 * novice discoverability. Crucially: don't call every feature a "3-step search". */
const {chromium}=require('playwright'),fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
require('./routes.js');const R=globalThis.ILLUSTRO_ROUTES;
const html=fs.readFileSync(__dirname+'/index.html');
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(html);});
let browser;
const rows=[];
async function panelRoute(p,f,path){
 const group=f.panel.slice(6);
 if(!(await p.locator('#dock').isVisible()))await p.locator('#workspaceToggle').click(); // open only when hidden
 if(!(await p.locator('#panels').isVisible())){
   await p.locator('#layerPageClose').click().catch(()=>{});
 }
 const box=p.locator('#box-'+group);
 if(!(await box.getAttribute('open')))await box.locator('summary').click();
 const direct=box.locator('[data-feature="'+f.id+'"]').first();
 if(await direct.count()&&await direct.isVisible()){
   await direct.click();path.push('Workspace direct control');return 'direct-panel';
 }
 await box.locator('[data-panel-category="'+f.category+'"]').click();
 path.push('Workspace '+group,'category '+f.category);
 const item=p.locator('#route-'+group+' [data-feature="'+f.id+'"]');
 await item.click();path.push('feature '+f.id);
 return 'category-panel';
}
async function viaCategory(p,f,path){
 await p.locator('#allFeatures').click();path.push('all features');
 await p.locator('#libraryContent [data-category="'+f.category+'"]').click();path.push('category '+f.category);
 await p.locator('#libraryContent [data-feature="'+f.id+'"]').click();path.push('feature '+f.id);
 return 'declared-catalog';
}
async function actualEntry(p,f,path,device){
 const key=f.primary_entry.id;
 if(key.startsWith('panel.')){
  if(key==='panel.layers.add'){
   if(device!=='desktop')await p.locator('#workspaceToggle').click();
   const box=p.locator('#box-layers');
   if(!(await box.getAttribute('open')))await box.locator('summary').click();
   const before=await p.locator('#layerRows .layerrow').count();
   await p.locator('#addLayer').click();path.push('Workspace Layer +');
   assert.equal(await p.locator('#layerRows .layerrow').count(),before+1);
   return 'direct-action-not-detail';
  }
  return panelRoute(p,f,path);
 }
 if(key.startsWith('scope.'))return viaCategory(p,f,path);
 if(key.startsWith('rail.')){
  const tool=key.slice(5);
  await p.locator('#tools [data-tool="'+tool+'"]').click();path.push('rail '+tool);
  assert.equal(await p.locator('#tools [data-tool="'+tool+'"]').getAttribute('aria-pressed'),'true');
  return 'direct-tool';
 }
 const controls={
  'home.new':'#home','canvas.view':'#fit','fixed.flip':'#fixed [data-flip="H"]',
  'context.size':'#brushSize','context.color':'#currentColor',
  'fixed.undo':'#fixed [data-undo]','top.save':'#save',
  'top.saveStatus':'#saveStatus','top.export':'#export',
  'canvas.quick':'#quickTrigger','top.search':'#search',
  'top.focus':'#focus','top.home':'#home'
 };
 const sel=controls[key];
 if(!sel)return viaCategory(p,f,path);
 if(device==='portrait'&&(key==='fixed.flip'||key==='fixed.undo')){
  if(key==='fixed.flip'){
   await p.locator('#quickTrigger').click();path.push('Quick');
   await p.locator('#quickGrid [data-flip="H"]').click();path.push('view flip H');
   return 'phone-quick-alternative';
  }
  await p.locator('#addLayer').click();
  await p.locator('#mobileTabs [data-undo]').click();path.push('mobile fixed Undo');
  return 'direct-control';
 }
 if(key==='fixed.undo')await p.locator('#addLayer').click();
 const el=p.locator(sel);
 if(key==='context.size'){
  assert(await el.isVisible());path.push('context size control');return 'direct-control';
 }
 await el.click();path.push(sel);
 return 'direct-control';
}
async function main(){
 await new Promise(resolve=>server.listen(43896,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true});
 fs.mkdirSync('test-results',{recursive:true});
 for(const device of ['desktop','portrait']){
  const page=await browser.newPage({viewport:device==='desktop'?{width:1180,height:820}:{width:390,height:844},hasTouch:device!=='desktop'});
  page.setDefaultTimeout(5500);
  for(const f of R.features){
   await page.goto('http://127.0.0.1:43896/',{waitUntil:'load'});
   const path=[];
   try{
    const kind=await actualEntry(page,f,path,device);
    const detail=await page.locator('[data-reached="'+f.id+'"]').isVisible();
    // Some direct actions open no inspector; must be acknowledged as such.
    const valid=detail||kind==='direct-action-not-detail'||kind==='direct-control'||kind==='direct-tool'||kind==='phone-quick-alternative';
    assert(valid,'no detail and no action');
    const start=page.locator('[data-start="'+f.id+'"]'),button=detail?await start.count():0;
    if(detail)assert.equal(button,f.availability.executable?1:0,'scope mismatch');
    const row={id:f.id,device,primary:keyType(f.primary_entry.id),kind,path,actions:path.length,detail,hasStart:!!button,production_action_verified:false,real_user:false};
    if(detail&&button){
     await start.click();row.startInvoked=true; // candidate UI only, not pixel algorithm
    }
    rows.push(row);
   }catch(e){
    rows.push({id:f.id,device,primary:f.primary_entry.id,path,status:'prototype-route-gap',error:String(e).slice(0,340),production_action_verified:false});
   }
  }
  await page.close();
 }
 const gaps=rows.filter(x=>x.status==='prototype-route-gap');
 const result={kind:'prototype-primary-entry-DOM-observation',features:247,attempts:rows.length,
  successful:rows.length-gaps.length,gaps:gaps.length,byKind:Object.fromEntries([...new Set(rows.filter(x=>x.kind).map(x=>x.kind))].map(k=>[k,rows.filter(x=>x.kind===k).length])),
  rows,
  limits:['A primary control is not necessarily its complete real editor workflow','no physical device','no novice task trial','some entries are catalog-only by approved scope','no formal raster operations']};
 fs.writeFileSync('test-results/stage3-primary-routes.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({attempts:result.attempts,successful:result.successful,gaps:result.gaps,byKind:result.byKind,gapExamples:gaps.slice(0,18)}));
 // The run is diagnostic rather than reclassifying known-but-unimplemented routes as passed.
 if(gaps.length)process.exitCode=1;
}
function keyType(id){return id.split('.').slice(0,2).join('.')}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();server.close()});
