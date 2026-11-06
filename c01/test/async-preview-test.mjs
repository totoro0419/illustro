import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const presentation=process.env.ILLUSTRO_TEST_PRESENTATION||'bitmap';
const root=resolve('.'),server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://local').pathname,file=resolve(root,'.'+(p==='/'?'/index.html':p));if(!file.startsWith(root+sep))throw Error('path');res.setHeader('content-type',extname(file)==='.mjs'?'text/javascript':extname(file)==='.css'?'text/css':'text/html');res.end(await readFile(file))}catch{res.writeHead(404).end()}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1100,height:820}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  const Native=Worker;window.__heldFormal=[];window.__holdFormal=true;
  window.Worker=class extends Native{
   constructor(url,options){super(url,options);this.formal=String(url).includes('raster-worker')}
   postMessage(m,transfer){if(this.formal&&window.__holdFormal&&['stroke','undo','redo','save'].includes(m.type)){window.__heldFormal.push([this,m,transfer]);return}return super.postMessage(m,transfer)}
  };
  window.__releaseFormal=()=>{window.__holdFormal=false;for(const [w,m,t]of window.__heldFormal.splice(0))Native.prototype.postMessage.call(w,m,t)};
 });
 await page.goto('http://127.0.0.1:'+server.address().port+'/?inputDebug=1&pixelMirror=1&presentation='+presentation);
 await page.waitForFunction(()=>document.getElementById('art')?.width===1600);
 const report=await page.evaluate(async()=>{
  const $=id=>document.getElementById(id),stage=$('stage'),paper=$('paper'),r=stage.getBoundingClientRect(),sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
  const until=async test=>{const at=performance.now();while(!await test()){if(performance.now()-at>30000)throw Error('timeout '+$('toast').textContent+' '+stage.dataset.rasterError);await sleep(15)}};
  const pixels=id=>{const c=$(id);return c.getContext('2d').getImageData(0,0,c.width,c.height).data};
  const count=id=>{const d=pixels(id);let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n};
  const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),n=>n.toString(16).padStart(2,'0')).join('');
  const emit=(type,kind,id,x,y)=>stage.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:kind,button:0,buttons:type==='pointerup'?0:1,pressure:.7,width:1,height:1,clientX:r.x+x,clientY:r.y+y}));
  const decode=async png=>{const image=await createImageBitmap(await (await fetch(png)).blob()),c=new OffscreenCanvas(image.width,image.height),ctx=c.getContext('2d');ctx.drawImage(image,0,0);image.close();return ctx.getImageData(0,0,c.width,c.height).data};
  $('size-n').value=300;$('size-n').dispatchEvent(new Event('change'));
  const start=performance.now();emit('pointerdown','pen',10,180,250);
  for(let i=1;i<30;i++){emit('pointermove','pen',10,180+i*8,250+Math.sin(i/4)*30);await sleep(2)}
  await until(()=>count('preview')>100);const previewStartProxyMs=performance.now()-start,previewBeforeFormal=count('preview');
  if(count('art')!==0)throw Error('formal gate failed');
  const pose=()=>paper.style.transform+'|'+$('retained-scene').style.transform;const firstPose=pose();
  emit('pointerdown','touch',21,440,390);emit('pointerdown','touch',22,540,390);emit('pointermove','touch',21,460,415);emit('pointermove','touch',22,590,370);
  await until(()=>pose()!==firstPose);const simultaneousPose=pose();
  emit('pointerup','pen',10,420,250);emit('pointerup','touch',21,460,415);emit('pointerup','touch',22,590,370);
  document.querySelector('[data-tool=marker]').click();
  emit('pointerdown','pen',30,190,340);emit('pointermove','pen',30,390,340);emit('pointerup','pen',30,390,340);
  document.querySelector('[data-action=undo]').click();
  const writes=[];window.showSaveFilePicker=async()=>({createWritable:async()=>({write:async data=>writes.push(typeof data==='string'?data:new TextDecoder().decode(data)),close:async()=>{},abort:async()=>{}})});
  document.querySelector('[data-action=save]').click();
  const before=pose(),navAt=performance.now();emit('pointerdown','touch',40,480,430);emit('pointermove','touch',40,510,450);
  await until(()=>pose()!==before);const pendingViewProxyMs=performance.now()-navAt;emit('pointerup','touch',40,510,450);
  const pendingBeforeRelease=stage.dataset.rasterPending;window.__releaseFormal();await until(()=>writes.length===1&&stage.dataset.rasterPending==='0');
  const saveA=JSON.parse(writes[0]),savedAHash=await digest(await decode(saveA.layers[0].png));
  await until(async()=>await digest(pixels('preview'))===savedAHash);const aHash=await digest(pixels('art'));
  document.querySelector('[data-action=redo]').click();await sleep(100);
  document.querySelector('[data-action=saveas]').click();await until(()=>writes.length===2);
  const saveAB=JSON.parse(writes[1]),abHash=await digest(await decode(saveAB.layers[0].png));await until(async()=>await digest(pixels('preview'))===abHash);
  const verify=window.__c02Verify;
  const premult=await decode(saveAB.layers[0].png);
  for(let i=0;i<premult.length;i+=4)for(let c=0;c<3;c++)premult[i+c]=Math.round(premult[i+c]*premult[i+3]/255);
  let visibleHash=null,viewportChecks=0;if(verify.presentation){
  const expectedTextureHash=await digest(premult),gpuVisibleHash=await digest(verify.presentation.readTexture());visibleHash=gpuVisibleHash;
  if(visibleHash!==expectedTextureHash)throw Error('Retained GPU texture differs from the exact premultiplied saved RGBA');
  const view=verify.getView(),actual=verify.presentation.readViewport(view),matrix=new DOMMatrix(paper.style.transform);viewportChecks=0;
  scan: for(let y=20;y<1180;y+=19)for(let x=20;x<1580;x+=23){const at=(y*1600+x)*4;if(premult[at+3]<20)continue;const p=new DOMPoint(x+.5,y+.5).matrixTransform(matrix),px=Math.round(p.x),py=Math.round(p.y);if(px<1||py<1||px>=actual.width-1||py>=actual.height-1)continue;
   const d=new DOMPoint(px+.5,py+.5).matrixTransform(matrix.inverse()),ix=Math.round(d.x),iy=Math.round(d.y);if(ix<1||iy<1||ix>=1599||iy>=1199)continue;
   // Flat interiors are stable under bilinear screen resampling.
   const src=(iy*1600+ix)*4;let flat=true;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)for(let c=0;c<4;c++)if(Math.abs(premult[src+c]-premult[src+(dy*1600+dx)*4+c])>2)flat=false;if(!flat)continue;
   const pixel=((actual.height-1-py)*actual.width+px)*4;let max=0;for(let c=0;c<3;c++)max=Math.max(max,Math.abs(actual.pixels[pixel+c]-(premult[src+c]+255-premult[src+3])));
   if(max>6)throw Error('GPU projection or color differs: '+JSON.stringify({max,src,doc:[ix,iy],screen:[px,py],got:[...actual.pixels.slice(pixel,pixel+4)],expected:[...premult.slice(src,src+4)],view,matrix:paper.style.transform,width:actual.width,height:actual.height}));if(++viewportChecks===20)break scan;
  }
  if(viewportChecks<10)throw Error('Insufficient GPU viewport color/pose checks');
  }
  const {rasterize,composite,tileBox}=await import('/app/brush-raster.mjs'),ref=new OffscreenCanvas(1600,1200),rc=ref.getContext('2d',{willReadFrequently:true});
  for(const stroke of saveAB.brushArchive.strokes){const {ink}=rasterize(stroke,1600,1200);for(const [key,tile]of ink.tiles){const b=tileBox(key,1600,1200);composite(rc,stroke,tile,b.x,b.y)}}
  const referenceHash=await digest(rc.getImageData(0,0,1600,1200).data);
  window.__holdFormal=true;const beforeErase=count('preview');document.querySelector('[data-tool=hardEraser]').click();
  emit('pointerdown','pen',50,250,300);emit('pointermove','pen',50,360,310);await until(()=>count('preview')<beforeErase);const previewErase=count('preview');
  emit('pointerup','pen',50,360,310);window.__releaseFormal();await until(()=>stage.dataset.rasterPending==='0');
  document.querySelector('[data-action=saveas]').click();await until(()=>writes.length===3);
  const erased=JSON.parse(writes[2]),eraseHash=await digest(await decode(erased.layers[0].png));await until(async()=>await digest(pixels('preview'))===eraseHash);
  return {visibleHash,viewportChecks,previewStartProxyMs,previewBeforeFormal,simultaneousPose,pendingViewProxyMs,pendingBeforeRelease,savedAHash,aHash,abHash,referenceHash,beforeErase,previewErase,eraseHash,saveAB};
 });
 assert.equal(report.pendingBeforeRelease,'2');assert.equal(report.savedAHash,report.aHash,'Save after pending Undo contains A only');assert.equal(report.referenceHash,report.abHash,'Formal RGBA matches reference');assert.notEqual(report.aHash,report.abHash,'Redo restores B');assert.ok(report.previewErase<report.beforeErase,'Eraser preview removes pixels');
 page.on('dialog',d=>d.accept());
 await page.setInputFiles('#open-file',{name:'fence.illustro',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(report.saveAB))});
 await page.waitForFunction(async expected=>{const c=document.getElementById('preview'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',d)),n=>n.toString(16).padStart(2,'0')).join('')===expected},report.abHash);
 const recoveryReport=await page.evaluate(async()=>{
  const $=id=>document.getElementById(id),stage=$('stage'),r=stage.getBoundingClientRect(),sleep=()=>new Promise(ok=>setTimeout(ok,20));
  const until=async test=>{const at=performance.now();while(!await test()){if(performance.now()-at>30000)throw Error('Epoch / loss recovery timeout: '+$('toast').textContent);await sleep()}};
  const digest=async d=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',d)),n=>n.toString(16).padStart(2,'0')).join('');
  const emit=(type,id,x,y)=>stage.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:'pen',button:0,buttons:type==='pointerup'?0:1,pressure:.7,clientX:r.x+x,clientY:r.y+y}));
  const stroke=(id,x,y)=>{emit('pointerdown',id,x,y);emit('pointermove',id,x+110,y+30);emit('pointerup',id,x+110,y+30)};
  window.__holdFormal=true;document.querySelector('[data-tool=gpen]').click();stroke(70,180,250);
  document.querySelector('[data-action=new]').click();$('new-width').value=640;$('new-height').value=480;$('new-dialog').requestSubmit();
  stroke(71,260,300);window.__releaseFormal();await until(()=>stage.dataset.rasterPending==='0');
  const writes=[];window.showSaveFilePicker=async()=>({createWritable:async()=>({write:async d=>writes.push(typeof d==='string'?d:new TextDecoder().decode(d)),close:async()=>{},abort:async()=>{}})});
  document.querySelector('[data-action=saveas]').click();await until(()=>writes.length===1);const first=JSON.parse(writes[0]);
  if(first.document.width!==640||first.brushArchive.strokes.length!==1)throw Error('Old epoch/archive leaked into the new document');
  const presentation=window.__c02Verify.presentation;if(presentation){const extension=presentation.gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('Context-loss test capability missing');extension.loseContext();
  await until(()=>$('gpu-presentation').hidden&&document.querySelectorAll('#display-tiles canvas').length>0);}
  stroke(72,320,390);await until(()=>stage.dataset.rasterPending==='0');document.querySelector('[data-action=saveas]').click();await until(()=>writes.length===2);
  const saved=JSON.parse(writes[1]);if(saved.brushArchive.strokes.length!==2)throw Error('Drawing stopped after GPU loss');
  const bitmap=await createImageBitmap(await (await fetch(saved.layers[0].png)).blob()),expected=new OffscreenCanvas(640,480),ec=expected.getContext('2d',{willReadFrequently:true});ec.drawImage(bitmap,0,0);bitmap.close();const expectedPixels=ec.getImageData(0,0,640,480).data;if(!presentation)for(let i=0;i<expectedPixels.length;i+=4){const a=expectedPixels[i+3]/255;for(let k=0;k<3;k++)expectedPixels[i+k]=Math.round(expectedPixels[i+k]*a+255*(1-a));expectedPixels[i+3]=255}const expectedHash=await digest(expectedPixels);
  let actualHash;await until(async()=>{const c=new OffscreenCanvas(640,480),ctx=c.getContext('2d',{willReadFrequently:true});if(!presentation){ctx.fillStyle='white';ctx.fillRect(0,0,640,480)}for(const tile of document.querySelectorAll('#display-tiles canvas'))ctx.drawImage(tile,parseFloat(tile.style.left),parseFloat(tile.style.top));actualHash=await digest(ctx.getImageData(0,0,640,480).data);return actualHash===expectedHash});
  return {newEpochStrokes:first.brushArchive.strokes.length,postLossStrokes:saved.brushArchive.strokes.length,expectedHash,actualHash};
 });
 Object.assign(report,{recovery:recoveryReport});
 assert.deepEqual(errors,[]);delete report.saveAB;
 await writeFile(process.env.ILLUSTRO_ASYNC_OUT||'/tmp/illustro-async-preview-'+presentation+'.json',JSON.stringify({...report,presentation,errors,scope:'Synthetic PointerEvent and held formal jobs; complete RGBA hashes. Latencies include polling, no scanout.'},null,2));
 console.log('PASS independent preview, pen+two touches, pending A/B/Undo/Save/complete/Redo/reload, exact RGBA, eraser',report);
}finally{await browser.close();server.close()}
