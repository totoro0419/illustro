import {GpuRenderer} from '@rt/renderer';
import {uploadTilePages} from '@rt/presentation-tiles';

// A display-only GPU context. No stroke, history, readback or raster queue is
// shared with it. Pan/pinch/rotation consumes the latest retained document
// tiles, including regions outside the previous viewport.
let renderer,view,epoch=0,running=false,again=false,version=0;
const pending=[],metrics={uploads:0,uploadCpuMaxMs:0,renderCpuMaxMs:0,frames:0};
const fail=error=>postMessage({type:'fault',error:String(error)});
async function draw(){
 if(running||!renderer||!view)return;running=true;
 try{do{again=false;const requests=pending.splice(0),b=renderer.backend,v=Array.from(view),generation=version,contentEpoch=epoch;
  b.setViewTransform(v);b.navigationPresentation=false;
  // Explicit direct refresh completely populates each new default bitmap.
  // transferToImageBitmap cannot turn a cache hit into a black picture.
  const started=performance.now(),done=b.presentCurrent(true);metrics.renderCpuMaxMs=Math.max(metrics.renderCpuMaxMs,performance.now()-started);await done;metrics.frames++;
  const bitmap=b.canvas.transferToImageBitmap();
  postMessage({type:'image',bitmap,view:v,epoch:contentEpoch,version:generation,requests,performance:{...metrics}},[bitmap]);
 }while(again||pending.length);
 }catch(error){fail(error);}finally{running=false;}
}
self.onmessage=({data:m})=>{Promise.resolve().then(async()=>{
 if(m.method==='init'){
  renderer=await GpuRenderer.create(new OffscreenCanvas(m.width,m.height),m.documentWidth,m.documentHeight,m.backend,{strokeHandoff:true,tileHistory:false});postMessage({type:'ready',info:renderer.info});
 }else if(m.method==='view'){view=m.view;again=true;void draw();}
 else if(m.method==='tiles'){
  const started=performance.now();uploadTilePages(renderer.backend,m.pages);metrics.uploads+=m.pages.length;metrics.uploadCpuMaxMs=Math.max(metrics.uploadCpuMaxMs,performance.now()-started);epoch=m.epoch;version=m.version;pending.push(m.request);again=true;void draw();
 }else if(m.method==='read'){
  const pixels=await renderer.backend.readViewport();postMessage({type:'read',request:m.request,pixels},[pixels.buffer]);
 }else if(m.method==='destroy'){renderer?.destroy();close();}
 else throw Error('Unknown presentation method');
 }).catch(fail);};
