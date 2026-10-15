// Derived, bounded area-average levels. Original artwork pixels remain untouched.
const glFragment=`#version 300 es
precision highp float;
uniform sampler2D source;out vec4 color;
void main(){ivec2 size=textureSize(source,0),at=ivec2(gl_FragCoord.xy)*2;
 color=(texelFetch(source,clamp(at,ivec2(0),size-1),0)+texelFetch(source,clamp(at+ivec2(1,0),ivec2(0),size-1),0)+texelFetch(source,clamp(at+ivec2(0,1),ivec2(0),size-1),0)+texelFetch(source,clamp(at+ivec2(1,1),ivec2(0),size-1),0))*.25;}`;
const wgsl=`@group(0) @binding(0) var source:texture_2d<f32>;
@vertex fn vertex(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{
 var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);}
@fragment fn fragment(@builtin(position) pos:vec4f)->@location(0) vec4f{
 let size=vec2i(textureDimensions(source));let at=vec2i(pos.xy)*2;
 return (textureLoad(source,clamp(at,vec2i(0),size-vec2i(1)),0)+textureLoad(source,clamp(at+vec2i(1,0),vec2i(0),size-vec2i(1)),0)+textureLoad(source,clamp(at+vec2i(0,1),vec2i(0),size-vec2i(1)),0)+textureLoad(source,clamp(at+vec2i(1,1),vec2i(0),size-vec2i(1)),0))*.25;}`;

// Exact rectangle union: adjacent dirty tiles share a draw without increasing
// the set of pixels recomputed. Also removes overlap at rounded mip boundaries.
export function coalesceRectangles(rects){
 if(rects.length<2)return rects;
 const events=new Map;for(const [id,r]of rects.entries()){const [x0,y0,x1,y1]=r;if(x1<=x0||y1<=y0)continue;for(const [y,add]of [[y0,true],[y1,false]]){let e=events.get(y);if(!e)events.set(y,e=[]);e.push({id,add,r});}}
 const ys=[...events.keys()].sort((a,b)=>a-b),active=new Map,out=[];let previous=new Map;
 for(let i=0;i<ys.length-1;i++){const y=ys[i],end=ys[i+1];for(const e of events.get(y)){if(e.add)active.set(e.id,e.r);else active.delete(e.id);}const spans=[];
  for(const [x0,,x1]of [...active.values()].sort((a,b)=>a[0]-b[0]||a[2]-b[2])){const last=spans.at(-1);if(last&&x0<=last[1])last[1]=Math.max(last[1],x1);else spans.push([x0,x1]);}
  const current=new Map;for(const [x0,x1]of spans){const key=x0+','+x1,prior=previous.get(key);if(prior&&prior[3]===y){prior[3]=end;current.set(key,prior);}else{const r=[x0,y,x1,end];out.push(r);current.set(key,r);}}previous=current;
 }return out;
}

// Conservative screen bounds of changed document tiles, including the footprint
// of the unchanged mip/area/bilinear samplers. Coordinates are top-left pixels.
export function presentationRectangles(view,width,height,keys,scale){
 const [bw,bh,cw,ch,dw,dh,zoom,angle,panX,panY,flipX,flipY]=view;
 const footprint=Math.max(cw/bw,ch/bh)/zoom,halo=scale*2+footprint,c=Math.cos(angle),s=Math.sin(angle),rects=[];
 for(const key of keys){const [tx,ty]=key.split(',').map(Number),xs=[tx*128-halo,Math.min(dw,(tx+1)*128)+halo],ys=[ty*128-halo,Math.min(dh,(ty+1)*128)+halo];let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const x of xs)for(const y of ys){const dx=(x-dw*.5)*flipX,dy=(y-dh*.5)*flipY,px=(cw*.5+panX+zoom*(dx*c-dy*s))*width/cw,py=(ch*.5+panY+zoom*(dx*s+dy*c))*height/ch;x0=Math.min(x0,px);y0=Math.min(y0,py);x1=Math.max(x1,px);y1=Math.max(y1,py);}
  const r=[Math.max(0,Math.floor(x0)-2),Math.max(0,Math.floor(y0)-2),Math.min(width,Math.ceil(x1)+2),Math.min(height,Math.ceil(y1)+2)];if(r[2]>r[0]&&r[3]>r[1])rects.push(r);
 }return coalesceRectangles(rects);
}

