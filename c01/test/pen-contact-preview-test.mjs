/** Stylus contact and terminal preview integration. Raster is held by the test:
 * the last painted pixel must be visible BEFORE formal stroke completion.
 * Synthetic pointer events do not measure hardware contact-to-photon delay. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=resolve('.');
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://local').pathname;
  const file=resolve(root,'.'+(path==='/'?'/index.html':path));
  if(!file.startsWith(root+sep))throw Error('outside test root');
  res.setHeader('content-type',extname(file)==='.mjs'?'text/javascript':extname(file)==='.css'?'text/css':'text/html');
  res.end(await readFile(file));
 }catch{res.writeHead(404).end()}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1100,height:820}}),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.addInitScript(()=>{
  const Native=Worker;window.__heldStrokes=[];
  window.Worker=class extends Native{
   constructor(url,options){super(url,options);this.formal=String(url).includes('raster-worker')}
   postMessage(message,transfer){
    if(this.formal&&message.type==='stroke'){window.__heldStrokes.push({worker:this,message,transfer});return}
    return super.postMessage(message,transfer);
   }
  };
  window.__releaseStrokes=()=>{for(const item of window.__heldStrokes.splice(0))Native.prototype.postMessage.call(item.worker,item.message,item.transfer)};
 });
 await page.goto('http://127.0.0.1:'+server.address().port+'/?pixelMirror=1&presentation=bitmap',{waitUntil:'load'});
 const result=await page.evaluate(async()=>{
  const stage=document.getElementById('stage'),paper=document.getElementById('paper');
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const until=async(check,label)=>{const started=performance.now();while(!check()){if(performance.now()-started>12000)throw Error('Timeout '+label+' pending='+stage.dataset.rasterPending+' error='+stage.dataset.rasterError);await sleep(15)}};
  await until(()=>stage.dataset.presentationReady==='true','display ready');
  document.querySelector('[data-tool=gpen]').click();
  document.getElementById('size-n').value=26;
  document.getElementById('size-n').dispatchEvent(new Event('change'));
  const alpha=(x,y,id='preview')=>{const c=document.getElementById(id);return c.getContext('2d').getImageData(Math.round(x),Math.round(y),1,1).data[3]};
  const rect=stage.getBoundingClientRect(),matrix=new DOMMatrix(paper.style.transform);
  const emit=(type,x,y,pressure,buttons)=>{
   const mapped=new DOMPoint(x,y).matrixTransform(matrix);
   stage.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:101,pointerType:'pen',button:0,buttons,pressure,clientX:rect.left+mapped.x,clientY:rect.top+mapped.y}));
  };
  const start=[350,300],middle=[450,300],end=[610,300];
  emit('pointerdown',...start,0,1);
  emit('pointermove',...middle,.85,1);
  // Observe the earlier point before sending pen-up; the final coordinate
  // must not rely on replay of already-consumed previewIndex.
  await until(()=>alpha(...middle)>0,'intermediate provisional ink');
  emit('pointerup',...end,0,0);
  await until(()=>alpha(...end)>0,'end contact provisional ink');
  const before={startAlpha:alpha(...start),middleAlpha:alpha(...middle),endAlpha:alpha(...end),formalEndAlpha:alpha(...end,'art'),held:window.__heldStrokes.length};
  window.__releaseStrokes();
  await until(()=>stage.dataset.rasterPending==='0'&&alpha(...end,'art')>0,'formal completion');
  return {before,after:{startAlpha:alpha(...start,'art'),endAlpha:alpha(...end,'art'),previewEndAlpha:alpha(...end)}};
 });
 assert.ok(result.before.startAlpha>0,'pen-down with zero reported pressure must leave a visible first mark');
 assert.ok(result.before.middleAlpha>0,'live preview must show intermediate pen ink');
 assert.ok(result.before.endAlpha>0,'preview must show final physical pen-up point before raster completes');
 assert.equal(result.before.formalEndAlpha,0,'formal raster intentionally held for preview-only check');
 assert.equal(result.before.held,1,'one formal stroke must be gated');
 assert.ok(result.after.startAlpha>0&&result.after.endAlpha>0,'formal raster must include both contacts');
 assert.ok(result.after.previewEndAlpha>0,'handoff retains terminal point');
 assert.deepEqual(errors,[]);
 console.log('PASS stylus down anchor, last pen-up preview, independent formal completion',result);
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
