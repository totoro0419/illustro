'use strict';
/* Stage ③ audit of primary-entry *prototype* pathways, not actual editor engines or
 * novice discoverability. Crucially: don't call every feature a "3-step search". */
const {chromium}=require('playwright'),fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
require('./routes.js');const R=globalThis.ILLUSTRO_ROUTES;
const html=fs.readFileSync(__dirname+'/index.html');
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(html);});
let browser;
const rows=[];
const pageMetrics=new WeakMap();
async function click(p,selector,label){
 const metrics=pageMetrics.get(p);
 const el=p.locator(selector).first();
 const probe=await el.evaluate(e=>{
  if(e.disabled)throw Error('disabled control: '+e.outerHTML.slice(0,90));
  const positions=new Map([...document.querySelectorAll('*')].map(e=>[e,[e.scrollTop,e.scrollLeft]]));e.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);
  if(r.width<=0||r.height<=0||!(hit===e||e.contains(hit)))throw Error('control center not hittable: '+e.outerHTML.slice(0,90)+' hit '+hit?.outerHTML.slice(0,90));
  return {x,y,scroll:[...positions].reduce((n,[e,[top,left]])=>n+Math.abs(e.scrollTop-top)+Math.abs(e.scrollLeft-left),0)};
 });
 metrics.scrollPixels+=probe.scroll;if(probe.scroll)metrics.scrollEvents++;
 // A real pointer dispatch after our explicit visibility/center-hit/enabled checks.
 await p.mouse.click(probe.x,probe.y);metrics.clicks++;metrics.controls.push({selector,label});
 if(/summary|workspaceToggle|data-open-panel|sheetClose/.test(selector))metrics.panelToggles++;
}
async function library(p,path){await click(p,await p.locator('#allFeatures').isVisible()?'#allFeatures':'#search','category browser');path.push('category browser (no query)');}
async function chooseTool(p,tool,path){
 if(await p.locator('#tools [data-tool="'+tool+'"]').isVisible())await click(p,'#tools [data-tool="'+tool+'"]','rail '+tool);
 else if(await p.locator('#landscapeTabs').isVisible()){
  await click(p,'#landscapeTabs [data-landscape-tools]','tool picker');await click(p,'#landscapeToolPicker [data-tool="'+tool+'"]','tool '+tool);
 }else{
  const f=R.features.find(f=>f.primary_entry.id==='rail.'+tool);
  await panelRoute(p,f,path);await click(p,'[data-start="'+f.id+'"]','start tool');
 }
 path.push('choose tool '+tool);
 if(await p.locator('[data-conflict="cancel"]').isVisible())await click(p,'[data-conflict="cancel"]','explicitly discard old candidate');
}