const copyWgsl=`@group(0) @binding(0) var source:texture_2d<f32>;
@vertex fn vertex(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);}
@fragment fn fragment(@builtin(position) pos:vec4f)->@location(0) vec4f{return textureLoad(source,vec2i(pos.xy),0);}`;

// One viewport-sized derived image, never artwork or history. Reuse unchanged
// screen pixels while preserving the original presentation shader and sampler.
export class ViewportCache{
 constructor(backend){this.backend=backend;this.enabled=true;this.budget=32*1024*1024;this.bytes=0;this.valid=false;this.dirty=new Set;this.full=true;this.shadedPixels=0;this.copiedPixels=0;this.hits=0;this.last={};}
 invalidate(keys){if(this.full)return;for(const key of keys)this.dirty.add(key);if(this.dirty.size>256){this.full=true;this.dirty.clear();}}
 clear(){this.full=true;this.dirty.clear();this.valid=false;}
 release(){if(this.image){this.backend.gl?this.backend.release(this.image):this.image.destroy();this.image=null;}this.group=null;this.bytes=0;this.clear();}
 plan(view,encoder,direct,refresh=false){
  const b=this.backend,p=b.presentationPyramid,w=b.canvas.width,h=b.canvas.height,generation=p.generation,keys=[...this.dirty],full=this.full,image=p.source(view,encoder),eligible=this.enabled&&b.sparsePreview&&!direct&&view[12]<.5&&view[14]<.5&&w>0&&h>0&&w*h*4<=this.budget;
  if(!eligible){this.valid=false;if(w*h*4>this.budget)this.release();this.last={screenPixels:w*h,screenRects:1,screenCacheHit:false,screenCopiedPixels:0};this.shadedPixels+=w*h;return {image,rects:[[0,0,w,h]],cached:false};}
  if(!this.image||this.width!==w||this.height!==h){this.release();this.image=b.gl?b.surface(w,h,b.gl.RGBA8,b.gl.UNSIGNED_BYTE):b.device.createTexture({size:[w,h],format:b.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});this.width=w;this.height=h;this.bytes=w*h*4;}
  const same=this.view?.length===view.length&&view.every((v,i)=>v===this.view[i]),fresh=!this.valid||!same||full||(this.generation!==generation&&this.generation!==generation-1)||(this.generation!==generation&&!keys.length);
  const rects=fresh?[[0,0,w,h]]:this.generation===generation?[]:presentationRectangles(view,w,h,keys,image.scale);
  this.view=Float32Array.from(view);this.generation=generation;this.valid=true;this.full=false;this.dirty.clear();const pixels=rects.reduce((n,[x,y,x1,y1])=>n+(x1-x)*(y1-y),0),copy=rects.length||refresh&&!b.gl?w*h:0;this.last={screenPixels:pixels,screenRects:rects.length,screenCacheHit:!rects.length,screenCopiedPixels:copy};this.shadedPixels+=pixels;this.copiedPixels+=copy;if(!rects.length)this.hits++;return {image,rects,cached:true};
 }
 presentGl(view,direct=false){
  const b=this.backend,g=b.gl,{image,rects,cached}=this.plan(view,null,direct);if(!rects.length)return false;const w=b.canvas.width,h=b.canvas.height,values=view.slice();values[15]=image.scale;
  g.bindFramebuffer(g.FRAMEBUFFER,cached?this.image.f:null);g.viewport(0,0,w,h);g.disable(g.BLEND);g.disable(g.DEPTH_TEST);g.bindVertexArray(b.vao);g.useProgram(b.present);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,image.source.t);g.uniform1i(b.uniformLocation(b.present,'source'),0);for(const [i,name]of ['viewScreen','viewDocument','viewMotion','viewOptions'].entries())g.uniform4fv(b.uniformLocation(b.present,name),values.subarray(i*4,i*4+4));
  if(cached)g.enable(g.SCISSOR_TEST);for(const [x,y,x1,y1]of rects){if(cached)g.scissor(x,h-y1,x1-x,y1-y);g.drawArrays(g.TRIANGLES,0,3);}g.disable(g.SCISSOR_TEST);
  if(cached){g.bindFramebuffer(g.READ_FRAMEBUFFER,this.image.f);g.bindFramebuffer(g.DRAW_FRAMEBUFFER,null);g.blitFramebuffer(0,0,w,h,0,0,w,h,g.COLOR_BUFFER_BIT,g.NEAREST);}g.flush();return true;
 }
 encodeGpu(e,view,direct=false,refresh=false){
  const b=this.backend,d=b.device,{image,rects,cached}=this.plan(view,e,direct,refresh);
  if(cached&&!rects.length&&!refresh)return false;
  if(rects.length){const values=view.slice();values[15]=image.scale;d.queue.writeBuffer(b.presentUniform,0,values);
  const pass=e.beginRenderPass({colorAttachments:[{view:(cached?this.image:b.context.getCurrentTexture()).createView(),clearValue:{r:1,g:1,b:1,a:1},loadOp:cached?'load':'clear',storeOp:'store'}]});pass.setPipeline(b.present);pass.setBindGroup(0,d.createBindGroup({layout:b.presentLayout,entries:[{binding:0,resource:image.source.createView()},{binding:1,resource:{buffer:b.presentUniform}}]}));for(const [x,y,x1,y1]of rects){pass.setScissorRect(x,y,x1-x,y1-y);pass.draw(3);}pass.end();
  }
  // Explicit canvas refreshes copy the retained image even without edits. An
  // unchanged automatic formal batch returns above before acquiring a current
  // texture, retaining the last displayed image and avoiding a redundant copy.
  if(cached){if(!this.pipeline){this.layout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}}]});const module=d.createShaderModule({code:copyWgsl});this.pipeline=d.createRenderPipeline({layout:d.createPipelineLayout({bindGroupLayouts:[this.layout]}),vertex:{module,entryPoint:'vertex'},fragment:{module,entryPoint:'fragment',targets:[{format:b.format}]},primitive:{topology:'triangle-list'}});}this.group??=d.createBindGroup({layout:this.layout,entries:[{binding:0,resource:this.image.createView()}]});const copy=e.beginRenderPass({colorAttachments:[{view:b.context.getCurrentTexture().createView(),loadOp:'clear',clearValue:{r:1,g:1,b:1,a:1},storeOp:'store'}]});copy.setPipeline(this.pipeline);copy.setBindGroup(0,this.group);copy.draw(3);copy.end();}return true;
 }
 destroy(){this.release();}
}

