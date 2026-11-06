/** Retained artwork texture. View changes submit one quad; brush calculation,
 * readback, history and PNG encoding are outside this presentation context. */
export class Presentation {
 constructor(stage){
  this.element=document.createElement('canvas');this.element.id='gpu-presentation';this.element.setAttribute('aria-hidden','true');
  Object.assign(this.element.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});stage.append(this.element);this.stage=stage;
  this.gl=this.element.getContext('webgl2',{alpha:false,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});
  if(!this.gl){this.element.hidden=true;return}
  const g=this.gl,shader=(type,source)=>{const s=g.createShader(type);g.shaderSource(s,source);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));return s};
  const v=shader(g.VERTEX_SHADER,`#version 300 es
  out vec2 position;
  void main(){position=vec2((gl_VertexID==1||gl_VertexID==3)?1.:0.,gl_VertexID>=2?1.:0.);gl_Position=vec4(position.x*2.-1.,1.-position.y*2.,0,1);}`);
  const f=shader(g.FRAGMENT_SHADER,`#version 300 es
  precision highp float;
  uniform sampler2D artwork;uniform vec4 pose;uniform vec4 dimensions;uniform vec2 origin;uniform vec2 flips;uniform vec4 display;
  in vec2 position;out vec4 color;
  vec2 documentPoint(vec2 pixel){vec2 d=pixel-origin;return vec2(pose.x*d.x+pose.y*d.y,-pose.y*d.x+pose.x*d.y)/dot(pose.xy,pose.xy)*flips;}
  float boxDistance(vec2 p){vec2 q=max(-p,p-dimensions.xy);return length(max(q,0.))+min(max(q.x,q.y),0.);}
  void main(){vec2 pixel=position*dimensions.zw;vec2 d=documentPoint(pixel);float scale=length(pose.xy),edge=boxDistance(d)*scale;
   float cover=clamp(.5-edge,0.,1.);bool repeated=display.z>.5;if(repeated){d=mod(d,dimensions.xy);cover=1.;}
   vec3 ink=vec3(1.);
   if(cover>0.){vec4 c=texture(artwork,d/dimensions.xy);vec3 paper=display.x>.5?vec3(1.):mix(vec3(1.),vec3(.914,.929,.941),mod(floor(d.x/10.)+floor(d.y/10.),2.));
    ink=c.rgb+paper*(1.-c.a);
    if(display.y>.5&&scale>=6.){float line=min(abs(fract(d.x)-.5),abs(fract(d.y)-.5));ink=mix(ink,vec3(.54,.58,.65),clamp(.5-line*scale,0.,.25));}
   }
   if(cover>=1.){if(repeated&&abs(edge)<1.5)ink=vec3(.255,.412,.843);color=vec4(ink,1.);return;}
   vec3 background=mix(vec3(.929,.953,.980),vec3(.902,.929,.965),position.y*.7+position.x*.3);
   float dotAlpha=1.-smoothstep(.8,1.,length(mod(pixel,21.)-10.5));background=mix(background,vec3(.804,.847,.906),dotAlpha);
   if(edge<50.){float distance=max(0.,boxDistance(documentPoint(pixel-vec2(0.,7.)))*scale);float shadow=exp(-distance*distance/200.)*.18;background=mix(background,vec3(.137,.212,.353),shadow);}
   color=vec4(mix(background,ink,cover),1.);
  }`);
  this.program=g.createProgram();g.attachShader(this.program,v);g.attachShader(this.program,f);g.linkProgram(this.program);g.deleteShader(v);g.deleteShader(f);
  if(!g.getProgramParameter(this.program,g.LINK_STATUS))throw Error(g.getProgramInfoLog(this.program));
  this.uniform=Object.fromEntries(['pose','dimensions','origin','flips','display'].map(n=>[n,g.getUniformLocation(this.program,n)]));
  const link=(vs,fs)=>{const p=g.createProgram(),v=shader(g.VERTEX_SHADER,vs),f=shader(g.FRAGMENT_SHADER,fs);g.attachShader(p,v);g.attachShader(p,f);g.linkProgram(p);g.deleteShader(v);g.deleteShader(f);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));return {program:p,uniform:Object.fromEntries(['pose','dimensions','origin','flips','display','halo','ratio'].map(n=>[n,g.getUniformLocation(p,n)]))}};
  const vertex=`#version 300 es
  uniform vec2 pose;uniform vec4 dimensions;uniform vec2 origin;uniform vec2 flips;uniform float halo;
  out vec2 docPoint;
  void main(){vec2 p=vec2((gl_VertexID==1||gl_VertexID==3)?1.:0.,gl_VertexID>=2?1.:0.);docPoint=p*(dimensions.xy+2.*halo)-halo;vec2 d=docPoint*flips;vec2 q=vec2(pose.x*d.x-pose.y*d.y,pose.y*d.x+pose.x*d.y)+origin;gl_Position=vec4(q.x/dimensions.z*2.-1.,1.-q.y/dimensions.w*2.,0,1);}`;
  this.inkProgram=link(vertex,`#version 300 es
  precision highp float;uniform sampler2D artwork;uniform vec2 pose;uniform vec4 dimensions;uniform vec4 display;uniform float ratio;in vec2 docPoint;out vec4 color;
  void main(){vec2 q=max(-docPoint,docPoint-dimensions.xy);float d=length(max(q,0.))+min(max(q.x,q.y),0.);float cover=clamp(.5-d*length(pose)*ratio,0.,1.);vec4 c=texture(artwork,docPoint/dimensions.xy);vec3 paper=display.x>.5?vec3(1.):mix(vec3(1.),vec3(.914,.929,.941),mod(floor(docPoint.x/10.)+floor(docPoint.y/10.),2.));vec3 ink=c.rgb+paper*(1.-c.a);if(display.y>.5&&length(pose)>=6.){float line=min(abs(fract(docPoint.x)-.5),abs(fract(docPoint.y)-.5));ink=mix(ink,vec3(.54,.58,.65),clamp(.5-line*length(pose),0.,.25));}color=vec4(ink*cover,cover);}`);
  this.shadowProgram=link(vertex,`#version 300 es
  precision highp float;uniform sampler2D artwork;uniform vec2 pose;uniform vec4 dimensions;in vec2 docPoint;out vec4 color;
  void main(){vec2 q=max(-docPoint,docPoint-dimensions.xy);float distance=length(max(q,0.))*length(pose);float a=texture(artwork,vec2(distance/32.,.5)).a;color=vec4(vec3(.137,.212,.353)*a,a);}`);
  this.backgroundProgram=link(`#version 300 es
  out vec2 position;void main(){position=vec2((gl_VertexID==1||gl_VertexID==3)?1.:0.,gl_VertexID>=2?1.:0.);gl_Position=vec4(position.x*2.-1.,1.-position.y*2.,0,1);}`,`#version 300 es
  precision highp float;uniform sampler2D artwork;uniform vec4 dimensions;in vec2 position;out vec4 color;
  void main(){vec3 tint=mix(vec3(.929,.953,.980),vec3(.902,.929,.965),position.y*.7+position.x*.3);color=vec4(texture(artwork,position*dimensions.zw/21.).rgb*tint,1.);}`);
  const texture=(width,height,data,repeat=false)=>{const t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,repeat?g.REPEAT:g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,repeat?g.REPEAT:g.CLAMP_TO_EDGE);g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,width,height,0,g.RGBA,g.UNSIGNED_BYTE,data);return t};
  const pattern=new Uint8Array(21*21*4);for(let y=0;y<21;y++)for(let x=0;x<21;x++){const d=Math.hypot(x-10,y-10),a=Math.max(0,Math.min(1,1-d)),i=(y*21+x)*4;pattern[i]=255-32*a;pattern[i+1]=255-28*a;pattern[i+2]=255-19*a;pattern[i+3]=255}this.backgroundTexture=texture(21,21,pattern,true);
  const shade=new Uint8Array(128*4);for(let x=0;x<128;x++)shade[x*4+3]=Math.round(255*.18*Math.exp(-((x/127*32)**2)/200));this.shadowTexture=texture(128,1,shade);

  this.element.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.gl=null;this.onLost?.()});
  this.element.addEventListener('webglcontextrestored',()=>{this.lost=false;this.onLost?.()});
 }
 configure(width,height,background){
  this.background=background;
  const g=this.gl;if(!g||this.lost)return false;
  if(Math.max(width,height)>g.getParameter(g.MAX_TEXTURE_SIZE))return false;
  if(this.texture)g.deleteTexture(this.texture);
  this.width=width;this.height=height;this.texture=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.texture);
  g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);
  g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);
  g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,width,height,0,g.RGBA,g.UNSIGNED_BYTE,null);
  if(g.getError()!==g.NO_ERROR){g.deleteTexture(this.texture);this.texture=null;this.element.hidden=true;return false}
  this.element.hidden=false;return true;
 }
 update(pictures){
  const g=this.gl;if(!g||!this.texture||this.lost)return;
  g.bindTexture(g.TEXTURE_2D,this.texture);g.pixelStorei(g.UNPACK_ALIGNMENT,1);
  for(const {box,image,gpuImage}of pictures)g.texSubImage2D(g.TEXTURE_2D,0,box.x,box.y,box.w,box.h,g.RGBA,g.UNSIGNED_BYTE,(gpuImage||image).data);
 }
 renderRetained(view,w,h,ratio){
  const g=this.gl,a=view.rotation*Math.PI/180,co=Math.cos(a)*view.scale,si=Math.sin(a)*view.scale;
  const set=(p,texture,halo=0,offsetY=0)=>{g.useProgram(p.program);g.bindTexture(g.TEXTURE_2D,texture);g.uniform2f(p.uniform.pose,co,si);g.uniform4f(p.uniform.dimensions,this.width,this.height,w,h);g.uniform2f(p.uniform.origin,view.x,view.y+offsetY);g.uniform2f(p.uniform.flips,view.flipX?-1:1,view.flipY?-1:1);g.uniform1f(p.uniform.halo,halo/view.scale);g.uniform1f(p.uniform.ratio,ratio);g.uniform4f(p.uniform.display,this.background==='white'?1:0,document.getElementById('grid').dataset.show==='1'?1:0,0,0);g.drawArrays(g.TRIANGLE_STRIP,0,4)};
  g.disable(g.BLEND);set(this.backgroundProgram,this.backgroundTexture);
  g.enable(g.BLEND);g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA);set(this.shadowProgram,this.shadowTexture,32,7);set(this.inkProgram,this.texture,1/ratio);g.disable(g.BLEND);
 }
 readTexture(){
  const g=this.gl,fb=g.createFramebuffer(),pixels=new Uint8Array(this.width*this.height*4);g.bindFramebuffer(g.FRAMEBUFFER,fb);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,this.texture,0);g.readPixels(0,0,this.width,this.height,g.RGBA,g.UNSIGNED_BYTE,pixels);g.bindFramebuffer(g.FRAMEBUFFER,null);g.deleteFramebuffer(fb);return pixels;
 }
 readViewport(view){this.render(view);const g=this.gl,pixels=new Uint8Array(this.element.width*this.element.height*4);g.readPixels(0,0,this.element.width,this.element.height,g.RGBA,g.UNSIGNED_BYTE,pixels);return {pixels,width:this.element.width,height:this.element.height}}
 request(view){this.pendingView={...view};if(!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;this.render(this.pendingView)})}
 render(view){
  if(this.frame){cancelAnimationFrame(this.frame);this.frame=0}
  const g=this.gl;if(!g||!this.texture||this.lost||this.element.hidden)return;
  const ratio=devicePixelRatio||1,w=this.stage.clientWidth,h=this.stage.clientHeight;
  const pw=Math.max(1,Math.round(w*ratio)),ph=Math.max(1,Math.round(h*ratio));
  if(this.element.width!==pw||this.element.height!==ph){this.element.width=pw;this.element.height=ph}
  g.viewport(0,0,pw,ph);g.clearColor(0,0,0,1);g.clear(g.COLOR_BUFFER_BIT);if(!this.repeat){this.renderRetained(view,w,h,ratio);return}g.useProgram(this.program);g.bindTexture(g.TEXTURE_2D,this.texture);
  const angle=view.rotation*Math.PI/180;g.uniform4f(this.uniform.pose,view.scale*Math.cos(angle),view.scale*Math.sin(angle),0,0);
  g.uniform4f(this.uniform.dimensions,this.width,this.height,w,h);g.uniform2f(this.uniform.origin,view.x,view.y);g.uniform2f(this.uniform.flips,view.flipX?-1:1,view.flipY?-1:1);
  g.uniform4f(this.uniform.display,this.background==='white'?1:0,document.getElementById('grid').dataset.show==='1'?1:0,this.repeat?1:0,0);g.drawArrays(g.TRIANGLE_STRIP,0,4);
 }
}
