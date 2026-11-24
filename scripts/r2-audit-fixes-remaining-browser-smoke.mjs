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
async function pen(size){const value=await page.locator('#brush option').evaluateAll(opts=>opts.find(o=>o.textContent.trim()==='ミリペン')?.value);assert.ok(value,'Millipen missing');await page.locator('#brush').selectOption(value,{force:true});await page.locator('#sizeNumber').fill(String(size));await page.locator('#sizeNumber').press('Enter');assert.equal(Number(await page.locator('#sizeNumber').inputValue()),size);}
const strokes=n=>page.waitForFunction(n=>Number(document.querySelector('#canvas')?.dataset.committedStrokes)===n&&document.querySelector('#canvas')?.dataset.historyBusy==='false',n,{timeout:60000});
async function image(){await page.mouse.move(3,3);await page.waitForTimeout(300);return PNG.sync.read(await canvas.screenshot());}
async function pixel(im,x,y){const b=await canvas.boundingBox(),p=await coords(x,y);const i=(Math.round((p[1]-b.y)*im.height/b.height)*im.width+Math.round((p[0]-b.x)*im.width/b.width))*4;return Array.from(im.data.subarray(i,i+4));}
const brightness=p=>p[0]+p[1]+p[2];
async function samples(im,pts){return Promise.all(pts.map(p=>pixel(im,...p)));}
async function history(before,after,points,oldColors,newColors){
 await page.locator('#undo').evaluate(e=>e.click());await waitRev(before,true);
 assert.deepEqual(await samples(await image(),points),oldColors,'Undo did not restore pixels');
 await page.locator('#redo').evaluate(e=>e.click());await waitRev(after,true);
 assert.deepEqual(await samples(await image(),points),newColors,'Redo did not restore pixels');
 log('UNDO-REDO-PIXELS');
}
async function fresh(){
 await page.goto(base+'?backend=webgl2&r2-defect='+id,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#ihStart').click();
 const setup=page.locator('#ihCanvasSetup');if(!await setup.evaluate(e=>e.open))await setup.locator('summary').click();
 await page.locator('#ihNewWidth').fill('512');await page.locator('#ihNewHeight').fill('384');
 await page.locator('#ihNewBackground').selectOption('transparent');
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
   const before=await revision(),old=await samples(await image(),pts);
   await p.getByRole('button',{name:'囲まれた領域だけ連続塗り',exact:true}).click();
   await p.getByText('閉じた領域だけを通過順に選びます。',{exact:false}).waitFor({timeout:60000});
   await stroke([[130,160],[350,160]]);await waitRev(before);
   const after=await revision(),now=await samples(await image(),pts);
   for(let i=0;i<2;i++)assert.ok(brightness(now[i])<brightness(old[i])-80,'closed interior not filled');
   for(let i=2;i<pts.length;i++)assert.deepEqual(now[i],old[i],'outside painted');
   log('ONE-DRAG-TWO-INTERIORS-OUTSIDE-UNCHANGED');await history(before,after,pts,old,now);
   await p.getByLabel('塗る範囲',{exact:true}).selectOption('color',{force:true});
   await p.getByRole('button',{name:'キャンバスで塗る',exact:true}).click();
   await page.mouse.click(...await coords(240,160));await waitRev(after);
   assert.ok(brightness(await pixel(await image(),240,160))<brightness(now[2])-80,'ordinary fill not restored');log('ORDINARY-FILL-RESTORED');
 }else if(id==='D-013'){
   await pen(10);await stroke([[100,192],[410,192]]);await strokes(1);
   const original=await image();
   await page.locator('#selection').click();const sel=page.locator('[data-tool-panel="selection"]');
   await sel.getByRole('button',{name:'四角形',exact:true}).click();await stroke([[65,90],[445,290]]);
   await sel.getByText('選択範囲を更新しました。',{exact:true}).waitFor({timeout:30000});
   await page.locator('#transform').click();const p=page.locator('[data-tool-panel="transform"]');
   const mode=p.getByLabel('変形の方法',{exact:true});await mode.selectOption('liquify',{force:true});
   const direct=p.getByRole('button',{name:'キャンバスでゆがみブラシを使う',exact:true});
   if(await direct.isDisabled())await p.getByRole('button',{name:'変形を始める',exact:true}).click();
   await p.getByLabel('ゆがみの半径（px）',{exact:true}).fill('60');
   await p.getByLabel('ゆがみの強さ',{exact:true}).fill('0.7');
   await direct.click();await stroke([[235,192],[235,245]]);await stroke([[275,192],[275,235]]);
   const before=await revision();await p.getByRole('button',{name:'変形を適用',exact:true}).click();await waitRev(before);
   const after=await revision(),now=await image(),pts=[];for(let y=165;y<=255;y+=5)for(let x=180;x<=330;x+=5)pts.push([x,y]);
   const oldColors=await samples(original,pts),newColors=await samples(now,pts);
   assert.ok(newColors.some((v,i)=>Math.abs(brightness(v)-brightness(oldColors[i]))>100),'applied image did not deform');
   log('TWO-LIQUIFY-STROKES-CHANGED-PIXELS');await history(before,after,pts,oldColors,newColors);
 }else if(id==='D-015'){
   await pen(4);for(const point of [[120,120],[200,170]]){await page.mouse.click(...await coords(...point));await idle();}
   await pen(15);await page.mouse.click(...await coords(340,240));await strokes(3);
   const p=await fxPanel(),radius=p.getByLabel(/ごみの半径/);
   await radius.fill('3');await p.getByRole('button',{name:'前後を比較',exact:true}).click();
   const highlight=p.locator('canvas[aria-label="変更予定（ピンク）"]');await highlight.waitFor({timeout:60000});
   const marks=await highlight.evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;const isPink=(x,y)=>{const i=(y*c.width+x)*4;return d[i]===255&&d[i+1]===45&&d[i+2]===140&&d[i+3]===255;};return [[120,120],[200,170],[340,240]].map(([x,y])=>{const a=Math.floor(x*c.width/512),b=Math.floor(y*c.height/384);for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)if(isPink(a+dx,b+dy))return true;return false;});});
   assert.deepEqual(marks,[true,true,false],'FX-125 highlights wrong marks');log('FX125-TWO-SMALL-MARKS-HIGHLIGHTED');
   const before=await revision(),pts=[[120,120],[200,170],[340,240],[30,30]],old=await samples(await image(),pts);
   await p.getByRole('button',{name:'レイヤーに適用',exact:true}).click();await waitRev(before);
   const after=await revision(),now=await samples(await image(),pts);
   for(let i=0;i<2;i++)assert.ok(brightness(now[i])>brightness(old[i])+80,'small dot remained');
   for(let i=2;i<4;i++)assert.deepEqual(now[i],old[i],'large dot or background changed');
   log('FX125-APPLIED-PIXELS');await history(before,after,pts,old,now);
 }else throw Error('Unknown defect '+id);
}catch(error){console.error('FAIL '+id,error);console.error(await page.evaluate(()=>({canvas:document.querySelector('#canvas')?.dataset,outputs:[...document.querySelectorAll('output,[role=status]')].map(e=>e.textContent).filter(Boolean).slice(-35)})).catch(()=>null));throw error;}
finally{await browser.close();}
