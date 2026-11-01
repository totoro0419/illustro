'use strict';
// Whole-viewport control-target survey, not a physical mis-tap study.
// Not a WCAG conformance certificate: 44px is the Stage③ design goal.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs');
const html=fs.readFileSync(__dirname+'/index.html');
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(html);});
const data=[];let browser;
async function inspect(p,label){
 const evidence=await p.evaluate(()=>{
  const frame=document.querySelector('#frame').getBoundingClientRect();
  const coarse=matchMedia('(any-pointer:coarse)').matches;
  function intersection(a,b){return {left:Math.max(a.left,b.left),top:Math.max(a.top,b.top),right:Math.min(a.right,b.right),bottom:Math.min(a.bottom,b.bottom)};}
  function area(r){return Math.max(0,r.right-r.left)*Math.max(0,r.bottom-r.top)}
  const controls=[...document.querySelectorAll('button,summary,[role="button"],input[type="range"],input[type="color"],select')];
  const rows=controls.map((el,i)=>{
   const r=el.getBoundingClientRect(),st=getComputedStyle(el),x=r.left+r.width/2,y=r.top+r.height/2;
   if(st.display==='none'||st.visibility==='hidden'||!area(r)||el.disabled)return null;
   let clipped=intersection(r,frame);
   for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){
    const cs=getComputedStyle(a);
    if(['hidden','auto','scroll','clip'].some(v=>[cs.overflowX,cs.overflowY].includes(v)))
      clipped=intersection(clipped,a.getBoundingClientRect());
   }
   if(area(clipped)/area(r)<.75)return null; // scrolled-out controls are not tappable until scrolled
   const hit=document.elementFromPoint(x,y),blocked=!(hit===el||el.contains(hit));
   const owner=el.closest('.float,.dock,.landscape-tool-picker,.sessionbar');
   const cover=hit?.closest('.float,.dock,.landscape-tool-picker,.sessionbar');
   const intentionalCover=blocked&&!!cover&&cover!==owner;
   return {selector:el.id?'#'+el.id:el.outerHTML.slice(0,90),index:i,width:Math.round(r.width*10)/10,height:Math.round(r.height*10)/10,
    centerHit:!blocked,intentionalCover,blockedUnexpected:blocked&&!intentionalCover,
    ancestor:el.closest('.topbar,.rail,.dock,.float,.sessionbar,.mobile-tabs,.landscape-tabs,.landscape-tool-picker,.viewbar,.contextbar')?.className||'surface'};
  }).filter(Boolean);
  return {coarse,rows};
 });
 const result=evidence.rows;
 const small=result.filter(x=>x.width<44||x.height<44);
 const blocked=result.filter(x=>x.blockedUnexpected);
 const covered=result.filter(x=>x.intentionalCover);
 const out={label,coarse:evidence.coarse,targets:result.length,under44:small.length,blockedUnexpected:blocked.length,intentionallyCovered:covered.length,
  under44ByRegion:Object.fromEntries([...new Set(small.map(x=>x.ancestor))].map(k=>[k,small.filter(x=>x.ancestor===k).length])),
  samplesSmall:small.slice(0,40),samplesBlocked:blocked.slice(0,25)};

 data.push(out);console.log(JSON.stringify({label,coarse:out.coarse,targets:out.targets,under44:out.under44,blockedUnexpected:out.blockedUnexpected,intentionallyCovered:out.intentionallyCovered,regions:out.under44ByRegion,small:out.samplesSmall.map(x=>({name:x.selector.slice(0,55),w:x.width,h:x.height}))}));
}
async function main(){
 await new Promise(resolve=>server.listen(43898,'127.0.0.1',resolve));browser=await chromium.launch();
 const checks=[
  ['narrow-320-200pct',320,568,2],
  ['portrait-390',390,844,1],
  ['landscape-740',740,360,1],
  ['tablet-middle-800',800,600,1],
  ['desktop-1180',1180,820,1]
 ];
 for(const [name,w,h,scale] of checks){
  const p=await browser.newPage({viewport:{width:w,height:h},hasTouch:true,isMobile:true});
  await p.goto('http://127.0.0.1:43898/');
  if(scale!==1)await p.evaluate(x=>{document.documentElement.style.fontSize=(87.5*x)+'%';},scale);
  await inspect(p,name+'-default');
  await p.locator('#search').click();await inspect(p,name+'-search');await p.locator('#libraryClose').click();
  if(w===740){
   await p.locator('#landscapeTabs [data-landscape-tools]').click();await inspect(p,name+'-tools');await p.locator('#landscapeToolPicker [data-tool="transform"]').click();
  }else await p.locator('#tools [data-tool="transform"]').click();
  await inspect(p,name+'-session');
  await p.locator('#sessionCancel').click();
  if(w===740)await p.locator('#landscapeTabs [data-open-panel="layers"]').click();
  else if(w<=760)await p.locator('#mobileTabs [data-open-panel="layers"]').click();
  await inspect(p,name+'-layers');
  await p.close();
 }
 fs.mkdirSync('test-results',{recursive:true});
 fs.writeFileSync('test-results/stage3-touch-target-audit.json',JSON.stringify({kind:'DOM target size + center hit survey, not real finger misuse',goalPx:44,cases:data},null,2));
 console.log(JSON.stringify({scenarios:data.length,totalChecked:data.reduce((n,x)=>n+x.targets,0),
  under44:data.reduce((n,x)=>n+x.under44,0),blockedUnexpected:data.reduce((n,x)=>n+x.blockedUnexpected,0),intentionallyCovered:data.reduce((n,x)=>n+x.intentionallyCovered,0),
  claim:'diagnostic exceptions, not human touch conformance'}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close()});
