import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const {PNG}=require(process.env.PREP_PNG_PATH??'pngjs');
const base=(process.env.R2_AUDIT_FIX_URL??'https://totoro0419.github.io/illustro/r2-audit-fixes-round2/').replace(/\/$/,'')+'/';
const id=process.argv[2],expected=process.env.EXPECTED_COMMIT_SHA;
const browser=await chromium.launch({headless:true,...(process.env.R2_CHROME_CHANNEL?{channel:process.env.R2_CHROME_CHANNEL}:{}),args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
let page=await context.newPage(),canvas=page.locator('#canvas');
const log=x=>console.log('PASS '+id+' '+x);
const idle=()=>page.waitForFunction(()=>document.querySelector('#canvas')?.dataset.historyBusy==='false',undefined,{timeout:60000});
const revision=()=>canvas.getAttribute('data-revision-id');
const waitRev=async(old,equal=false)=>{await page.waitForFunction(({old,equal})=> (document.querySelector('#canvas')?.dataset.revisionId===old)===equal,{old,equal},{timeout:60000});await idle();};
async function coords(x,y){const b=await canvas.boundingBox(),v=JSON.parse(await canvas.getAttribute('data-view'));assert.ok(b&&v.zoom>0);assert.equal(v.rotation,0);return [b.x+v.cssWidth/2+v.panX+(x-v.documentWidth/2)*v.zoom,b.y+v.cssHeight/2+v.panY+(y-v.documentHeight/2)*v.zoom];}
async function stroke(points){await page.mouse.move(...await coords(...points[0]));await page.mouse.down();for(const p of points.slice(1))await page.mouse.move(...await coords(...p),{steps:18});await page.mouse.up();}
async function pen(size){const value=await page.locator('#brush option').evaluateAll(opts=>opts.find(o=>o.value==='foundation-technical')?.value);assert.ok(value,'Millipen missing');await page.locator('#brush').selectOption(value,{force:true});await page.locator('#sizeNumber').fill(String(size));await page.locator('#sizeNumber').press('Enter');assert.equal(Number(await page.locator('#sizeNumber').inputValue()),size);}
const strokes=n=>page.waitForFunction(n=>Number(document.querySelector('#canvas')?.dataset.committedStrokes)===n&&document.querySelector('#canvas')?.dataset.historyBusy==='false',n,{timeout:60000});
async function image(){await page.mouse.move(3,3);await page.waitForTimeout(300);const box=await canvas.boundingBox(),view=JSON.parse(await canvas.getAttribute('data-view'));return {png:PNG.sync.read(await canvas.screenshot()),box,view};}
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
try{
 const release=await (await page.request.get(base+'release.json')).json();
 assert.equal(release.sourceCommit,expected);assert.equal(release.isolatedStorage,true);
 if(id==='D-019'){
   await page.goto(base+'#settings',{waitUntil:'domcontentloaded'});
   const language=page.locator('#ihLanguageSettings select'),mode=page.locator('#colorPickerMode');
   await language.selectOption('en',{force:true});
   assert.equal(await language.getAttribute('aria-label'),'Interface language');
   assert.equal(await mode.getAttribute('aria-label'),'Color picker mode');
   assert.equal(await mode.getAttribute('title'),'Color picker mode');
   assert.equal(await mode.locator('option[value=classic]').textContent(),'Classic');
   assert.equal(await mode.locator('option[value=orbit]').textContent(),'Orbit');
   await mode.selectOption('orbit',{force:true});
   assert.equal(await page.locator('#colorOrbitPicker').getAttribute('aria-label'),'Orbit color picker');
   await language.selectOption('ja',{force:true});
   assert.equal(await language.getAttribute('aria-label'),'表示言語');
   assert.equal(await mode.getAttribute('aria-label'),'色選択の表示モード');
   assert.equal(await mode.locator('option[value=orbit]').textContent(),'オービット');
   log('ENGLISH-JAPANESE-OPTIONS-AND-ACCESSIBLE-NAMES');
 }else if(id==='D-016'){
   await fresh();await pen(8);
   let root=await openMacros();log('HISTORY-AUTOMATION-ENTRY');
   await button(root,'操作の記録を開始').click();
   await stroke([[90,100],[150,100]]);await idle();
   await button(root,'操作の記録を停止').evaluate(e=>e.click());
   await root.getByText('記録したブラシの線',{exact:false}).waitFor();
   await root.getByLabel('操作セットの名前',{exact:true}).fill('Round2 recording');
   await button(root,'保存').click();assert.ok((await root.locator('output').textContent()).includes('保存しました'));
   await findCommand('自動操作','操作セットを記録・再生');root=page.locator('.c04-simple-macros');
   assert.equal(await root.evaluate(e=>e.open),true);log('SEARCH-ENTRY-AND-RECORDED-SAVED-MACRO');
   const before=await revision(),points=[[120,100],[120,190]],old=await samples(await image(),points);
   await button(root,'実行').click();
   let confirm=page.locator('dialog[aria-label="操作セットを確認"]');
   await confirm.waitFor();await button(confirm,'取り消す').click();
   assert.equal(await revision(),before);log('CANCEL-NO-EDIT');
   await button(root,'実行').click();confirm=page.locator('dialog[aria-label="操作セットを確認"]');
   await confirm.getByLabel('縦のずれ（px）').fill('90');
   await button(confirm,'この内容で実行').click();
   // The existing engine deliberately requires a second, visual confirmation.
   await page.getByRole('button',{name:'適用',exact:true}).filter({visible:true}).click();await waitRev(before);
   const after=await revision(),now=await samples(await image(),points);
   assert.deepEqual(now[0],old[0]);assert.notDeepEqual(now[1],old[1]);
   await history(before,after,points,old,now);log('SAVED-MACRO-REPLAYED-REAL-STROKE');
 }else if(id==='D-017'){
   await fresh();await pen(4);
   await page.locator('#workspaceEffects').click();
   await page.mouse.click(...await coords(120,120));await idle();
   await page.mouse.click(...await coords(200,170));
   await page.locator('#effectsBoxBody button').filter({hasText:'画像から候補を出す'}).first().evaluate(e=>e.click());
   const dialog=page.locator('dialog.export-dialog[aria-label="画像から候補を出す"]');
   await dialog.waitFor();
   await dialog.locator('select:has(option[value="specks"])').first().selectOption('specks',{force:true});
   const run=button(dialog,'候補を計算');
   await page.waitForFunction(()=>{const d=document.querySelector('dialog.export-dialog[aria-label="画像から候補を出す"]');return !!d&&![...d.querySelectorAll('button')].find(b=>b.textContent==='候補を計算')?.disabled;},undefined,{timeout:30000});
   await run.click();
   const candidates=dialog.locator('label:has(input[type=checkbox])').filter({hasText:/ごみ候補\s+\d/});
   await candidates.first().waitFor({timeout:45000});assert.equal(await candidates.count(),2);
   const labels=await candidates.allTextContents(),points=labels.map(label=>{const m=label.match(/ごみ候補\s+(\d+),\s*(\d+)/);assert.ok(m);return [Number(m[1]),Number(m[2])];});
   await candidates.nth(0).locator('input').check();await candidates.nth(1).locator('input').uncheck();
   const before=await revision();
   await button(dialog,'選んだ内容を採用する').click();await dialog.waitFor({state:'hidden'});await waitRev(before);
   const after=await revision(),removed=await samples(await image(),points);
   await page.locator('#undo').evaluate(e=>e.click());await waitRev(before,true);
   const original=await samples(await image(),points);
   assert.notDeepEqual(removed[0],original[0]);assert.deepEqual(removed[1],original[1]);
   await page.locator('#redo').evaluate(e=>e.click());await waitRev(after,true);
   assert.deepEqual(await samples(await image(),points),removed);log('IMMEDIATE-DRAW-ANALYZE-SELECTIVE-REMOVE-UNDO');
 }else if(id==='D-018'){
   await fresh();await findCommand('作業欄の設定','作業欄の設定');
   const settings=page.locator('#workspaceBoxBody details').filter({has:page.locator('select:has(option[value=extra])')}).first();
   await settings.locator('summary').click();
   const text=settings.locator('select:has(option[value=extra])'),density=settings.locator('select:has(option[value=roomy])'),grid=settings.locator('.c06-clipboard-grid');
   const columns=()=>grid.evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
   assert.equal(await columns(),2);
   for(const width of [288,344,440]){
     await page.locator('#width').evaluate((e,w)=>{e.value=String(w);e.dispatchEvent(new Event('input',{bubbles:true}));},width);
     for(const size of ['large','extra']){
       await text.selectOption(size,{force:true});await density.selectOption('roomy',{force:true});
       assert.equal(await columns(),1);
       assert.equal(await grid.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,'accessibility grid overflows at '+width);
       assert.equal(await grid.evaluate(e=>[...e.children].every(c=>c.getBoundingClientRect().right<=e.getBoundingClientRect().right+1)),true);
     }
   }
   await text.selectOption('standard',{force:true});await density.selectOption('standard',{force:true});assert.equal(await columns(),2);log('344PX-AND-OTHER-WIDTHS-ONE-COLUMN-WITHOUT-OVERFLOW');
 }else if(id==='D-020'){
   await fresh();await findCommand('作業欄の設定','作業欄の設定');
   const settings=page.locator('.c04-shortcut-settings');await settings.locator('summary').click();
   await settings.getByLabel('登録する機能',{exact:true}).selectOption('panView',{force:true});
   await settings.getByLabel('キーを押したときの動作',{exact:true}).selectOption('hold',{force:true});
   await button(settings,'キーを押して登録').click();await page.keyboard.press('j');
   await settings.locator('.c04-shortcut-row').filter({hasText:'押している間だけ'}).waitFor();
   await page.locator('#paint').click();
   // Fit-to-window clamps pan to zero. Zoom so a real pan is possible.
   await page.locator('#zoomIn').evaluate(e=>e.click());await page.locator('#zoomIn').evaluate(e=>e.click());
   await page.waitForFunction(()=>JSON.parse(document.querySelector('#canvas')?.dataset.view??'{}').zoom>2.5);
   assert.equal(await page.locator('#panView').getAttribute('aria-pressed'),'false');
   await page.keyboard.down('j');assert.equal(await page.locator('#panView').getAttribute('aria-pressed'),'true');
   await page.locator('#shortcutHoldIndicator').waitFor({state:'visible'});
   const oldView=JSON.parse(await canvas.getAttribute('data-view')),before=await revision();
   const b=await canvas.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+70,b.y+b.height/2+40,{steps:8});await page.mouse.up();
   await page.waitForFunction(old=>{const v=JSON.parse(document.querySelector('#canvas')?.dataset.view??'{}');return v.panX!==old.panX||v.panY!==old.panY;},oldView,{timeout:5000});
   const newView=JSON.parse(await canvas.getAttribute('data-view'));assert.notDeepEqual([newView.panX,newView.panY],[oldView.panX,oldView.panY]);assert.equal(await revision(),before);
   await page.keyboard.up('j');await page.waitForFunction(()=>document.querySelector('#panView')?.getAttribute('aria-pressed')==='false');await page.locator('#shortcutHoldIndicator').waitFor({state:'hidden'});
   assert.equal(await page.locator('#paint').getAttribute('aria-pressed'),'true');
   await page.keyboard.down('j');await page.locator('#erase').click();await page.keyboard.up('j');
   assert.equal(await page.locator('#erase').getAttribute('aria-pressed'),'true');
   log('VISIBLE-HOLD-MODE-REAL-PAN-RELEASE-MANUAL-TOOL-PRESERVED');
 }else if(id==='D-021'){
   await fresh();await pen(9);await stroke([[70,120],[180,120]]);await idle();
   await page.locator('#selection').click();const sel=page.locator('[data-tool-panel="selection"]');
   const rect=button(sel,'四角形');if(await rect.getAttribute('aria-pressed')!=='true')await rect.click();
   await stroke([[200,80],[400,280]]);await sel.getByText('選択範囲を更新しました。',{exact:true}).waitFor();
   await sel.getByRole('checkbox',{name:'選択の境界を表示する（隠しても選択は有効）',exact:true}).uncheck();
   await page.locator('#paint').click();await pen(12);
   const before=await revision();await stroke([[230,200],[350,200]]);await waitRev(before);
   const after=await revision(),points=[[120,120],[290,200],[450,340]],colors=await samples(await image(),points);
   const layer=await canvas.getAttribute('data-selected-layer-id'),doc=await canvas.getAttribute('data-document-id');
   const first=await saveCopy('first'),manifest=await readNativeManifest(first);
   assert.ok(manifest.sections.some(s=>s.id==='partial-raster-support'&&s.required===true),'actual partial raster section missing');
   await openFile(first,512);assert.equal(await canvas.getAttribute('data-document-id'),doc);assert.equal(await canvas.getAttribute('data-selected-layer-id'),layer);assert.equal(await revision(),after);
   assert.deepEqual(await samples(await image(),points),colors);
   await page.locator('#undo').evaluate(e=>e.click());await waitRev(before,true);
   assert.notDeepEqual((await samples(await image(),points))[1],colors[1]);
   await page.locator('#redo').evaluate(e=>e.click());await waitRev(after,true);assert.deepEqual(await samples(await image(),points),colors);
   const second=await saveCopy('second');await openFile(second,512);assert.equal(await revision(),after);assert.deepEqual(await samples(await image(),points),colors);
   log('DOWNLOAD-CLOSE-OPEN-PIXELS-UNDO-REDO-RESAVE-REOPEN');
 }else throw Error('unknown check '+id);
}catch(error){console.error('FAIL '+id,error);console.error(await page.evaluate(()=>({canvas:document.querySelector('#canvas')?.dataset,outputs:[...document.querySelectorAll('output,[role=status]')].map(e=>e.textContent).filter(Boolean).slice(-25)})).catch(()=>null));await page.screenshot({path:'r2-'+id+'-failure.png',fullPage:true}).catch(()=>{});throw error;}
finally{await browser.close();await rm(temp,{recursive:true,force:true});}
