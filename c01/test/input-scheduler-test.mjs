/** Data delivery must not depend on main-thread rAF; inspect real Worker pixels. */
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=resolve('.'),server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://x').pathname,file=resolve(root,'.'+(p==='/'?'/index.html':p));if(!file.startsWith(root+sep))throw Error();res.setHeader('content-type',extname(file)==='.mjs'?'text/javascript':extname(file)==='.css'?'text/css':'text/html');res.end(await readFile(file))}catch{res.writeHead(404).end()}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1100,height:820}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
 await page.addInitScript(()=>{
  window.__scheduler={sent:[],submitted:[],endpoint:false};
  const Native=window.Worker;
  window.Worker=class extends Native{
   constructor(url,opts){super(url,opts);this.preview=String(url).includes('preview-worker');if(this.preview)this.addEventListener('message',({data:m})=>{
    if(m.type==='display-submit')window.__scheduler.submitted.push(performance.now());
    for(const p of m.pictures||[]){const {x,y,w,h}=p.box;if(300>=x&&300<x+w&&200>=y&&200<y+h){const i=((200-y)*w+300-x)*4;if(p.image.data[i+3]>100)window.__scheduler.endpoint=true}}
   })}
   postMessage(m,...args){if(this.preview&&m.type==='points')window.__scheduler.sent.push({at:performance.now(),active:m.active,count:m.points.length,last:m.points.at(-1)});return super.postMessage(m,...args)}
  };
 });
 await page.goto('http://127.0.0.1:'+server.address().port+'/?perf=1');await page.waitForFunction(()=>document.getElementById('art')?.width===1600);
 await page.evaluate(()=>{const $=id=>document.getElementById(id);document.querySelector('[data-action=new]').click();$('new-width').value=640;$('new-height').value=480;$('new-dialog').requestSubmit()});
 await page.waitForFunction(()=>document.getElementById('stage').dataset.presentationReady==='true');
 await page.evaluate(()=>{document.querySelector('[data-tool=round]').click();const size=document.getElementById('size-n');size.value=30;size.dispatchEvent(new Event('change'));document.getElementById('show-cursor').checked=false;});
 await page.evaluate(()=>new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok))));
 await page.evaluate(()=>{
  const state=window.__scheduler,raf=requestAnimationFrame,cancel=cancelAnimationFrame,held=new Map();let next=-1;state.held=held;
  window.requestAnimationFrame=cb=>{const id=next--;held.set(id,cb);return id};
  window.cancelAnimationFrame=id=>{if(!held.delete(id))cancel(id)};
  state.restore=()=>{window.requestAnimationFrame=raf;window.cancelAnimationFrame=cancel;for(const cb of held.values())raf(cb);held.clear()};
  Element.prototype.setPointerCapture=()=>{};Element.prototype.hasPointerCapture=()=>false;
  const stage=document.getElementById('stage'),r=stage.getBoundingClientRect(),m=new DOMMatrix(document.getElementById('paper').style.transform);
  state.emit=(type,id,x,y,kind='pen')=>{const p=new DOMPoint(x,y).matrixTransform(m);stage.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:kind,pointerId:id,button:0,buttons:1,pressure:1,clientX:r.x+p.x,clientY:r.y+p.y}))};
  state.started=performance.now();state.emit('pointerdown',11,80,200);
  for(let i=1;i<=22;i++)state.emit('pointermove',11,80+i*10,200);
 });
 await page.waitForFunction(()=>window.__scheduler.sent.some(m=>m.active&&m.last.x>299),null,{polling:5,timeout:5000});
 await page.waitForFunction(()=>window.__scheduler.endpoint&&window.__scheduler.submitted.length>0,null,{polling:10,timeout:5000});
 const intake=await page.evaluate(()=>{const s=window.__scheduler;return {sendMs:s.sent.find(m=>m.active&&m.last.x>299).at-s.started,heldCallbacks:s.held.size,endpoint:s.endpoint,submissions:s.submitted.length}});
 assert.ok(intake.sendMs<100,JSON.stringify(intake));assert.ok(intake.heldCallbacks>0);assert.ok(intake.endpoint);
 const cdp=await page.context().newCDPSession(page);const {data}=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 const pixel=await page.evaluate(async base64=>{const bmp=await createImageBitmap(await(await fetch('data:image/png;base64,'+base64)).blob()),c=new OffscreenCanvas(bmp.width,bmp.height),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(bmp,0,0);bmp.close();const p=new DOMPoint(290,200).matrixTransform(new DOMMatrix(document.getElementById('paper').style.transform)),r=document.getElementById('stage').getBoundingClientRect();return [...ctx.getImageData(Math.round(r.x+p.x),Math.round(r.y+p.y),1,1).data]},data);
 assert.ok(Math.max(...pixel.slice(0,3))<230,'Endpoint must reach actual default display while main rAF is held: '+pixel);
 await page.evaluate(()=>{const s=window.__scheduler;s.cancelAt=performance.now();s.emit('lostpointercapture',11,300,200)});
 await page.waitForFunction(()=>window.__scheduler.sent.some(m=>!m.active&&m.at>=window.__scheduler.cancelAt),null,{polling:5,timeout:5000});
 const interrupted=await page.evaluate(()=>{const s=window.__scheduler;return {inactiveMs:s.sent.find(m=>!m.active&&m.at>=s.cancelAt).at-s.cancelAt,offered:!document.getElementById('interrupted-stroke').hidden}});
 assert.ok(interrupted.inactiveMs<100&&interrupted.offered,JSON.stringify(interrupted));
 const view=await page.evaluate(()=>{const s=window.__scheduler,before=document.getElementById('retained-scene').style.transform;s.emit('pointerdown',21,350,300,'touch');s.emit('pointermove',21,390,320,'touch');const after=document.getElementById('retained-scene').style.transform;s.emit('pointerup',21,390,320,'touch');s.restore();return {before,after}});
 assert.notEqual(view.before,view.after,'View CSS must change without main rAF');
 assert.deepEqual(errors,[]);await writeFile('/tmp/illustro-input-scheduler.json',JSON.stringify({scope:'Synthetic pen with main rAF callbacks deliberately held, real default Worker display screenshot; no physical latency claim',intake,pixel,interrupted,view,errors},null,2));console.log('PASS input delivery / actual display / interruption / View independent of main rAF',{intake,pixel,interrupted});
}finally{await browser.close();server.close()}
