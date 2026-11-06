/** Actual default bitmap surfaces, 100 held jobs and a save fence at job 50. */
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=resolve('.'),server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://x').pathname,file=resolve(root,'.'+(p==='/'?'/index.html':p));if(!file.startsWith(root+sep))throw Error();res.setHeader('content-type',extname(file)==='.mjs'?'text/javascript':extname(file)==='.css'?'text/css':'text/html');res.end(await readFile(file))}catch{res.writeHead(404).end()}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1100,height:820}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
 await page.addInitScript(()=>{const Native=Worker;window.held=[];window.hold=true;window.Worker=class extends Native{constructor(url,o){super(url,o);this.formal=String(url).includes('raster-worker')}postMessage(m,t){if(this.formal&&window.hold&&['stroke','save','undo','redo'].includes(m.type)){window.held.push([this,m,t]);return}super.postMessage(m,t)}};window.release=()=>{window.hold=false;for(const [w,m,t]of window.held.splice(0))Native.prototype.postMessage.call(w,m,t)}});
 await page.goto('http://127.0.0.1:'+server.address().port+'/?inputDebug=1');await page.waitForFunction(()=>document.getElementById('art')?.width===1600);
 const report=await page.evaluate(async()=>{
  const $=id=>document.getElementById(id),stage=$('stage'),sleep=ms=>new Promise(ok=>setTimeout(ok,ms)),raf=()=>new Promise(ok=>requestAnimationFrame(ok));
  const until=async test=>{const at=performance.now();while(!await test()){if(performance.now()-at>60000)throw Error('Backlog timeout '+$('toast').textContent+' '+stage.dataset.rasterError);await sleep(20)}};
  document.querySelector('[data-action=new]').click();$('new-width').value=640;$('new-height').value=480;$('new-dialog').requestSubmit();await until(()=>stage.dataset.presentationReady==='true');
  const paper=$('paper'),scene=$('retained-scene'),r=stage.getBoundingClientRect(),pose=new DOMMatrix(paper.style.transform),writes=[];
  window.showSaveFilePicker=async()=>({createWritable:async()=>({write:async d=>writes.push(JSON.parse(typeof d==='string'?d:new TextDecoder().decode(d))),close:async()=>{},abort:async()=>{}})});
  const emit=(type,kind,id,x,y,n=1)=>{const opt={bubbles:true,pointerId:id,pointerType:kind,button:0,buttons:type==='pointerup'?0:1,pressure:.7,clientX:r.x+x,clientY:r.y+y};const e=new PointerEvent(type,opt);if(n>1)e.getCoalescedEvents=()=>Array.from({length:n},(_,i)=>new PointerEvent(type,{...opt,clientX:opt.clientX+i*.1,clientY:opt.clientY+i*.1}));stage.dispatchEvent(e)};
  $('size-n').value=12;$('size-n').dispatchEvent(new Event('change'));
  for(let i=0;i<100;i++){const p=new DOMPoint(90+(i%10)*12,80+Math.floor(i/10)*24).matrixTransform(pose);emit('pointerdown','pen',10,p.x,p.y);emit('pointermove','pen',10,p.x+70,p.y+6,32);emit('pointerup','pen',10,p.x+70,p.y+6);if(i===49)document.querySelector('[data-action=save]').click();if(i%10===9)await raf()}
  const pending=Number(stage.dataset.rasterPending);if(pending!==100)throw Error('Expected 100 admitted provisional strokes, got '+pending);
  await until(()=>document.querySelectorAll('#display-tiles canvas').length>0);
  const base=paper.style.transform;const mark=scene.style.transform;const at=performance.now();emit('pointerdown','touch',21,400,360);emit('pointerdown','touch',22,500,360);emit('pointermove','touch',21,430,390);emit('pointermove','touch',22,565,330);
  if(scene.style.transform===mark||paper.style.transform!==base)throw Error('Navigation must change only retained scene transform');
  const updateMs=performance.now()-at,combined=new DOMMatrix(scene.style.transform).multiply(new DOMMatrix(base));
  for(const p of [[0,0],[320,240],[640,480]]){const a=new DOMPoint(...p).matrixTransform(combined);if(!Number.isFinite(a.x+a.y))throw Error('Invalid View affine')}
  emit('pointerup','touch',21,430,390);emit('pointerup','touch',22,565,330);
  // Completing the gesture rebases the children at the identical document pose.
  const rebased=new DOMMatrix(paper.style.transform);const affineDelta=Math.max(...['a','b','c','d','e','f'].map(k=>Math.abs(rebased[k]-combined[k])));if(affineDelta>.001)throw Error('View rebase jumped '+affineDelta);
  window.release();await until(()=>writes.length===1&&stage.dataset.rasterPending==='0');if(writes[0].brushArchive.strokes.length!==50)throw Error('Save fence leaked later jobs');
  document.querySelector('[data-action=saveas]').click();await until(()=>writes.length===2);const saved=writes[1];if(saved.brushArchive.strokes.length!==100)throw Error('Dropped accepted strokes');
  const bmp=await createImageBitmap(await(await fetch(saved.layers[0].png)).blob()),expected=new OffscreenCanvas(640,480),ec=expected.getContext('2d',{willReadFrequently:true});ec.drawImage(bmp,0,0);bmp.close();const expectedData=ec.getImageData(0,0,640,480).data;
  for(let i=0;i<expectedData.length;i+=4){const a=expectedData[i+3]/255;for(let c=0;c<3;c++)expectedData[i+c]=Math.round(expectedData[i+c]*a+255*(1-a));expectedData[i+3]=255}
  const digest=async d=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',d)),n=>n.toString(16).padStart(2,'0')).join(''),expectedHash=await digest(expectedData);let actualHash;
  await until(async()=>{const out=new OffscreenCanvas(640,480),ctx=out.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,640,480);for(const tile of document.querySelectorAll('#display-tiles canvas'))ctx.drawImage(tile,parseFloat(tile.style.left),parseFloat(tile.style.top));actualHash=await digest(ctx.getImageData(0,0,640,480).data);return actualHash===expectedHash});
  return {pending,updateMs,affineDelta,savedAtFence:writes[0].brushArchive.strokes.length,savedFinal:saved.brushArchive.strokes.length,expectedHash,actualHash,scope:'Synthetic 32 coalesced samples/event; default bitmap presentation without pixelMirror; updateMs is synchronous CSS submission, no scanout'};
 });assert.deepEqual(errors,[]);await writeFile('/tmp/illustro-backlog.json',JSON.stringify({...report,errors},null,2));console.log('PASS 100 held jobs, default displayed pixels, Save at 50, View rebase',report);
}finally{await browser.close();server.close()}
