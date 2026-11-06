import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
const url=process.env.ILLUSTRO_PREVIEW_URL||'https://totoro0419.github.io/illustro/c02/';
let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.ILLUSTRO_CHROMIUM||undefined,args:process.env.ILLUSTRO_CHROMIUM?['--no-sandbox','--disable-dev-shm-usage']:[]});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const response=await page.goto(url+(url.includes('?')?'&':'?')+'pixelMirror=1',{waitUntil:'networkidle',timeout:45000});
  assert.equal(response.status(),200,'Preview must respond 200');
  await page.locator('#brush-search').waitFor({state:'visible'});
  await page.locator('#brush-search').fill('鉛筆');
  await page.locator('#brush-list').selectOption('pencil');
  await page.locator('#brush-edit').click();
  await page.locator('#pad-after').press('Enter');
  assert.ok(await page.locator('#pad-after').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)));
  await page.locator('#brush-cancel').click();
  await page.waitForFunction(()=>document.querySelector('#art')?.width===1600);
  const before=await page.locator('#art').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return d.some((v,i)=>i%4===3&&v>0)});
  assert.equal(before,false,'Initial artwork must be empty');
  const s=await page.locator('#stage').boundingBox();
  await page.mouse.move(s.x+s.width*.4,s.y+s.height*.4);
  await page.mouse.down();await page.mouse.move(s.x+s.width*.4+80,s.y+s.height*.4+50,{steps:10});await page.mouse.up();
  await page.waitForFunction(()=>document.getElementById('stage').dataset.rasterPending==='0' && document.querySelector('#art').getContext('2d').getImageData(0,0,1600,1200).data.some((v,i)=>i%4===3&&v>0));
  const painted=await page.locator('#art').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return d.some((v,i)=>i%4===3&&v>0)});
  assert.equal(painted,true,'Public app must paint actual pixels');
  await page.locator('[data-action=undo]').first().click();
  await page.waitForFunction(()=>!document.querySelector('#art').getContext('2d').getImageData(0,0,1600,1200).data.some((v,i)=>i%4===3&&v>0));
  const undone=await page.locator('#art').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return d.some((v,i)=>i%4===3&&v>0)});
  assert.equal(undone,false,'Undo must remove artwork');
  await page.locator('[data-action=redo]').first().click();
  await page.evaluate(()=>{
   window.previewWrites=[];
   window.showSaveFilePicker=async()=>({createWritable:async()=>({write:async data=>window.previewWrites.push(typeof data==='string'?data:new TextDecoder().decode(data)),close:async()=>{}})});
  });
  await page.locator('[data-action=save]').first().click();
  await page.waitForFunction(()=>window.previewWrites.length>0);
  const archive=await page.evaluate(()=>JSON.parse(window.previewWrites[0]));
  assert.equal(archive.formatVersion,2);
  assert.equal(archive.brushArchive.strokes[0].brush.id,'pencil');
  const visible=await page.evaluate(async png=>{
   const stage=document.getElementById('stage'),paper=document.getElementById('paper'),scene=document.getElementById('retained-scene'),r=stage.getBoundingClientRect();
   const before=paper.style.transform+'|'+scene.style.transform;
   const emit=(type,id,x,y)=>stage.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'touch',pointerId:id,button:0,buttons:type==='pointerup'?0:1,clientX:r.x+x,clientY:r.y+y}));
   emit('pointerdown',81,350,300);emit('pointerdown',82,450,300);emit('pointermove',81,380,330);emit('pointermove',82,515,275);
   const moved=before!==paper.style.transform+'|'+scene.style.transform;emit('pointerup',81,380,330);emit('pointerup',82,515,275);
   const digest=async d=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',d)),n=>n.toString(16).padStart(2,'0')).join('');
   const image=await createImageBitmap(await(await fetch(png)).blob()),w=image.width,h=image.height,expected=new OffscreenCanvas(w,h),ec=expected.getContext('2d',{willReadFrequently:true});ec.drawImage(image,0,0);image.close();const data=ec.getImageData(0,0,w,h).data;
   for(let i=0;i<data.length;i+=4){const a=data[i+3]/255;for(let c=0;c<3;c++)data[i+c]=Math.round(data[i+c]*a+255*(1-a));data[i+3]=255}
   const expectedHash=await digest(data);let actualHash;
   for(let attempt=0;attempt<200;attempt++){const canvas=new OffscreenCanvas(w,h),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,w,h);for(const tile of document.querySelectorAll('#display-tiles canvas'))ctx.drawImage(tile,parseFloat(tile.style.left),parseFloat(tile.style.top));actualHash=await digest(ctx.getImageData(0,0,w,h).data);if(actualHash===expectedHash)break;await new Promise(ok=>setTimeout(ok,20))}
   return {moved,expectedHash,actualHash};
  },archive.layers[0].png);
  assert.ok(visible.moved,'Public pen result must pan/zoom/rotate');assert.equal(visible.actualHash,visible.expectedHash,'Actual public bitmap groups must match native PNG');

  await page.locator('#open-file').setInputFiles({name:'preview.illustro',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archive))});
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('ネイティブ作品を開きました'));
  page.on('dialog',d=>d.accept());
  await page.locator('[data-action=new]').first().click();
  await page.locator('#new-width').fill('320');await page.locator('#new-height').fill('240');
  await page.locator('#new-dialog button[type=submit]').click();
  assert.equal(await page.locator('#art').evaluate(c=>c.width),320);
  assert.deepEqual(errors,[],'No client exceptions');
  const phone=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  const resp=await phone.goto(url,{waitUntil:'networkidle',timeout:45000});assert.equal(resp.status(),200);
  assert.equal(await phone.locator('.mobilebar').isVisible(),true);
  await phone.locator('#mobile-tools').click();assert.equal(await phone.locator('.workspace').isVisible(),true);

  const diag=await browser.newPage({viewport:{width:393,height:852},hasTouch:true,isMobile:true});
  const diagErrors=[];diag.on('pageerror',e=>diagErrors.push(String(e)));
  const diagResponse=await diag.goto(url+'input-test.html',{waitUntil:'load',timeout:45000});
  assert.equal(diagResponse.status(),200,'Public standalone diagnostic must respond 200');
  assert.ok(await diag.locator('#zone').isVisible(),'Public independent touch surface must be visible');
  assert.deepEqual(diagErrors,[]);
  console.log('LIVE_PASS: URL HTTP 200, actual draw/display pixels, pan/zoom/rotate, save/reload, undo/redo/new/phone panel and independent input diagnostic');
} finally {if(browser)await browser.close()}
