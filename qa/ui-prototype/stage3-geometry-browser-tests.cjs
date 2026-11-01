'use strict';
// Geometry probe deliberately uses known IDs, never counted as a normal route or human trial.
const {chromium}=require('playwright'),fs=require('fs'),http=require('http'),assert=require('assert/strict');
require('./routes.js');const R=globalThis.ILLUSTRO_ROUTES,html=fs.readFileSync(__dirname+'/index.html');
const server=http.createServer((q,r)=>r.end(html));let browser;const cases=[];let sequence=0;
async function scan(p,label){
 const result=await p.evaluate(()=>{
  const frame=document.querySelector('#frame').getBoundingClientRect();
  const rect=r=>({x:r.x,y:r.y,width:r.width,height:r.height});
  const area=r=>Math.max(0,r.right-r.left)*Math.max(0,r.bottom-r.top);
  const inter=(a,b)=>({left:Math.max(a.left,b.left),top:Math.max(a.top,b.top),right:Math.min(a.right,b.right),bottom:Math.min(a.bottom,b.bottom)});
  const rows=[];
  for(const e of document.querySelectorAll('button,summary,input,select,textarea,[role="button"],.color-plane,#splitter')){
   const r=e.getBoundingClientRect(),s=getComputedStyle(e);if(!area(r)||s.visibility==='hidden'||s.display==='none'||e.closest('[hidden]'))continue;
   // A summary in a closed ancestor details may have a layout box but is not rendered.
   if(!e.checkVisibility())continue;
   let clipped=inter(r,frame),scrollable=false;
   for(let a=e.parentElement;a&&a!==document.body;a=a.parentElement){const s=getComputedStyle(a);if(/auto|scroll/.test(s.overflowY+s.overflowX))scrollable=true;if(/auto|scroll|hidden|clip/.test(s.overflowY+s.overflowX))clipped=inter(clipped,a.getBoundingClientRect());}
   const ratio=area(clipped)/area(r),id=e.id||e.getAttribute('aria-label')||e.textContent.trim().slice(0,60),x=r.x+r.width/2,y=r.y+r.height/2;
   if(ratio<.75){rows.push({id,rect:rect(r),status:scrollable?'scroll-clipped':'outside-unscrollable',ratio});continue;}
   const hit=document.elementFromPoint(x,y),blocked=!(hit===e||e.contains(hit));
   const owner=e.closest('.float,.dock,.landscape-tool-picker,.sessionbar,.mobile-tabs,.landscape-tabs');
   const cover=hit?.closest('.float,.dock,.landscape-tool-picker,.sessionbar,.mobile-tabs,.landscape-tabs');
   const covered=blocked&&cover&&owner!==cover;
   const exception=e.id==='splitter'?{reason:'9px pointer/keyboard separator; equivalent 44px width buttons',alternative:'#widthLess / #widthMore'}:null;
   rows.push({id,tag:e.tagName,disabled:!!e.disabled,rect:rect(r),status:covered?'covered-by-open-surface':blocked?'blocked-unexpected':'active',under44:r.width<43.99||r.height<43.99,exception});
  }
  const active=rows.filter(x=>x.status==='active');let overlaps=[];let closePairs=[];
  for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
   const a=active[i],b=active[j],dx=Math.max(0,a.rect.x-b.rect.x-b.rect.width,b.rect.x-a.rect.x-a.rect.width),dy=Math.max(0,a.rect.y-b.rect.y-b.rect.height,b.rect.y-a.rect.y-a.rect.height);
   const dist=Math.hypot(dx,dy);if(dist<4)closePairs.push({a:a.id,b:b.id,gap:dist});
   if(dx===0&&dy===0&&Math.min(a.rect.x+a.rect.width,b.rect.x+b.rect.width)>Math.max(a.rect.x,b.rect.x)&&Math.min(a.rect.y+a.rect.height,b.rect.y+b.rect.height)>Math.max(a.rect.y,b.rect.y))overlaps.push({a:a.id,b:b.id});
  }
  return {rows,overlaps,closePairs};
 });
 const failures=result.rows.filter(r=>r.status==='blocked-unexpected'||(r.status==='active'&&r.under44&&!r.exception));
 fs.appendFileSync('test-results/stage3-geometry-details.jsonl',JSON.stringify({label,...result,failures})+'\n');
 cases.push({label,targets:result.rows.length,failures,exceptions:result.rows.filter(r=>r.exception),overlaps:result.overlaps.length,closePairs:result.closePairs.length,clipped:result.rows.filter(r=>r.status==='scroll-clipped').length,outsideUnscrollable:result.rows.filter(r=>r.status==='outside-unscrollable')});return failures;
}
async function sweep(p,label){
 await scan(p,label+'-current');
 // Scroll actual content containers, not the entire drawing surface.
 for(const selector of ['#panels','#layerPage','#library','.floatbody']){
  const el=p.locator(selector).first();if(!await el.isVisible())continue;
  const max=await el.evaluate(e=>e.scrollHeight-e.clientHeight);if(max<1)continue;
  const step=Math.max(60,await el.evaluate(e=>e.clientHeight*.75));
  for(let y=0;y<=max+step;y+=step){await el.evaluate((e,y)=>e.scrollTop=y,Math.min(max,y));await scan(p,label+'-'+selector+'-'+Math.min(max,y));}
 }
}
async function main(){
 await new Promise(r=>server.listen(43902,'127.0.0.1',r));browser=await chromium.launch();fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/stage3-geometry-details.jsonl','');
 const sizes=[[320,568,2],[390,844,1],[740,360,1],[760,360,1],[761,480,1],[800,360,1],[800,600,1],[960,400,1],[960,600,1],[1180,820,1]];
 for(const [w,h,scale] of sizes.filter(s=>!process.env.GEOMETRY_WIDTH||s[0]===+process.env.GEOMETRY_WIDTH)){
  const p=await browser.newPage({viewport:{width:w,height:h},hasTouch:true});p.setDefaultTimeout(2500);p.setDefaultNavigationTimeout(30000);
  await p.goto('http://127.0.0.1:43902/');if(scale===2)await p.evaluate(()=>document.documentElement.style.fontSize='175%');
  await sweep(p,w+'-initial');await p.locator('#search').click();await sweep(p,w+'-library');await p.locator('#libraryClose').click();
  if(!await p.locator('#panels').isVisible())await p.locator('#workspaceToggle').click();
  await p.locator('#panels details.box').evaluateAll(es=>es.forEach(e=>e.open=true));await sweep(p,w+'-all-Workspace-sections');
  await p.locator('#focus').click();await p.locator('#quickTrigger').click();await sweep(p,w+'-focus-Quick');await p.locator('#quickClose').click();
  await p.locator('#workspaceToggle').click();await sweep(p,w+'-focus-Workspace');
  await p.screenshot({path:'test-results/stage3-geometry-'+w+'.png'});
  await p.close();console.log(JSON.stringify({width:w,cases:cases.length,failures:cases.reduce((n,c)=>n+c.failures.length,0),examples:cases.flatMap(c=>c.failures.map(r=>({label:c.label,...r}))).slice(0,20)}));
 }
 // All details and generated candidate fields under the two most constrained layouts.
 for(const [w,h] of (process.env.GEOMETRY_STATIC_ONLY?[]:[[320,568],[740,360]])){
  const p=await browser.newPage({viewport:{width:w,height:h},hasTouch:true});await p.goto('http://127.0.0.1:43902/');
  for(const f of R.features){
   await p.evaluate(id=>{location.hash=id},f.id);
   await p.locator('[data-reached="'+f.id+'"]').waitFor();
   const start=p.locator('[data-start="'+f.id+'"]');
   if(await start.count()){
    await start.click();
    if(await p.locator('[data-conflict="cancel"]').isVisible())await p.locator('[data-conflict="cancel"]').click();
   }
   await sweep(p,w+'-'+f.id);
   if(await p.locator('#sessionCancel').isVisible())await p.locator('#sessionCancel').click();
   sequence++;
  }
  await p.close();
 }
 const failures=cases.flatMap(c=>c.failures.map(r=>({label:c.label,...r}))),result={kind:'DOM geometry, not real finger or normative conformance',goalCSSPx:44,scenarioSnapshots:cases.length,featureLayouts:sequence,targets:cases.reduce((n,c)=>n+c.targets,0),failures,detailsFile:'stage3-geometry-details.jsonl',exceptions:cases.flatMap(c=>c.exceptions.map(r=>({label:c.label,...r}))),cases};
 fs.writeFileSync('test-results/stage3-geometry.json',JSON.stringify(result,null,2));console.log(JSON.stringify({snapshots:cases.length,featureLayouts:sequence,failures:failures.length,examples:failures.slice(0,12)}));assert.equal(failures.length,0,'touch geometry defects remain');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();server.close()});
