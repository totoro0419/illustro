import {TILE} from '@rt/model';

// Transport is independent of viewport, brush, layers and history. Each atlas
// is immutable and completely initialized before ownership is transferred.
// The raster queue never renders into the window's retained display textures.
export const ATLAS_SIZE=512,ATLAS_TILES=(ATLAS_SIZE/TILE)**2;
export function tilePages(keys,width,height){
 const pages=[];let page=[];
 for(const key of keys){const [tx,ty]=key.split(',').map(Number),x=tx*TILE,y=ty*TILE,w=Math.min(TILE,width-x),h=Math.min(TILE,height-y);
  if(x<0||y<0||w<=0||h<=0)continue;
  const i=page.length;page.push({key,x,y,w,h,sx:i%(ATLAS_SIZE/TILE)*TILE,sy:Math.floor(i/(ATLAS_SIZE/TILE))*TILE});
  if(page.length===ATLAS_TILES){pages.push(page);page=[];}
 }if(page.length)pages.push(page);return pages;
}
export function captureTilePages(b,keys){
 const pages=[];
 for(const tiles of tilePages(keys,b.width,b.height)){
  // transferToImageBitmap replaces the canvas bitmap. Always acquire and
  // populate a NEW full atlas, including transparent holes and edge padding.
  if(b.canvas.width!==ATLAS_SIZE)b.canvas.width=ATLAS_SIZE;if(b.canvas.height!==ATLAS_SIZE)b.canvas.height=ATLAS_SIZE;
  if(b.gl){const g=b.gl;
   b.tileCopy??=b.program(`#version 300 es
   void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}`,
   `#version 300 es
   precision highp float;uniform sampler2D source;uniform ivec4 region;out vec4 color;
   void main(){color=texelFetch(source,ivec2(gl_FragCoord.xy)-region.zw+region.xy,0);}`);
   g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,ATLAS_SIZE,ATLAS_SIZE);g.disable(g.SCISSOR_TEST);g.disable(g.BLEND);g.disable(g.DEPTH_TEST);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.bindVertexArray(b.vao);g.useProgram(b.tileCopy);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,b.liveTarget.t);g.bindSampler(0,null);g.uniform1i(b.uniformLocation(b.tileCopy,'source'),0);g.enable(g.SCISSOR_TEST);
   for(const t of tiles){const dy=ATLAS_SIZE-t.sy-t.h;g.scissor(t.sx,dy,t.w,t.h);g.uniform4i(b.uniformLocation(b.tileCopy,'region'),t.x,b.height-t.y-t.h,t.sx,dy);g.drawArrays(g.TRIANGLES,0,3);}g.disable(g.SCISSOR_TEST);
   const error=g.getError();if(error)throw Error('Tile capture GL '+error);g.flush();
  }else{const d=b.device,e=d.createCommandEncoder(),target=b.context.getCurrentTexture();e.beginRenderPass({colorAttachments:[{view:target.createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]}).end();
   for(const t of tiles)e.copyTextureToTexture({texture:b.liveTarget,origin:[t.x,t.y]},{texture:target,origin:[t.sx,t.sy]},[t.w,t.h]);d.queue.submit([e.finish()]);
  }
  pages.push({tiles,bitmap:b.canvas.transferToImageBitmap()});
 }return pages;
}
export function uploadTilePages(b,pages){
 const keys=new Set;
 for(const {tiles,bitmap}of pages){
  try{
   if(b.gl){const g=b.gl,texture=g.createTexture();g.bindTexture(g.TEXTURE_2D,texture);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);
    g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,g.RGBA,g.UNSIGNED_BYTE,bitmap);
    const fb=g.createFramebuffer();g.bindFramebuffer(g.READ_FRAMEBUFFER,fb);g.framebufferTexture2D(g.READ_FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,texture,0);g.bindFramebuffer(g.DRAW_FRAMEBUFFER,b.liveTarget.f);g.disable(g.SCISSOR_TEST);
    // ImageBitmap row zero is top-left. WebGL uploads it into the lower row;
    // flip the source rectangle once while copying to the document texture.
    for(const t of tiles){g.blitFramebuffer(t.sx,t.sy+t.h,t.sx+t.w,t.sy,t.x,b.height-t.y-t.h,t.x+t.w,b.height-t.y,g.COLOR_BUFFER_BIT,g.NEAREST);keys.add(t.key);}
    const error=g.getError();if(error)throw Error('Tile upload GL '+error);g.deleteFramebuffer(fb);g.deleteTexture(texture);
   }else{for(const t of tiles){b.device.queue.copyExternalImageToTexture({source:bitmap,origin:[t.sx,t.sy]},{texture:b.liveTarget,origin:[t.x,t.y],premultipliedAlpha:true},[t.w,t.h]);keys.add(t.key);}}
  }finally{bitmap.close();}
 }
 b.presentationPyramid.invalidate(keys);return keys;
}