export class PresentationPyramid{
 constructor(backend,vertex){this.backend=backend;this.vertex=vertex;this.levels=[];this.dirty=new Set;this.full=true;this.generation=0;this.updates=0;}
 invalidate(keys){if(!keys.size)return;this.backend.viewportCache?.invalidate(keys);for(const key of keys)this.dirty.add(key);if(this.dirty.size>256){this.full=true;this.dirty.clear();}this.generation++;}
 clear(){this.backend.viewportCache?.clear();this.full=true;this.dirty.clear();this.generation++;}
 source(view,encoder){
  const b=this.backend,base=view[14]>.5?b.referenceImage:b.liveTarget;
  // QA reference remains on the original sampler, for comparison with M08.
  if(view[14]>.5||view[13]>.5)return {source:base,scale:1};
  const footprint=Math.max(view[2]/view[0],view[3]/view[1])/view[6];
  const wanted=Math.max(0,Math.min(Math.floor(Math.log2(footprint)),Math.ceil(Math.log2(Math.max(b.width,b.height)))));
  if(!wanted)return {source:base,scale:1};
  // Padded odd-size levels must not change the seamless repetition period.
  if(view[12]>.5&&(b.width%(2**wanted)||b.height%(2**wanted)))return {source:base,scale:1};
  this.initialize();let source=base,w=b.width,h=b.height;
  const rects=this.full?null:[...this.dirty].map(key=>{const [x,y]=key.split(',').map(Number);return [x*128,b.gl?Math.max(0,b.height-(y+1)*128):y*128,Math.min(b.width,(x+1)*128),b.gl?b.height-y*128:Math.min(b.height,(y+1)*128)];});
  for(let i=0;i<wanted;i++){
   w=Math.max(1,Math.ceil(w/2));h=Math.max(1,Math.ceil(h/2));let level=this.levels[i];
   if(!level){level={image:this.allocate(w,h),generation:-1,w,h};this.levels.push(level);}
   if(level.generation!==this.generation){
    const scale=2**(i+1);
    // A level skipped during previous content edits requires a complete refresh.
    const regions=level.generation===this.generation-1&&rects?.length?rects.map(([x0,y0,x1,y1])=>[Math.floor(x0/scale),Math.floor(y0/scale),Math.min(w,Math.ceil(x1/scale)),Math.min(h,Math.ceil(y1/scale))]):[[0,0,w,h]];
    this.draw(source,level,coalesceRectangles(regions),encoder);level.generation=this.generation;this.updates++;
   }
   source=level.image;
  }
  this.full=false;this.dirty.clear();return {source,scale:2**wanted};
 }
 initialize(){if(this.pipeline)return;const b=this.backend;
  if(b.gl){this.pipeline=b.program(this.vertex,glFragment);return;}
  const d=b.device,module=d.createShaderModule({code:wgsl});
  this.layout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}}]});
  this.pipeline=d.createRenderPipeline({layout:d.createPipelineLayout({bindGroupLayouts:[this.layout]}),vertex:{module,entryPoint:'vertex'},fragment:{module,entryPoint:'fragment',targets:[{format:b.format}]},primitive:{topology:'triangle-list'}});
 }
 allocate(w,h){const b=this.backend;return b.gl?b.surface(w,h,b.gl.RGBA8,b.gl.UNSIGNED_BYTE):b.device.createTexture({size:[w,h],format:b.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});}
 draw(source,level,rects,encoder){const b=this.backend;
  if(b.gl){const g=b.gl;g.bindFramebuffer(g.FRAMEBUFFER,level.image.f);g.viewport(0,0,level.w,level.h);g.disable(g.BLEND);g.disable(g.DEPTH_TEST);g.bindVertexArray(b.vao);g.useProgram(this.pipeline);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,source.t);g.uniform1i(g.getUniformLocation(this.pipeline,'source'),0);g.enable(g.SCISSOR_TEST);
   for(const [x0,y0,x1,y1]of rects){if(x1<=x0||y1<=y0)continue;g.scissor(x0,y0,x1-x0,y1-y0);g.drawArrays(g.TRIANGLES,0,3);}g.disable(g.SCISSOR_TEST);
  }else{const p=encoder.beginRenderPass({colorAttachments:[{view:level.image.createView(),loadOp:'load',storeOp:'store'}]});p.setPipeline(this.pipeline);p.setBindGroup(0,b.device.createBindGroup({layout:this.layout,entries:[{binding:0,resource:source.createView()}]}));
   for(const [x0,y0,x1,y1]of rects){if(x1<=x0||y1<=y0)continue;p.setScissorRect(x0,y0,x1-x0,y1-y0);p.draw(3);}p.end();}
 }
 get bytes(){return this.levels.reduce((sum,x)=>sum+x.w*x.h*4,0);}
 destroy(){for(const level of this.levels)this.backend.gl?this.backend.release(level.image):level.image.destroy();this.levels=[];}
}
