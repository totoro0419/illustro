import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const {PNG}=require(process.env.PREP_PNG_PATH??'pngjs');
const base=(process.env.R2_AUDIT_FIX_URL??'https://totoro0419.github.io/illustro/r2-audit-fixes/').replace(/\/$/,'')+'/';
const id=process.argv[2],expected=process.env.EXPECTED_COMMIT_SHA;
const browser=await chromium.launch({headless:true,...(process.env.R2_CHROME_CHANNEL?{channel:process.env.R2_CHROME_CHANNEL}:{}),args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
const page=await context.newPage(),canvas=page.locator('#canvas');
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
async function fillPanel(){await page.locator('#smartFill').click();const p=page.locator('[data-tool-panel="smartFill"]');await p.waitFor();return p;}
async function fxPanel(){await page.locator('#workspaceEffects').click();const p=page.locator('details.raster-effects');if(!await p.evaluate(e=>e.open))await p.locator('summary').click();await p.locator('select:has(option[value="median"])').first().selectOption('median',{force:true});await p.getByRole('button',{name:'新しい効果',exact:true}).click();return p;}
try{
 const release=await (await page.request.get(base+'release.json')).json();assert.equal(release.sourceCommit,expected);log('EXACT-RELEASE');
 await fresh();
 if(id==='D-008'){
   await pen(10);
   await stroke([[80,100],[180,100],[180,230],[80,230],[80,100]]);await strokes(1);
   await stroke([[300,100],[400,100],[400,230],[300,230],[300,100]]);await strokes(2);
   const p=await fillPanel(),pts=[[130,160],[350,160],[240,160],[30,30],[470,320]];
   const before=await revision(),imageBeforeDrag=await image(),old=await samples(imageBeforeDrag,pts);
   await p.getByRole('button',{name:'囲まれた領域だけ連続塗り',exact:true}).click();
   await p.getByText('閉じた領域だけを通過順に選びます。',{exact:false}).waitFor({timeout:60000});
   await page.mouse.move(...await coords(130,160));await page.mouse.down();
   await page.mouse.move(...await coords(350,160),{steps:25});
   const view=JSON.parse(await canvas.getAttribute('data-view')),box=await canvas.boundingBox();
   const previewPoints=[[130,160],[350,160],[240,120],[30,30]];
   const previewOld=await samples(await imageBeforeDrag,previewPoints);
   let observed=false;
   for(let attempt=0;attempt<20&&!observed;attempt++){
     const live={png:PNG.sync.read(await canvas.screenshot()),box,view};const colors=await samples(live,previewPoints);
     observed=colors[0][2]>colors[0][0]+20&&colors[1][2]>colors[1][0]+20&&
       colors[2].every((v,i)=>v===previewOld[2][i])&&colors[3].every((v,i)=>v===previewOld[3][i]);
   }
   await page.mouse.up();assert.ok(observed,'closed-region live preview did not match both interiors');log('LIVE-PREVIEW-ONLY-CLOSED-REGIONS');await waitRev(before);
   const after=await revision(),now=await samples(await image(),pts);
   for(let i=0;i<2;i++)assert.ok(brightness(now[i])<brightness(old[i])-80,'closed interior not filled');
   for(let i=2;i<pts.length;i++)assert.deepEqual(now[i],old[i],'outside painted');
   log('ONE-DRAG-TWO-INTERIORS-OUTSIDE-UNCHANGED');await history(before,after,pts,old,now);
   const method=p.locator('select:has(option[value="lasso-closed"])');assert.equal(await method.count(),1);await method.selectOption('color',{force:true});assert.equal(await method.inputValue(),'color');
   // History navigation may close the active tool panel. Reopen the actual
   // rail entry, which arms normal fill using the already changed method.
   await page.locator('#smartFill').click();
   assert.equal(await method.inputValue(),'color');
   await page.mouse.click(...await coords(240,160));await waitRev(after);
   assert.ok(brightness(await pixel(await image(),240,160))<brightness(now[2])-80,'ordinary fill not restored');log('ORDINARY-FILL-RESTORED');
 }else if(id==='D-013'){
   await pen(10);await page.locator('#colorPage').click();await page.locator('#colorHex').fill('#e02020');await page.locator('#colorHex').press('Enter');await stroke([[100,192],[410,192]]);await strokes(1);
   await page.locator('#selection').click();const sel=page.locator('[data-tool-panel="selection"]');
   const rectangle=sel.getByRole('button',{name:'四角形',exact:true});
   if(await rectangle.getAttribute('aria-pressed')!=='true')await rectangle.click();
   assert.equal(await rectangle.getAttribute('aria-pressed'),'true');await stroke([[65,90],[445,290]]);
   await sel.getByText('選択範囲を更新しました。',{exact:true}).waitFor({timeout:30000});
   await sel.locator('label.c06-visibility input').uncheck();
   const original=await image();
   await page.locator('#transform').click();const p=page.locator('[data-tool-panel="transform"]');
   const mode=p.locator('select:has(option[value="liquify"])');await page.waitForFunction(()=>{const p=document.querySelector('[data-tool-panel="transform"]');const mode=[...p?.querySelectorAll('select')??[]].find(s=>[...s.options].some(o=>o.value==='liquify'));return mode&&!mode.disabled;},undefined,{timeout:30000});await mode.selectOption('liquify',{force:true});
   const direct=p.getByRole('button',{name:'キャンバスでゆがみブラシを使う',exact:true});
   await p.getByLabel('ゆがみの半径（px）',{exact:true}).fill('60');
   await p.getByLabel('ゆがみの強さ',{exact:true}).fill('0.7');
   const preview=p.locator(':scope > canvas').first();
   await preview.waitFor({state:'visible',timeout:30000});
   const previewHash=()=>preview.evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let hash=2166136261;for(const v of a)hash=Math.imul(hash^v,16777619);return hash;});
   async function changedPreview(old){await page.waitForFunction(old=>{const c=document.querySelector('[data-tool-panel="transform"] > canvas');if(!c||c.hidden)return false;const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let hash=2166136261;for(const v of a)hash=Math.imul(hash^v,16777619);return hash!==old;},old,{timeout:30000});}
   const modeControl=p.locator('select:has(option[value="pinch"])');
   await direct.click();let hash=await previewHash();await stroke([[235,192],[235,245]]);await changedPreview(hash);
   hash=await previewHash();await stroke([[275,192],[275,235]]);await changedPreview(hash);log('TWO-PUSH-STROKES-PREVIEW');
   for(const [kind,points] of [['expand',[[325,192],[325,205]]],['pinch',[[150,192],[150,205]]]]){
     await modeControl.selectOption(kind,{force:true});assert.equal(await modeControl.inputValue(),kind);hash=await previewHash();await stroke(points);await changedPreview(hash);log(kind.toUpperCase()+'-CHANGES-PREVIEW');
   }
   const before=await revision();await p.getByRole('button',{name:'変形を適用',exact:true}).click();await waitRev(before);
   const after=await revision(),now=await image(),pts=[];for(let y=165;y<=255;y+=5)for(let x=180;x<=330;x+=5)pts.push([x,y]);
   const oldColors=await samples(original,pts),newColors=await samples(now,pts);
   assert.ok(newColors.some((v,i)=>Math.abs(brightness(v)-brightness(oldColors[i]))>100),'applied image did not deform');
   log('TWO-LIQUIFY-STROKES-CHANGED-PIXELS');await history(before,after,pts,oldColors,newColors);
 }else if(id==='D-015'||id==='D-015-white'){
   if(id==='D-015-white'){
     await page.locator('#colorPage').click();await page.locator('#colorHex').fill('#ffffff');await page.locator('#colorHex').press('Enter');
     const before=await revision();await fillPanel();await page.mouse.click(...await coords(30,30));await waitRev(before);
     await page.locator('#paint').click();await page.locator('#colorPage').click();await page.locator('#colorHex').fill('#1f2633');await page.locator('#colorHex').press('Enter');
     log('WHITE-PIXELS-PAINTED-ON-EDITABLE-LAYER');
   }
   await pen(4);for(const point of [[120,120],[200,170]]){await page.mouse.click(...await coords(...point));await idle();}
   await pen(15);await page.mouse.click(...await coords(340,240));await strokes(3);
   await pen(4);await stroke([[110,290],[260,290]]);await strokes(4);
   const p=await fxPanel(),radius=p.getByLabel(/ごみの半径/);
   await radius.fill('3');await p.getByRole('button',{name:'前後を比較',exact:true}).click();
   const highlight=p.locator('canvas[aria-label="変更予定（ピンク）"]');await highlight.waitFor({timeout:60000});
   const marks=await highlight.evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;const isPink=(x,y)=>{const i=(y*c.width+x)*4;return d[i]===255&&d[i+1]===45&&d[i+2]===140&&d[i+3]===255;};return [[120,120],[200,170],[340,240]].map(([x,y])=>{const a=Math.floor(x*c.width/512),b=Math.floor(y*c.height/384);for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)if(isPink(a+dx,b+dy))return true;return false;});});
   assert.deepEqual(marks,[true,true,false],'FX-125 highlights wrong marks');log('FX125-TWO-SMALL-MARKS-HIGHLIGHTED');
   const before=await revision(),pts=[[120,120],[200,170],[340,240],[30,30],[180,290]],old=await samples(await image(),pts);
   await p.getByRole('button',{name:'レイヤーに適用',exact:true}).click();await waitRev(before);
   const after=await revision(),now=await samples(await image(),pts);
   for(let i=0;i<2;i++)assert.ok(brightness(now[i])>brightness(old[i])+80,'small dot remained');
   for(let i=2;i<pts.length;i++)assert.deepEqual(now[i],old[i],'large dot, line or background changed');
   log('FX125-APPLIED-PIXELS');await history(before,after,pts,old,now);
 }else throw Error('Unknown defect '+id);
}catch(error){console.error('FAIL '+id,error);console.error(await page.evaluate(()=>({canvas:document.querySelector('#canvas')?.dataset,outputs:[...document.querySelectorAll('output,[role=status]')].map(e=>e.textContent).filter(Boolean).slice(-35)})).catch(()=>null));await page.screenshot({path:'r2-'+id+'-failure.png',fullPage:true}).catch(()=>{});throw error;}
finally{await browser.close();}
