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

export class PresentationPyramid{
 constructor(backend,vertex){this.backend=backend;this.vertex=vertex;this.levels=[];this.dirty=new Set;this.full=true;this.generation=0;this.updates=0;}
 invalidate(keys){if(!keys.size)return;for(const key of keys)this.dirty.add(key);if(this.dirty.size>256){this.full=true;this.dirty.clear();}this.generation++;}
 clear(){this.full=true;this.dirty.clear();this.generation++;}
 source(view,encoder){
  const b=this.backend,base=view[14]>.5?b.referenceImage:b.liveTarget;
  // QA reference remains on the original sampler, for comparison with M08.
  if(view[14]>.5||view[13]>.5)return {source:base,scale:1};
  const footprint=Math.max(view[2]/view[0],view[3]/view[1])/view[6];
  const wanted=Math.max(0,Math.min(Math.floor(Math.log2(footprint)),Math.ceil(Math.log2(Math.max(b.width,b.height)))));
  if(!wanted)return {source:base,scale:1};
  this.initialize();let source=base,w=b.width,h=b.height;
  const rects=this.full?null:[...this.dirty].map(key=>{const [x,y]=key.split(',').map(Number);return [x*128,b.gl?Math.max(0,b.height-(y+1)*128):y*128,Math.min(b.width,(x+1)*128),b.gl?b.height-y*128:Math.min(b.height,(y+1)*128)];});
  for(let i=0;i<wanted;i++){
   w=Math.max(1,Math.ceil(w/2));h=Math.max(1,Math.ceil(h/2));let level=this.levels[i];
   if(!level){level={image:this.allocate(w,h),generation:-1,w,h};this.levels.push(level);}
   if(level.generation!==this.generation){
    const scale=2**(i+1);
    // A level skipped during previous content edits requires a complete refresh.
    const regions=level.generation===this.generation-1&&rects?.length?rects.map(([x0,y0,x1,y1])=>[Math.floor(x0/scale),Math.floor(y0/scale),Math.min(w,Math.ceil(x1/scale)),Math.min(h,Math.ceil(y1/scale))]):[[0,0,w,h]];
    this.draw(source,level,regions,encoder);level.generation=this.generation;this.updates++;
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
 allocate(w,h){const b=this.backend;return b.gl?b.surface(w,h,b.gl.RGBA8,b.gl.UNSIGNED_BYTE):b.device.createTexture({size:[w,h],format:b.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});}
 draw(source,level,rects,encoder){const b=this.backend;
  if(b.gl){const g=b.gl;g.bindFramebuffer(g.FRAMEBUFFER,level.image.f);g.viewport(0,0,level.w,level.h);g.disable(g.BLEND);g.disable(g.DEPTH_TEST);g.bindVertexArray(b.vao);g.useProgram(this.pipeline);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,source.t);g.uniform1i(g.getUniformLocation(this.pipeline,'source'),0);g.enable(g.SCISSOR_TEST);
   for(const [x0,y0,x1,y1]of rects){if(x1<=x0||y1<=y0)continue;g.scissor(x0,y0,x1-x0,y1-y0);g.drawArrays(g.TRIANGLES,0,3);}g.disable(g.SCISSOR_TEST);
  }else{const p=encoder.beginRenderPass({colorAttachments:[{view:level.image.createView(),loadOp:'load',storeOp:'store'}]});p.setPipeline(this.pipeline);p.setBindGroup(0,b.device.createBindGroup({layout:this.layout,entries:[{binding:0,resource:source.createView()}]}));
   for(const [x0,y0,x1,y1]of rects){if(x1<=x0||y1<=y0)continue;p.setScissorRect(x0,y0,x1-x0,y1-y0);p.draw(3);}p.end();}
 }
 get bytes(){return this.levels.reduce((sum,x)=>sum+x.w*x.h*4,0);}
 destroy(){for(const level of this.levels)this.backend.gl?this.backend.release(level.image):level.image.destroy();this.levels=[];}
}
