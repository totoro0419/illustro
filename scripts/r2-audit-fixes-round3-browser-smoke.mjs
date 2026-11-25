import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const {PNG}=require(process.env.PREP_PNG_PATH??'pngjs');
const base=(process.env.R2_AUDIT_FIX_URL??'https://totoro0419.github.io/illustro/r2-audit-fixes-round3/').replace(/\/$/,'')+'/';
const id=process.argv[2],expected=process.env.EXPECTED_COMMIT_SHA;
const browser=await chromium.launch({headless:true,...(process.env.R2_CHROME_CHANNEL?{channel:process.env.R2_CHROME_CHANNEL}:{}),args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:true});
const page=await context.newPage(),canvas=page.locator('#canvas');
const dir=await mkdtemp(join(tmpdir(),'illustro-r3-'));
const b=(name,root=page)=>root.getByRole('button',{name,exact:true});
const wait=async f=>page.waitForFunction(f,undefined,{timeout:60000});
const idle=()=>wait(()=>document.querySelector('#canvas')?.dataset.historyBusy==='false'&&!document.querySelector('#brush')?.disabled);
const doc=()=>canvas.getAttribute('data-document-id');
const rev=()=>canvas.getAttribute('data-revision-id');
const change=async before=>{await page.waitForFunction(old=>document.querySelector('#canvas')?.dataset.revisionId!==old,before,{timeout:60000});await idle();};
async function create(name){
  await page.locator('#ihStart').click();
  await page.locator('#ihNewName').evaluate((input,n)=>{input.value=n;input.dispatchEvent(new Event('input',{bubbles:true}));},name);
  const setup=page.locator('#ihCanvasSetup');
  if(!await setup.evaluate(e=>e.open))await setup.locator(':scope > summary').click();
  await page.locator('#ihNewWidth').fill('512');await page.locator('#ihNewHeight').fill('384');
  await page.locator('#ihNewBackground').selectOption('transparent',{force:true});
  await page.locator('#ihNewCreate').click();await canvas.waitFor({state:'visible'});await idle();
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
async function importReference(){
  const root=await openBox('assetsBox');
  await root.getByLabel('素材の種類',{exact:true}).selectOption('brush');
  await root.getByLabel('取り込む素材の種類',{exact:true}).selectOption('reference');
  const png=new PNG({width:96,height:96});for(let i=0;i<png.data.length;i+=4)png.data.set([180,47,115,255],i);
  await root.locator('input[type=file]').first().setInputFiles({name:'round3-reference.png',mimeType:'image/png',buffer:PNG.sync.write(png)});
  await b('追加した素材を見る',root).waitFor({timeout:30000});
  assert.equal(await root.locator('.c05-asset-entry').count(),0,'filtered material should initially be hidden');
  await b('追加した素材を見る',root).click();
  const entry=root.locator('[data-round3-new]').filter({hasText:'round3-reference.png'});
  await entry.waitFor({state:'visible'});return {root,entry};
}
async function metadata(entry,tag,origin){
  await b('整理',entry).click();const d=page.getByRole('dialog').filter({hasText:'素材の整理'});
  await d.waitFor();const original=await d.getByLabel('素材名',{exact:true}).inputValue();
  await d.getByLabel('タグ（カンマ区切り）',{exact:true}).fill(tag);
  if(origin)await d.getByLabel('出典・作成元',{exact:true}).fill(origin);
  await b('保存',d).click();await d.waitFor({state:'hidden'});return original;
}
async function shape(){
  await page.locator('#shapes').click();
  const panel=page.locator('[data-tool-panel=shapes]');await panel.waitFor({state:'visible'});
  if(!await panel.evaluate(e=>e.open))await panel.locator('summary').click();
  await b('新しく作る',panel).click();
  await panel.getByLabel('形',{exact:true}).selectOption('rectangle');
  await panel.getByLabel('保存する形式',{exact:true}).selectOption('vector');
  await panel.getByLabel('内側を塗る',{exact:true}).uncheck();
  for(const [name,value] of [['始点 X','100'],['始点 Y','90'],['終点 X','300'],['終点 Y','250']])
    await panel.getByLabel(name,{exact:true}).fill(value);
  const before=await rev();await b('適用',panel).click();await change(before);
  return panel;
}
async function coords(x,y){
  const box=await canvas.boundingBox(),v=JSON.parse(await canvas.getAttribute('data-view'));assert.ok(box&&v.zoom>0);assert.equal(v.rotation,0);
  return [box.x+v.cssWidth/2+v.panX+(x-v.documentWidth/2)*v.zoom,box.y+v.cssHeight/2+v.panY+(y-v.documentHeight/2)*v.zoom];
}
async function exportSvg(){
  await page.locator('#fileActionsOpen').click();await page.locator('#exportImage').click();await page.locator('#exchangeExport').click();
  const d=page.getByRole('dialog',{name:'他の形式で書き出す'});await d.waitFor();
  await d.getByLabel('形式',{exact:true}).selectOption('svg');await d.getByLabel('出力内容',{exact:true}).selectOption('layered');
  const download=page.waitForEvent('download',{timeout:60000});await b('書き出す',d).click();
  const file=join(dir,'round3.svg');await (await download).saveAs(file);await b('閉じる',d).click();return file;
}
async function openSvg(file){
  const old=await doc();await page.locator('#openFile').setInputFiles(file);
  await b('編集用に開く').click();
  await page.waitForFunction(old=>document.querySelector('#canvas')?.dataset.documentId!==old,old,{timeout:60000});await idle();
}
async function verifyRelease(){
  const r=await page.request.get(base+'release.json');assert.ok(r.ok());const release=await r.json();
  assert.equal(release.sourceCommit,expected);assert.equal(release.isolatedStorage,true);
}
async function assertRailClear(frame){
  const f=await frame.boundingBox(),r=await page.locator('.rail').boundingBox();
  assert.ok(f&&r);assert.ok(f.x+f.width<=r.x||f.x>=r.x+r.width||f.y+f.height<=r.y||f.y>=r.y+r.height,'reference covers fixed toolbar');
  await page.locator('#allFeatures').click();await page.locator('#allFeaturesPanel').waitFor({state:'visible'});await page.locator('#featuresClose').click();
}
try{
  await verifyRelease();await page.goto(base+'?backend=webgl2&r3='+id+'#home',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#ihStart').waitFor({timeout:60000});await create('round3-A');
  if(['D-022','D-023','D-024','D-027'].includes(id)){
    const {root,entry}=await importReference();
    if(id==='D-022'){
      await b('プレビュー',entry).click();await page.locator('dialog.c05-asset-preview').waitFor();await b('閉じる',page.locator('dialog.c05-asset-preview')).click();
      await b('元の絞り込みに戻す',root).click();assert.equal(await root.getByLabel('素材の種類',{exact:true}).inputValue(),'brush');assert.equal(await entry.count(),0);
    }
    if(id==='D-023'){
      const name=await metadata(entry,'round3-tag',null);await b('整理',entry).click();
      const d=page.getByRole('dialog').filter({hasText:'素材の整理'});
      assert.equal(await d.getByLabel('素材名',{exact:true}).inputValue(),name);assert.match(await d.getByLabel('タグ（カンマ区切り）',{exact:true}).inputValue(),/round3-tag/);
      await d.getByLabel('タグ（カンマ区切り）',{exact:true}).fill('cancelled');await b('キャンセル',d).click();
      await b('整理',entry).click();assert.match(await d.getByLabel('タグ（カンマ区切り）',{exact:true}).inputValue(),/round3-tag/);await b('キャンセル',d).click();
    }
    if(id==='D-024'||id==='D-027'){
      if(id==='D-027')await metadata(entry,'sample','Round3 test origin');
      await b('参考資料として開く',entry).click();const frame=page.locator('.c05-reference-frame').first();await frame.waitFor({timeout:30000});
      if(id==='D-024'){
        await assertRailClear(frame);const p=await frame.boundingBox();assert.ok(p);
        const heading=await frame.locator('.c05-reference-heading').boundingBox();assert.ok(heading);
        await page.mouse.move(heading.x+heading.width/2,heading.y+8);await page.mouse.down();await page.mouse.move(heading.x+heading.width/2+30,heading.y+28,{steps:8});await page.mouse.up();
        const moved=await frame.boundingBox();assert.ok(moved);assert.notEqual(moved.x,p.x);
        await page.waitForTimeout(700);await page.reload({waitUntil:'domcontentloaded'});await page.locator('#ihNavWorks').click();
        await page.locator('#ihWorkGrid .ih-work-card').first().click();await idle();
        await frame.waitFor({timeout:30000});const restored=await frame.boundingBox();assert.ok(restored);assert.ok(Math.abs(restored.x-moved.x)<2&&Math.abs(restored.y-moved.y)<2,'saved position changed');
      }else{
        await b('画像上で直接採色',frame).click();
        await frame.locator('.c05-reference-image-area img').click();await page.locator('#colorPage').click();
        await page.locator('#colorShowPalette').click();
        const source=page.getByRole('button',{name:/採色元を確認：round3-reference/});await source.click();
        const d=page.getByRole('dialog').filter({hasText:'Round3 test origin'});await d.waitFor();await b('閉じる',d).click();
        await page.reload({waitUntil:'domcontentloaded'});await page.locator('#ihNavWorks').click();
        await page.locator('#ihWorkGrid .ih-work-card').first().click();await idle();await page.locator('#colorPage').click();await page.locator('#colorShowPalette').click();
        await source.click();await d.waitFor();assert.match(await d.textContent(),/Round3 test origin/);await b('閉じる',d).click();
      }
    }
  }else if(id==='D-025'){
    await shape();const file=await exportSvg();const svg=await readFile(file,'utf8');assert.match(svg,/<rect /);
    await openSvg(file);await page.locator('#shapes').click();const panel=page.locator('[data-tool-panel=shapes]');
    if(!await panel.evaluate(e=>e.open))await panel.locator('summary').click();
    await b('選んだレイヤーを編集',panel).click();
    assert.equal(await panel.getByLabel('形',{exact:true}).inputValue(),'rectangle');
    for(const [name,value] of [['始点 X',100],['始点 Y',90],['終点 X',300],['終点 Y',250]])assert.equal(Number(await panel.getByLabel(name,{exact:true}).inputValue()),value);
    const old=await rev();await panel.getByLabel('終点 X',{exact:true}).fill('320');await b('適用',panel).click();await change(old);
    const second=await exportSvg();assert.match(await readFile(second,'utf8'),/<rect [^>]*width="220"/);
    const original=await doc();
    for(const unsafe of ['<script>throw 1</script>','<image href="https://example.invalid/image.png" width="1" height="1"/>','<rect width="1" height="1" onclick="alert(1)"/>']){
      await page.locator('#openFile').setInputFiles({name:'unsafe.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">'+unsafe+'</svg>')});
      await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('安全に対応できない'),undefined,{timeout:10000});assert.equal(await doc(),original);
      await page.waitForTimeout(200);
    }
  }else if(id==='D-026'){
    const p=await coords(150,150),q=await coords(250,200);const before=await rev();await page.mouse.move(...p);await page.mouse.down();await page.mouse.move(...q,{steps:12});await page.mouse.up();await change(before);
    const body=await openBox('documentBox');const clipboard=body.locator('.c06-clipboard-panel').filter({has:page.locator('#c06CopyLayer')});if(!await clipboard.evaluate(e=>e.open))await clipboard.locator('summary').click();
    await page.locator('#c06CopyLayer').click();await page.waitForFunction(()=>!document.querySelector('#c06Paste')?.disabled,undefined,{timeout:30000});
    const a=await doc();await page.locator('#home').click();await page.locator('#ihStart').waitFor();await create('round3-B');assert.notEqual(await doc(),a);
    assert.equal(await page.locator('#c06Paste').isEnabled(),true,'paste must refresh without brush changes');
    await openBox('documentBox');if(!await clipboard.evaluate(e=>e.open))await clipboard.locator('summary').click();
    const old=await rev();await page.locator('#c06Paste').click();await change(old);const pasted=await rev();
    await page.locator('#undo').click();await change(pasted);const undone=await rev();await page.locator('#redo').click();await change(undone);
  }else if(id==='D-028'){
    await shape();await page.locator('#selection').click();const panel=page.locator('[data-tool-panel=selection]');if(!await panel.evaluate(e=>e.open))await panel.locator('summary').click();
    await panel.getByLabel('自動選択に使う画像',{exact:true}).selectOption('merged');await b('線画で囲まれた部分を選ぶ',panel).click();
    await page.mouse.click(...await coords(200,170));const notice=panel.locator('.c06-selection-notice');await notice.waitFor();
    assert.match(await notice.textContent(),/選択中：1\d\d×1\d\dpx/);
    await b('線画で囲まれた部分を選ぶ',panel).click();await page.mouse.click(...await coords(30,30));await page.waitForFunction(()=>document.querySelector('.c06-selection-panel output')?.textContent?.includes('閉じた領域がありません'),undefined,{timeout:10000});
  }else if(id==='D-029'){
    await page.locator('#colorPage').click();const panel=page.locator('.c04-color-harmony');await panel.locator('summary').click();
    await panel.getByLabel('配色候補の種類',{exact:true}).selectOption('triad');await panel.locator('.c04-harmony-swatch').first().click();
    assert.match(await panel.locator('output').textContent(),/明暗比/);
    await panel.getByLabel('色覚の見え方を比べる',{exact:true}).selectOption('deutan');assert.equal(await page.locator('body').getAttribute('data-c04-vision'),'deutan');
    await panel.getByLabel('色覚の見え方を比べる',{exact:true}).selectOption('none');
  }else throw Error('unknown defect '+id);
  // Actual IndexedDB names must be confined to Round 3 in this fresh context.
  const names=await page.evaluate(async()=> (await indexedDB.databases()).map(db=>db.name));
  assert.ok(names.length>0&&names.every(n=>n?.startsWith('illustro-r2-audit-fixes-round3')),JSON.stringify(names));
  console.log('PASS '+id+' '+expected);
}catch(error){await page.screenshot({path:'r2-'+id+'-failure.png',fullPage:true}).catch(()=>{});console.error('FAIL',id,await page.locator('#status').textContent().catch(()=>null),error);throw error;}
finally{await browser.close();await rm(dir,{recursive:true,force:true});}
