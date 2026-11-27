import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const {PNG}=require(process.env.PREP_PNG_PATH??'pngjs');
const base=(process.env.R2_AUDIT_FIX_URL??'http://127.0.0.1:4173/').replace(/\/$/,'')+'/';
const id=process.argv[2],expected=process.env.EXPECTED_COMMIT_SHA;
if(!process.env.R2_AUDIT_FIX_URL || (new URL(base).hostname!=='127.0.0.1' && base!=='https://totoro0419.github.io/illustro/r2-audit-fixes-round5/')) throw Error('Isolated round 5 audit URL required');
const browser=await chromium.launch({headless:true,...(process.env.R2_CHROME_CHANNEL?{channel:process.env.R2_CHROME_CHANNEL}:{}),args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:true});
let page=await context.newPage(),canvas=page.locator('#canvas');
const log=x=>console.log('PASS '+id+' '+x);
const idle=()=>page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.historyBusy==='false',undefined,{timeout:60000});
const revision=()=>canvas.getAttribute('data-revision-id');
const waitRev=async(old,equal=false)=>{await page.waitForFunction(({old,equal})=> (document.querySelector('#canvas')?.dataset.revisionId===old)===equal,{old,equal},{timeout:60000});await idle();};
async function coords(x,y){const b=await canvas.boundingBox(),v=JSON.parse(await canvas.getAttribute('data-view'));assert.ok(b&&v.zoom>0);assert.equal(v.rotation,0);return [b.x+v.cssWidth/2+v.panX+(x-v.documentWidth/2)*v.zoom,b.y+v.cssHeight/2+v.panY+(y-v.documentHeight/2)*v.zoom];}
async function stroke(points){await page.mouse.move(...await coords(...points[0]));await page.mouse.down();for(const p of points.slice(1))await page.mouse.move(...await coords(...p),{steps:18});await page.mouse.up();}
async function pen(size){const value=await page.locator('#brush option').evaluateAll(opts=>opts.find(o=>o.value==='foundation-technical')?.value);assert.ok(value,'Millipen missing');await page.locator('#brush').selectOption(value,{force:true});await page.locator('#sizeNumber').fill(String(size));await page.locator('#sizeNumber').press('Enter');assert.equal(Number(await page.locator('#sizeNumber').inputValue()),size);}
const strokes=n=>page.waitForFunction(n=>Number(document.querySelector('#canvas')?.dataset.committedStrokes)===n&&document.querySelector('#canvas')?.dataset.historyBusy==='false',n,{timeout:60000});
async function image(){await page.mouse.move(3,3);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const box=await canvas.boundingBox(),view=JSON.parse(await canvas.getAttribute('data-view'));return {png:PNG.sync.read(await canvas.screenshot()),box,view};}
async function pixel(im,x,y){const {png,box:b,view:v}=im;const px=Math.round((v.cssWidth/2+v.panX+(x-v.documentWidth/2)*v.zoom)*png.width/b.width),py=Math.round((v.cssHeight/2+v.panY+(y-v.documentHeight/2)*v.zoom)*png.height/b.height);assert.ok(px>=0&&px<png.width&&py>=0&&py<png.height,'sample outside canvas');const i=(py*png.width+px)*4;return Array.from(png.data.subarray(i,i+4));}
const brightness=p=>p[0]+p[1]+p[2];
async function samples(im,pts){return Promise.all(pts.map(p=>pixel(im,...p)));}
async function history(before,after,points,oldColors,newColors){
 await page.waitForFunction(()=>!document.querySelector('#undo')?.disabled&&document.querySelector('#canvas')?.dataset.historyBusy==='false');
 await page.locator('#undo').evaluate(e=>e.click());await waitRev(before,true);
 assert.deepEqual(await samples(await image(),points),oldColors,'Undo did not restore pixels');
 await page.waitForFunction(()=>!document.querySelector('#redo')?.disabled&&document.querySelector('#canvas')?.dataset.historyBusy==='false');
 await page.locator('#redo').evaluate(e=>e.click());await waitRev(after,true);
 assert.deepEqual(await samples(await image(),points),newColors,'Redo did not restore pixels');
 log('UNDO-REDO-PIXELS');
}
async function fresh(){
 await page.goto(base+'?backend=webgl2&r2-defect='+id,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#ihStart').click();
 const setup=page.locator('#ihCanvasSetup');if(!await setup.evaluate(e=>e.open))await setup.locator(':scope > summary').click();
 await page.locator('#ihNewWidth').fill('512');await page.locator('#ihNewHeight').fill('384');
 await page.locator('#ihNewBackground').selectOption('transparent',{force:true});
 await page.locator('#ihNewCreate').click();
 await page.waitForFunction(()=>!document.querySelector('#brush')?.disabled&&document.querySelector('#canvas')?.dataset.documentWidth==='512',undefined,{timeout:60000});
}

import {readFile,stat,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const temp=await mkdtemp(join(tmpdir(),'illustro-r2-'));
const button=(parent,name)=>parent.getByRole('button',{name,exact:true});
async function findCommand(query,name){
  if(await page.locator('#allFeaturesPanel').isVisible())await page.locator('#featuresClose').click();
  await page.locator('#allFeatures').click();
  await page.locator('#commandSearchOpen').click();
  const dialog=page.locator('#commandSearchDialog');
  await dialog.locator('input[type=search]').fill(query);
  await dialog.locator('.c04-command-run').filter({hasText:name}).first().click();
  await dialog.waitFor({state:'hidden'});
}
async function openMacros(){
  await page.locator('#allFeatures').click();
  await page.locator('[data-category="history-automation"]').click();
  await page.getByRole('button',{name:'操作セットを記録・再生',exact:true}).click();
  const root=page.locator('.c04-simple-macros');
  await root.waitFor({state:'visible'});
  assert.equal(await root.evaluate(e=>e.open),true);
  await button(root,'操作の記録を開始').waitFor({state:'visible'});
  return root;
}
async function newContext(){
  await context.close();
  context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:true});
  await context.addInitScript(()=>{Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true});});
  page=await context.newPage();canvas=page.locator('#canvas');
  await page.goto(base+'?backend=webgl2&r2-round2='+id+'#home',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#ihStart').waitFor({timeout:60000});
}
async function saveCopy(name){
  await page.evaluate(()=>Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true}));
  const downloaded=page.waitForEvent('download',{timeout:120000});
  await page.locator('#saveCopy').evaluate(e=>e.click());
  const download=await downloaded,path=join(temp,name+'.illustro');
  await download.saveAs(path);assert.equal(await download.failure(),null);
  console.log('SAVED',name,(await stat(path)).size);
  return path;
}
async function readNativeManifest(path){
  const b=await readFile(path);
  return JSON.parse(b.subarray(24,24+b.readUInt32LE(16)).toString('utf8'));
}
async function openFile(path,width){
  await newContext();
  await page.locator('#openFile').setInputFiles(path);
  await page.waitForFunction(w=>document.querySelector('#canvas')?.dataset.documentWidth===String(w)&&!document.querySelector('#brush')?.disabled&&document.querySelector('#status')?.textContent?.includes('作品ファイルを開きました'),width,{timeout:120000});
  await idle();
  // The selection is restored on open; hide its blue presentation overlay
  // before comparing actual artwork pixels, without clearing the selection.
  const boundary=page.getByRole('checkbox',{name:'選択の境界を表示する（隠しても選択は有効）',exact:true,includeHidden:true});
  if(await boundary.count())await boundary.evaluate(e=>{if(e.checked){e.checked=false;e.dispatchEvent(new Event('change',{bubbles:true}));}});
}
import {mkdir,writeFile} from 'node:fs/promises';
const evidence=process.env.R2_CASE_DIR;
const fixture=process.env.R2_FIXTURE_DIR;
if(!evidence||!fixture)throw Error('Set evidence and fixture directory');
await mkdir(evidence,{recursive:true});
const checks=[];
function eq(name,actual,expected){checks.push({name,actual,expected});if(JSON.stringify(actual)!==JSON.stringify(expected)){const error=Error(name);error.auditFailure=true;throw error;}}
function yes(name,value){eq(name,!!value,true);}
async function mark(name,fn){await fn();console.log('CHECK '+name);}
async function panel(tool){await page.locator('#'+tool).click();const p=page.locator('[data-tool-panel="'+tool+'"]');await p.waitFor({state:'visible'});if(await p.evaluate(e=>e.tagName==='DETAILS'&&!e.open))await p.locator(':scope > summary').click();return p;}
async function drawLine(points,size=8){await page.locator('#paint').click();await pen(size);const old=await revision();await stroke(points);await waitRev(old);}
async function png(scale=1,scope='artwork',name='output'){
  await page.locator('#fileActionsOpen').click();await page.locator('#exportImage').click();
  const d=page.locator('#exportDialog');await d.waitFor({state:'visible'});
  await d.locator('#exportFormat').selectOption('png',{force:true});
  await d.locator('#exportLayerScope').selectOption(scope,{force:true});
  await d.locator('#exportPixelScale').fill(String(scale));
  const dl=page.waitForEvent('download',{timeout:60000});await d.locator('#exportRun').click();
  const file=join(evidence,name+'.png');await (await dl).saveAs(file);
  if(await d.isVisible())await d.locator('#exportCancel').click();
  return PNG.sync.read(await readFile(file));
}
function rgba(im,x,y){return [...im.data.subarray((y*im.width+x)*4,(y*im.width+x)*4+4)];}
function opaque(im){const a=[];for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(rgba(im,x,y)[3])a.push([x,y,rgba(im,x,y)]);return a;}
function alpha(im,xy){return rgba(im,...xy)[3];}
async function selectLasso(points){const p=await panel('selection');const b=button(p,'投げ縄');if(await b.getAttribute('aria-pressed')!=='true')await b.click();await stroke(points);await p.getByText('選択範囲を更新しました。',{exact:true}).waitFor();const boundary=p.getByRole('checkbox',{name:'選択の境界を表示する（隠しても選択は有効）',exact:true});if(await boundary.isChecked())await boundary.uncheck();return p;}
async function selectRect(a,b){const p=await panel('selection');const btn=button(p,'四角形');if(await btn.getAttribute('aria-pressed')!=='true')await btn.click();await stroke([a,b]);await p.getByText('選択範囲を更新しました。',{exact:true}).waitFor();return p;}
async function clearSelection(){
 const p=await panel('selection'),clear=page.locator('#selectionClear');
 if(await clear.isEnabled()){if(await clear.isVisible())await clear.click();else await clear.evaluate(e=>e.click());}
 await page.locator('#paint').click();await idle();
}
async function resetPage(){await newContext();}
async function openArtwork(id){await page.locator('#ihNavWorks').click();await page.locator('[data-work-id="'+id+'"] .ih-work-preview').click();await page.locator('#ihApp').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(expected=>{const c=document.querySelector('#canvas');return c?.dataset.documentId===expected&&c.dataset.view!=='null'&&!document.querySelector('#brush')?.disabled;},id,{timeout:60000});await idle();}
async function saveIdle(){await page.waitForFunction(()=>document.querySelector('#saveState')?.dataset.autosavePending==='false'&&document.querySelector('#saveState')?.textContent?.includes('保存済み'),undefined,{timeout:60000});}
async function viewMenu(){const b=page.locator('#viewActionsOpen');if(!await page.locator('#viewActions').evaluate(e=>e.matches(':popover-open')))await b.click();}
async function full(){await viewMenu();await page.locator('#c04FullscreenToggle').click();}
async function recordMacro(){let root=await openMacros();await button(root,'操作の記録を開始').click();await stroke([[90,100],[150,100]]);await idle();await button(root,'操作の記録を停止').evaluate(e=>e.click());await root.getByText('記録したブラシの線',{exact:false}).waitFor();await root.getByLabel('操作セットの名前',{exact:true}).fill('QA stroke');await button(root,'保存').click();return root;}
async function choose(select,value){
  if(await select.inputValue()===value)return;
  const label=await select.locator('option[value="'+value+'"]').textContent();
  if(await select.isVisible()){await select.selectOption(value);return;}
  const trigger=select.locator('xpath=following-sibling::button[contains(@class,"workspace-choice")][1]');
  await trigger.click();const list=page.locator('#'+await trigger.getAttribute('aria-controls'));
  const index=await select.locator('option[value="'+value+'"]').evaluate(o=>o.index);
  const item=list.locator('[id="'+await trigger.getAttribute('aria-controls')+'-'+index+'"]');
  assert.equal(await item.textContent(),label);await item.click();
  assert.equal(await select.inputValue(),value);
}
async function openBox(box){
  const body=page.locator('#'+box+'Body'),toggle=page.locator('[aria-controls="'+box+'Body"].box-toggle');
  if(!await body.isVisible()){
    if(!await toggle.isVisible())await page.locator('#workspacePanel').click();
    if(!await toggle.isVisible()){
      await page.locator('#allFeatures').click();await page.locator('#workspaceToggle').click();
    }
    await toggle.waitFor({state:'visible'});await toggle.click();
  }
  await body.waitFor({state:'visible'});return body;
}

async function advancedFill(){
 const p=await panel('smartFill'),advanced=p.getByText('線画の解析・細かい調整',{exact:true});
 if(await advanced.isVisible()&&!await button(p,'線画を解析・更新').isVisible())await advanced.click();
 return p;
}
async function importRaster(path){
 const old=await canvas.getAttribute('data-document-id');
 await page.locator('#openFile').setInputFiles(path);
 const opened=page.waitForFunction(old=>{const c=document.querySelector('#canvas');return !!c?.dataset.documentId&&c.dataset.documentId!==old&&c.dataset.view&&c.dataset.view!=='null'&&!document.querySelector('#brush')?.disabled;},old,{timeout:60000});
 const warning=button(page,'編集用に開く');
 const choice=await Promise.race([opened.then(()=>false),warning.waitFor({state:'visible',timeout:60000}).then(()=>true)]);
 if(choice){await warning.click();await opened;}
 await idle();
}
async function fillState(p,pattern,label){
 const output=p.locator('output').filter({hasText:pattern}).first();
 await output.waitFor({state:'visible',timeout:45000});
 const value=await output.textContent();yes(label,pattern.test(value??''));
}
async function addReference(){
 const root=await openBox('assetsBox');
 await choose(root.locator('select[aria-label="素材の種類"]'),'brush');
 await choose(root.locator('select[aria-label="取り込む素材の種類"]'),'reference');
 await root.locator('input[type=file]').first().setInputFiles(join(fixture,'colors.png'));
 await button(root,'追加した素材を見る').click();
 const entry=root.locator('.c05-asset-entry').filter({hasText:'colors.png'}).first();
 await button(entry,'参考資料として開く').click();
 await page.locator('.c05-reference-frame').first().waitFor();
}