async function panelRoute(p,f,path){
 const group=f.panel.slice(6);
 if(!(await p.locator('#panels').isVisible())){await click(p,'#workspaceToggle','open Workspace');path.push('open Workspace');} // open only when hidden
 if(!(await p.locator('#panels').isVisible())){
   if(await p.locator('#layerPageClose').isVisible())await click(p,'#layerPageClose','Workspace sections');
 }
 const box=p.locator('#box-'+group);
 if(!(await box.evaluate(e=>e.open))){await click(p,'#box-'+group+'>summary','open '+group);path.push('open '+group+' section');}
 const direct=box.locator('[data-feature="'+f.id+'"]').first();
 if(await direct.count()&&await direct.isVisible()){
   await click(p,'#box-'+group+' [data-feature="'+f.id+'"]','direct '+f.id);path.push('Workspace direct control');return 'direct-panel';
 }
 await click(p,'#box-'+group+' [data-panel-category="'+f.category+'"]','category');
 path.push('category '+f.category);
 const item=p.locator('#route-'+group+' [data-feature="'+f.id+'"]');
 await click(p,'#route-'+group+' [data-feature="'+f.id+'"]','feature');path.push('feature '+f.id);
 return 'category-panel';
}
async function viaCategory(p,f,path){
 await library(p,path);
 await click(p,'#libraryContent [data-category="'+f.category+'"]','category');path.push('category '+f.category);
 await click(p,'#libraryContent [data-feature="'+f.id+'"]','feature');path.push('feature '+f.id);
 return 'declared-catalog';
}
async function actualEntry(p,f,path,device){
 const key=f.primary_entry.id;
 if(key.startsWith('panel.')){
  if(key==='panel.layers.add'){
   if(!(await p.locator('#panels').isVisible()))await click(p,'#workspaceToggle','open Workspace');
   const box=p.locator('#box-layers');
   if(!(await box.evaluate(e=>e.open)))await click(p,'#box-layers>summary','open layers');
   const before=await p.locator('#layerRows .layerrow').count();
   await click(p,'#addLayer','add layer');path.push('Workspace Layer +');
   assert.equal(await p.locator('#layerRows .layerrow').count(),before+1);
   return 'direct-action-not-detail';
  }
  return panelRoute(p,f,path);
 }
 if(key.startsWith('scope.'))return viaCategory(p,f,path);
 if(key.startsWith('rail.')){
  const tool=key.slice(5);await chooseTool(p,tool,path);
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
 const visible=await p.locator(sel).isVisible();
 if(key==='home.new'){await click(p,'#home','home');await click(p,'#newDocument','new work');path.push('Home → New');return 'home-new-detail';}
 if(key==='fixed.undo'){
  // Setup a reversible document edit separately: reaching a disabled Undo is not a route failure.
  if(!(await p.locator(sel).isEnabled())){
   let visibleUndo=null;
   for(const selector of ['#fixed [data-undo]','#landscapeTabs [data-undo]','#mobileTabs [data-undo]'])if(await p.locator(selector).isVisible()){visibleUndo=selector;break;}
   if(!visibleUndo){await click(p,'#quickTrigger','Quick: expose disabled artwork Undo');visibleUndo='#quickGrid [data-undo]';}
   assert(await p.locator(visibleUndo).isVisible(),'disabled Undo has no reachable visible control');
   assert.equal(await p.locator(visibleUndo).isEnabled(),false);
   path.push('visible disabled artwork Undo: no document history');return 'disabled-correct';
  }
 }
 if(!visible){
  if(key==='context.size'){
   if(await p.locator('#landscapeTabs').isVisible()){
    await click(p,'#landscapeTabs [data-landscape-properties]','properties');
    assert(await p.locator('#brushSize').isVisible());path.push('landscape size');return 'direct-control';
   }
   if(!(await p.locator('#panels').isVisible()))await click(p,'#workspaceToggle','Workspace');
   if(!(await p.locator('#box-brush').evaluate(e=>e.open)))await click(p,'#box-brush>summary','brush');
   await p.locator('#dockBrushSize').scrollIntoViewIfNeeded();assert(await p.locator('#dockBrushSize').isVisible());path.push('Workspace size');return 'direct-control';
  }
  if(key==='context.color'){
   await click(p,'#quickTrigger','Quick');await click(p,'#quickGrid [data-open-panel="color"]','color');path.push('Quick → Color');return 'direct-control';
  }
  if(key==='fixed.undo'){
   const fixed=await p.locator('#landscapeTabs').isVisible()?'#landscapeTabs [data-undo]':await p.locator('#mobileTabs').isVisible()?'#mobileTabs [data-undo]':null;
   if(fixed){await click(p,fixed,'document Undo');path.push('fixed document Undo');return 'direct-control';}
  }
  if(key==='fixed.flip'||key==='fixed.undo'||key==='top.export'){
   await click(p,'#quickTrigger','Quick');
   await click(p,key==='fixed.flip'?'#quickGrid [data-flip="H"]':key==='fixed.undo'?'#quickGrid [data-undo]':'#quickGrid [data-export-quick]','Quick action');
   path.push('Quick alternative');return 'quick-alternative';
  }
  return viaCategory(p,f,path);
 }
 if(key==='context.size'){assert(await p.locator(sel).isVisible());path.push('size available');return 'direct-control';}
 await click(p,sel,'primary control');path.push(sel);
 return 'direct-control';
}
async function prepareState(page,state){
 if(state==='workspace-hidden'&&await page.locator('#panels').isVisible())await page.locator('#workspaceToggle').click();
 if(state==='focus')await page.locator('#focus').click();
 if(state==='session'){
  await chooseTool(page,'transform',[]);
  if(await page.locator('#dock').isVisible())await page.locator('#workspaceToggle').click();
 }
}
async function main(){
 await new Promise(resolve=>server.listen(43896,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true});
 fs.mkdirSync('test-results',{recursive:true});
 const devices=[['desktop',1180,820,false],['tablet-portrait',800,1180,true],['tablet-landscape',1180,800,true],['portrait',390,844,true],['landscape',740,360,true],['landscape-wide',960,400,true]];
 const queue=devices.filter(d=>!process.env.DEVICE||d[0]===process.env.DEVICE);
 await Promise.all([0,1].map(async()=>{
 while(queue.length){
 const [device,width,height,hasTouch]=queue.shift();
 for(const state of ['initial','workspace-hidden','focus','session'].filter(s=>!process.env.STATE||s===process.env.STATE)){
  const page=await browser.newPage({viewport:{width,height},hasTouch});
  page.setDefaultTimeout(2200);page.setDefaultNavigationTimeout(30000);
  for(const f of R.features.filter(f=>!process.env.FEATURES||process.env.FEATURES.split(',').includes(f.id))){
   await page.goto('http://127.0.0.1:43896/',{waitUntil:'load'});
   const path=[];let metrics={clicks:0,scrollPixels:0,scrollEvents:0,panelToggles:0,controls:[]};pageMetrics.set(page,metrics);
   try{
    await prepareState(page,state);
    metrics={clicks:0,scrollPixels:0,scrollEvents:0,panelToggles:0,controls:[]};pageMetrics.set(page,metrics);

    const kind=await actualEntry(page,f,path,device);
    const detail=await page.locator('[data-reached="'+f.id+'"]').isVisible();
    // Some direct actions open no inspector; must be acknowledged as such.
    const valid=detail||kind==='direct-action-not-detail'||kind==='direct-control'||kind==='direct-tool'||kind==='quick-alternative'||kind==='disabled-correct';
    assert(valid,'no detail and no action');
    const start=page.locator('[data-start="'+f.id+'"]'),button=detail?await start.count():0;
    if(detail)assert.equal(button,f.availability.executable?1:0,'scope mismatch');
    const row={id:f.id,device,startState:state,scope:f.final_scope,primary:keyType(f.primary_entry.id),kind,path,actions:metrics.clicks,measured:{...metrics,controls:metrics.controls.map(x=>({...x}))},pathClassification:'observed-normal-declared-entry; not global shortest',detail,hasStart:!!button,production_action_verified:false,real_user:false};
    if(detail&&button){
     await click(page,'[data-start="'+f.id+'"]','start');if(await page.locator('[data-conflict="cancel"]').isVisible()){await click(page,'[data-conflict="cancel"]','explicit candidate cancellation');row.conflictResolved=true;}row.startInvoked=true;row.toCandidate={...metrics}; // candidate UI only, not pixel algorithm
    }
    // Compare identical detail goals using two actual no-query route families.
    // This is a measured minimum of these families, NOT an exhaustive UI proof.
    if(detail){
     await page.goto('http://127.0.0.1:43896/',{waitUntil:'load'});
     pageMetrics.set(page,{clicks:0,scrollPixels:0,scrollEvents:0,panelToggles:0,controls:[]});
     await prepareState(page,state);
     const alternate={clicks:0,scrollPixels:0,scrollEvents:0,panelToggles:0,controls:[]};pageMetrics.set(page,alternate);
     const alternatePath=[];await viaCategory(page,f,alternatePath);
     assert(await page.locator('[data-reached="'+f.id+'"]').isVisible(),'alternate detail goal mismatch');
     row.routeComparison={goal:'same feature detail/scope information',normal:row.measured,catalog:alternate,catalogPath:alternatePath,
      observedMinimumClicks:Math.min(row.measured.clicks,alternate.clicks),normalExcessClicks:Math.max(0,row.measured.clicks-alternate.clicks),
      classification:'minimum of measured normal and category routes; not global shortest; no ID/name query'};
    }else row.routeComparison={goal:kind,normal:row.measured,classification:'direct action/control goal; catalog detail is a different goal and not compared'};
    rows.push(row);
   }catch(e){
    console.log(JSON.stringify({gap:f.id,device,state,error:String(e).slice(0,500),path}));
    rows.push({id:f.id,device,startState:state,primary:f.primary_entry.id,path,status:'prototype-route-gap',error:String(e).slice(0,340),production_action_verified:false});
   }
  }
  await page.close();console.log(JSON.stringify({device,state,completed:rows.length,gaps:rows.filter(x=>x.status).length}));
 }
 }
 }));
 const gaps=rows.filter(x=>x.status==='prototype-route-gap');
 rows.sort((a,b)=>(a.device+'|'+a.startState+'|'+a.id).localeCompare(b.device+'|'+b.startState+'|'+b.id));
 const result={kind:'prototype-primary-entry-DOM-observation',features:247,attempts:rows.length,
  successful:rows.length-gaps.length,gaps:gaps.length,byKind:Object.fromEntries([...new Set(rows.filter(x=>x.kind).map(x=>x.kind))].map(k=>[k,rows.filter(x=>x.kind===k).length])),
  rows,
  limits:['A primary control is not necessarily its complete real editor workflow','no physical device','no novice task trial','minimum only within measured normal/category same-detail routes; direct actions are different goals; no exhaustive shortest-path proof','some entries are catalog-only by approved scope','no formal raster operations']};
 fs.writeFileSync('test-results/stage3-primary-routes.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({attempts:result.attempts,successful:result.successful,gaps:result.gaps,byKind:result.byKind,gapExamples:gaps.slice(0,18)}));
 // The run is diagnostic rather than reclassifying known-but-unimplemented routes as passed.
 if(gaps.length)process.exitCode=1;
}
function keyType(id){return id.split('.').slice(0,2).join('.')}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();server.close()});
