import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const dist=fileURLToPath(new URL('../apps/editor/dist/',import.meta.url));
const types={js:'text/javascript',css:'text/css',html:'text/html',json:'application/json'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
    const bytes=await readFile(dist+file);
    res.setHeader('Content-Type',types[file.split('.').at(-1)]??'application/octet-stream');
    res.end(bytes);
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));

let browser;
try{
  browser=await chromium.launch({
    executablePath:process.env.CHROMIUM_EXECUTABLE,
    args:['--enable-unsafe-swiftshader','--use-angle=swiftshader',...JSON.parse(process.env.CHROMIUM_EXTRA_ARGS??'[]')],
  });
  const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
  page.setDefaultTimeout(30000);
  const pageErrors=[],browserDialogs=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('dialog',dialog=>{browserDialogs.push(dialog.type());void dialog.dismiss();});
  await page.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true}));
  await page.goto('http://127.0.0.1:'+server.address().port+'/?backend=webgl2');

  const element=id=>page.locator('#'+id);
  const wait=fn=>page.waitForFunction(fn);
  const canvas=element('canvas');
  const state=()=>canvas.evaluate(node=>({...node.dataset}));
  const location=()=>page.evaluate(()=>[window.location.hash,history.length]);
  const press=id=>element(id).click();
  async function cancelNew(open,close,hash){
    const previous=await location();
    assert.equal(previous[0],hash);
    await open();
    await element('ihNewDialog').waitFor();
    await close();
    await element('ihNewDialog').waitFor({state:'hidden'});
    assert.deepEqual(await location(),previous);
    assert.equal(await element('ihApp').isHidden(),hash==='#editor');
  }
  async function create(name){
    await element('ihNewName').fill(name);
    await press('ihNewCreate');
    try{await element('ihNewDialog').waitFor({state:'hidden'});}
    catch(error){throw Error(await element('ihNewError').textContent(),{cause:error});}
    await element('ihApp').waitFor({state:'hidden'});
    assert.equal((await state()).documentName,name);
    return (await state()).documentId;
  }
  async function draw(count,y=.44){
    const box=await canvas.boundingBox();
    await page.mouse.move(box.x+box.width*.42,box.y+box.height*y);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width*.56,box.y+box.height*y,{steps:10});
    await page.mouse.up();
    await strokes(count);
  }
  async function strokes(count){
    await page.waitForFunction(n=>{
      const data=document.getElementById('canvas').dataset;
      return data.committedStrokes===String(n)&&data.historyBusy==='false';
    },count);
  }
  async function fileAction(id){
    await press('fileActionsOpen');
    await press(id);
  }
  async function getDownload(action){
    const [download]=await Promise.all([page.waitForEvent('download'),action()]);
    return readFile(await download.path());
  }
  async function home(){
    await press('home');
    await element('ihApp').waitFor();
  }
  async function works(count){
    await press('ihNavWorks');
    await page.waitForFunction(n=>document.querySelectorAll('#ihWorkGrid .ih-work-card').length===n,count);
  }
  const work=id=>page.locator('#ihWorkGrid [data-work-id="'+id+'"]');
  async function openWork(id){
    await work(id).locator('.ih-work-preview').click();
    await element('ihApp').waitFor({state:'hidden'});
    assert.equal((await state()).documentId,id);
  }
  async function importFile(buffer){
    const [chooser]=await Promise.all([page.waitForEvent('filechooser'),press('ihSelectFile')]);
    await chooser.setFiles({name:'検査用.illustro',mimeType:'application/octet-stream',buffer});
  }
  const collision=page.locator('dialog.illustro-app-dialog[open]');
  async function decide(label){
    await collision.getByRole('button',{name:label,exact:true}).click();
    await collision.waitFor({state:'hidden'});
  }

  await cancelNew(()=>press('ihStart'),()=>press('ihNewCancel'),'#home');
  await works(0);
  assert.match(await page.locator('.ih-empty-note').textContent(),/ホームの「ファイルから開く」/);
  await cancelNew(()=>press('ihWorksStart'),()=>press('ihNewClose'),'#works');
  await press('ihNavSettings');
  assert.match(await page.locator('.ih-placeholder p').textContent(),/「その他」→「パネル一覧」/);
  await press('ihNavHome');
  await press('ihStart');
  const originalId=await create('検査用 A');
  assert.equal((await state()).backend,'WebGL2');
  await cancelNew(()=>fileAction('new'),()=>page.keyboard.press('Escape'),'#editor');
  assert.equal((await state()).documentId,originalId);
  console.log('PASS home and editor cancel paths, history, and Home help');

  await press('brushPage');
  await page.getByText('描き味を調整',{exact:true}).click();
  await element('brushOpacityNumber').fill('45');
  await element('brushOpacityNumber').press('Enter');
  assert.equal(await element('brushOpacityNumber').inputValue(),'45');
  assert.equal(await element('brushOpacity').inputValue(),'45');
  assert.equal(await element('brushOpacityValue').textContent(),'45%');
  await element('brushFlowNumber').fill('31');
  await element('brushFlowNumber').press('Tab');
  assert.equal(await element('brushFlow').inputValue(),'31');
  await element('brushFlowNumber').fill('100');
  await element('brushFlowNumber').press('Enter');
  await press('brushPage');
  await draw(1);
  assert.doesNotMatch(await element('status').textContent(),/作品の範囲外/);
  const png=await getDownload(async()=>{
    await fileAction('exportImage');
    await element('exportFormat').selectOption('png');
    await press('exportRun');
  });
  const alpha=await page.evaluate(async values=>{
    const bitmap=await createImageBitmap(new Blob([new Uint8Array(values)]));
    const canvas=new OffscreenCanvas(bitmap.width,bitmap.height);
    const context=canvas.getContext('2d');
    context.drawImage(bitmap,0,0);
    bitmap.close();
    const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
    let max=0;
    for(let i=3;i<pixels.length;i+=4)max=Math.max(max,pixels[i]);
    return max;
  },Array.from(png));
  assert.ok(Math.abs(alpha-255*.45)<=2,'45% stroke should export with alpha ≈115, received '+alpha);
  await press('undo');
  await strokes(0);
  await press('redo');
  await strokes(1);
  await press('brushPage');
  await element('brushOpacity').press('End');
  assert.equal(await element('brushOpacityNumber').inputValue(),'100');
  await element('brush').selectOption('foundation-round-pen');
  await press('brushPage');
  await element('sizeNumber').fill('28');
  await element('sizeNumber').press('Enter');
  assert.equal(await element('size').inputValue(),'28');
  await draw(2,.56);
  console.log('PASS numeric opacity, drawn pixels (alpha '+alpha+'), fill strength, slider, Undo/Redo');

  await press('colorPage');
  await element('colorShowColor').click();
  await page.getByText('色を数値で調整',{exact:true}).click();
  await element('colorHex').fill('#1A7BD4');
  await element('colorHex').press('Enter');
  await press('colorShowPalette');
  await page.locator('[data-color-action="add-current"]').click();
  assert.equal(await page.locator('#colorHistoryList button').count(),1);
  assert.equal(await page.locator('#colorPaletteList button[data-hex="#1A7BD4" i]').count(),1);
  await page.getByRole('button',{name:'履歴を消去',exact:true}).click();
  assert.equal(await page.locator('#colorHistoryList button').count(),0);
  assert.equal(await page.locator('#colorPaletteList button[data-hex="#1A7BD4" i]').count(),1);
  assert.equal((await element('colorHex').inputValue()).toLowerCase(),'#1a7bd4');

  await press('colorPage');
  const portable=await getDownload(()=>fileAction('saveCopy'));
  const originalRevision=(await state()).revisionId;
  await wait(()=>document.getElementById('saveState').textContent.includes('アプリ内に保存済み'));
  await fileAction('new');
  const otherId=await create('検査用 B');
  assert.notEqual(otherId,originalId);
  await draw(1);
  assert.doesNotMatch(await element('status').textContent(),/作品の範囲外/);
  assert.equal((await state()).selectedPresetId,'foundation-g-pen');
  assert.equal(await element('sizeNumber').inputValue(),'16');
  await home();
  await page.reload();
  await works(2);
  await openWork(originalId);
  assert.equal((await state()).selectedPresetId,'foundation-round-pen');
  assert.equal((await state()).revisionId,originalRevision);
  assert.equal(await element('sizeNumber').inputValue(),'28');
  await press('colorPage');
  await press('colorShowPalette');
  assert.equal(await page.locator('#colorHistoryList button').count(),0);
  assert.equal(await page.locator('#colorPaletteList button[data-hex="#1A7BD4" i]').count(),1);
  assert.equal((await element('colorHex').inputValue()).toLowerCase(),'#1a7bd4');
  console.log('PASS brush restored per work and color history cleared after reload');

  await home();
  await importFile(portable);
  assert.match(await collision.textContent(),/同じ識別番号/);
  assert.equal(await collision.getByRole('button',{name:'キャンセル'}).evaluate(el=>el===document.activeElement),true);
  await decide('キャンセル');
  await works(2);
  assert.equal(await work(originalId).getAttribute('data-work-revision'),originalRevision);
  await press('ihNavHome');
  await importFile(portable);
  await decide('既存作品を開く');
  await element('ihApp').waitFor({state:'hidden'});
  assert.equal((await state()).documentId,originalId);
  await home();
  await importFile(portable);
  await decide('別作品として複製');
  await element('ihApp').waitFor({state:'hidden'});
  const firstCopy=(await state()).documentId;
  assert.notEqual(firstCopy,originalId);
  assert.equal((await state()).revisionId,originalRevision);
  await home();
  await works(3);
  assert.equal(await work(originalId).getAttribute('data-work-revision'),originalRevision);
  await openWork(originalId);
  await draw(3,.65);
  const laterRevision=(await state()).revisionId;
  assert.notEqual(laterRevision,originalRevision);
  await wait(()=>document.getElementById('saveState').textContent.includes('アプリ内に保存済み'));
  await home();
  await importFile(portable);
  await decide('別作品として複製');
  await element('ihApp').waitFor({state:'hidden'});
  assert.notEqual((await state()).documentId,originalId);
  assert.notEqual((await state()).documentId,firstCopy);
  assert.equal((await state()).revisionId,originalRevision);
  await home();
  await works(4);
  assert.equal(await work(originalId).getAttribute('data-work-revision'),laterRevision);
  console.log('PASS collision cancel, open existing, copy same revision, and copy older revision');
  await page.goto('http://localhost:'+server.address().port+'/?backend=webgl2');
  await importFile(portable);
  await element('ihApp').waitFor({state:'hidden'});
  assert.equal(await collision.count(),0);
  assert.equal((await state()).documentId,originalId);
  assert.equal((await state()).revisionId,originalRevision);
  assert.deepEqual(browserDialogs,[]);
  assert.deepEqual(pageErrors,[]);
  console.log('PASS normal file import without a collision');
}finally{
  try{await browser?.close();}
  finally{await new Promise(resolve=>server.close(resolve));}
}
