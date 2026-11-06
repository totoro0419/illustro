/** Independent frozen-reference comparison: use the pre-fix checkout, not the
 * modified module as its own oracle. Same seed, samples, settings and output RGBA. */
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const roots={current:resolve('.'),reference:resolve(process.env.ILLUSTRO_REFERENCE||'../../illustro_before/c01')};
const server=createServer(async(req,res)=>{try{const parts=new URL(req.url,'http://x').pathname.split('/').filter(Boolean);if(!parts.length){res.end('<!doctype html><title>Raster equality</title>');return}const root=roots[parts.shift()];if(!root)throw Error();const file=resolve(root,parts.join('/'));if(!file.startsWith(root+sep))throw Error();res.setHeader('content-type','text/javascript');res.end(await readFile(file))}catch{res.writeHead(404).end()}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:'+server.address().port);
 const report=await page.evaluate(async()=>{
  const {preset}=await import('/current/app/brush-engine.mjs'),old=await import('/reference/app/brush-raster.mjs'),now=await import('/current/app/brush-raster.mjs');
  const results=[],worker=new Worker('/current/app/raster-worker.mjs',{type:'module'});let epoch=0;
  const seed=document.createElement('canvas');seed.width=320;seed.height=256;const seedContext=seed.getContext('2d',{willReadFrequently:true});seedContext.fillStyle='rgba(210,80,30,.75)';seedContext.fillRect(30,30,250,190);
  const basePNG=seed.toDataURL(),basePixels=seedContext.getImageData(0,0,320,256).data;
  for(const name of ['round','gpen','pencil','marker','air','hardEraser','softEraser','taper-scatter','alpha-lock','behind','wrap','selection','bitmap','particles','broad-pencil','repeat-texture','low-opacity']){
   const b=preset(name.includes('Eraser')||['pencil','marker','air','gpen'].includes(name)?name:'round');
   if(name==='taper-scatter')Object.assign(b,{taper:true,start:50,end:60,scatter:5,aspect:.7,shear:.25,angle:27});
   if(name==='bitmap')Object.assign(b,{tip:'bitmap',asset:{width:2,height:2,alpha:'ff803000',sha256:'0'.repeat(64)}});
   if(name==='particles')b.particles=5;
   if(['broad-pencil','repeat-texture'].includes(name))Object.assign(b,{texture:'graphite',depth:.85,textureAngle:27});
   if(['alpha-lock','behind'].includes(name))b.blend=name;
   const stroke={brush:b,algorithm:'illustro.canvas-dabs.1',points:Array.from({length:35},(_,i)=>({x:12+i*9,y:110+55*Math.sin(i/4),t:i*6,p:.1+.8*Math.sin(i/34*Math.PI),tiltX:20,tiltY:-10,azimuth:45,twist:15})),seed:'0011223344556677',size:name==='wrap'?380:name==='broad-pencil'?300:72,opacity:name==='low-opacity'?.05:b.opacityFactor,flow:.83,colorAlpha:.8,color:[32,103,189],pen:true,curve:1.2,correction:{mode:'strong'},wrap:['wrap','repeat-texture'].includes(name),selection:name==='selection'?{x:80,y:50,w:120,h:150,alpha:.6}:null};
   const draw=api=>{const c=new OffscreenCanvas(320,256),ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='rgba(210,80,30,.75)';ctx.fillRect(30,30,250,190);const {ink,stamps}=api.rasterize(stroke,320,256);for(const [key,tile]of ink.tiles){const box=api.tileBox(key,320,256);api.composite(ctx,stroke,tile,box.x,box.y)}return {pixels:ctx.getImageData(0,0,320,256).data,stamps}};
   const a=draw(old),bResult=draw(now);let differences=0,maxChannelDelta=0,totalDelta=0;
   for(let i=0;i<a.pixels.length;i++){const delta=Math.abs(a.pixels[i]-bResult.pixels[i]);if(delta)differences++;totalDelta+=delta;maxChannelDelta=Math.max(maxChannelDelta,delta)}
   const atEpoch=++epoch;
   const packet=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Worker formal timeout '+name)),30000);worker.onmessage=({data:m})=>{if(m.epoch!==atEpoch)return;if(m.type==='frame'||m.type==='error'){clearTimeout(timer);m.type==='frame'?resolve(m):reject(Error(m.message))}};worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message))};worker.postMessage({type:'reset',epoch:atEpoch,width:320,height:256});worker.postMessage({type:'load',epoch:atEpoch,png:basePNG});worker.postMessage({type:'stroke',epoch:atEpoch,seq:1,stroke})});
   const actual=new Uint8ClampedArray(basePixels);for(const {box,image}of packet.pictures)for(let y=0;y<box.h;y++)actual.set(image.data.subarray(y*box.w*4,(y+1)*box.w*4),((box.y+y)*320+box.x)*4);
   let workerDifferingChannels=0,workerMaxChannelDelta=0;for(let i=0;i<actual.length;i++){const delta=Math.abs(actual[i]-a.pixels[i]);if(delta)workerDifferingChannels++;workerMaxChannelDelta=Math.max(workerMaxChannelDelta,delta)}
   results.push({name,workerDifferingChannels,workerMaxChannelDelta,workerStamps:packet.stats.stamps,workerMs:packet.stats.workerMs,maxSliceMs:packet.stats.maxSliceMs,referenceStamps:a.stamps,currentStamps:bResult.stamps,differingChannels:differences,maxChannelDelta,totalDelta});
  }
  worker.terminate();return results;
 });
 await writeFile(process.env.ILLUSTRO_EQUIVALENCE_OUT||'/tmp/illustro-formal-equivalence.json',JSON.stringify({reference:'4a002dd4dde701579ce0cc0c9bb7bb9da96807f0',scope:'Full RGBA from direct raster AND actual cooperative formal Worker against frozen original raster module; same seed / path / brush / Canvas2D implementation.',cases:report,errors},null,2));
 assert.deepEqual(errors,[]);for(const r of report){assert.equal(r.currentStamps,r.referenceStamps);assert.equal(r.workerStamps,r.referenceStamps);assert.equal(r.workerMaxChannelDelta,0,'Formal Worker mismatch: '+JSON.stringify(r));assert.equal(r.maxChannelDelta,0,'Frozen raster mismatch: '+JSON.stringify(r))}
 console.log('PASS frozen pre-fix raster equality, 17 cases / all RGBA channels',report);
}finally{await browser.close();server.close()}
