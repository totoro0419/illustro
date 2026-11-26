import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const {PNG}=require(process.env.PREP_PNG_PATH??'pngjs');
const base=(process.env.R2_AUDIT_FIX_URL??'https://totoro0419.github.io/illustro/r2-audit-fixes-round4/').replace(/\/$/,'')+'/';
const id=process.argv[2],expected=process.env.EXPECTED_COMMIT_SHA;
const browser=await chromium.launch({headless:true,...(process.env.R2_CHROME_CHANNEL?{channel:process.env.R2_CHROME_CHANNEL}:{}),args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:true});
let page=await context.newPage(),canvas=page.locator('#canvas');
const dir=await mkdtemp(join(tmpdir(),'illustro-r4-'));
const b=(name,root=page)=>root.getByRole('button',{name,exact:true});
const wait=async f=>page.waitForFunction(f,undefined,{timeout:60000});
const idle=()=>wait(()=>document.querySelector('#canvas')?.dataset.historyBusy==='false'&&!document.querySelector('#brush')?.disabled);
const doc=()=>canvas.getAttribute('data-document-id');
const rev=()=>canvas.getAttribute('data-revision-id');
const change=async before=>{await page.waitForFunction(old=>document.querySelector('#canvas')?.dataset.revisionId!==old,before,{timeout:60000});await idle();};
async function choose(select,value){
  if(await select.inputValue()===value)return;
  const label=await select.locator('option[value="'+value+'"]').textContent();
  if(await select.isVisible()){await select.selectOption(value);return;}
  const trigger=select.locator('xpath=following-sibling::button[contains(@class,"workspace-choice")][1]');
  await trigger.click();const list=page.locator('#'+await trigger.getAttribute('aria-controls'));
  await list.getByRole('option',{name:label,exact:true}).click();
  assert.equal(await select.inputValue(),value);
}
async function create(name){
  const old=await doc();
  await page.locator('#ihStart').click();
  await page.locator('#ihNewName').evaluate((input,n)=>{input.value=n;input.dispatchEvent(new Event('input',{bubbles:true}));},name);
  const setup=page.locator('#ihCanvasSetup');
  if(!await setup.evaluate(e=>e.open))await setup.locator(':scope > summary').click();
  await page.locator('#ihNewWidth').fill('512');await page.locator('#ihNewHeight').fill('384');
  await page.locator('#ihNewBackground').selectOption('transparent',{force:true});
  await page.locator('#ihNewCreate').click();await canvas.waitFor({state:'visible'});await page.waitForFunction(old=>{const id=document.querySelector('#canvas')?.dataset.documentId;return !!id&&id!==old;},old,{timeout:60000});await idle();
  await wait(()=>!document.querySelector('#new')?.disabled&&document.querySelector('#status')?.textContent?.includes('描画できます'));
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
async function coords(x,y){
  const box=await page.locator('.surface').boundingBox(),v=JSON.parse(await canvas.getAttribute('data-view'));assert.ok(box&&v.zoom>0);assert.equal(v.rotation,0);
  return [box.x+v.cssWidth/2+v.panX+(x-v.documentWidth/2)*v.zoom,box.y+v.cssHeight/2+v.panY+(y-v.documentHeight/2)*v.zoom];
}
async function verifyRelease(){
  const r=await page.request.get(base+'release.json');assert.ok(r.ok());const release=await r.json();
  assert.equal(release.sourceCommit,expected);assert.equal(release.isolatedStorage,true);
}

async function home(){await page.goto(base+'?backend=webgl2&r4='+id+'#home',{waitUntil:'domcontentloaded',timeout:60000});await page.locator('#ihStart').waitFor({timeout:60000});}
async function saveCopy(name){
  await idle();
  await page.evaluate(()=>Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true}));
  const dl=page.waitForEvent('download',{timeout:60000});
  await page.locator('#saveCopy').evaluate(e=>e.click());
  const file=join(dir,name+'.illustro');await (await dl).saveAs(file);return file;
}
async function sections(file){
  const data=await readFile(file),n=data.readUInt32LE(16),manifest=JSON.parse(data.subarray(24,24+n).toString());
  return new Map(manifest.sections.map(s=>[s.id,{...s,bytes:data.subarray(24+n+s.offset,24+n+s.offset+s.length)}]));
}
async function mask(name){
  const s=await sections(await saveCopy(name)),a=s.get('c06.selection.active');
  if(!a)return Buffer.alloc(512*384);
  if(a.type!=='selection.alpha.rle.v2'){assert.equal(a.bytes.length,512*384);return a.bytes;}
  const out=[];for(let i=0;i<a.bytes.length;){const c=a.bytes[i++];if(c<128){for(let j=0;j<=c;j++)out.push(a.bytes[i++]);}else{const x=a.bytes[i++];for(let j=0;j<c-127;j++)out.push(x);}}
  assert.equal(out.length,512*384);return Buffer.from(out);
}
async function openPanel(id){await page.locator('#'+id).click();const p=page.locator('[data-tool-panel="'+id+'"]');if(!await p.evaluate(e=>e.open))await p.locator('summary').first().click();return p;}
async function numeric(p,rect){
  await b('座標と大きさで四角く選ぶ',p).click();
  const d=page.locator('dialog.illustro-app-dialog[open]');await d.locator('input').fill(rect.join(', '));await b('確定',d).click();await d.waitFor({state:'hidden'});
  await page.waitForFunction(()=>/選択範囲を更新しました|選択を解除しました/.test(document.querySelector('.c06-selection-panel output')?.textContent??''));await idle();
}
function expectedMask(a,b,mode){const result=Buffer.alloc(512*384);for(let y=0;y<384;y++)for(let x=0;x<512;x++){const inside=r=>r&&x>=r[0]&&y>=r[1]&&x<r[0]+r[2]&&y<r[1]+r[3];const A=!!inside(a),B=!!inside(b);result[y*512+x]=255*Number(mode==='replace'?B:mode==='add'?A||B:mode==='subtract'?A&&!B:mode==='intersect'?A&&B:A!==B);}return result;}
async function draw(x1,y1,x2,y2){const old=await rev();await page.mouse.move(...await coords(x1,y1));await page.mouse.down();await page.mouse.move(...await coords(x2,y2),{steps:20});await page.mouse.up();await change(old);}
async function reopen(file,copy=false){
  const old=await doc();await page.locator('#openFile').setInputFiles(file);
  if(copy)await b('別作品として複製').click();
  await page.waitForFunction(old=>{const id=document.querySelector('#canvas')?.dataset.documentId;return !!id&&id!==old;},old,{timeout:60000});await idle();
}
async function fresh(){await context.close();context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:true});page=await context.newPage();canvas=page.locator('#canvas');await home();}
async function checkBrush(id,size){assert.equal(await page.locator('#brush').inputValue(),id);assert.equal(Number(await page.locator('#sizeNumber').inputValue()),size);}
async function brushState(file){const s=(await sections(file)).get('brush.editing-state');assert.ok(s,'brush state missing');return JSON.parse(s.bytes.toString());}
async function png(name){
  await page.locator('#fileActionsOpen').click();await page.locator('#exportImage').click();
  const d=page.locator('#exportDialog');await d.waitFor();
  await choose(d.locator('#exportFormat'),'png');await choose(d.locator('#exportLayerScope'),'artwork');
  await d.locator('#exportPixelScale').fill('1');const dl=page.waitForEvent('download',{timeout:60000});
  await d.locator('#exportRun').click();const file=join(dir,name+'.png');await (await dl).saveAs(file);return PNG.sync.read(await readFile(file));
}
function coverage(im,x,y,w,h){let n=0;for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)if(im.data[(j*im.width+i)*4+3]>0)n++;return n;}
try{
  await verifyRelease();await home();
  if(id==='SEL-001'){
    await create('round4-selection');const p=await openPanel('selection');
    const mode=p.getByLabel('選択範囲を組み合わせる方法',{exact:true}),A=[180,120,80,70],B=[220,150,90,60];
    for(const m of ['replace','add','subtract','intersect','xor']){
      await choose(mode,'replace');await numeric(p,A);await choose(mode,m);await numeric(p,B);
      assert.deepEqual(await mask('numeric-'+m),expectedMask(A,B,m),'numeric full pixel mask '+m);
    }
    await b('選択だけ元に戻す',p).click();assert.deepEqual(await mask('undo'),expectedMask(null,A,'replace'));
    await b('選択だけやり直す',p).click();assert.deepEqual(await mask('redo'),expectedMask(A,B,'xor'));
    await b('座標と大きさで四角く選ぶ',p).click();const d=page.locator('dialog.illustro-app-dialog[open]');await d.locator('input').fill('-1,0,5,5');await b('確定',d).click();assert.ok(await d.isVisible());await b('キャンセル',d).click();assert.deepEqual(await mask('invalid'),expectedMask(A,B,'xor'));
    console.log('PASS numeric 5 modes full mask, selection undo/redo, invalid/cancel');
  }else if(id==='BRU-011'){
    await create('round4-brush');
    await choose(page.locator('#brush'),'foundation-technical');await page.locator('#sizeNumber').fill('9');await page.locator('#sizeNumber').press('Enter');
    await checkBrush('foundation-technical',9);
    await draw(150,130,260,130);const file=await saveCopy('brush');const state=await brushState(file);assert.equal(state.preset.id,'foundation-technical');assert.equal(state.preset.size,9);
    await reopen(file,true);await checkBrush('foundation-technical',9);
    await fresh();await reopen(file);await checkBrush('foundation-technical',9);
    await draw(150,230,260,230);const restored=await brushState(await saveCopy('brush-restored'));assert.deepEqual(restored.preset,state.preset);
    console.log('PASS native brush section, duplicate, isolated context, subsequent stroke and resave');
  }else if(id==='LIN-006'){
    await page.locator('#openFile').setInputFiles(process.env.R2_ROUND4_FIXTURE_DIR+'/line-art.png');
    await page.locator('#canvas').waitFor({state:'visible',timeout:60000});await idle();
    const p=await openPanel('smartFill');const advanced=p.getByText('線画の解析・細かい調整',{exact:true});if(await advanced.isVisible()&&!await b('線画を解析・更新',p).isVisible())await advanced.click();
    const g=p.getByLabel('埋める隙間（px）',{exact:true});await g.fill('8');await g.press('Tab');await b('線画を解析・更新',p).click();
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-tool-panel="smartFill"] output')].some(e=>/閉領域|確定待ち/.test(e.textContent??'')),undefined,{timeout:60000});
    for(const point of [[62,8],[100,8]]){
      await b('キャンバスで隙間を調べる',p).click();await page.mouse.click(...await coords(...point));
      await p.getByLabel('隙間候補の拡大表示',{exact:true}).waitFor({state:'visible',timeout:30000});
      await page.waitForFunction(()=>[...document.querySelectorAll('[data-tool-panel="smartFill"] output')].some(e=>/隙間候補 \d+\/\d+/.test(e.textContent??'')));
    }
    await b('この接続を取り消す',p).click();await b('線画領域を確定・保存',p).click();await idle();
    await saveCopy('line-region');
    console.log('PASS original fixture local candidate UI at both gaps, explicit rejection and save');
  }else throw Error('unknown case '+id);
  const names=await page.evaluate(async()=> (await indexedDB.databases()).map(db=>db.name));
  assert.ok(names.length>0&&names.every(n=>n?.startsWith('illustro-r2-audit-fixes-round4')),JSON.stringify(names));
  console.log('PASS '+id+' '+expected);
}catch(error){await page.screenshot({path:'r2-'+id+'-failure.png',fullPage:true}).catch(()=>{});console.error('FAIL',id,error);throw error;}
finally{await browser.close();await rm(dir,{recursive:true,force:true});}
