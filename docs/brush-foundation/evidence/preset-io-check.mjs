import fs from 'node:fs/promises';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../../..');
const pw=createRequire(import.meta.url)(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const html=await fs.readFile(path.join(root,'prototypes/brush-rt/dist/illustro-brush-rt.html'));
const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(html);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await pw.chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface']});
const report={scope:'preset IO, pointer failure recovery, mouse save/history, narrow layout; physical stylus and assistive technology unverified',backends:[]};
try{
 for(const backend of ['webgl2','webgpu']){
  const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/?backend=${backend}&document=256`);await page.waitForFunction(()=>window.__rt);
  const original=await page.evaluate(()=>JSON.stringify(window.__rt.foundationPresets));
  const invalid=await page.evaluate(async()=>{const {createPreset,exportPresets}=await import('@rt/foundation');const first=structuredClone(window.__rt.foundationPresets[0]);first.name='SHOULD NOT BE APPLIED';return exportPresets([first,createPreset('not-installed','unsupported',{kind:'watercolor',renderer:'not-installed'})]);});
  await page.locator('#presetFile').setInputFiles({name:'invalid-provider.json',mimeType:'application/json',buffer:Buffer.from(invalid)});
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('このページで使えない'));
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__rt.foundationPresets)),original);
  const valid=await page.evaluate(async()=>{const {exportPresets}=await import('@rt/foundation');const p=structuredClone(window.__rt.foundationPresets[0]);p.name='読み込み確認';p.size=12;return exportPresets([p]);});
  await page.locator('#presetFile').setInputFiles({name:'valid-brush.json',mimeType:'application/json',buffer:Buffer.from(valid)});await page.waitForFunction(()=>document.getElementById('status').textContent==='ブラシ設定を読み込みました。');
  assert.equal(await page.locator('#brush option[value="f:0"]').textContent(),'読み込み確認');assert.equal(await page.locator('#sizeNumber').inputValue(),'12');
  const draw=async()=>{const b=await page.locator('#draw').boundingBox();await page.mouse.move(b.x+b.width*.2,b.y+b.height*.4);await page.mouse.down();await page.mouse.move(b.x+b.width*.7,b.y+b.height*.6,{steps:12});await page.mouse.up();};
  await page.locator('#sizeNumber').fill('0');await draw();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('この設定では描けません'));
  assert.equal(await page.evaluate(()=>window.__rt.session.records.length),0);
  await page.locator('#sizeNumber').fill('16');await draw();await page.waitForFunction(()=>window.__rt.session.records.length===1);
  const saved=await page.evaluate(()=>JSON.stringify(window.__rt.session.export()));await page.locator('#undo').click();await page.waitForFunction(()=>window.__rt.session.records.length===0&&!document.getElementById('undo').disabled);await page.locator('#redo').click();await page.waitForFunction(()=>window.__rt.session.records.length===1&&!document.getElementById('redo').disabled);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__rt.session.export())),saved);
  const restored=await page.evaluate(async s=>{await window.__rt.session.load(JSON.parse(s));return window.__rt.compareLive();},saved);assert.equal(restored.channelsOver3,0);
  const download=page.waitForEvent('download');await page.locator('#presetSave').click();const file=await download;assert.equal(file.suggestedFilename(),'illustro-brushes.json');const exported=JSON.parse(await fs.readFile(await file.path(),'utf8'));assert.equal(exported.presets[0].name,'読み込み確認');
  const layouts=[];for(const width of [320,800,1200]){await page.setViewportSize({width,height:1000});const layout=await page.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,canvasWidth:document.getElementById('draw').getBoundingClientRect().width}));assert.ok(layout.documentWidth<=width+1,JSON.stringify(layout));assert.ok(layout.canvasWidth>0);layouts.push(layout);}
  assert.deepEqual(errors,[]);report.backends.push({backend,status:'PASS',invalidPackPreservesAllSettings:true,validNameAndSizeUpdated:true,invalidStrokeThenDrawRecovery:true,saveHistoryExact:true,restored,exportedBrushPack:true,layouts,consoleErrors:errors});await page.close();
 }
}finally{await browser.close();server.close();await fs.writeFile(path.join(import.meta.dirname,'ui-contract-reproduced.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report));
