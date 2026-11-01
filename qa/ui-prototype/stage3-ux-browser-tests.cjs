'use strict';
/* AUD008/010/016/017/019: DOM model and geometry measurements. Not a human study. */
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html'),measurements=[];
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(html)});
let browser,passed=0;
async function run(name,width,height,touch,fn){
 const p=await browser.newPage({viewport:{width,height},hasTouch:touch});const errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto('http://127.0.0.1:43889/');await fn(p);
  assert.deepEqual(errors,[],name+' JS errors');passed++;console.log('PASS '+name);
 }finally{await p.close();}
}
async function box(p,selector){const r=await p.locator(selector).first().boundingBox();assert(r,selector+' missing rectangle');return r;}
async function assertHit(p,selector){
 const el=await p.locator(selector).first();
 return el.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
 return r.width>0&&r.height>0&&(hit===e||e.contains(hit));});
}
async function main(){
 await new Promise(r=>server.listen(43889,'127.0.0.1',r));browser=await chromium.launch({headless:true});fs.mkdirSync('test-results',{recursive:true});
 await run('AUD008 no-name task chips and Search result',1180,820,false,async p=>{
  await p.locator('#search').click();await p.screenshot({path:'test-results/stage3-ux-task-search.png'});await p.locator('#libraryContent [data-task-query="はみ出さないように塗る"]').click();
  assert.equal(await p.locator('#query').inputValue(),'はみ出さないように塗る');
  assert(await p.locator('#libraryContent [data-feature="LAY-004"]').count()>0);
  await p.locator('#libraryContent [data-feature="LAY-004"]').click();
  assert(await p.locator('[data-reached="LAY-004"]').isVisible());
 });
 await run('AUD008 non-name task to transparent PNG and flip',390,844,true,async p=>{
  await p.locator('#search').click();
  await p.locator('#libraryContent [data-task-query="背景を透明にして保存"]').click();
  assert(await p.locator('#libraryContent [data-feature="IO-002"]').count()>0);
  await p.locator('#query').fill('絵を裏返して確認');
  assert.equal(await p.locator('#libraryContent [data-feature="CAN-003"]').first().count(),1);
 });
 await run('AUD010 actual primary DOM Clip Mask brush entry vs known-ID search',1180,820,false,async p=>{
  const cases=[['#box-layers [data-feature="LAY-004"]','LAY-004'],
   ['#box-layers [data-feature="LAY-005"]','LAY-005'],
   ['#box-brush [data-feature="BRU-008"]','BRU-008']];
  for(const [sel,id] of cases){
   await p.locator(sel).click();
   assert(await p.locator('[data-reached="'+id+'"]').isVisible());
   const primaryActions=1, toStart=await p.locator('[data-start="'+id+'"]').count()?1:0;
   measurements.push({audit:'AUD010',feature:id,start:'visible direct Workspace',toDetail:primaryActions,toStart:primaryActions+toStart});
   await p.locator('[data-detail-close]').last().click();
  }
 });
 await run('failed Apply-and-continue keeps candidate, tool and pending transition until explicit cancel',1180,820,false,async p=>{
  await p.locator('#addLayer').click();await p.locator('#tools [data-tool="transform"]').click();
  await p.locator('#tools [data-tool="brush"]').click(); // queue a tool transition while the target exists
  await p.locator('#fixed [data-undo]').click(); // remove that target while the conflict UI is open
  await p.locator('[data-conflict="apply"]').click();
  assert(await p.locator('#sessionbar').isVisible());
  assert(await p.locator('#context').isVisible(),'failed Apply hid the resolution UI');
  assert.equal(await p.locator('#tools [data-tool="transform"]').getAttribute('aria-pressed'),'true','failed Apply continued into a new tool');
  await p.locator('[data-conflict="cancel"]').click();
  assert.equal(await p.locator('#sessionbar').isVisible(),false);
  assert.equal(await p.locator('#tools [data-tool="brush"]').getAttribute('aria-pressed'),'true');
 });
 await run('AUD016 Pad Ref Manager Undo never occupies document Undo and vice versa',1180,820,false,async p=>{
  await p.locator('#addLayer').click();
  async function editScope(scope,panel){
   if(panel!=='brush')await p.locator('#box-'+panel+'>summary').click();
   const selector='[data-scope-panel="'+scope+'"]';
   await p.locator(selector+' [data-scope-action="edit"]').click();
   assert((await p.locator(selector+' [data-scope-summary]').innerText()).includes('1件'));
  }
  await editScope('test-pad','brush');await editScope('reference','reference');await editScope('document-manager','document');
  for(const [scope,label] of [['test-pad','試筆パッド'],['reference','資料'],['document-manager','作品管理']]){
   assert.equal(await p.locator('[data-scope-panel="'+scope+'"] [data-scope-action="undo"]').innerText(),label+'Undo');
   assert.equal(await p.locator('[data-scope-panel="'+scope+'"] [data-scope-action="redo"]').innerText(),label+'Redo');
  }
  await p.locator('#box-reference [data-scope-action="undo"]').click();
  assert((await p.locator('[data-scope-summary="reference"]').innerText()).includes('0件'));
  assert((await p.locator('[data-scope-summary="test-pad"]').innerText()).includes('1件'));
  await p.locator('#fixed [data-undo]').click();
  assert.equal(await p.locator('#layerRows .layerrow').count(),3);
  assert((await p.locator('[data-scope-summary="document-manager"]').innerText()).includes('1件'));
  await p.locator('#box-reference [data-scope-action="redo"]').click();await p.screenshot({path:'test-results/stage3-ux-named-undo.png'});
  assert((await p.locator('[data-scope-summary="reference"]').innerText()).includes('1件'));
 });
 await run('ibisPaint-informed 740x360: compact bar and transient tools/layers',740,360,true,async p=>{
  assert(await p.locator('#landscapeTabs').isVisible(),'compact landscape bar missing');
  assert.equal(await p.locator('#mobileTabs').isVisible(),false);
  assert.equal(await p.locator('.rail').isVisible(),false);
  assert.equal(await p.locator('#dock').isVisible(),false);
  assert((await box(p,'.stage')).width>=739,'rail still occupies landscape drawing width');
  for(const attr of ['data-landscape-brush-toggle','data-landscape-tools','data-landscape-properties','data-undo','data-redo']){
   assert(await assertHit(p,'#landscapeTabs ['+attr+']'),attr+' missed compact toolbar');
  }
  const before=await p.locator('#currentTool').innerText();
  await p.locator('#landscapeTabs [data-landscape-brush-toggle]').click();
  assert.notEqual(await p.locator('#currentTool').innerText(),before);
  await p.locator('#landscapeTabs [data-landscape-tools]').click();
  assert(await p.locator('#landscapeToolPicker').isVisible());
  await p.screenshot({path:'test-results/stage3-ibis-reference-740-tools.png'});
  await p.locator('#landscapeToolPicker [data-tool="transform"]').click();
  assert.equal(await p.locator('#landscapeToolPicker').isVisible(),false);
  assert(await p.locator('#sessionbar').isVisible());
  assert(await assertHit(p,'#sessionApply'));
  assert(await assertHit(p,'#sessionCancel'));
  measurements.push({audit:'ibis-reference-landscape',viewport:'740x360',stageWidth:(await box(p,'.stage')).width,
   sessionHeight:(await box(p,'#sessionbar')).height,toolbarHeight:(await box(p,'#landscapeTabs')).height});
  await p.locator('#sessionCancel').click();
  await p.locator('#landscapeTabs [data-open-panel="layers"]').click();
  assert(await p.locator('#dock').isVisible());
  assert.equal(await p.locator('.viewbar').isVisible(),false,'covered viewbar must be hidden while layer panel is open');
  assert(await p.locator('#layerRows .layerrow').count()>0);
  const panel=await box(p,'#dock');
  assert(panel.width<400&&panel.x>0,'layer panel is not transient to the right');
  await p.screenshot({path:'test-results/stage3-ibis-reference-740-layers.png'});
  await p.locator('#landscapeTabs [data-open-panel="layers"]').click();
  assert.equal(await p.locator('#dock').isVisible(),false);
  assert(await p.locator('.viewbar').isVisible(),'viewbar must return after closing Workspace');
  await p.locator('#landscapeTabs [data-landscape-properties]').click();
  assert(await p.locator('.contextbar').isVisible());
  await p.locator('#landscapeTabs [data-landscape-properties]').click();
  assert.equal(await p.locator('.contextbar').isVisible(),false);
 });
 await run('ibisPaint-informed 390x844: preserve portrait UI',390,844,true,async p=>{
  assert.equal(await p.locator('#landscapeTabs').isVisible(),false);
  assert(await p.locator('#mobileTabs').isVisible());
  assert(await p.locator('.rail').isVisible());
  await p.locator('#mobileTabs [data-open-panel="layers"]').click();
  assert(await p.locator('#dock').isVisible());
  assert.equal(await p.locator('.viewbar').isVisible(),false);
  await p.locator('#sheetClose').click();
  assert(await p.locator('.viewbar').isVisible());
 });
 for(const width of [740,760,761,800,960,1180]){
  await run('AUD017 stage geometry & workspace entry '+width,width,600,width<=760,async p=>{
   const stage=await box(p,'.stage');if(width===800)await p.screenshot({path:'test-results/stage3-ux-800-workspace.png'});
   const closed=width<=760;
   if(!closed){
    assert(stage.width>=420,'Canvas drawing column under 420px: '+stage.width);
    if(width<=1000){
     await p.locator('#focus').click();
     await p.locator('#quickTrigger').click();
     await p.locator('#quickGrid [data-open-panel="color"]').click();
     const focusedStage=await box(p,'.stage');
     assert(focusedStage.width>=420,'Focus + panel makes canvas too narrow: '+focusedStage.width);
     measurements.push({audit:'AUD017-focus',viewport:width,stageWidth:focusedStage.width});
    }
   }
   else{
    assert(!(await p.locator('#dock').isVisible()),'phone overlay initially blocks canvas');
    await p.locator('#workspaceToggle').click();
    assert(await p.locator('#dock').isVisible());
    await p.locator('#sheetClose').click();
    assert(!(await p.locator('#dock').isVisible()));
   }
   measurements.push({audit:'AUD017',viewport:width,stageWidth:stage.width,stageHeight:stage.height,sheetInitiallyClosed:closed});
  });
 }
 for(const width of [320,390,740,800]){
  await run('AUD019 coarse topbar hit and bounds '+width,width,width===740?360:640,true,async p=>{
   if(width===320){await p.evaluate(()=>document.documentElement.style.fontSize='200%');await p.screenshot({path:'test-results/stage3-ux-320-text200.png'});}
   const metrics=await p.locator('.topbar').evaluate(top=>{
    const frame=document.querySelector('#frame').getBoundingClientRect();
    return [...top.querySelectorAll('button')].filter(el=>el.getClientRects().length)
     .map(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return {id:el.id,w:r.width,h:r.height,x:r.left,right:r.right,hit:hit===el||el.contains(hit),frameRight:frame.right}});
   });
   for(const item of metrics){
    assert(item.w>=44-0.02&&item.h>=44-0.02,item.id+' touch target too small '+item.w+'x'+item.h);
    assert(item.right<=item.frameRight+1,item.id+' beyond right edge '+item.right+'/'+item.frameRight);
    assert(item.hit,item.id+' center covered by other control');
   }
   measurements.push({audit:'AUD019',width,text200:width===320,targets:metrics});
  });
 }
 fs.mkdirSync('test-results',{recursive:true});
 fs.writeFileSync('test-results/stage3-ux-evidence.json',JSON.stringify({passed,measurements,limits:['No human first-use comparison','No physical stylus/hand error rate','DOM viewport metrics only','Not all 247 shortest pathways']},null,2));
 console.log(JSON.stringify({passed,measurements:measurements.length}));
}
main().catch(e=>{console.error('FAIL',e.stack);process.exitCode=1}).finally(async()=>{await browser?.close();server.close();});
