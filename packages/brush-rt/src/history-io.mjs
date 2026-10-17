import {TILE} from '@rt/model';

export const HISTORY_BYTES=TILE*TILE*4;
// A normal task also admits native GPU completion messages. Repeated boosted
// scheduler.yield continuations can starve those messages while polling a fence.
export const historyYield=()=>new Promise(resolve=>setTimeout(resolve,0));

/** Read immutable snapshots, not mutable document tiles. At most 512 KiB per
 * transfer. Fence polling/mapAsync yields; readPixels never waits on the CPU. */
export async function readHistoryImages(b,images){
 if(images.length>8)throw Error('History transfer exceeds 512 KiB');
 if(!images.length)return [];
 const result=images.map(()=>new Uint8Array(HISTORY_BYTES));
 if(b.gl){
  const g=b.gl,pbo=g.createBuffer();let fence;
  try{
   g.bindBuffer(g.PIXEL_PACK_BUFFER,pbo);g.bufferData(g.PIXEL_PACK_BUFFER,images.length*HISTORY_BYTES,g.STREAM_READ);
   images.forEach((image,i)=>{g.bindFramebuffer(g.FRAMEBUFFER,image.f);g.readPixels(0,0,TILE,TILE,g.RGBA,g.UNSIGNED_BYTE,i*HISTORY_BYTES);});
   fence=g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE,0);g.bindBuffer(g.PIXEL_PACK_BUFFER,null);g.flush();
   const start=performance.now();
   for(;;){await historyYield();if(b.lost)throw Error('History GPU context lost');const status=g.clientWaitSync(fence,0,0);
    if(status===g.ALREADY_SIGNALED||status===g.CONDITION_SATISFIED)break;
    if(status===g.WAIT_FAILED||performance.now()-start>30000)throw Error('History read fence failed');}
   g.bindBuffer(g.PIXEL_PACK_BUFFER,pbo);
   result.forEach((pixels,i)=>g.getBufferSubData(g.PIXEL_PACK_BUFFER,i*HISTORY_BYTES,pixels));
  }finally{g.bindBuffer(g.PIXEL_PACK_BUFFER,null);if(fence)g.deleteSync(fence);g.deleteBuffer(pbo);}
 }else{
  const d=b.device,buffer=d.createBuffer({size:images.length*HISTORY_BYTES,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
  try{
   const e=d.createCommandEncoder();images.forEach((texture,i)=>e.copyTextureToBuffer({texture},{buffer,offset:i*HISTORY_BYTES,bytesPerRow:TILE*4},[TILE,TILE]));
   d.queue.submit([e.finish()]);await buffer.mapAsync(GPUMapMode.READ);
   const mapped=new Uint8Array(buffer.getMappedRange());result.forEach((pixels,i)=>pixels.set(mapped.subarray(i*HISTORY_BYTES,(i+1)*HISTORY_BYTES)));
  }finally{buffer.destroy();}
 }
 return result;
}

export function copyHistoryImage(b,source,target,encoder){
 if(encoder)encoder.copyTextureToTexture({texture:source},{texture:target},[TILE,TILE]);else b.copySurface(source,target);
}
export function newHistoryImage(b){return b.gl?b.surface(TILE,TILE,b.gl.RGBA8,b.gl.UNSIGNED_BYTE):b.texture(TILE,TILE,'rgba8unorm');}
export function releaseHistoryImage(b,image){if(b.gl)b.release(image);else image.destroy();}
export function uploadHistoryImage(b,pixels,target){
 if(b.gl){const g=b.gl;g.bindTexture(g.TEXTURE_2D,target.t);g.texSubImage2D(g.TEXTURE_2D,0,0,0,TILE,TILE,g.RGBA,g.UNSIGNED_BYTE,pixels);}
 else b.device.queue.writeTexture({texture:target},pixels,{bytesPerRow:TILE*4},[TILE,TILE]);
}

/** Session cache only. The document journal remains the crash-recovery source. */
export class HistoryArchive {
 constructor(options={}){
  this.sequence=0;this.pending=new Map;this.metrics={};this.closed=false;
  this.worker=new Worker(new URL('./history.worker.mjs',import.meta.url),{type:'module'});
  this.worker.onmessage=({data:m})=>{this.metrics=m.metrics??this.metrics;const p=this.pending.get(m.request);if(!p)return;this.pending.delete(m.request);clearTimeout(p.timer);m.error?p.reject(Error(m.error)):p.resolve(m);};
  this.worker.onerror=e=>this.fail(Error(e.message||'History worker failed'));
  this.ready=this.call('init',{memoryBudget:options.memoryBudget,diskBudget:options.diskBudget,storageDisabled:options.storageDisabled});
  this.ready.catch(()=>{});
 }
 call(type,values={},transfer=[]){
  if(this.closed)return Promise.reject(Error('History archive closed'));
  const request=++this.sequence;
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(request);reject(Error('History archive timeout'));},30000);this.pending.set(request,{resolve,reject,timer});this.worker.postMessage({type,request,...values},transfer);});
 }
 async put(id,pixels){await this.ready;return this.call('put',{id,pixels},[pixels.buffer]);}
 async get(id){await this.ready;return this.call('get',{id});}
 async getMany(ids){await this.ready;return (await this.call('get-many',{ids})).tiles;}
 drop(ids){if(ids.length)void this.ready.then(()=>this.call('drop',{ids})).catch(()=>{});}
 fail(error){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();this.closed=true;this.worker.terminate();}
 destroy(){if(this.closed)return;void this.call('close').finally(()=>this.fail(Error('History archive disposed'))).catch(()=>{});}
}
