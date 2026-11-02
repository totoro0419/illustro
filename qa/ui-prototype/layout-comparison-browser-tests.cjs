'use strict';
// Same fixed UI task, three actual CSS layouts. Times are automation timings, not human performance.
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),assert=require('assert/strict');
const html=fs.readFileSync(__dirname+'/index.html');const server=http.createServer((q,r)=>r.end(html));let browser;const rows=[];
const variants={
 A:`#frame:not(.focused) .rail{display:flex;bottom:56px;width:52px}#frame:not(.focused) .stage{left:52px;right:0;bottom:56px}#frame:not(.focused) .contextbar{display:flex}#frame:not(.focused) .landscape-tabs{display:none}#frame:not(.focused) .mobile-tabs{display:flex;position:absolute;bottom:0;left:52px;right:0;height:56px;z-index:12;background:white}#frame:not(.focused) .mobile-tabs button{flex:1;min-width:44px;min-height:44px}#frame:not(.focused) .dock{left:52px;right:0;top:auto;bottom:56px;width:auto;height:56%}`,
 B:`#frame:not(.focused) .rail{display:flex;bottom:56px;width:52px}#frame:not(.focused) .stage{left:52px;right:40%;bottom:56px}#frame:not(.focused) .contextbar{display:flex}#frame:not(.focused) .landscape-tabs{display:none}#frame:not(.focused) .mobile-tabs{display:flex;position:absolute;bottom:0;left:52px;right:0;height:56px;z-index:12;background:white}#frame:not(.focused) .mobile-tabs button{flex:1;min-width:44px;min-height:44px}#frame:not(.focused) .dock{display:flex;left:auto;right:0;top:46px;bottom:56px;width:40%;height:auto}`,
 C:''
};
async function geometry(p){return p.evaluate(()=>{
 const s=document.querySelector('#surface').getBoundingClientRect();
 const covers=[...document.querySelectorAll('.dock,.viewbar,.quick-trigger,.float,.landscape-tool-picker')].filter(e=>e.checkVisibility()).map(e=>e.getBoundingClientRect()).map(r=>({x1:Math.max(s.left,r.left),x2:Math.min(s.right,r.right),y1:Math.max(s.top,r.top),y2:Math.min(s.bottom,r.bottom)})).filter(r=>r.x2>r.x1&&r.y2>r.y1);
 const xs=[...new Set(covers.flatMap(r=>[r.x1,r.x2]))].sort((a,b)=>a-b);let blocked=0;
 for(let i=0;i<xs.length-1;i++){
  const x=(xs[i]+xs[i+1])/2,ys=covers.filter(r=>r.x1<=x&&r.x2>=x).map(r=>[r.y1,r.y2]).sort((a,b)=>a[0]-b[0]);let sum=0,lo=null,hi=null;
  for(const [a,b] of ys){if(lo===null){lo=a;hi=b;}else if(a<=hi)hi=Math.max(hi,b);else{sum+=hi-lo;lo=a;hi=b;}}if(lo!==null)sum+=hi-lo;blocked+=(xs[i+1]-xs[i])*sum;
 }
 return {surfaceWidth:s.width,surfaceHeight:s.height,surfaceArea:s.width*s.height,occludedArea:blocked,occlusionFraction:blocked/(s.width*s.height),availableArea:s.width*s.height-blocked};
});}
async function main(){await new Promise(r=>server.listen(43904,'127.0.0.1',r));browser=await chromium.launch();fs.mkdirSync('test-results',{recursive:true});
 for(const [width,height] of [[740,360],[760,360],[761,360],[800,400],[960,400],[800,600],[960,600],[1180,800]]){
 for(const [variant,css] of Object.entries(variants)){
  const p=await browser.newPage({viewport:{width,height},hasTouch:true});p.setDefaultTimeout(5000);await p.goto('http://127.0.0.1:43904/');console.log(JSON.stringify({checking:variant,width,height}));if(css)await p.addStyleTag({content:css+(variant==='B'?'#frame:not(.focused) .dock:not(.sheet-open){display:flex}':'')});
  let clicks=0,panelCommands=0;const stages=[];
  const click=async s=>{await p.locator(s).first().click();clicks++;if(/data-open-panel|sheetClose|workspaceToggle/.test(s))panelCommands++;};
  const tool=async t=>{if(await p.locator('#tools [data-tool="'+t+'"]').getAttribute('aria-pressed')==='true')return;if(await p.locator('#landscapeTabs').isVisible()){await click('#landscapeTabs [data-landscape-tools]');await click('#landscapeToolPicker [data-tool="'+t+'"]');}else await click('#tools [data-tool="'+t+'"]');};
  const closePanel=async()=>{if(variant==='B')return;if(await p.locator('#dock').isVisible())await click(await p.locator('#sheetClose').isVisible()?'#sheetClose':'#workspaceToggle');};
  const openPanel=async panel=>{const tabs=await p.locator('#landscapeTabs').isVisible()?'#landscapeTabs':await p.locator('#mobileTabs').isVisible()?'#mobileTabs':null;if(tabs)await click(tabs+' [data-open-panel="'+panel+'"]');else {await click('#quickTrigger');await click('#quickGrid [data-open-panel="'+panel+'"]');}};
  stages.push({step:'idle',...await geometry(p)});
  await tool('brush');await openPanel('color');await click('#swatches button');stages.push({step:'color',...await geometry(p)});await closePanel();
  await openPanel('layers');await click(await p.locator('#layerPage [data-add-layer]').isVisible()?'#layerPage [data-add-layer]':'#addLayer');stages.push({step:'layers',...await geometry(p)});await closePanel();
  await tool('smudge');stages.push({step:'mix-ready',...await geometry(p)});
  await tool('transform');assert(await p.locator('#sessionbar').isVisible());
  stages.push({step:'candidate',...await geometry(p)});
  await p.screenshot({path:'test-results/stage3-layout-'+variant+'-'+width+'x'+height+'.png'});const cancelHittable=await p.locator('#sessionCancel').evaluate(e=>{const r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===e||e.contains(h)});
  if(cancelHittable){await click('#sessionCancel');await closePanel();}
  else assert.notEqual(variant,'C','current responsive design occludes candidate Cancel');
  rows.push({variant,taskCompleted:cancelHittable,candidateControlCollision:!cancelHittable,clickCountKind:cancelHittable?'complete-task':'partial-until-occluded-cancel',viewport:{width,height},task:'brush → color adoption → new layer → smudge → transform → cancel',clicks,panelCommands,stages,minimumAvailableArea:Math.min(...stages.map(x=>x.availableArea)),meanAvailableArea:stages.reduce((n,s)=>n+s.availableArea,0)/stages.length,realUser:false});await p.close();
 }
 }
 const c=rows.find(x=>x.variant==='C');assert(c.stages.find(x=>x.step==='idle').surfaceWidth>=739);
 const result={kind:'same scripted task and exact rectangle-union measurement',viewports:[...new Set(rows.map(r=>r.viewport.width+'x'+r.viewport.height))],rows,decision:'C selected for full idle width and accessible candidate controls. A/B may fail the task at intermediate widths; partial click totals are not speed wins. No human preference claim',humanTiming:'NOT_RUN',fingerErrors:'NOT_RUN'};
 fs.writeFileSync('test-results/stage3-layout-comparison.json',JSON.stringify(result,null,2));console.log(JSON.stringify(rows.map(({variant,viewport,taskCompleted,candidateControlCollision,clicks,panelCommands,minimumAvailableArea,meanAvailableArea})=>({variant,viewport,taskCompleted,candidateControlCollision,clicks,panelCommands,minimumAvailableArea,meanAvailableArea}))));
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();server.close()});