async function shapeRect(x1,y1,x2,y2,lineWidth=8){
 const p=await panel('shapes');await button(p,'新しく作る').click();
 await choose(p.locator('select:has(option[value="rectangle"])'),'rectangle');
 await choose(p.locator('select:has(option[value="vector"])'),'vector');
 await p.getByLabel('内側を塗る',{exact:true}).check();await p.getByLabel('線幅（px）',{exact:true}).fill(String(lineWidth));await p.getByLabel('線幅（px）',{exact:true}).press('Tab');
 for(const [name,value] of [['始点 X',x1],['始点 Y',y1],['終点 X',x2],['終点 Y',y2]])await p.getByLabel(name,{exact:true}).fill(String(value));
 const old=await revision();await button(p,'適用').click();await waitRev(old);
 return await canvas.getAttribute('data-selected-layer-id');
}
async function layerPage(){
 if(!await page.locator('#layerPage').isVisible())await page.locator('#layer').click();
 await page.locator('#layerPageList').waitFor({state:'visible'});
}
async function layerActions(){
 await layerPage();const menu=page.locator('#layerActionsMenu');
 if(!await menu.evaluate(e=>e.matches(':popover-open')))await page.locator('#layerSettingsTrigger').click();
 await menu.waitFor({state:'visible'});assert.equal(await menu.evaluate(e=>e.matches(':popover-open')),true);
 return menu;
}
async function openDocumentSettings(){
 await page.locator('#workspacePanel').click();
 const body=await openBox('documentBox');await body.waitFor({state:'visible'});return body;
}
async function selectLayer(id){
 await layerPage();await page.locator('#layerPageList [data-layer-id="'+id+'"]').click();
 await page.locator('#closeLayerPage').click();
}
function xBounds(im,y0,y1){
 let left=Infinity,right=-Infinity;
 for(let y=y0;y<=y1;y++)for(let x=0;x<im.width;x++)if(alpha(im,[x,y])>127){left=Math.min(left,x);right=Math.max(right,x);}
 return [left,right];
}
const cases={
 'SAV-006':async()=>{
  await fresh();await drawLine([[70,100],[180,100]],12);await saveIdle();
  const initial=await png(1,'artwork','external-original'),firstRevision=await revision();
  // Controlled file-handle adapter: actual native bytes, separate external versions, no real user files.
  await page.evaluate(()=>{
    const entries=new Map(),writes=new Map();let pick=0;
    window.qaSaveFiles=entries;window.qaSaveWrites=writes;
    Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:async()=>{
      const name=++pick===1?'original.illustro':'recovery.illustro';
      return {name,getFile:async()=>{const item=entries.get(name)??{blob:new Blob([]),modified:1};return new File([item.blob],name,{lastModified:item.modified});},
      createWritable:async()=>{let staged=new Blob([]);return {truncate:async n=>{if(n===0)staged=new Blob([]);},write:async data=>{staged=new Blob([data]);},close:async()=>{entries.set(name,{blob:staged,modified:Date.now()});writes.set(name,(writes.get(name)??0)+1);},abort:async()=>{}};}};
    }});
  });
  await findCommand('作品ファイルを保存','作品ファイルを保存');
  await page.waitForFunction(()=>window.qaSaveWrites?.get('original.illustro')===1&&document.querySelector('#status')?.textContent?.includes('保存'));
  await page.waitForFunction(()=>!document.querySelector('#saveState')?.dataset.saving||document.querySelector('#saveState').dataset.saving==='false');
  const originalBytes=await page.evaluate(async()=>[...new Uint8Array(await window.qaSaveFiles.get('original.illustro').blob.arrayBuffer())]);
  const {createHash}=await import('node:crypto');const digest=bytes=>createHash('sha256').update(Buffer.from(bytes)).digest('hex');
  const originalFile=join(evidence,'external-original.illustro');await writeFile(originalFile,Buffer.from(originalBytes));
  // Simulate another application replacing the original with a different valid native document.
  await drawLine([[70,200],[180,200]],12);const externalImage=await png(1,'artwork','external-version');
  await page.evaluate(()=>{window.qaPicker=window.showSaveFilePicker;Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true});});
  const externalNative=await saveCopy('external-valid-version'),externalBytes=[...await readFile(externalNative)];
  await page.evaluate(()=>Object.defineProperty(window,'showSaveFilePicker',{value:window.qaPicker,configurable:true}));
  await page.evaluate(bytes=>{
    window.qaSaveFiles.set('original.illustro',{blob:new Blob([new Uint8Array(bytes)]),modified:Date.now()+1000});
  },externalBytes);
  await drawLine([[270,300],[380,300]],12);const current=await png(1,'artwork','local-version');
  await findCommand('作品ファイルを保存','作品ファイルを保存');
  const d=page.getByRole('dialog',{name:'保存先に別の版があります'});await d.waitFor({timeout:60000});
  yes('external conflict explicitly displayed',await d.isVisible());eq('external conflict prevented overwrite',await page.evaluate(()=>window.qaSaveWrites.get('original.illustro')),1);
  eq('original external bytes retained',digest(await page.evaluate(async()=>[...new Uint8Array(await window.qaSaveFiles.get('original.illustro').blob.arrayBuffer())])),digest(externalBytes));
  await button(d,'版を見比べる').click();await d.locator('figure').nth(1).waitFor({timeout:60000});eq('both actual versions compared',await d.locator('figure').count(),2);
  await button(d,'別名で保存').click();await page.waitForFunction(()=>window.qaSaveWrites?.get('recovery.illustro')===1);
  eq('save copy leaves original external bytes unchanged',digest(await page.evaluate(async()=>[...new Uint8Array(await window.qaSaveFiles.get('original.illustro').blob.arrayBuffer())])),digest(externalBytes));
  yes('current canvas preserved after conflict',current.data.equals((await png(1,'artwork','local-after-conflict')).data));
  // Real concurrent browser tabs sharing one browser storage origin.
  await newContext();await fresh();await drawLine([[70,100],[180,100]],12);await saveIdle();
  const one=page,oneCanvas=canvas,doc=await canvas.getAttribute('data-document-id');
  const two=await context.newPage();page=two;canvas=page.locator('#canvas');
  await page.goto(base+'#home');await openArtwork(doc);await saveIdle();
  await drawLine([[70,200],[180,200]],12);await saveIdle();const newer=await png(1,'artwork','concurrent-newer');
  page=one;canvas=oneCanvas;
  await drawLine([[270,300],[380,300]],12);
  await page.waitForFunction(()=>[...document.querySelectorAll('#status,#saveState,[role=status]')].some(e=>e.textContent?.includes('別の画面で更新されています')),undefined,{timeout:60000});
  yes('stale tab warns instead of overwriting',true);
  const localCopy=await saveCopy('concurrent-local-rescue');yes('stale tab can export recovery copy',(await stat(localCopy)).size>0);
  page=two;canvas=page.locator('#canvas');await page.reload();await openArtwork(doc);
  yes('latest saved version preserved across tab conflict',newer.data.equals((await png(1,'artwork','concurrent-reopen')).data));
  // Browser-native quota override: storage manager enforces the actual limit.
  const cdp=await context.newCDPSession(page);const origin=new URL(base).origin;
  await cdp.send('Storage.overrideQuotaForOrigin',{origin,quotaSize:1});
  try{
    await drawLine([[270,320],[380,320]],12);
    await page.waitForFunction(()=>[...document.querySelectorAll('#status,#saveState,[role=status]')].some(e=>/storage quota|QuotaExceeded|容量不足/i.test(e.textContent??'')),undefined,{timeout:60000});
    yes('actual browser quota limit reported',true);
    const rescue=await saveCopy('quota-rescue');yes('quota failure still permits native rescue',(await stat(rescue)).size>0);
  }finally{await cdp.send('Storage.overrideQuotaForOrigin',{origin});}
  if(await page.locator('#retryWorkSave').isVisible())await page.locator('#retryWorkSave').click();await saveIdle();
  yes('quota removal allows retry and verified autosave',true);
  const recovered=await png(1,'artwork','quota-recovered');yes('failed quota stroke still available',alpha(recovered,[320,320])>127);
  await page.reload();await openArtwork(doc);yes('retry saved all recovered pixels',recovered.data.equals((await png(1,'artwork','quota-reopen')).data));
 },
 'TRN-005':async()=>{
  await fresh();const a=await shapeRect(60,55,120,95),b=await shapeRect(170,125,250,175),c=await shapeRect(340,245,390,305);
  const before=await png(1,'artwork','unaligned');
  const boxes=[[60,55,120,95],[170,125,250,175],[340,245,390,305]];
  const layers=boxes.map(([x0,y0,x1,y1])=>{let pixels=[];for(let y=y0-5;y<=y1+5;y++)for(let x=x0-5;x<=x1+5;x++){let a=alpha(before,[x,y]);if(a)pixels.push([x,y,a]);}return pixels;});
  const bounds=layers.map(p=>({x:Math.min(...p.map(v=>v[0])),y:Math.min(...p.map(v=>v[1])),right:Math.max(...p.map(v=>v[0]))+1,bottom:Math.max(...p.map(v=>v[1]))+1}));
  yes('three distinct x positions',new Set(bounds.map(x=>x.x)).size===3);
  await layerActions();await page.locator('#layerBatchToggle').click();
  for(const id of [a,b,c])await page.locator('#layerPageList [data-layer-id="'+id+'"]').click();
  await page.locator('#closeLayerPage').click();
  for(const mode of ['left','center-x','right','top','center-y','bottom','spread-x','spread-y']){
   const root=await openDocumentSettings(),p=root.getByText('レイヤーの整列・均等配置',{exact:true}).locator('xpath=..');
   if(!await p.evaluate(e=>e.open))await p.locator('summary').click();
   const preview=p.getByLabel('青は移動先、破線は現位置',{exact:true});
   await button(p,'候補を取り消す').click();await button(p,'複数選択したレイヤーを確認').click();
   await page.waitForFunction(()=>{const p=[...document.querySelectorAll('canvas')].find(x=>x.getAttribute('aria-label')==='青は移動先、破線は現位置');return p&&!p.hidden;});
   await p.getByText(/破線は現在の位置、実線は移動先/).waitFor();
   await choose(p.locator('select:has(option[value="left"])'),mode);
   const reference=p.locator('select:has(option[value="'+a+'"])');
   await choose(reference,a);eq(mode+' confirmed reference layer',await reference.inputValue(),a);
   const horizontal=['left','center-x','right','spread-x'].includes(mode),key=horizontal?'x':'y',end=horizontal?'right':'bottom';
   const sizes=bounds.map(v=>v[end]-v[key]),starts=bounds.map(v=>v[key]);
   let shift;
   if(mode.startsWith('spread')){const gap=(bounds[2][end]-starts[0]-sizes.reduce((s,n)=>s+n,0))/2;shift=[0,starts[0]+sizes[0]+gap-starts[1],0];}
   else{const fraction=mode.startsWith('center')?.5:mode==='right'||mode==='bottom'?1:0;shift=starts.map((v,k)=>starts[0]+sizes[0]*fraction-v-sizes[k]*fraction);}
   const expected=new Uint8Array(before.width*before.height);
   for(let k=0;k<layers.length;k++)for(const [x,y,v] of layers[k]){
    const nx=x+(horizontal?Math.round(shift[k]):0),ny=y+(horizontal?0:Math.round(shift[k]));if(nx>=0&&ny>=0&&nx<before.width&&ny<before.height)expected[ny*before.width+nx]=Math.max(expected[ny*before.width+nx],v);
   }
   const old=await revision();await button(p,'この位置に適用').click();await waitRev(old);
   const im=await png(1,'artwork','aligned-'+mode);let interiorErrors=0,edgeDifferences=0;
   for(let k=0;k<expected.length;k++){const actual=im.data[k*4+3],exp=expected[k];if((actual>127)!==(exp>127))interiorErrors++;if(actual!==exp)edgeDifferences++;}
   await writeFile(join(evidence,'arrangement-'+mode+'.json'),JSON.stringify({bounds,shift,interiorErrors,edgeDifferences}));
   eq(mode+' independent binary alpha coverage',interiorErrors,0);
   await page.locator('#undo').evaluate(e=>e.click());await waitRev(old,true);
   yes(mode+' one undo restores all pixels',before.data.equals((await png(1,'artwork','undo-'+mode)).data));
  }
  // Independently measured handle coordinates; each test uses actual canvas drag.
  await newContext();await fresh();await drawLine([[60,100],[120,100]],8);
  const first=await canvas.getAttribute('data-selected-layer-id'),targetBefore=await png(1,'active','snap-source');
  let old=await revision();await layerPage();await page.locator('#addLayerPage').click();await waitRev(old);await page.locator('#closeLayerPage').click();
  await drawLine([[220,200],[300,200]],8);const target=await canvas.getAttribute('data-selected-layer-id');
  await layerActions();await page.locator('#layerBatchToggle').click();for(const id of [first,target])await page.locator('#layerPageList [data-layer-id="'+id+'"]').click();await page.locator('#closeLayerPage').click();
  const t=await panel('transform');await choose(t.locator('select:has(option[value="layer"]):has(option[value="boundary"])'),'layer');if(await button(t,'変形を始める').isEnabled())await button(t,'変形を始める').click();
  const mode=t.locator('select:has(option[value="free"])');await choose(mode,'free');const x=t.getByLabel('左上 X',{exact:true}),y=t.getByLabel('左上 Y',{exact:true});
  async function corner(toX,toY){await x.waitFor({state:'visible'});await stroke([[Number(await x.inputValue()),Number(await y.inputValue())],[toX,toY]]);}
  const guide=t.getByLabel('キャンバスの端・中央',{exact:true});await guide.check();await corner(253,Number(await y.inputValue()));
  eq('canvas center snap exact x',Number(await x.inputValue()),256);await t.getByText(/キャンバスの中央/).filter({visible:true}).last().waitFor();
  await button(t,'次の操作だけ吸着を解除').click();await corner(253,Number(await y.inputValue()));
  yes('temporary bypass keeps unsnapped x',Math.abs(Number(await x.inputValue())-253)<1);await t.getByText('この操作は吸着を解除しました。',{exact:true}).waitFor();
  await corner(253,Number(await y.inputValue())+1);eq('snap resumes automatically next drag',Number(await x.inputValue()),256);
  await guide.uncheck();await t.getByLabel('画素',{exact:true}).check();await corner(244.3,Number(await y.inputValue())+0.4);
  eq('pixel snapping produces integer x',Number(await x.inputValue())%1,0);eq('pixel snapping produces integer y',Number(await y.inputValue())%1,0);
  await t.getByLabel('画素',{exact:true}).uncheck();await t.getByLabel('複数選択した他のレイヤー',{exact:true}).check();
  const pixels=opaque(targetBefore),right=Math.max(...pixels.map(p=>p[0]))+1;
  await corner(right+3,Number(await y.inputValue()));eq('other selected layer right edge snap',Number(await x.inputValue()),right);
  await button(t,'取り消す').click();
  const rulers=await panel('rulers');const rule=page.locator('#guideEnabled');if(!await rule.isVisible())await page.locator('.guide-settings summary').click();await rule.check();
  const t2=await panel('transform');await choose(t2.locator('select:has(option[value="layer"]):has(option[value="boundary"])'),'layer');if(await button(t2,'変形を始める').isEnabled())await button(t2,'変形を始める').click();
  await choose(t2.locator('select:has(option[value="free"])'),'free');
  for(const label of ['画素','キャンバスの端・中央','複数選択した他のレイヤー'])await t2.getByLabel(label,{exact:true}).uncheck();
  await t2.getByLabel('定規の基準位置',{exact:true}).check();await corner(3,Number(await y.inputValue()));eq('ruler reference snap x',Number(await x.inputValue()),0);await t2.getByText(/定規の基準 X/).filter({visible:true}).last().waitFor();
  await button(t2,'取り消す').click();
 },
 'VEC-004':async()=>{
  await fresh();const a=await shapeRect(70,70,250,250,0),b=await shapeRect(170,130,350,310,0);
  const before=await png(1,'artwork','original');
  const points=[[100,100],[200,180],[300,280],[40,40]];
  for(const [mode,expected] of [['union',[true,true,true,false]],['intersection',[false,true,false,false]],['difference',[true,false,false,false]],['xor',[true,false,true,false]]]){
   await selectLayer(a);const root=await openDocumentSettings();
   const p=root.getByText('ベクター線・点の編集',{exact:true}).locator('xpath=..');
   if(!await p.evaluate(e=>e.open))await p.locator('summary').click();
   await button(p,'選んだベクターを編集').click();
   await choose(p.locator('select:has(option[value="'+b+'"])'),b);
   await choose(p.locator('select:has(option[value="'+mode+'"])'),mode);
   await button(p,'2つの形を組み合わせる').click();
   await p.getByText(/元の2レイヤーを同時に隠せます/).waitFor();
   eq(mode+' zero outline width for exact fill oracle',await p.getByLabel('線幅（px）',{exact:true}).inputValue(),'0');
   const old=await revision();await button(p,'作品に反映').click();await waitRev(old);
   const im=await png(1,'artwork',mode);eq(mode+' independent point-in-rectangle coverage',points.map(q=>alpha(im,q)>127),expected);
   let solidErrors=0,edgeErrors=0;
   for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
    const a=x>=70&&x<250&&y>=70&&y<250,b=x>=170&&x<350&&y>=130&&y<310;
    const exp=mode==='union'?a||b:mode==='intersection'?a&&b:mode==='difference'?a&&!b:a!==b;
    if((alpha(im,[x,y])>127)!==exp){
     if([70,250,170,350].some(v=>Math.abs(x-v)<=3)||[70,250,130,310].some(v=>Math.abs(y-v)<=3))edgeErrors++;else solidErrors++;
    }
   }
   await writeFile(join(evidence,'boolean-'+mode+'-oracle.json'),JSON.stringify({solidErrors,edgeErrors}));
   eq(mode+' full-image interior/exterior oracle',solidErrors,0);
   await page.locator('#undo').evaluate(e=>e.click());await waitRev(old,true);
   yes(mode+' undo restores original',before.data.equals((await png(1,'artwork',mode+'-undo')).data));
  }
  const s=await panel('shapes');await button(s,'新しく作る').click();await choose(s.locator('select:has(option[value="polyline"])'),'polyline');await choose(s.locator('select:has(option[value="vector"])'),'vector');
  await s.getByLabel('内側を塗る',{exact:true}).uncheck();await s.getByLabel('線幅（px）',{exact:true}).fill('8');
  await button(s,'キャンバスで形や向きを指定').click();await stroke([[60,350],[110,320],[160,350],[210,320],[260,350]]);
  let old=await revision();await button(s,'適用').click();await waitRev(old);
  const root=await openDocumentSettings(),v=root.getByText('ベクター線・点の編集',{exact:true}).locator('xpath=..');if(!await v.evaluate(e=>e.open))await v.locator('summary').click();
  await button(v,'選んだベクターを編集').click();const point=v.getByLabel('編集する点の番号',{exact:true});
  const initialCount=Number(await point.getAttribute('max')),line=await png(1,'artwork','polyline');yes('polyline has redundant samples',initialCount>5);
  await v.getByLabel('点を減らす許容幅（px）',{exact:true}).fill('2');await button(v,'点を減らす').click();
  const reduced=Number(await point.getAttribute('max'));yes('simplification reduces points but retains corners',reduced>=5&&reduced<initialCount);
  old=await revision();await button(v,'作品に反映').click();await waitRev(old);
  const simplified=await png(1,'artwork','simplified');yes('simplified endpoints and corners retained',[[60,350],[110,320],[160,350],[210,320],[260,350]].every(p=>alpha(simplified,p)>0));
  await button(v,'選んだベクターを編集').click();await button(v,'曲線をなめらかにする').click();old=await revision();await button(v,'作品に反映').click();await waitRev(old);
  const smooth=await png(1,'artwork','smoothed');yes('smoothing changes the curve and retains endpoints',!smooth.data.equals(simplified.data)&&alpha(smooth,[60,350])>0&&alpha(smooth,[260,350])>0);
  await page.locator('#undo').evaluate(e=>e.click());await waitRev(old,true);yes('smooth undo pixel equality',simplified.data.equals((await png(1,'artwork','smooth-undo')).data));
  await newContext();await fresh();const left=await shapeRect(40,40,200,200,0),right=await shapeRect(198,40,340,200,0);
  const thinBase=await png(1,'artwork','thin-before');await selectLayer(left);const panelRoot=await openDocumentSettings(),vp=panelRoot.getByText('ベクター線・点の編集',{exact:true}).locator('xpath=..');if(!await vp.evaluate(e=>e.open))await vp.locator('summary').click();
  await button(vp,'選んだベクターを編集').click();await choose(vp.locator('select:has(option[value="'+right+'"])'),right);await choose(vp.locator('select:has(option[value="intersection"])'),'intersection');await button(vp,'2つの形を組み合わせる').click();await vp.getByText(/元の2レイヤーを同時に隠せます/).waitFor();
  old=await revision();await button(vp,'作品に反映').click();await waitRev(old);const thin=await png(1,'artwork','thin-intersection');
  yes('two-pixel intersection retained',alpha(thin,[198,100])>127&&alpha(thin,[199,100])>127);eq('thin intersection excludes left exterior',alpha(thin,[195,100]),0);eq('thin intersection excludes right exterior',alpha(thin,[202,100]),0);
  await page.locator('#undo').evaluate(e=>e.click());await waitRev(old,true);yes('thin operation undo exact',thinBase.data.equals((await png(1,'artwork','thin-undo')).data));
 },
 'FX-007':async()=>{
  await fresh();await importRaster(join(fixture,'repair-damaged.png'));
  const before=await png(1,'artwork','repair-input'),clean=PNG.sync.read(await readFile(join(fixture,'repair-clean.png')));
  eq('repair fixture dimensions',[before.width,before.height],[clean.width,clean.height]);
  const p=page.locator('[data-tool-panel="smudge"]'),mode=p.locator('select:has(option[value="clone"])');
  async function openRepair(kind,label,query,category=false){
   if(category){
    if(await page.locator('#allFeaturesPanel').isVisible())await page.locator('#featuresClose').click();
    await page.locator('#allFeatures').click();await page.locator('[data-category="adjust-filter-retouch"]').click();
    await button(page.locator('#featuresItems'),label).click();
   }else await findCommand(query,label);
   await p.waitFor({state:'visible'});if(!await p.evaluate(e=>e.open))await p.locator('summary').click();
   eq('entry selects '+kind,await mode.inputValue(),kind);
   await p.getByLabel('強さ（%）',{exact:true}).fill('100');await p.getByLabel('強さ（%）',{exact:true}).press('Tab');
   await p.getByLabel('直径（px）',{exact:true}).fill('24');await p.getByLabel('直径（px）',{exact:true}).press('Tab');
  }
  async function pick(x,y){await button(p,'元を指定').click();await page.mouse.click(...await coords(x,y));await p.getByText(/採取点/).waitFor({state:'visible'});}
  const error=im=>{let sum=0;for(let y=44;y<=48;y++)for(let x=46;x<=50;x++)for(let k=0;k<3;k++)sum+=Math.abs(rgba(im,x,y)[k]-rgba(clean,x,y)[k]);return sum;};
  const outside=(im,x0,y0,x1,y1)=>{let n=0;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if((x<x0||x>x1||y<y0||y>y1)&&JSON.stringify(rgba(im,x,y))!==JSON.stringify(rgba(before,x,y)))n++;return n;};
  async function undo(old,name){await page.locator('#undo').evaluate(e=>e.click());await waitRev(old,true);yes(name+' undo restores all pixels',before.data.equals((await png(1,'artwork',name+'-undo')).data));}
  await openRepair('clone','クローン','Clone');
  await pick(16.5,30.5);let old=await revision();
  await page.mouse.click(...await coords(48.5,46.5));await waitRev(old);
  let after=await png(1,'artwork','clone');eq('clone donor center',rgba(after,48,46),rgba(before,16,30));eq('clone exterior unchanged',outside(after,34,32,63,61),0);
  const redoRevision=await revision();await undo(old,'clone');await page.locator('#redo').evaluate(e=>e.click());await waitRev(redoRevision,true);yes('clone redo restores result',after.data.equals((await png(1,'artwork','clone-redo')).data));await undo(old,'clone-second');
  await openRepair('heal','修復ブラシ','Healing',true);await pick(16.5,30.5);old=await revision();
  await page.mouse.click(...await coords(48.5,46.5));await waitRev(old);after=await png(1,'artwork','heal');
  yes('healing decreases independent defect error',error(after)<error(before));eq('heal exterior unchanged',outside(after,34,32,63,61),0);await undo(old,'heal');
  await openRepair('patch','範囲パッチ','Patch',true);await pick(12,40);old=await revision();
  await stroke([[44,40],[56,52]]);await button(p,'パッチを取消').click();eq('cancel leaves revision unchanged',await revision(),old);yes('cancel leaves original pixels',before.data.equals((await png(1,'artwork','patch-cancel')).data));
  await button(p,'キャンバスで使う').click();await stroke([[44,40],[56,52]]);await button(p,'パッチを確定').click();await waitRev(old);after=await png(1,'artwork','patch');yes('patch decreases independent defect error',error(after)<error(before));eq('patch exterior unchanged',outside(after,43,39,57,53),0);await undo(old,'patch');
  // The other three entries must launch their own actual tool, not just exist.
  await openRepair('clone','クローン','Clone',true);await openRepair('heal','修復ブラシ','Healing');await openRepair('patch','範囲パッチ','Patch');
  // Real selection clipping, using the original imported raster.
  await selectRect([46,44],[51,49]);await openRepair('clone','クローン','Clone');await pick(16.5,30.5);old=await revision();
  await page.mouse.click(...await coords(48.5,46.5));await waitRev(old);after=await png(1,'artwork','clone-selected');eq('selection exterior unchanged',outside(after,46,44,51,49),0);await undo(old,'clone-selected');
  await clearSelection();
  // Separate repair layer must leave the original active-layer PNG unchanged.
  const originalLayer=await canvas.getAttribute('data-selected-layer-id');
  const originalPixels=await png(1,'active','original-layer-before');
  await openRepair('clone','クローン','Clone');await p.getByLabel('新しいレイヤーに結果を置く',{exact:true}).check();await pick(16.5,30.5);old=await revision();
  await page.mouse.click(...await coords(48.5,46.5));await waitRev(old);
  yes('separate repair layer created',await canvas.getAttribute('data-selected-layer-id')!==originalLayer);
  await selectLayer(originalLayer);yes('original layer untouched',originalPixels.data.equals((await png(1,'active','original-layer-after')).data));
  await undo(old,'separate-clone');
  // Explicit source layer and target on a blank layer. The source remains unchanged.
  await layerPage();old=await revision();await page.locator('#addLayerPage').click();await waitRev(old);await page.locator('#closeLayerPage').click();
  const targetLayer=await canvas.getAttribute('data-selected-layer-id');
  await openRepair('clone','クローン','Clone');await p.getByLabel('新しいレイヤーに結果を置く',{exact:true}).uncheck();
  await choose(p.locator('select:has(option[value="merged"]):has(option[value="active"]):has(option[value="layer"])'),'layer');await choose(p.locator('select:has(option[value="'+originalLayer+'"])'),originalLayer);
  await pick(16.5,30.5);old=await revision();await page.mouse.click(...await coords(48.5,46.5));await waitRev(old);
  eq('explicit source copied onto requested layer',await canvas.getAttribute('data-selected-layer-id'),targetLayer);
  const clonedLayer=await png(1,'active','explicit-source');eq('specified donor pixel',rgba(clonedLayer,48,46),rgba(before,16,30));
  await selectLayer(originalLayer);yes('specified source layer remains intact',originalPixels.data.equals((await png(1,'active','explicit-source-original')).data));
  await selectLayer(targetLayer);await openRepair('clone','クローン','Clone');
  const aligned=p.getByLabel('次の一筆にも採取元との位置関係を保つ',{exact:true});await aligned.check();await pick(16.5,30.5);
  old=await revision();await page.mouse.click(...await coords(80.5,20.5));await waitRev(old);
  old=await revision();await page.mouse.click(...await coords(100.5,20.5));await waitRev(old);
  const continuous=await png(1,'active','aligned-clone');eq('aligned clone follows donor offset',rgba(continuous,100,20),rgba(before,36,30));
  await aligned.uncheck();await pick(16.5,30.5);old=await revision();await page.mouse.click(...await coords(80.5,70.5));await waitRev(old);old=await revision();await page.mouse.click(...await coords(100.5,70.5));await waitRev(old);
  const repeated=await png(1,'active','unaligned-clone');eq('unaligned clone restarts from donor',rgba(repeated,100,70),rgba(before,16,30));
  await selectRect([40,35],[55,55]);await layerActions();if(!await page.locator('#layerVectorMask').evaluate(e=>e.open))await page.locator('#layerVectorMask summary').click();await choose(page.locator('#vectorMaskShape'),'rectangle');old=await revision();await page.locator('#vectorMaskFromSelection').click();await waitRev(old);await page.locator('#closeLayerPage').click();await clearSelection();
  await openRepair('clone','クローン','Clone');await pick(20.5,30.5);old=await revision();await page.mouse.click(...await coords(48.5,46.5));await waitRev(old);
  await layerActions();if(!await page.locator('#layerVectorMask').evaluate(e=>e.open))await page.locator('#layerVectorMask summary').click();old=await revision();await page.locator('#vectorMaskEnabled').uncheck();await waitRev(old);await page.locator('#closeLayerPage').click();
  const afterMask=await png(1,'active','clone-mask-disabled');let changedOutside=0;for(let y=0;y<afterMask.height;y++)for(let x=0;x<afterMask.width;x++)if((x<40||x>=55||y<35||y>=55)&&JSON.stringify(rgba(afterMask,x,y))!==JSON.stringify(rgba(repeated,x,y)))changedOutside++;
  eq('mask protects actual stored exterior pixels',changedOutside,0);
  await selectLayer(originalLayer);await layerActions();old=await revision();await page.locator('#deleteLayer').click();const confirm=page.locator('dialog.illustro-app-dialog[open]');if(await confirm.isVisible())await button(confirm,'確定').click();await waitRev(old);if(await page.locator('#layerPage').isVisible())await page.locator('#closeLayerPage').click();
  await selectLayer(targetLayer);await openRepair('clone','クローン','Clone');const sourceSelect=p.locator('select:has(option[value="'+targetLayer+'"])');eq('deleted source absent from reference options',await sourceSelect.locator('option[value="'+originalLayer+'"]').count(),0);
  old=await revision();await button(p,'キャンバスで使う').click();await p.getByText('採取するレイヤーを選んでください。',{exact:true}).waitFor();eq('missing source does not commit',await revision(),old);
  await newContext();await fresh();await importRaster(join(fixture,'repair-damaged.png'));await openRepair('clone','クローン','Clone');await pick(16.5,30.5);
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  const [tx,ty]=await coords(48.5,46.5);old=await revision();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await waitRev(old);
  eq('emulated touch clone donor pixel',rgba(await png(1,'artwork','touch-clone'),48,46),rgba(before,16,30));
 },

 'LIN-007':async()=>{
  await fresh();let p=await advancedFill();
  await fillState(p,/未解析/,'blank unanalysed');
  await button(p,'線画を解析・更新').click();await fillState(p,/無効/,'blank invalid');
  const blankRevision=await revision(),blank=await png(1,'artwork','invalid-before');
  await choose(p.locator('select:has(option[value="lasso-closed"])'),'lasso-closed');
  await button(p,'キャンバスで塗る').click();await stroke([[80,80],[180,80],[180,180],[80,180],[80,80]]);
  await p.getByText(/先に「線画を解析・更新」で候補を作り、領域を確定してください/).waitFor({timeout:20000});
  eq('invalid graph cannot create a revision',await revision(),blankRevision);yes('invalid graph cannot change pixels',blank.data.equals((await png(1,'artwork','invalid-after')).data));
  await drawLine([[70,100],[180,100]],8);
  yes('normal drawing after invalid graph',alpha(await png(1,'artwork','normal-after-invalid'),[120,100])>0);
  await importRaster(join(fixture,'line-art.png'));p=await advancedFill();
  const gap=p.getByLabel('埋める隙間（px）',{exact:true});await gap.fill('8');await gap.press('Tab');
  await button(p,'線画を解析・更新').click();await fillState(p,/確定待ち/,'fixture awaiting confirmation');
  await button(p,'線画領域を確定・保存').click();await fillState(p,/確定済み/,'confirmed graph');
  await idle();const native=await saveCopy('line-graph');await writeFile(join(evidence,'line-graph.illustro'),await readFile(native));
  await page.screenshot({path:join(evidence,'confirmed.png')});
  await openFile(native,128);p=await advancedFill();
  await p.locator(':scope > summary').click();await p.locator(':scope > summary').click();
  const advanced=p.getByText('線画の解析・細かい調整',{exact:true});if(!await p.locator('label').filter({hasText:'作品に保存した線画領域'}).locator('select').isVisible()&&!await button(p,'保存した領域を使う').isVisible())await advanced.click();
  const saved=p.locator('label').filter({hasText:'作品に保存した線画領域'}).locator('select');
  await saved.locator('option').nth(1).waitFor({state:'attached'});
  const options=await saved.locator('option').evaluateAll(os=>os.map(o=>({value:o.value,label:o.textContent})));
  yes('saved line analysis present after reopening',options.some(o=>o.value));
  await choose(saved,options.find(o=>o.value).value);await button(p,'保存した領域を使う').click();
  await fillState(p,/確定済み|保存済み/,'reopened saved graph');
  const issue=p.locator('label').filter({hasText:'確認する箇所'}).locator('select');
  const area=await issue.locator('option').evaluateAll(os=>os.find(o=>o.value.startsWith('area:'))?.value);
  yes('problem area visible in issue list',!!area);await choose(issue,area);await button(p,'この領域の除外を切り替える').click();
  await fillState(p,/確定待ち/,'excluded area returns to confirmation');
  const oldPixels=await png(1,'artwork','before-exclusion-save'),oldRevision=await revision();
  await button(p,'線画領域を確定・保存').click();await waitRev(oldRevision);await p.getByText('線画領域を作品に保存しました。',{exact:true}).waitFor();
  yes('exclusion save leaves original artwork pixels unchanged',oldPixels.data.equals((await png(1,'artwork','after-exclusion-save')).data));
  const state=await p.locator('output').first().textContent();await writeFile(join(evidence,'exclusion-state.json'),JSON.stringify({state,sourcePixelsUnchanged:true}));
  yes('exclusion saved without false original-line-change notice',!state.includes('元の線画は変更済み'));
  await drawLine([[12,20],[34,20]],3);await advancedFill();await fillState(p,/変更済み/,'actual source edit explicitly flagged');
 },
 'REF-006':async()=>{
  await fresh();await drawLine([[70,100],[180,100]],8);
  const before=await png(1,'artwork','before');
  await addReference();const frame=page.locator('.c05-reference-frame').first();
  yes('reference frame present',await frame.isVisible());
  await findCommand('参考資料ボード','参考資料ボード');
  const root=page.locator('.c05-reference-editor');await root.waitFor({state:'visible'});
  const row=root.locator('.c05-reference-row').first();
  await row.getByRole('button',{name:/出典・メモを(追加|編集)/}).click();
  const d=page.getByRole('dialog',{name:'資料の出典と利用メモ'});
  await d.locator('textarea').fill('QA source: https://example.com/fixture ; author: QA ; usage: testing');
  await button(d,'メモを保存').click();
  await row.getByRole('button',{name:'位置を固定',exact:true}).click();
  await row.getByRole('button',{name:'固定解除',exact:true}).waitFor();
  const geometry=await frame.evaluate(e=>[e.style.left,e.style.top,e.style.width,e.style.height]);
  const mode=root.getByLabel('作品ファイルに参考画像を含めるか',{exact:true});
  await mode.selectOption('embedded',{force:true});const embedded=await saveCopy('reference-embedded');
  await mode.selectOption('linked',{force:true});const linked=await saveCopy('reference-linked');
  const after=await png(1,'artwork','with-reference');yes('reference excluded from all exported pixels',before.data.equals(after.data));
  await openFile(embedded,512);await page.locator('.c05-reference-frame img').first().waitFor();
  yes('embedded image loaded in clean context',await page.locator('.c05-reference-frame img').first().evaluate(e=>e.complete&&e.naturalWidth>0));
  eq('embedded reference geometry restored',await page.locator('.c05-reference-frame').first().evaluate(e=>[e.style.left,e.style.top,e.style.width,e.style.height]),geometry);
  await findCommand('参考資料ボード','参考資料ボード');
  await page.locator('.c05-reference-row').first().getByRole('button',{name:'出典・メモを編集',exact:true}).click();
  let notes=page.getByRole('dialog',{name:'資料の出典と利用メモ'});
  eq('source notes restored',await notes.locator('textarea').inputValue(),'QA source: https://example.com/fixture ; author: QA ; usage: testing');
  await button(notes,'メモを保存').click();
  const reopened=await png(1,'artwork','embedded-open');yes('embedded reference did not alter artwork',reopened.data.equals(before.data));
  await openFile(linked,512);await page.getByText('参照画像が見つかりません。素材庫から元データを復元してください。',{exact:true}).waitFor();
  yes('linked reference missing notice in clean context',true);
  await findCommand('参考資料ボード','参考資料ボード');
  const missing=page.locator('.c05-reference-row').first(),chooser=page.waitForEvent('filechooser');
  await button(missing,'元画像を選び直す').click();await (await chooser).setFiles(join(fixture,'colors.png'));
  await page.locator('.c05-reference-frame img').first().waitFor();
  yes('reference image relinked',await page.locator('.c05-reference-frame img').first().evaluate(e=>e.complete&&e.naturalWidth>0));
  eq('relink geometry retained',await page.locator('.c05-reference-frame').first().evaluate(e=>[e.style.left,e.style.top,e.style.width,e.style.height]),geometry);
  yes('relink does not enter PNG',before.data.equals((await png(1,'artwork','relinked')).data));
 },
 'AUT-003':async()=>{
  await fresh();await pen(8);const root=await recordMacro();
  const initial=await png(1,'artwork','before');const old=await revision();
  await button(root,'実行').click();let d=page.getByRole('dialog',{name:'操作セットを確認'});
  await button(d,'取り消す').click();await d.waitFor({state:'hidden'});eq('cancel revision unchanged',await revision(),old);
  const canceled=await png(1,'artwork','canceled');yes('cancel all pixels unchanged',initial.data.equals(canceled.data));
  await button(root,'実行').click();await d.getByLabel('縦のずれ（px）').fill('90');
  await button(d,'この内容で実行').click();
  const apply=page.getByRole('button',{name:'適用',exact:true}).filter({visible:true});await apply.waitFor();
  eq('preview does not commit revision',await revision(),old);
  await apply.click();await page.locator('dialog[open]').waitFor({state:'hidden'}).catch(()=>{});await waitRev(old);
  const applied=await png(1,'artwork','applied');yes('macro changes expected area',alpha(applied,[120,190])>0);
  await page.locator('#undo').evaluate(e=>e.click());await waitRev(old,true);
  const undone=await png(1,'artwork','undo');yes('one undo restores all pixels',initial.data.equals(undone.data));
  let macros=await openMacros();await button(macros,'新しく作る').click();
  const commands=macros.getByLabel('追加する操作',{exact:true});
  await choose(commands,'layerNameAtRun');await button(macros,'操作を追加').click();
  await choose(commands,'layerClipping');await button(macros,'操作を追加').click();
  await macros.getByLabel('操作セットの名前',{exact:true}).fill('QA atomic failure');await button(macros,'保存').click();
  const failedRevision=await revision(),originalName=await canvas.getAttribute('data-selected-layer-name');
  await button(macros,'実行').click();await d.getByLabel('レイヤー名を設定',{exact:true}).fill('must-not-persist');await button(d,'この内容で実行').click();
  await macros.getByText(/2番目の手順に必要な下のレイヤーがありません/).waitFor();
  eq('failed sequence does not create revision',await revision(),failedRevision);eq('failed sequence retains name',await canvas.getAttribute('data-selected-layer-name'),originalName);
  yes('failed sequence retains every pixel',initial.data.equals((await png(1,'artwork','atomic-failure')).data));
  await drawLine([[270,270],[360,270]],10);const later=await png(1,'artwork','later-edit');yes('later drawing still possible',alpha(later,[310,270])>127);
  await page.locator('#undo').click();await waitRev(failedRevision,true);yes('undo affects only the later drawing',initial.data.equals((await png(1,'artwork','later-undo')).data));
 },
 'AUT-005':async()=>{
  await fresh();await pen(8);const root=await recordMacro();
  const dl=page.waitForEvent('download',{timeout:30000});await button(root,'操作セットを書き出す').click();
  const file=join(evidence,'macro.json');await (await dl).saveAs(file);const raw=JSON.parse(await readFile(file,'utf8'));
  yes('exported macro JSON contains name',JSON.stringify(raw).includes('QA stroke'));
  await button(root,'素材に登録').click();await root.getByText('素材に登録しました。',{exact:true}).waitFor();
  await findCommand('自動操作','操作セットを記録・再生');yes('search reopens macro panel',await page.locator('.c04-simple-macros').isVisible());
  await newContext();await fresh();
  const assets=await openBox('assetsBox');
  await choose(assets.locator('select[aria-label="取り込む素材の種類"]'),'macro');
  await assets.locator('input[type=file]').first().setInputFiles(file);await button(assets,'追加した素材を見る').click();
  const entry=assets.locator('.c05-asset-entry').filter({hasText:'macro.json'}).first();await button(entry,'操作セットとして読み込む').click();
  await assets.getByText('1件の設定を読み込みました。',{exact:true}).waitFor();
  const d=page.getByRole('dialog',{name:'操作セットを確認'});
  async function replay(name,dy){
   await d.getByLabel('縦のずれ（px）').fill(String(dy));const old=await revision();await button(d,'この内容で実行').click();
   await page.getByRole('button',{name:'適用',exact:true}).filter({visible:true}).click();await waitRev(old);
   yes(name,alpha(await png(1,'artwork',name),[120,100+dy])>0);
  }
  await findCommand('QA stroke','QA stroke');await replay('imported-macro-replays',0);
  if(await page.locator('#allFeaturesPanel').isVisible())await page.locator('#featuresClose').click();
  await page.locator('#allFeatures').click();await page.locator('#commandSearchOpen').click();
  const search=page.locator('#commandSearchDialog');await search.locator('input[type=search]').fill('QA stroke');
  await search.getByRole('button',{name:'QA strokeをQuickに固定',exact:true}).click();await search.waitFor({state:'hidden'});
  if(!await page.locator('#quickControllerPanel').isVisible())await page.locator('#quickControllerOpen').click();
  const quick=page.locator('#quickControllerPanel');
  if(await quick.locator('.c04-quick-slot').filter({hasText:'変更'}).count())await quick.locator('.c04-quick-slot').first().click();
  if(!await quick.isVisible())await page.locator('#quickControllerOpen').click();
  await quick.getByRole('button',{name:'QA stroke',exact:true}).click();await replay('quick-macro-replays',90);
  await findCommand('作業欄の設定','作業欄の設定');const shortcuts=page.locator('.c04-shortcut-settings');if(!await shortcuts.evaluate(e=>e.open))await shortcuts.locator('summary').click();
  const registration=shortcuts.getByLabel('登録する機能',{exact:true});
  const trigger=registration.locator('xpath=following-sibling::button[contains(@class,"workspace-choice")][1]');
  if(await trigger.isVisible()){
   await trigger.click();const list=page.locator('#'+await trigger.getAttribute('aria-controls'));
   await list.waitFor({state:'visible'});
   await list.screenshot({path:join(evidence,'shortcut-visible-options.png')});
   const actual=await list.getByRole('option').allTextContents();await trigger.click();
   await writeFile(join(evidence,'shortcut-visible-options.json'),JSON.stringify(actual,null,2));
   yes('imported macro appears in visible shortcut assignment list',actual.some(v=>v.includes('QA stroke')));
  }
  const macroId=await registration.locator('option').evaluateAll(os=>os.find(o=>o.label.startsWith('QA stroke ·'))?.value);
  yes('imported macro has available shortcut command',!!macroId);
  await choose(registration,macroId);
  await button(shortcuts,'キーを押して登録').click();await page.keyboard.press('j');
  await shortcuts.locator('.c04-shortcut-row').filter({hasText:'QA stroke'}).waitFor();
  await page.locator('#paint').click();await page.keyboard.press('j');await replay('shortcut-macro-replays',180);
 },

 'INP-006':async()=>{
  await fresh();await page.locator('#paint').click();await pen(20);
  await findCommand('ブラシ','ブラシの一覧');const c=page.locator('#brushCursorEnabled');
  const summary=c.locator('xpath=ancestor::details[1]/summary');
  if(!await c.isVisible())await summary.click();
  await c.check();const cursor=page.locator('#brushCursor');
  async function measure(x,y){
   const [sx,sy]=await coords(x,y);await page.mouse.move(sx,sy);await cursor.waitFor({state:'visible'});
   await page.waitForFunction(({sx,sy})=>{const r=document.querySelector('#brushCursor').getBoundingClientRect();return Math.abs(r.x+r.width/2-sx)<2&&Math.abs(r.y+r.height/2-sy)<2;},{sx,sy},{timeout:4000}).catch(()=>{});
   const r=await cursor.boundingBox();yes('cursor visible bounding box',!!r);
   yes('cursor center within 2 CSS px',Math.hypot(r.x+r.width/2-sx,r.y+r.height/2-sy)<=2);
   return {width:r.width,height:r.height,zoom:JSON.parse(await canvas.getAttribute('data-view')).zoom};
  }
  const before=await measure(240,180);await page.locator('#zoomIn').evaluate(e=>e.click());
  const after=await measure(250,190);
  yes('zoom actually increased',after.zoom>before.zoom);
  yes('cursor width tracks zoom within 2 CSS px',Math.abs(after.width-before.width*after.zoom/before.zoom)<=2);
  const rev=await revision();await page.mouse.down();await cursor.waitFor({state:'hidden'});await page.mouse.up();await waitRev(rev);
  const im=await png(1,'artwork','contact');yes('contact mark contains indicated center',alpha(im,[250,190])>0);
 },
 'NDE-002':async()=>{
  await fresh();await drawLine([[70,140],[270,140]],24);const before=await png(1,'artwork','before');
  const black=rgba(before,150,140);yes('initial dark opaque artwork',black[3]>200&&Math.max(...black.slice(0,3))<32);
  await findCommand('合成モード','レイヤーの合成モード');
  const d=page.getByRole('dialog',{name:'レイヤーの合成モード'});
  await d.getByText('明るさで合成範囲を指定',{exact:true}).click();
  await d.getByLabel('明るさで範囲を絞る',{exact:true}).check();
  await d.locator('select:has(option[value="self"])').selectOption('self');
  await d.locator('select:has(option[value="luminosity"])').selectOption('luminosity');
  await d.getByLabel('暗部のなじみ',{exact:true}).fill('128');
  await d.getByLabel('暗部の境界',{exact:true}).fill('128');
  const rev=await revision();await button(d,'確定').click();await waitRev(rev);
  const masked=await png(1,'artwork','threshold');eq('dark range excluded at center',alpha(masked,[150,140]),0);
  eq('outside remains transparent',alpha(masked,[150,200]),0);
  await page.locator('#undo').evaluate(e=>e.click());await waitRev(rev,true);
  const restored=await png(1,'artwork','undo');yes('undo restores complete prior pixel buffer',before.data.equals(restored.data));
 },
 'AUT-004':async()=>{
  await fresh();await drawLine([[70,100],[180,100]],12);const first=await png(1,'artwork','first-expected');
  await saveIdle();const one=await canvas.getAttribute('data-document-id');
  await page.locator('#home').click();await page.locator('#ihNavHome').click();await page.locator('#ihStart').click();
  const setup=page.locator('#ihCanvasSetup');if(!await setup.evaluate(e=>e.open))await setup.locator(':scope > summary').click();
  await page.locator('#ihNewWidth').fill('256');await page.locator('#ihNewHeight').fill('192');
  await page.locator('#ihNewBackground').selectOption('transparent',{force:true});await page.locator('#ihNewCreate').click();
  await page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.documentWidth==='256'&&!document.querySelector('#brush')?.disabled);
  await drawLine([[40,60],[150,60]],18);const second=await png(1,'artwork','second-expected');
  await saveIdle();const two=await canvas.getAttribute('data-document-id');yes('different work ids',one!==two);
  await page.locator('#home').click();await page.locator('#ihNavWorks').click();
  for(const work of [one,two])await page.locator('[data-work-id="'+work+'"] input[type=checkbox]').check();
  await page.evaluate(()=>{
    let attempts=0;const files=new Map();window.qaBatchFiles=files;window.qaBatchWrites=[];
    Object.defineProperty(window,'showDirectoryPicker',{configurable:true,value:async()=>({name:'QA isolated simulated folder',getFileHandle:async(name,opts)=>{
      if(!opts?.create&&!files.has(name))throw new DOMException('not found','NotFoundError');
      return {createWritable:async()=>{let next;return {write:async(blob)=>{if(++attempts===1)throw new DOMException('QA simulated quota fault','QuotaExceededError');next=Array.from(new Uint8Array(await blob.arrayBuffer()));},close:async()=>{files.set(name,next);window.qaBatchWrites.push(name);},abort:async()=>{next=undefined;}};}};
    }})});
  });
  await page.locator('#ihWorkExportSelected').click();const d=page.getByRole('dialog',{name:'選んだ作品を一括で書き出す'});
  await choose(d.locator('select:has(option[value="png"])'),'png');
  await button(d,'保存先フォルダーを選ぶ').click();
  await d.getByRole('button',{name:/保存先 QA isolated simulated folder/}).waitFor();
  await button(d,'画像をまとめて作成').click();
  await d.getByText('1件を作成 ／ 1件で失敗。',{exact:true}).waitFor({timeout:90000});
  eq('failure does not prevent the next file',await d.locator('ol li').filter({hasText:'作成済み'}).count(),1);
  let actual=[];
  for(const link of await d.locator('ol a:visible').all()){
   const dl=page.waitForEvent('download',{timeout:30000});await link.click();
   const file=join(evidence,'batch-'+actual.length+'.png');await (await dl).saveAs(file);actual.push(PNG.sync.read(await readFile(file)));
  }
  eq('two real downloadable outputs',actual.length,2);
  for(const expected of [first,second]){
   const found=actual.find(x=>x.width===expected.width&&x.height===expected.height);
   yes('output dimensions and every pixel match individual export '+expected.width,!!found&&found.data.equals(expected.data));
  }
  await button(d,'失敗・中止分を再試行').click();
  await d.getByText('1件を作成。',{exact:true}).waitFor({timeout:90000});
  eq('both output rows recovered',await d.locator('ol li').filter({hasText:'作成済み'}).count(),2);
  const stored=await page.evaluate(()=>[...window.qaBatchFiles]);eq('two distinct saved folder files',stored.length,2);
  for(const [,bytes] of stored){const im=PNG.sync.read(Buffer.from(bytes));const expected=[first,second].find(x=>x.width===im.width&&x.height===im.height);yes('folder output identical to original export '+im.width,!!expected&&im.data.equals(expected.data));}
  await page.evaluate(()=>{window.qaBatchWrites.length=0;for(const name of window.qaBatchFiles.keys())window.qaBatchFiles.set(name,[7,11,13]);});
  await button(d,'画像をまとめて作成').click();
  const confirmation=page.locator('dialog.illustro-app-dialog[open]');await confirmation.getByText(/上書きしますか/).waitFor();
  await button(confirmation,'キャンセル').click();await d.getByText(/元ファイルを保持/).waitFor();
  await confirmation.getByText(/上書きしますか/).waitFor();await button(confirmation,'確定').click();
  await d.getByText('2件を作成。',{exact:true}).waitFor({timeout:90000});
  const overwrites=await page.evaluate(()=>({files:[...window.qaBatchFiles],writes:window.qaBatchWrites}));
  eq('exactly one approved overwrite',overwrites.writes.length,1);
  eq('declined original file untouched',overwrites.files.filter(([,v])=>JSON.stringify(v)==='[7,11,13]').length,1);
  const overwritten=PNG.sync.read(Buffer.from(overwrites.files.find(([name])=>name===overwrites.writes[0])[1]));
  const approved=[first,second].find(x=>x.width===overwritten.width&&x.height===overwritten.height);
  yes('approved overwrite contains correct artwork',!!approved&&overwritten.data.equals(approved.data));
  await button(d,'閉じる').click();
  await openArtwork(one);const originalOne=await png(1,'artwork','original-one');yes('first original untouched',originalOne.data.equals(first.data));await page.locator('#home').click();await openArtwork(two);const originalTwo=await png(1,'artwork','original-two');yes('second original untouched',originalTwo.data.equals(second.data));
 },

 'BRU-011':async()=>{
  await fresh();await drawLine([[70,120],[180,120]],9);
  const before=await png(1,'artwork','before'),brush=await page.locator('#brush').inputValue(),size=await page.locator('#sizeNumber').inputValue();
  const native=await saveCopy('brush');await writeFile(join(evidence,'native.illustro'),await readFile(native));await openFile(native,512);
  const restoredBrush=await page.locator('#brush').inputValue(),restoredSize=await page.locator('#sizeNumber').inputValue();
  const after=await png(1,'artwork','after');yes('identical native round trip artwork',before.data.equals(after.data));
  eq('brush identifier after native open',restoredBrush,brush);
  eq('brush size after native open',restoredSize,size);
  await drawLine([[70,220],[180,220]],9);const more=await png(1,'artwork','new-stroke');
  for(const x of [100,130,160])eq('same pen coverage at '+x,rgba(more,x,220),rgba(before,x,120));
 },
 'SAV-007':async()=>{
  await fresh();await drawLine([[70,100],[180,100]]);
  await saveIdle();const docId=await canvas.getAttribute('data-document-id');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller,undefined,{timeout:60000});
  await context.setOffline(true);eq('offline flag',await page.evaluate(()=>navigator.onLine),false);
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});await page.locator('#ihNavWorks').waitFor();
  await openArtwork(docId);eq('same work offline',await canvas.getAttribute('data-document-id'),docId);
  await drawLine([[70,200],[180,200]]);
  await selectRect([90,190],[150,220]);await drawLine([[70,210],[180,210]],8);const after=await png(1,'artwork','offline');yes('new offline stroke present',alpha(after,[120,200])>0);yes('offline selection constrains stroke',alpha(after,[175,210])===0);
  await saveIdle();await page.reload({waitUntil:'domcontentloaded'});await openArtwork(docId);
  const restored=await png(1,'artwork','offline-restored');yes('offline save survived reload',after.data.equals(restored.data));
  await clearSelection();
  const originalLayer=await canvas.getAttribute('data-selected-layer-id');
  await layerPage();let old=await revision();await page.locator('#addLayerPage').click();await waitRev(old);await page.locator('#closeLayerPage').click();
  yes('offline new layer created',await canvas.getAttribute('data-selected-layer-id')!==originalLayer);
  await drawLine([[270,300],[350,300]],12);const withLayer=await png(1,'artwork','offline-layer');
  yes('offline new layer pixels rendered',alpha(withLayer,[310,300])>200);
  await page.locator('#undo').click();await idle();eq('offline undo removes new stroke',alpha(await png(1,'artwork','offline-undo'),[310,300]),0);
  await page.locator('#redo').click();await idle();yes('offline redo restores all pixels',withLayer.data.equals((await png(1,'artwork','offline-redo')).data));
  await saveIdle();await page.reload({waitUntil:'domcontentloaded'});await openArtwork(docId);yes('offline layer/history survives reload',withLayer.data.equals((await png(1,'artwork','offline-layer-reopen')).data));
  await clearSelection();
  const transform=await panel('transform');await choose(transform.locator('select:has(option[value="layer"]):has(option[value="boundary"])'),'layer');
  if(await button(transform,'変形を始める').isEnabled())await button(transform,'変形を始める').click();const dx=transform.getByLabel('横の移動（px）',{exact:true});await dx.waitFor({state:'visible'});await dx.fill('40');await dx.press('Tab');old=await revision();
  await button(transform,'変形を適用').click();await waitRev(old);
  const moved=await png(1,'artwork','offline-transformed');yes('offline transform moved pixels',alpha(moved,[350,300])>127&&alpha(moved,[280,300])===0);
  await addReference();yes('offline reference image visible',await page.locator('.c05-reference-frame img').first().evaluate(e=>e.complete&&e.naturalWidth>0));
  yes('offline reference excluded from export',moved.data.equals((await png(1,'artwork','offline-reference')).data));
  await layerPage();old=await revision();await page.locator('#addLayerPage').click();await waitRev(old);await page.locator('#closeLayerPage').click();
  await drawLine([[200,60],[300,60]],12);const effectBefore=await png(1,'artwork','offline-filter-before');
  await findCommand('レイヤーのフィルター','レイヤーのフィルターを開く');const effects=page.locator('.raster-effects');
  await choose(effects.locator('select:has(option[value="invert"])'),'invert');await button(effects,'新しい効果').click();old=await revision();await button(effects,'レイヤーに適用').click();await waitRev(old);
  const effectAfter=await png(1,'artwork','offline-filter-after');eq('offline invert actual opaque RGB',rgba(effectAfter,250,60),rgba(effectBefore,250,60).map((v,k)=>k===3?v:255-v));
  await page.locator('#undo').evaluate(e=>e.click());await waitRev(old,true);yes('offline filter undo restores full image',effectBefore.data.equals((await png(1,'artwork','offline-filter-undo')).data));
  await layerPage();old=await revision();await page.locator('#addLayerPage').click();await waitRev(old);await page.locator('#closeLayerPage').click();
  await drawLine([[270,75],[350,75]],8);const macro=await openMacros();await button(macro,'新しく作る').click();
  await choose(macro.getByLabel('追加する操作',{exact:true}),'layerOpacityAtRun');await button(macro,'操作を追加').click();
  await macro.getByLabel('操作セットの名前',{exact:true}).fill('QA offline opacity');await button(macro,'保存').click();await button(macro,'実行').click();
  const dialog=page.getByRole('dialog',{name:'操作セットを確認'});await dialog.getByLabel('不透明度を設定（%）',{exact:true}).fill('50');old=await revision();
  await button(dialog,'この内容で実行').click();await page.getByRole('button',{name:'適用',exact:true}).filter({visible:true}).click();await waitRev(old);
  yes('offline macro applied actual opacity',Math.abs(alpha(await png(1,'artwork','offline-macro'),[310,75])-128)<=1);
  await saveIdle();const final=await png(1,'artwork','offline-final');await page.reload();await openArtwork(docId);
  yes('all offline edits survive reopen',final.data.equals((await png(1,'artwork','offline-final-reopened')).data));
  await context.setOffline(false);
 },
 'SEL-001':async()=>{
  await fresh();await selectLasso([[100,100],[240,100],[240,160],[160,160],[160,240],[100,240],[100,100]]);
  await drawLine([[70,130],[270,130]],14);await drawLine([[70,200],[270,200]],14);
  const im=await png();
  for(const p of [[130,130],[200,130],[130,200]])yes('selected point '+p,alpha(im,p)>200);
  for(const p of [[75,130],[260,130],[200,200],[260,200]])eq('unselected point '+p,alpha(im,p),0);
 },
 'FIL-005':async()=>{
  await fresh();const p=await panel('smartFill');
  const method=p.locator('select:has(option[value="lasso"])');await method.selectOption('lasso',{force:true});await p.getByLabel('通常塗りも候補を確認してから適用',{exact:true}).check({force:true});
  const points=[[100,100],[240,100],[240,160],[160,160],[160,240],[100,240],[100,100]];
  await button(p,'キャンバスで塗る').click();await stroke(points);
  const apply=button(p,'候補を適用');await apply.waitFor({state:'visible'});let old=await revision();await apply.click();await waitRev(old);
  let im=await png(1,'artwork','filled');yes('interior colored',alpha(im,[130,130])>200);eq('concave exclusion',alpha(im,[200,200]),0);eq('outside',alpha(im,[60,60]),0);
  await panel('smartFill');await p.getByLabel('指定部分を透明にする',{exact:true}).check({force:true});
  await button(p,'キャンバスで塗る').click();await stroke([[110,110],[150,110],[150,150],[110,150],[110,110]]);old=await revision();await apply.click();await waitRev(old);
  const filled=im;im=await png(1,'artwork','erased');eq('erased inside',alpha(im,[130,130]),0);yes('outside erasure retained',alpha(im,[200,130])>200);
  await page.locator('#undo').evaluate(e=>e.click());await waitRev(old,true);yes('erase undo pixel equality',filled.data.equals((await png(1,'artwork','erase-undo')).data));
  await selectRect([110,110],[160,160]);await panel('smartFill');await p.getByLabel('指定部分を透明にする',{exact:true}).check();await button(p,'キャンバスで塗る').click();await stroke([[90,90],[190,90],[190,190],[90,190],[90,90]]);old=await revision();await apply.click();await waitRev(old);
  const selected=await png(1,'artwork','selection-filled');let errors=0;for(let y=0;y<selected.height;y++)for(let x=0;x<selected.width;x++)if((x<110||x>=160||y<110||y>=160)&&JSON.stringify(rgba(selected,x,y))!==JSON.stringify(rgba(filled,x,y)))errors++;
  eq('selection confines lasso erase',errors,0);eq('selected portion erased',alpha(selected,[130,130]),0);
  await importRaster(join(fixture,'line-art.png'));const q=await advancedFill();
  const beforeClosed=await png(1,'artwork','closed-before');
  await choose(q.locator('select:has(option[value="lasso-closed"])'),'lasso-closed');
  await q.getByLabel('指定部分を透明にする',{exact:true}).uncheck();
  await q.getByLabel('埋める隙間（px）',{exact:true}).fill('0');await q.getByLabel('埋める隙間（px）',{exact:true}).press('Tab');
  await button(q,'線画を解析・更新').click();await fillState(q,/確定待ち/,'closed graph ready');
  await button(q,'線画領域を確定・保存').click();await fillState(q,/確定済み/,'closed graph confirmed');
  await button(q,'キャンバスで塗る').click();await stroke([[4,4],[123,4],[123,45],[4,45],[4,4]]);
  const applyClosed=button(q,'候補を適用');await applyClosed.waitFor();old=await revision();await applyClosed.click();await waitRev(old);
  const closed=await png(1,'artwork','closed-only');yes('closed interior painted',alpha(closed,[20,20])>0);eq('open interior remains transparent',alpha(closed,[103,20]),0);eq('outside remains transparent',alpha(closed,[42,20]),0);
  await page.locator('#undo').evaluate(e=>e.click());await waitRev(old,true);yes('closed region undo restores pixels',beforeClosed.data.equals((await png(1,'artwork','closed-undo')).data));
  await newContext();await fresh();await drawLine([[70,160],[300,160]],18);const protectedBefore=await png(1,'artwork','protected-before');
  await layerActions();await page.locator('#layerAlphaLock').click();await page.locator('#closeLayerPage').click();
  const q2=await panel('smartFill');await choose(q2.locator('select:has(option[value="lasso"])'),'lasso');await q2.getByLabel('通常塗りも候補を確認してから適用',{exact:true}).check();
  await q2.getByLabel('指定部分を透明にする',{exact:true}).uncheck();
  await button(q2,'キャンバスで塗る').click();await stroke([[60,120],[220,120],[220,200],[60,200],[60,120]]);const applyLocked=button(q2,'候補を適用');await applyLocked.waitFor();await applyLocked.click();await idle();
  const protectedAfter=await png(1,'artwork','alpha-protected');let alphaChanges=0;for(let i=3;i<protectedAfter.data.length;i+=4)if(protectedAfter.data[i]!==protectedBefore.data[i])alphaChanges++;
  eq('alpha lock preserves every alpha value',alphaChanges,0);
  await layerActions();if(await page.locator('#layerAlphaLock').getAttribute('aria-pressed')==='true'){old=await revision();await page.locator('#layerAlphaLock').click();await waitRev(old);}eq('alpha lock disabled for mask test',await page.locator('#layerAlphaLock').getAttribute('aria-pressed'),'false');
  if(await page.locator('#layerPage').isVisible())await page.locator('#closeLayerPage').click();
  await selectRect([100,100],[190,210]);await layerActions();if(!await page.locator('#layerVectorMask').evaluate(e=>e.open))await page.locator('#layerVectorMask summary').click();await choose(page.locator('#vectorMaskShape'),'rectangle');old=await revision();await page.locator('#vectorMaskFromSelection').click();await waitRev(old);await page.locator('#closeLayerPage').click();await clearSelection();
  const q3=await panel('smartFill');await choose(q3.locator('select:has(option[value="lasso"])'),'lasso');await q3.getByLabel('指定部分を透明にする',{exact:true}).check();await button(q3,'キャンバスで塗る').click();await stroke([[60,120],[240,120],[240,200],[60,200],[60,120]]);old=await revision();await button(q3,'候補を適用').click();await waitRev(old);
  const masked=await png(1,'artwork','fill-mask');eq('mask interior erased',alpha(masked,[140,160]),0);eq('masked exterior remains transparent',alpha(masked,[220,160]),0);
  await layerActions();if(!await page.locator('#layerVectorMask').evaluate(e=>e.open))await page.locator('#layerVectorMask summary').click();old=await revision();await page.locator('#vectorMaskEnabled').uncheck();await waitRev(old);await page.locator('#closeLayerPage').click();
  const revealed=await png(1,'artwork','fill-mask-disabled');eq('mask outside original pixels protected',rgba(revealed,220,160),rgba(protectedBefore,220,160));eq('inside erase persisted',alpha(revealed,[140,160]),0);
 },
 'PIX-001':async()=>{
  await fresh();await findCommand('ドット絵','1pxのドットペン');
  const old=await revision();await stroke([[101.2,101.2],[106.2,101.2]]);await waitRev(old);
  const im=await png();const a=opaque(im);eq('exact pixel row',a.map(p=>p.slice(0,2)),Array.from({length:6},(_,i)=>[101+i,101]));
  yes('no antialias',a.every(p=>p[2][3]===255));
 },
 'PIX-002':async()=>{
  await fresh();await findCommand('ドット絵','1pxのドットペン');let old=await revision();await stroke([[101.2,101.2],[106.2,101.2]]);await waitRev(old);
  const im=await png(1,'artwork','one'),big=await png(4,'artwork','four');
  eq('4x export dimensions',[big.width,big.height],[im.width*4,im.height*4]);
  const a=opaque(im);yes('non-empty input',a.length>0);
  let mismatch=0;for(let y=0;y<big.height;y++)for(let x=0;x<big.width;x++){const si=(Math.floor(y/4)*im.width+Math.floor(x/4))*4,di=(y*big.width+x)*4;for(let k=0;k<4;k++)if(im.data[si+k]!==big.data[di+k]){mismatch++;break;}}
  eq('integer upscaling every RGBA pixel',mismatch,0);
 },
 'LAY-005':async()=>{
  await fresh();await drawLine([[70,160],[300,160]],18);const before=await png(1,'artwork','unmasked');
  await selectRect([100,100],[190,210]);await layerActions();if(!await page.locator('#layerVectorMask').evaluate(e=>e.open))await page.locator('#layerVectorMask summary').click();await page.locator('#vectorMaskShape').selectOption('rectangle',{force:true});
  let old=await revision();await page.locator('#vectorMaskFromSelection').click();await waitRev(old);
  if(await page.locator('#layerPage').isVisible())await page.locator('#closeLayerPage').click();const masked=await png(1,'artwork','masked');yes('visible center',alpha(masked,[140,160])>200);eq('hidden exterior',alpha(masked,[240,160]),0);
  old=await revision();await layerActions();if(!await page.locator('#layerVectorMask').evaluate(e=>e.open))await page.locator('#layerVectorMask summary').click();await page.locator('#vectorMaskEnabled').uncheck();await waitRev(old);
  if(await page.locator('#layerPage').isVisible())await page.locator('#closeLayerPage').click();const disabled=await png(1,'artwork','mask-disabled');yes('disable restores artwork',before.data.equals(disabled.data));
  const menu=async()=>{await layerActions();const p=page.locator('#layerVectorMask');if(!await p.evaluate(e=>e.open))await p.locator('summary').click();return p;};
  const close=async()=>{if(await page.locator('#layerPage').isVisible())await page.locator('#closeLayerPage').click();};
  await menu();old=await revision();await page.locator('#vectorMaskEnabled').check();await waitRev(old);
  await menu();old=await revision();await page.locator('#vectorMaskInverted').check();await waitRev(old);await close();
  let result=await png(1,'artwork','inverted');eq('inverted center hidden',alpha(result,[140,160]),0);yes('inverted exterior visible',alpha(result,[240,160])>200);
  await menu();old=await revision();await page.locator('#vectorMaskDensity').fill('50');await waitRev(old);await close();
  result=await png(1,'artwork','density-half');yes('half density restores half the hidden opaque pixel',Math.abs(alpha(result,[140,160])-Math.round(alpha(before,[140,160])/2))<=1);
  await menu();old=await revision();await page.locator('#maskLinked').uncheck();await waitRev(old);await close();
  const native=await saveCopy('mask-state');await openFile(native,512);
  yes('mask saved and reopened exactly',result.data.equals((await png(1,'artwork','mask-reopened')).data));
  await menu();eq('unlink setting persists',await page.locator('#maskLinked').isChecked(),false);eq('inversion persists',await page.locator('#vectorMaskInverted').isChecked(),true);eq('density persists',await page.locator('#vectorMaskDensity').inputValue(),'50');
  old=await revision();await page.locator('#vectorMaskRemove').click();await waitRev(old);await close();yes('removing mask preserves raster',before.data.equals((await png(1,'artwork','mask-removed')).data));
  await selectRect([100,100],[190,210]);await menu();await choose(page.locator('#vectorMaskShape'),'ellipse');old=await revision();await page.locator('#vectorMaskFromSelection').click();await waitRev(old);await close();
  const ellipse=await png(1,'artwork','ellipse');yes('ellipse center retained',alpha(ellipse,[145,160])>200);eq('ellipse far outside hidden',alpha(ellipse,[240,160]),0);
  await menu();old=await revision();await page.locator('#vectorMaskRemove').click();await waitRev(old);await close();
  await clearSelection();await page.locator('#paint').click();await pen(50);
  await menu();old=await revision();await page.locator('#pixelMaskAdd').click();await waitRev(old);await page.locator('#maskEditingBar').waitFor({state:'visible'});
  old=await revision();await stroke([[120,160],[160,160]]);await waitRev(old);await page.locator('#doneMaskEditing').click();
  const hidden=await png(1,'artwork','pixel-mask-hide');eq('black mask hides pixel',alpha(hidden,[140,160]),0);yes('black mask preserves remote pixel',alpha(hidden,[240,160])>200);
  await menu();await page.locator('#pixelMaskAdd').click();await page.locator('#maskPaintReveal').click();old=await revision();await stroke([[120,160],[160,160]]);await waitRev(old);await page.locator('#doneMaskEditing').click();
  const revealed=await png(1,'artwork','pixel-mask-reveal');yes('white mask restores center',alpha(revealed,[140,160])>200);
  await menu();old=await revision();await page.locator('#vectorMaskRemove').click();await waitRev(old);await close();yes('pixel mask removal preserves entire artwork',before.data.equals((await png(1,'artwork','pixel-mask-removed')).data));
  await menu();await page.locator('#maskPathEdit').click();old=await revision();const corners=[[100,130],[190,130],[190,190],[100,190],[100,160],[100,130]];
  await page.mouse.move(...await coords(...corners[0]));await page.mouse.down();for(const pt of corners.slice(1))await page.mouse.move(...await coords(...pt));await page.mouse.up();await waitRev(old);
  const pathMask=await png(1,'artwork','path-mask');yes('path mask interior visible',alpha(pathMask,[140,160])>200);eq('path mask exterior hidden',alpha(pathMask,[240,160]),0);
  await menu();await page.locator('#maskPointEdit').click();old=await revision();await stroke([[100,160],[60,160]]);await waitRev(old);await page.locator('#doneMaskEditing').click();
  const edited=await png(1,'artwork','path-mask-edited');yes('point editing changes path mask coverage',!edited.data.equals(pathMask.data));yes('moved point extends visibility to the left',alpha(edited,[80,160])>alpha(pathMask,[80,160]));
  const editedFile=await saveCopy('edited-path-mask');await openFile(editedFile,512);yes('edited path mask survives native reopen',edited.data.equals((await png(1,'artwork','path-mask-edited-reopen')).data));
 },
 'HIS-005':async()=>{
  await fresh();await drawLine([[70,100],[180,100]]);const historical=await revision(),layer=await canvas.getAttribute('data-selected-layer-id');
  await drawLine([[70,200],[180,200]]);await drawLine([[270,200],[380,200]]);
  const before=await png(1,'artwork','before');await findCommand('履歴','履歴');await page.locator('#openArtworkHistory').click();
  const d=page.getByRole('dialog').filter({hasText:'作品の履歴'});await choose(d.locator('select:has(option[value="'+historical+'"])').first(),historical);
  await d.getByText('以前のレイヤーからコピー',{exact:true}).click();
  await choose(d.locator('select:has(option[value="'+layer+'"])').first(),layer);await button(d,'履歴ブラシを使う').click();
  await page.locator('#historyBrushBar').waitFor({state:'visible'});let old=await revision();await stroke([[90,200],[150,200]]);await waitRev(old);
  await page.locator('#doneHistoryBrush').click();const after=await png(1,'artwork','restored');
  yes('old stroke retained',alpha(after,[120,100])>0);yes('local restoration changed pixel',alpha(after,[120,200])<alpha(before,[120,200]));eq('remote stroke retained',rgba(after,320,200),rgba(before,320,200));
  await page.locator('#undo').evaluate(e=>e.click());await waitRev(old,true);yes('history restoration undo all pixels',before.data.equals((await png(1,'artwork','history-undo')).data));
  await selectRect([80,80],[160,120]);await findCommand('履歴','履歴');await page.locator('#openArtworkHistory').click();
  await choose(d.locator('select:has(option[value="'+historical+'"])').first(),historical);
  const comparisonRevision=await revision();await button(d,'原寸で比較').click();
  await d.locator('figure').nth(1).waitFor({timeout:60000});eq('comparison leaves revision unchanged',await revision(),comparisonRevision);
  await d.getByText('以前のレイヤーからコピー',{exact:true}).click();
  await choose(d.locator('select:has(option[value="'+layer+'"])').last(),layer);
  await button(d,'現在選んでいる範囲だけ').click();await waitRev(comparisonRevision);
  const partial=await png(1,'active','copied-region');yes('historical copy contains selected old stroke',alpha(partial,[120,100])>0);eq('historical region excludes newer stroke',alpha(partial,[120,200]),0);eq('outside selection excluded',alpha(partial,[170,100]),0);
  await page.locator('#undo').evaluate(e=>e.click());await waitRev(comparisonRevision,true);yes('partial-copy undo restores artwork',before.data.equals((await png(1,'artwork','copy-undo')).data));
  await clearSelection();await layerPage();let added=await revision();await page.locator('#addLayerPage').click();await waitRev(added);await page.locator('#closeLayerPage').click();
  await findCommand('履歴','履歴');await page.locator('#openArtworkHistory').click();await choose(d.locator('select:has(option[value="'+historical+'"])').first(),historical);
  await d.getByText('以前のレイヤーからコピー',{exact:true}).click();await choose(d.locator('select:has(option[value="'+layer+'"])').last(),layer);await button(d,'履歴ブラシを使う').click();
  const mismatch=page.locator('dialog.illustro-app-dialog[open]');await mismatch.getByText(/左上をそろえて/).waitFor();const mismatchRevision=await revision();await button(mismatch,'キャンセル').click();
  eq('different target cancellation keeps revision',await revision(),mismatchRevision);yes('history brush not activated on mismatched target after cancel',!await page.locator('#historyBrushBar').isVisible());
 },
 'GST-005':async()=>{
  await fresh();await findCommand('作業欄の設定','作業欄の設定');
  let p=page.locator('.c04-shortcut-settings');if(!await p.evaluate(e=>e.open))await p.locator('summary').click();
  await choose(p.locator('select:has(option[value="panView"])'),'panView');
  await choose(p.locator('select:has(option[value="hold"])'),'hold');
  await button(p,'キーを押して登録').click();await page.keyboard.press('j');await p.locator('.c04-shortcut-row').filter({hasText:'押している間だけ'}).waitFor();
  let dl=page.waitForEvent('download');await button(p,'キー設定を書き出す').click();const file=join(evidence,'keys.json');await (await dl).saveAs(file);
  const original=JSON.parse(await readFile(file,'utf8'));
  eq('real exported logical binding',original.bindings.find(b=>b.key==='j')?.physical,false);
  const unknown={commandId:'qa.unavailable-command',key:'u',code:'KeyU',ctrl:false,shift:false,alt:false,meta:false,physical:false,mode:'press'};
  const physical={...unknown,commandId:'panView',key:'q',code:'KeyH',physical:true,mode:'hold'};
  const mixed={...original,bindings:[...original.bindings,unknown,physical]};
  const input=join(evidence,'mixed-keys.json');await writeFile(input,JSON.stringify(mixed,null,2));
  await resetPage();await fresh();await findCommand('作業欄の設定','作業欄の設定');p=page.locator('.c04-shortcut-settings');if(!await p.evaluate(e=>e.open))await p.locator('summary').click();
  await p.locator('input[type=file]').setInputFiles(input);const d=page.locator('dialog.illustro-app-dialog[open]');await d.waitFor();
  yes('unsupported warning shown',/未対応の機能 1件/.test(await d.textContent()));
  await button(d,'確定').click();await p.locator('.c04-shortcut-row').filter({hasText:'qa.unavailable-command（今は未対応）'}).waitFor();
  const docId=await canvas.getAttribute('data-document-id');await saveIdle();await page.reload({waitUntil:'domcontentloaded'});await openArtwork(docId);
  await page.locator('#paint').click();
  await page.keyboard.down('j');eq('imported logical key after restart',await page.locator('#panView').getAttribute('aria-pressed'),'true');await page.keyboard.up('j');
  eq('release restores drawing tool',await page.locator('#paint').getAttribute('aria-pressed'),'true');
  const session=await context.newCDPSession(page);
  async function keyPair(key,code,expected,label){
   await session.send('Input.dispatchKeyEvent',{type:'keyDown',key,code});
   eq(label,await page.locator('#panView').getAttribute('aria-pressed'),expected);
   await session.send('Input.dispatchKeyEvent',{type:'keyUp',key,code});
   eq(label+' release',await page.locator('#paint').getAttribute('aria-pressed'),'true');
  }
  await keyPair('j','KeyZ','true','logical key follows character, not code');
  await keyPair('z','KeyH','true','physical binding follows code, not character');
  await keyPair('q','KeyQ','false','physical binding ignores character alone');
  const old=await revision();await page.keyboard.press('u');eq('unknown command does not edit',await revision(),old);eq('unknown command does not change active tool',await page.locator('#paint').getAttribute('aria-pressed'),'true');
  await findCommand('作業欄の設定','作業欄の設定');p=page.locator('.c04-shortcut-settings');if(!await p.evaluate(e=>e.open))await p.locator('summary').click();
  dl=page.waitForEvent('download');await button(p,'キー設定を書き出す').click();const output=join(evidence,'keys-after-restart.json');await (await dl).saveAs(output);
  const restored=JSON.parse(await readFile(output,'utf8'));eq('all supported and unsupported bindings preserved',restored.bindings,mixed.bindings);
 },
 'AUT-002':async()=>{
  await fresh();await pen(8);const root=await recordMacro();const first=await canvas.getAttribute('data-selected-layer-id');
  await page.locator('#addLayer').evaluate(e=>e.click());await page.waitForFunction(old=>document.querySelector('#canvas')?.dataset.selectedLayerId!==old,first);await idle();
  const second=await canvas.getAttribute('data-selected-layer-id');await button(root,'実行').click();const d=page.locator('dialog[aria-label="操作セットを確認"]');
  await d.locator('select:has(option[value="'+first+'"])').selectOption(first,{force:true});await d.getByLabel('縦のずれ（px）').fill('90');const old=await revision();
  await button(d,'この内容で実行').click();await page.getByRole('button',{name:'適用',exact:true}).filter({visible:true}).click();await waitRev(old);
  eq('selection not silently switched',await canvas.getAttribute('data-selected-layer-id'),second);
  const active=await png(1,'active','active'),all=await png(1,'artwork','all');eq('non-target layer remains empty',opaque(active).length,0);yes('requested target offset rendered',alpha(all,[120,190])>0);
  await openMacros();await button(root,'新しく作る').click();const commands=root.getByLabel('追加する操作',{exact:true});
  for(const value of ['layerOpacityAtRun','layerNameAtRun']){await choose(commands,value);await button(root,'操作を追加').click();}
  await root.getByLabel('操作セットの名前',{exact:true}).fill('QA parameter types');await button(root,'保存').click();
  await button(root,'実行').click();await choose(d.locator('select:has(option[value="'+first+'"])'),first);
  await d.getByLabel('不透明度を設定（%）',{exact:true}).fill('50');await d.getByLabel('レイヤー名を設定',{exact:true}).fill('QA renamed');
  const paramRevision=await revision();await button(d,'この内容で実行').click();await page.getByRole('button',{name:'適用',exact:true}).filter({visible:true}).click();await waitRev(paramRevision);
  await selectLayer(first);eq('text parameter set on intended layer',await canvas.getAttribute('data-selected-layer-name'),'QA renamed');
  const changed=await png(1,'artwork','param-opacity');yes('numeric opacity affects exported pixels',Math.abs(alpha(changed,[120,190])-Math.round(alpha(all,[120,190])/2))<=1);
  await selectLayer(second);await layerActions();await page.locator('#deleteLayer').click();const confirm=page.locator('dialog.illustro-app-dialog[open]');if(await confirm.isVisible())await button(confirm,'確定').click();await idle();
  if(await page.locator('#layerPage').isVisible())await page.locator('#closeLayerPage').click();
  await openMacros();await button(root,'実行').click();
  eq('deleted target unavailable in confirmation UI',await d.locator('option[value="'+second+'"]').count(),0);
  await button(d,'取り消す').click();
 },
 'UI-007':async()=>{
  await fresh();await drawLine([[70,100],[180,100]]);const before=await png(1,'artwork','before'),old=await revision();
  await viewMenu();await page.locator('#c04FocusToggle').click();eq('focus does not alter document',await revision(),old);await page.locator('#c04FocusExit').click();
  await full();await page.waitForFunction(()=>!!document.fullscreenElement||document.querySelector('#status')?.textContent?.includes('全画面表示を切り替えられません'),undefined,{timeout:10000});
  if(!await page.evaluate(()=>!!document.fullscreenElement)){const e=Error('Native fullscreen denied by browser');e.environment=true;throw e;}
  eq('fullscreen transition preserves revision',await revision(),old);
  await drawLine([[70,200],[180,200]]);await full();await page.waitForFunction(()=>!document.fullscreenElement);
  const after=await png(1,'artwork','after');eq('first stroke kept',rgba(after,120,100),rgba(before,120,100));yes('new stroke in fullscreen',alpha(after,[120,200])>0);
  const rev=await revision();await page.evaluate(()=>{document.documentElement.requestFullscreen=async()=>{throw new DOMException('audit permission denied','NotAllowedError');};});await full();await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('全画面表示を切り替えられません'));
  eq('denial leaves artwork unchanged',await revision(),rev);eq('fullscreen still inactive',await page.evaluate(()=>!!document.fullscreenElement),false);
 },
 'IO-006':async()=>{
  await fresh();await importRaster(join(fixture,'colors.png'));const src=await png(1,'artwork','source-colors');
  const {spawnSync}=await import('node:child_process');
  const ff=(args)=>{const x=spawnSync('ffmpeg',['-v','error',...args],{maxBuffer:16*1024*1024});if(x.status!==0)throw Error(x.stderr.toString());return x.stdout;};
  const lin=v=>v<=10?v/3294.6:((v/255+.055)/1.055)**2.4;
  const srgb=v=>Math.round(255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055));
  for(const format of ['avif','exr']){
    await page.locator('#fileActionsOpen').click();await page.locator('#exportImage').click();await page.locator('#exchangeExport').click();const d=page.getByRole('dialog',{name:'他の形式で書き出す'});
    await choose(d.locator('select:has(option[value="'+format+'"])'),format);
    if(format==='avif')await d.getByLabel('AVIFを可逆圧縮する',{exact:true}).check();
    const dl=page.waitForEvent('download',{timeout:90000});await button(d,'書き出す').click();const file=join(evidence,'image.'+format);await (await dl).saveAs(file);
    const data=await readFile(file);yes('real '+format+' signature',format==='avif'?data.subarray(4,8).toString()==='ftyp':data.subarray(0,4).toString('hex')==='762f3101');
    const probe=spawnSync('ffprobe',['-v','error','-show_entries','stream=width,height','-of','json',file],{encoding:'utf8'});if(probe.status!==0)throw Error(probe.stderr);const stream=JSON.parse(probe.stdout).streams[0];eq(format+' decoded size',[stream.width,stream.height],[128,96]);
    if(format==='exr'){
      const raw=ff(['-i',file,'-f','rawvideo','-pix_fmt','gbrapf32le','-']);let max=0,n=src.width*src.height;eq('EXR buffer length',raw.length,n*16);
      for(let i=0;i<n;i++){const a=src.data[i*4+3]/255;for(const [plane,channel] of [[0,1],[1,2],[2,0],[3,3]])max=Math.max(max,Math.abs(raw.readFloatLE((plane*n+i)*4)-(channel===3?a:lin(src.data[i*4+channel])*a)));}
      await writeFile(join(evidence,'exr-float-oracle.json'),JSON.stringify({max}));yes('EXR all linear color and alpha channels match',max<.000001);
    }else{
      const decoded=join(evidence,'avif-decoded.png');const p=spawnSync('heif-convert',[file,decoded],{encoding:'utf8'});if(p.status!==0)throw Error(p.stderr);
      const im=PNG.sync.read(await readFile(decoded));let maxAlpha=0,maxColor=0;for(let i=3;i<im.data.length;i+=4)maxAlpha=Math.max(maxAlpha,Math.abs(im.data[i]-src.data[i]));
      for(const y of [24,72])for(const x of [16,48,80,112])for(let k=0;k<3;k++)maxColor=Math.max(maxColor,Math.abs(rgba(im,x,y)[k]-rgba(src,x,y)[k]));
      await writeFile(join(evidence,'avif-oracle.json'),JSON.stringify({maxAlpha,maxColor}));eq('AVIF exact alpha',maxAlpha,0);yes('AVIF lossless center color tolerance',maxColor<=2);
    }
    await button(d,'閉じる').click();
  }
  for(const format of ['avif','exr','heic']){
    const old=await canvas.getAttribute('data-document-id'),file=join(fixture,'colors.'+format);
    await page.locator('#openFile').setInputFiles(file);
    let outcome='';
    for(let i=0;i<4;i++){
      const edit=button(page,'編集用に開く'),profile=button(page,'プロファイルに従って色を変換');
      const result=await Promise.race([page.waitForFunction(old=>{const c=document.querySelector('#canvas');return c?.dataset.documentId!==old&&c?.dataset.view!=='null'&&!document.querySelector('#brush')?.disabled;},old,{timeout:60000}).then(()=> 'opened'),edit.waitFor({state:'visible',timeout:60000}).then(()=> 'edit'),profile.waitFor({state:'visible',timeout:60000}).then(()=> 'profile'),page.locator('#status').filter({hasText:/交換用ファイルを開けません/}).waitFor({timeout:60000}).then(()=> 'unsupported')]);
      if(result==='edit'){await edit.click();continue;}if(result==='profile'){await profile.click();continue;}outcome=result;break;
    }
    if(format==='heic'&&outcome==='unsupported'){yes('HEIF explicit unsupported notice',/HEIF画像を開けません/.test(await page.locator('#status').textContent()));eq('unsupported HEIF preserves original work',await canvas.getAttribute('data-document-id'),old);continue;}
    eq(format+' real fixture opened',outcome,'opened');await idle();const im=await png(1,'artwork','imported-'+format);eq(format+' import size',[im.width,im.height],[128,96]);
    if(format==='exr'){
      const raw=ff(['-i',file,'-f','rawvideo','-pix_fmt','gbrapf32le','-']);let n=128*96,max=0;
      for(let i=0;i<n;i++){let a=Math.max(0,Math.min(1,raw.readFloatLE((3*n+i)*4)));max=Math.max(max,Math.abs(im.data[i*4+3]-Math.round(a*255)));for(const [plane,c] of [[0,1],[1,2],[2,0]])if(a)max=Math.max(max,Math.abs(im.data[i*4+c]-srgb(Math.max(0,Math.min(1,raw.readFloatLE((plane*n+i)*4)/a)))));}
      await writeFile(join(evidence,'exr-import-oracle.json'),JSON.stringify({max}));yes('EXR import matches independently decoded SDR RGBA',max<=1);
    }else{
      let max=0;for(const y of [24,72])for(const x of [16,48,80,112]){if(format==='heic'&&x===112&&y===72)continue;for(let k=0;k<4;k++)max=Math.max(max,Math.abs(rgba(im,x,y)[k]-rgba(src,x,y)[k]));}
      await writeFile(join(evidence,format+'-import-oracle.json'),JSON.stringify({max}));yes(format+' independently checked fixture colors',max<=25);
    }
  }
 },
 'COL-008':async()=>{
  await fresh();await importRaster(join(fixture,'colors.png'));
  const before=await png(1,'artwork','original-before'),old=await revision();
  eq('known colored fixture size',[before.width,before.height],[128,96]);
  const red=rgba(before,16,72);yes('fixture has saturated red',red[0]>240&&red[1]<15&&red[2]<15);
  await page.locator('#eyedropper').click();await page.mouse.click(...await coords(16,72));
  await page.locator('#status').filter({hasText:/キャンバスから .* を取得しました/}).waitFor();
  const sampleBefore=await page.locator('#status').textContent();
  await page.locator('#fileActionsOpen').click();await page.locator('#exportImage').click();await page.locator('#exchangeExport').click();
  const d=page.getByRole('dialog',{name:'他の形式で書き出す'});await d.getByText('印刷時の大きさ',{exact:true}).click();
  const bleed=d.getByLabel('片側の塗り足し（mm）',{exact:true});await bleed.fill('0');await bleed.press('Tab');eq('bleed excluded from pixel comparison',await bleed.inputValue(),'0');
  await d.getByLabel('出力先のICCプロファイル（確認用）',{exact:true}).setInputFiles(join(fixture,'narrow.icc'));
  const gamut=d.getByLabel('出力先の範囲外の色をピンクで強調する',{exact:true});
  const black=d.getByLabel('出力先に合わせて黒を補正する',{exact:true});
  const intent=d.locator('select:has(option[value="3"]):has(option[value="2"])').first();
  const display=d.locator('select:has(option[value="original"]):has(option[value="proof"])');
  const p=d.getByLabel('透明部分と仕上がり線を表示する出力前の作品全体',{exact:true});
  async function capture(name){
   await p.waitFor({state:'visible'});const img=await p.evaluate(c=>({width:c.width,height:c.height,data:[...c.getContext('2d').getImageData(0,0,c.width,c.height).data]}));
   await writeFile(join(evidence,name+'.png'),PNG.sync.write({width:img.width,height:img.height,data:Buffer.from(img.data)}));
   return {width:img.width,height:img.height,data:Buffer.from(img.data)};
  }
  const pinkCount=img=>{let n=0;for(let i=0;i<img.data.length;i+=4)if(img.data[i]===255&&img.data[i+1]===45&&img.data[i+2]===140&&img.data[i+3]>0)n++;return n;};
  async function proof(name){
   await button(d,'出力先の色を確認').click();await d.getByText(/作品と出力ファイルの色は変更されません/).waitFor({timeout:90000});return capture(name);
  }
  await gamut.check();const warned=await proof('gamut-warning');
  yes('actual pink warning pixels present',pinkCount(warned)>0);
  await choose(display,'original');const original=await capture('original-preview');eq('original view has no warning pixels',pinkCount(original),0);
  yes('proof differs from original',!warned.data.equals(original.data));
  await choose(display,'proof');const warningAgain=await capture('warning-again');{
   let count=0,max=0;
   for(let i=0;i<warned.data.length;i+=4){
    const a=warned.data[i+3],z=warningAgain.data[i+3];let error=Math.abs(a-z);
    for(let k=0;k<3;k++)error=Math.max(error,Math.abs(Math.round(warned.data[i+k]*a/255)-Math.round(warningAgain.data[i+k]*z/255)));
    if(error>0){count++;max=Math.max(max,error);}
   }
   await writeFile(join(evidence,'proof-toggle-difference.json'),JSON.stringify({differentPixels:count,maxPremultipliedDelta:max,bleed:0}));
   eq('display toggle restores proof (premultiplied pixels, no bleed)',count,0);
  }
  await choose(display,'original');const originalAgain=await capture('original-again');yes('original toggle stable',originalAgain.data.equals(original.data));
  await choose(display,'proof');
  const rawDelta=(a,b)=>{let count=0,max=0;for(let i=0;i<a.data.length;i+=4){let d=0;for(let k=0;k<4;k++)d=Math.max(d,Math.abs(a.data[i+k]-b.data[i+k]));if(d){count++;max=Math.max(max,d);}}return {count,max};};
  const noGuideRaw=rawDelta(warned,warningAgain);
  await bleed.fill('3');await bleed.press('Tab');const guided=await capture('guided-proof');
  await choose(display,'original');await capture('guided-original');await choose(display,'proof');const guidedAgain=await capture('guided-proof-again');
  const withGuideRaw=rawDelta(guided,guidedAgain);
  await bleed.fill('0');await bleed.press('Tab');const restoredNoGuide=await capture('guide-removed');
  const restoredRaw=rawDelta(warned,restoredNoGuide);
  await writeFile(join(evidence,'proof-isolation-factor.json'),JSON.stringify({noGuideRaw,withGuideRaw,restoredRaw}));
  eq('guide removed restores same proof',restoredRaw.count,0);
  eq('same guide same proof',withGuideRaw.count,0);
  eq('zero guide raw comparison',noGuideRaw.count,0);
  for(let k=0;k<5;k++){await choose(display,'original');await choose(display,'proof');}
  eq('repeated switching stable',rawDelta(warned,await capture('rapid-switch')).count,0);
  await gamut.uncheck();const noWarning=await proof('no-warning');eq('warning disabled removes pink pixels',pinkCount(noWarning),0);
  await black.uncheck();await choose(intent,'0');const perceptual=await proof('perceptual-no-black-point');
  eq('intent is selected','0',await intent.inputValue());eq('black point disabled',await black.isChecked(),false);
  yes('alternate proof has valid dimensions',perceptual.width===noWarning.width&&perceptual.height===noWarning.height);
  await black.check();await choose(intent,'2');await proof('saturation-with-black-point');
  await choose(intent,'3');await proof('absolute');
  await button(d,'閉じる').click();
  eq('proof does not alter revision',await revision(),old);
  const after=await png(1,'artwork','original-after');yes('normal PNG identical pixel for pixel',before.data.equals(after.data));
  await page.locator('#eyedropper').click();await page.mouse.click(...await coords(16,72));
  await page.locator('#status').filter({hasText:/キャンバスから .* を取得しました/}).waitFor();
  eq('eyedropper unchanged after proof',await page.locator('#status').textContent(),sampleBefore);
 },

};
let result={id,status:'ERROR',checks,reason:'not started'};
try{
 const release=await (await page.request.get(base+'release.json')).json();if(release.sourceCommit!==expected||release.isolatedStorage!==true)throw Error('Unexpected built release');
 if(!cases[id])throw Error('No new browser scenario for '+id);
 await cases[id]();result={id,status:'PASS',checks,reason:'Implemented subchecks passed, see manifest for coverage gaps'};
}catch(error){
 result={id,status:error.auditFailure?'FAIL':error.environment?'ENV_LIMIT':'ERROR',checks,reason:String(error.stack??error)};
 await page.screenshot({path:join(evidence,'failure.png'),fullPage:true}).catch(()=>{});
 await writeFile(join(evidence,'page-state.json'),JSON.stringify(await page.evaluate(()=>({status:document.querySelector('#status')?.textContent,canvas:document.querySelector('#canvas')?.dataset,outputs:[...document.querySelectorAll('output,[role=status]')].map(e=>e.textContent).filter(Boolean).slice(-25)})).catch(()=>null),null,2));
}finally{
 await writeFile(join(evidence,'browser.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();await rm(temp,{recursive:true,force:true});
}
if(result.status!=='PASS')process.exitCode=1;
