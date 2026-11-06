/** Inspect compositor screenshots, including pixels at display-tile boundaries. */
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=resolve('.'),server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://x').pathname,file=resolve(root,'.'+(p==='/'?'/index.html':p));if(!file.startsWith(root+sep))throw Error();res.setHeader('content-type',extname(file)==='.mjs'?'text/javascript':extname(file)==='.css'?'text/css':'text/html');res.end(await readFile(file))}catch{res.writeHead(404).end()}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1100,height:820},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForFunction(()=>document.getElementById('art')?.width===1600);
 await page.evaluate(()=>{const $=id=>document.getElementById(id);document.querySelector('[data-action=new]').click();$('new-width').value=640;$('new-height').value=480;$('new-dialog').requestSubmit();});
 await page.waitForFunction(()=>document.getElementById('stage').dataset.presentationReady==='true');
 await page.evaluate(()=>{const $=id=>document.getElementById(id);document.querySelector('[data-tool=round]').click();$('show-cursor').checked=false;$('size-n').value=120;$('size-n').dispatchEvent(new Event('change'));$('hex').value='#223344';$('hex').dispatchEvent(new Event('change'));const stage=$('stage'),r=stage.getBoundingClientRect(),matrix=new DOMMatrix($('paper').style.transform);for(let i=0;i<=20;i++){const p=new DOMPoint(40+i*28,200).matrixTransform(matrix),type=i===0?'pointerdown':i===20?'pointerup':'pointermove';stage.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'pen',pointerId:11,button:0,buttons:i===20?0:1,pressure:1,clientX:r.x+p.x,clientY:r.y+p.y}))}});
 await page.waitForFunction(()=>document.getElementById('stage').dataset.presentationSeq==='1');
 const results=[];
 for(const pose of ['fit','rotate-zoom','flipped']){
  if(pose==='rotate-zoom')await page.evaluate(()=>{const stage=document.getElementById('stage'),r=stage.getBoundingClientRect();const emit=(type,id,x,y)=>stage.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'touch',pointerId:id,button:0,buttons:type==='pointerup'?0:1,clientX:r.x+x,clientY:r.y+y}));emit('pointerdown',21,400,300);emit('pointerdown',22,500,300);emit('pointermove',22,500,350);emit('pointerup',21,400,300);emit('pointerup',22,500,350)});
  if(pose==='flipped'){await page.locator('[data-action=flipx]').click();await page.locator('[data-action=flipy]').click()}
  await page.evaluate(()=>new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok))));
  const points=await page.evaluate(()=>{const matrix=new DOMMatrix(document.getElementById('paper').style.transform),out=[];for(const x of [128,256,384,512])for(const delta of [-2,-1,-.5,0,.5,1,2])for(const y of [190,200,210,255.5,256,256.5]){const p=new DOMPoint(x+delta,y).matrixTransform(matrix);out.push({doc:[x+delta,y],x:Math.round(p.x),y:Math.round(p.y)})}return out});
  const image=await page.locator('#stage').screenshot();
  const result=await page.evaluate(async({base64,points})=>{const bmp=await createImageBitmap(await(await fetch('data:image/png;base64,'+base64)).blob()),canvas=new OffscreenCanvas(bmp.width,bmp.height),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bmp,0,0);bmp.close();const d=ctx.getImageData(0,0,canvas.width,canvas.height).data;let max=0,checked=0;const failures=[];for(const p of points){if(p.x<1||p.y<1||p.x>=canvas.width-1||p.y>=canvas.height-1)continue;const i=(p.y*canvas.width+p.x)*4,delta=Math.max(...[34,51,68].map((v,c)=>Math.abs(d[i+c]-v)));max=Math.max(max,delta);checked++;if(delta>3&&failures.length<5)failures.push({...p,rgba:[...d.slice(i,i+4)]})}return {checked,maxChannelDelta:max,failures}}, {base64:image.toString('base64'),points});
  if(result.maxChannelDelta>3)await writeFile('/tmp/illustro-view-'+pose+'.png',image);
  results.push({pose,...result});assert.ok(result.checked>=100,'Enough visible boundary samples');assert.ok(result.maxChannelDelta<=3,JSON.stringify({pose,...result}));
 }
 const taps=await page.evaluate(async()=>{
  const stage=document.getElementById('stage'),r=stage.getBoundingClientRect();
  const tap=n=>{for(let i=0;i<n;i++)stage.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:80+i,button:0,buttons:1,clientX:r.x+300+i*60,clientY:r.y+350}));for(let i=0;i<n;i++)stage.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:80+i,button:0,buttons:0,clientX:r.x+300+i*60,clientY:r.y+350}))};
  tap(2);const undone=!document.querySelector('[data-action=redo]').disabled;tap(3);return {undone,redone:document.querySelector('[data-action=redo]').disabled};
 });assert.ok(taps.undone&&taps.redone,'Two-finger Undo and three-finger Redo must each run once');
 assert.deepEqual(errors,[]);await writeFile('/tmp/illustro-display-viewport.json',JSON.stringify({scope:'Actual Chromium compositor screenshot / default presentation; opaque flat interiors at tile boundaries; cursor disabled through its normal checkbox; no pixelMirror',results,taps,errors},null,2));console.log('PASS actual displayed tile edges / rotate / zoom / flips',results);
}finally{await browser.close();server.close()}
