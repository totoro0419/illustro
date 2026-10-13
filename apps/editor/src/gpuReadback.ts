import {TILE} from '@illustro/brush-rt';
export type TileReadRequest={surfaceId:string;key:string};
const bytes=TILE*TILE*4;
/** One bounded transfer (at most 1 MiB), without allocating absent GPU tiles. */
export async function readGpuTiles(backend:any,requests:readonly TileReadRequest[],valid:()=>boolean){
 if(requests.length>16)throw new Error('GPU readback batch exceeds 1 MiB');
 if(!valid())throw new Error('Projection checkpoint capture is stale');
 const result=requests.map(r=>({...r,pixels:new Uint8Array(bytes)}));
 const occupied=result.map((r,i)=>({i,t:backend.tiles.get(r.surfaceId+'\u0000'+r.key)})).filter(x=>x.t);
 if(!occupied.length)return result;
 if(backend.gl){
  const gl=backend.gl as WebGL2RenderingContext,pbo=gl.createBuffer();if(!pbo)throw new Error('GPU readback buffer unavailable');let fence:WebGLSync|null=null;
  try{
   gl.bindBuffer(gl.PIXEL_PACK_BUFFER,pbo);gl.bufferData(gl.PIXEL_PACK_BUFFER,occupied.length*bytes,gl.STREAM_READ);
   for(const [index,{t}]of occupied.entries()){gl.bindFramebuffer(gl.FRAMEBUFFER,t.layer[t.l].f);gl.readPixels(0,0,TILE,TILE,gl.RGBA,gl.UNSIGNED_BYTE,index*bytes);}
   fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);gl.flush();if(!fence)throw new Error('GPU readback fence unavailable');
   const started=performance.now();
   while(true){await new Promise<void>(resolve=>setTimeout(resolve,0));if(!valid())throw new Error('Projection checkpoint capture is stale');
    const status=gl.clientWaitSync(fence,0,0);if(status===gl.ALREADY_SIGNALED||status===gl.CONDITION_SATISFIED)break;
    if(status===gl.WAIT_FAILED||performance.now()-started>30000)throw new Error('GPU readback fence failed or timed out');}
   gl.bindBuffer(gl.PIXEL_PACK_BUFFER,pbo);
   for(const [index,{i}]of occupied.entries())gl.getBufferSubData(gl.PIXEL_PACK_BUFFER,index*bytes,result[i]!.pixels);
  }finally{gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);if(fence)gl.deleteSync(fence);gl.deleteBuffer(pbo);}
 }else if(backend.device){
  const d=backend.device,gpu=globalThis as any,b=d.createBuffer({size:occupied.length*bytes,usage:gpu.GPUBufferUsage.COPY_DST|gpu.GPUBufferUsage.MAP_READ});
  try{const encoder=d.createCommandEncoder();for(const [index,{t}]of occupied.entries())encoder.copyTextureToBuffer({texture:t.layer[t.l]},{buffer:b,offset:index*bytes,bytesPerRow:TILE*4},[TILE,TILE]);
   d.queue.submit([encoder.finish()]);await b.mapAsync(gpu.GPUMapMode.READ);
   if(!valid())throw new Error('Projection checkpoint capture is stale');const array=new Uint8Array(b.getMappedRange());
   for(const [index,{i}]of occupied.entries())result[i]!.pixels.set(array.subarray(index*bytes,(index+1)*bytes));
  }finally{b.destroy();}
 }else throw new Error('Projection checkpoint readback backend unsupported');
 if(!valid())throw new Error('Projection checkpoint capture is stale');return result;
}
