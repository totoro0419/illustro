'use strict';
// Whole-viewport control-target survey, not a physical mis-tap study.
// Not a WCAG conformance certificate: 44px is the Stage③ design goal.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs');
const html=fs.readFileSync(__dirname+'/index.html');
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(html);});
const data=[];let browser;
async function inspect(p,label){
 const result=await p.evaluate(()=>{
  const frame=document.querySelector('#frame').getBoundingClientRect();
  const targets=[...document.querySelectorAll('button,summary,[role="button"],input[type="range"],input[type="color"],select')];
  return targets.map((el,i)=>{
   const r=el.getBoundingClientRect(),st=getComputedStyle(el),x=r.left+r.width/2,y=r.top+r.height/2;
   const hit=document.elementFromPoint(x,y),visible=st.display!=='none'&&st.visibility!=='hidden'&&r.width>0&&r.height>0;
   const viewportIntersection=Math.max(0,Math.min(r.right,frame.right)-Math.max(r.left,frame.left))*Math.max(0,Math.min(r.bottom,frame.bottom)-Math.max(r.top,frame.top));
   const fraction=viewportIntersection/(r.width*r.height||1);
   return {selector:el.id?'#'+el.id:el.outerHTML.slice(0,100),index:i,width:Math.round(r.width*10)/10,height:Math.round(r.height*10)/10,
    centerHit:hit===el||el.contains(hit),inFrame:fraction,visible,disabled:el.disabled||false,
    ancestor:el.closest('.topbar,.rail,.dock,.float,.sessionbar,.mobile-tabs,.landscape-tabs,.landscape-tool-picker,.viewbar,.contextbar')?.className||'surface'};
  }).filter(x=>x.visible&&x.inFrame>.75&&!x.disabled);
 });
 const small=result.filter(x=>x.width<44||x.height<44);
 const blocked=result.filter(x=>!x.centerHit);
 const out={label,targets:result.length,under44:small.length,blocked:blocked.length,
  under44ByRegion:Object.fromEntries([...new Set(small.map(x=>x.ancestor))].map(k=>[k,small.filter(x=>x.ancestor===k).length])),
  samplesSmall:small.slice(0,40),samplesBlocked:blocked.slice(0,25)};
 data.push(out);console.log(JSON.stringify({label,targets:out.targets,under44:out.under44,blocked:out.blocked,regions:out.under44ByRegion}));
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
  const p=await browser.newPage({viewport:{width:w,height:h},hasTouch:true});
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
  under44:data.reduce((n,x)=>n+x.under44,0),blocked:data.reduce((n,x)=>n+x.blocked,0),
  claim:'diagnostic exceptions, not human touch conformance'}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close()});
