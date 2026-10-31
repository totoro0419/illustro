'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const results=[],metrics=[];let browser;
const html=fs.readFileSync(process.env.PROTOTYPE_HTML||path.join(__dirname,'index.html'));
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(html);});
const mode=process.env.BASELINE?'before':'after';
async function run(name,fn,size=[1180,820],touch=false){
 const context=await browser.newContext({viewport:{width:size[0],height:size[1]},hasTouch:touch});const p=await context.newPage();p.setDefaultTimeout(process.env.BASELINE?2500:6000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{await p.goto('http://127.0.0.1:43880/');await fn(p,context);assert.deepEqual(errors,[]);results.push({name,status:'pass'});}
 catch(e){results.push({name,status:'fail',error:String(e.message).slice(0,500)});}
 finally{await context.close();}
 console.log(results.at(-1));
}
async function hit(p,sel){return p.locator(sel).first().evaluate(el=>{const r=el.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>0&&r.height>0&&(h===el||el.contains(h));});}
async function search(p,id){await p.locator('#search').click();await p.locator('#query').fill(id);await p.locator('#libraryContent [data-feature="'+id+'"]').click();}
async function draw(p){const r=await p.locator('#art').boundingBox();await p.mouse.move(r.x+r.width*.3,r.y+r.height*.3);await p.mouse.down();await p.mouse.move(r.x+r.width*.45,r.y+r.height*.45);await p.mouse.up();}
async function main(){
 await new Promise(r=>server.listen(43880,'127.0.0.1',r));browser=await chromium.launch({headless:true});
 for(const origin of ['fixed','quick','search','context','key'])await run('AUD-001/003 '+origin+' Undo is document action with Session',async p=>{
  await p.locator('#addLayer').click();await p.locator('#tools [data-tool="transform"]').click();
  if(origin==='fixed')await p.locator('#fixed [data-undo]').click();
  if(origin==='quick'){await p.locator('#quickTrigger').click();await p.locator('#quickGrid [data-undo]').click();}
  if(origin==='search'||origin==='context'){
   if(origin==='search')await search(p,'HIS-001');
   else{await p.locator('#contextButton').click();await p.locator('#contextActions [data-feature="HIS-001"]').click();}
   await p.locator('[data-start="HIS-001"]').click();await p.locator('#fields-HIS-001 [data-undo]').click();
  }
  if(origin==='key')await p.keyboard.press('Control+z');
  assert.equal(await p.locator('#layerRows .layerrow').count(),3);assert(await p.locator('#sessionbar').isVisible());
 });
 await run('AUD-002 layer state save reload across independent changes',async p=>{
  await p.locator('#addLayer').click();await p.locator('#layerRows .eye').first().click();await p.locator('#save').click();
  await p.waitForFunction(()=>document.querySelector('#saveStatus').textContent.includes('保存済み'));
  await p.locator('#fixed [data-undo]').click();await p.locator('#reviewToggle').click();await p.locator('#reloadMock').click();
  assert.equal(await p.locator('#layerRows .layerrow').count(),4);assert.equal(await p.locator('#layerRows .eye').first().getAttribute('aria-pressed'),'false');
 });
 await run('Scenario 1 new mock document and first stroke',async p=>{
  await p.locator('#home').click();await p.locator('#newDocument').click();await p.locator('[data-start="CAN-001"]').click();await p.locator('[data-new-mock]').click();
  assert.equal(await p.locator('#layerRows .layerrow').count(),1);await draw(p);assert.equal(await p.locator('#demoStrokes path').count(),1);
 });
 await run('Scenario 2 layers rough line color with visibility Undo',async p=>{
  await draw(p);await p.locator('#layerRows [data-eye="layer-1"]').click();assert.equal(await p.locator('#demoStrokes path').count(),0);
  await p.locator('#layerRows [data-layer="layer-2"]').click();await p.locator('#fixed [data-undo]').click();assert.equal(await p.locator('#demoStrokes path').count(),1);
 });
 await run('Scenario 3 continuous brush color size and HSV consistency',async p=>{
  await p.locator('#currentColor').click();await p.locator('#hue').fill('0');await p.locator('.color-plane').click({position:{x:240,y:5}});
  const rgb=await p.locator('#colorPicker').inputValue();assert(Number.parseInt(rgb.slice(1,3),16)>Number.parseInt(rgb.slice(3,5),16));
  await p.locator('#brushSize').fill('30');await p.locator('#currentTool').click();assert(await p.locator('[data-reached="BRU-001"]').isVisible());
 });
 await run('Scenario 4 reference fill candidate flow (no raster claim)',async p=>{
  await search(p,'FIL-003');await p.locator('[data-start="FIL-003"]').click();await p.locator('[data-value]').first().fill('線画を参照／色へ塗る');
  await p.locator('#sessionApply').click();await p.locator('#tools [data-tool="fill"]').click();assert(await p.locator('[data-reached="FIL-001"]').isVisible());
 });
 await run('Scenario 5 transform local Undo and reedit preserves independent layer',async p=>{
  await p.locator('#tools [data-tool="transform"]').click();await p.locator('[data-value]').first().fill('20');
  await p.locator('#target').click();await p.locator('#layerRows [data-layer="layer-2"]').click();await p.locator('#tools [data-tool="brush"]').click();await draw(p);
  await p.locator('#sessionUndo').click();assert.equal(await p.locator('#demoStrokes path').count(),1);await p.locator('#sessionCancel').click();assert.equal(await p.locator('#demoStrokes path').count(),1);
 });
 await run('Scenario 6 effect candidate apply and artwork Undo',async p=>{
  await search(p,'FX-001');await p.locator('[data-start="FX-001"]').click();await p.locator('[data-value]').first().fill('比較');
  await p.locator('#sessionApply').click();assert(await p.locator('#fixed [data-undo]').isEnabled());await p.locator('#fixed [data-undo]').click();assert(await p.locator('#fixed [data-redo]').isEnabled());
 });
 await run('Scenario 8 export choices and truthful feedback',async p=>{
  await p.locator('#export').click();await p.locator('[data-start="IO-002"]').click();await p.locator('[aria-label="出力形式"]').selectOption('WebP');await p.locator('[data-export-mock]').click();assert((await p.locator('#toast').textContent()).includes('生成していません'));
 });
 await run('AUD-009 detail Escape returns focus to search origin',async p=>{
  await search(p,'COL-001');await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>document.activeElement.dataset.feature),'COL-001');
 });
 await run('AUD-012 status-only updates preserve existing stroke DOM',async p=>{
  await draw(p);await p.evaluate(()=>{window.savedStroke=document.querySelector('#demoStrokes path');window.strokeMutations=0;new MutationObserver(m=>window.strokeMutations+=m.length).observe(document.querySelector('#demoStrokes'),{childList:true});});
  for(let i=0;i<5;i++){await p.locator('#quickTrigger').click();await p.locator('#quickClose').click();}
  assert(await p.evaluate(()=>window.savedStroke===document.querySelector('#demoStrokes path')&&window.strokeMutations===0));
 });
 for(const size of [[320,568],[390,844],[740,360],[760,600],[800,600],[960,700],[1180,820],[820,1180]])await run('AUD-004/007/017 responsive '+size.join('x'),async p=>{
  await p.locator('#focus').click();await p.locator('#quickTrigger').click();await p.locator('#quickGrid [data-open-panel="color"]').click();assert(await p.locator('#dock').isVisible());
  await p.locator('#workspaceToggle').click();assert.equal(await p.locator('#dock').isVisible(),false);
  await p.locator('#focus').click();await p.locator('#tools [data-tool="transform"]').click();assert(await hit(p,'#sessionApply'));assert(await hit(p,'#sessionCancel'));
  const m=await p.evaluate(()=>{const f=document.querySelector('#frame').getBoundingClientRect(),s=document.querySelector('#surface').getBoundingClientRect(),d=document.querySelector('#dock').getBoundingClientRect();return {width:f.width,height:f.height,canvasWidth:s.width,canvasHeight:s.height,dockWidth:d.width};});metrics.push(m);
  assert(m.canvasWidth>0&&m.canvasHeight>0);
  if(size[0]===800)assert(m.canvasWidth>=470);
 },size,true);
 await run('AUD-011 two-touch centroid reprojection after flip and rotation',async(p,c)=>{
  await p.locator('#fixed [data-flip="H"]').click();await p.locator('#rotateView').click();const r=await p.locator('#surface').boundingBox(),x=r.x+r.width*.6,y=r.y+r.height*.5;
  const point=await p.evaluate(({x,y})=>{const p=new DOMPoint(x,y).matrixTransform(document.querySelector('#art svg').getScreenCTM().inverse());return {x:p.x,y:p.y};},{x,y});
  const cdp=await c.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-15,y},{x:x+15,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-30,y},{x:x+30,y}]});
  const projected=await p.evaluate(point=>{const p=new DOMPoint(point.x,point.y).matrixTransform(document.querySelector('#art svg').getScreenCTM());return {x:p.x,y:p.y};},point);
  assert(Math.hypot(projected.x-x,projected.y-y)<1);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 },[1180,820],true);
 const fail=results.filter(r=>r.status==='fail');fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/browser-'+mode+'.json',JSON.stringify({mode,results,metrics,real_device:false,physical_pen:false,gpu:false},null,2));
 if(!process.env.BASELINE&&fail.length)process.exitCode=1;
 if(process.env.BASELINE&&!fail.length)throw Error('Baseline did not expose any failures');
 console.log(JSON.stringify({mode,pass:results.length-fail.length,fail:fail.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
