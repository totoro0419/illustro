import {GpuRenderer} from '@rt/renderer';
import {uploadTilePages} from '@rt/presentation-tiles';

// A display-only GPU context. No stroke, history, readback or raster queue is
// shared with it. Pan/pinch/rotation consumes the latest retained document
// tiles, including regions outside the previous viewport.
let renderer,view,epoch=0,running=false,again=false,version=0,navigation=false;
const metrics={uploads:0,uploadCpuMaxMs:0,renderCpuMaxMs:0,frames:0};
const fail=error=>postMessage({type:'fault',error:String(error)});
async function draw(){
 if(running||!renderer||!view||navigation&&view[12]<.5&&view[14]<.5)return;running=true;
 try{do{again=false;const b=renderer.backend,v=Array.from(view),generation=version,contentEpoch=epoch;
  b.setViewTransform(v);b.navigationPresentation=false;
  // Explicit direct refresh completely populates each new default bitmap.
  // transferToImageBitmap cannot turn a cache hit into a black picture.
  const started=performance.now(),done=b.presentCurrent(true);metrics.renderCpuMaxMs=Math.max(metrics.renderCpuMaxMs,performance.now()-started);
  // WebGPU's current canvas texture expires at a task boundary. Transfer its
  // immutable ownership before yielding, then wait for the submitted work;
  // never reacquire a blank/new default bitmap after the GPU acknowledgement.
  const bitmap=b.canvas.transferToImageBitmap();try{await done;}catch(error){bitmap.close();throw error;}metrics.frames++;
  postMessage({type:'image',bitmap,view:v,epoch:contentEpoch,version:generation,performance:{...metrics}},[bitmap]);
 }while(again&&(!navigation||view[12]>.5||view[14]>.5));
 }catch(error){fail(error);}finally{running=false;}
}
self.onmessage=({data:m})=>{Promise.resolve().then(async()=>{
 if(m.method==='init'){
  renderer=await GpuRenderer.create(new OffscreenCanvas(m.width,m.height),m.documentWidth,m.documentHeight,m.backend,{strokeHandoff:true,tileHistory:false});postMessage({type:'ready',info:renderer.info});
 }else if(m.method==='view'){view=m.view;again=true;void draw();}
 // A plain affine gesture is composed from retained document pictures. It
 // needs no new GPU viewport image for each finger event. Keep the latest view
 // and refresh M08 once the interaction ends; document updates keep publishing.
 else if(m.method==='navigation'){navigation=m.active;again=true;void draw();}
 else if(m.method==='tiles'){
  const started=performance.now(),tiles=[];
  // Crop immutable atlas pictures in this worker, never via window Canvas2D or
  // a synchronous GPU read. Keep only changed tiles in the compositor scene.
  const tasks=[];for(const page of m.pages)for(const t of page.tiles)tasks.push(createImageBitmap(page.bitmap,t.sx,t.sy,t.w,t.h).then(bitmap=>({...t,bitmap})));tiles.push(...await Promise.all(tasks));
  uploadTilePages(renderer.backend,m.pages);metrics.uploads+=m.pages.length;metrics.uploadCpuMaxMs=Math.max(metrics.uploadCpuMaxMs,performance.now()-started);epoch=m.epoch;version=m.version;
  postMessage({type:'document',tiles,epoch,version,request:m.request},tiles.map(t=>t.bitmap));again=true;void draw();
 }else if(m.method==='read'){
  const pixels=await renderer.backend.readViewport();postMessage({type:'read',request:m.request,pixels},[pixels.buffer]);
 }else if(m.method==='destroy'){renderer?.destroy();close();}
 else throw Error('Unknown presentation method');
 }).catch(fail);};
