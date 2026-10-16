import {commandBounds,referenceCoverage,continuous} from '@rt/model';
import {textureFactor} from '@rt/foundation';

// Disposable display pixels. No proxy value is ever returned as artwork,
// recorded as input, or used by strict rendering, history or persistence.
const clamp=v=>Math.max(0,Math.min(1,v));
const CELL=16,MAX_PIXELS=131072,MAX_BYTES=32*1024*1024;
export function polygonArea(p){let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i].x*q.y-q.x*p[i].y;}return Math.abs(a)*.5;}
export function clipPolygon(points,x0,y0,x1,y1){
 let p=points;for(const [axis,value,greater]of [['x',x0,true],['x',x1,false],['y',y0,true],['y',y1,false]]){
  const input=p;p=[];if(!input.length)break;let a=input.at(-1),ai=greater?a[axis]>=value:a[axis]<=value;
  for(const b of input){const bi=greater?b[axis]>=value:b[axis]<=value;if(ai!==bi){const t=(value-a[axis])/(b[axis]-a[axis]);p.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}if(bi)p.push(b);a=b;ai=bi;}
 }return p;
}
export function toScreen(view,x,y){const [, ,cw,ch,dw,dh,z,a,px,py,fx,fy]=view,c=Math.cos(a),s=Math.sin(a),dx=(x-dw/2)*fx,dy=(y-dh/2)*fy;return {x:cw/2+px+z*(dx*c-dy*s),y:ch/2+py+z*(dx*s+dy*c)};}
export function toDocument(view,x,y){const [, ,cw,ch,dw,dh,z,a,px,py,fx,fy]=view,c=Math.cos(a),s=Math.sin(a),dx=(x-cw/2-px)/z,dy=(y-ch/2-py)/z;return {x:dw/2+(dx*c+dy*s)*fx,y:dh/2+(-dx*s+dy*c)*fy};}
export function proxyPlan(view,ratio=1/32,thin=false,pixelCap=MAX_PIXELS){
 if(!view||![1/8,1/16,1/32,1/64,1/128].includes(ratio))throw Error('Invalid screen proxy profile');
 const [bw,bh,cw,ch,dw,dh,z]=view;if(!(cw>0&&ch>0&&z>0))throw Error('Invalid proxy view');
 const polygon=clipPolygon([[0,0],[dw,0],[dw,dh],[0,dh]].map(([x,y])=>toScreen(view,x,y)),0,0,cw,ch),area=polygonArea(polygon);
 const density=Math.min(2,Math.max(1,Math.min(bw/cw,bh/ch))),effectiveRatio=thin?Math.max(ratio,1/8):ratio;
 if(!area)return {polygon,visibleArea:0,ratio,effectiveRatio,density,width:1,height:1,pixels:1,scale:0,x:0,y:0,cssWidth:0,cssHeight:0};
 const xs=polygon.map(p=>p.x),ys=polygon.map(p=>p.y),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
 // The polygon controls the TOTAL allocation. A rotated bounding box never
 // becomes the area budget. Rounding is kept below the explicit pixel cap.
 const budget=Math.max(1,Math.min(pixelCap,Math.floor(area*effectiveRatio*density))),scale=Math.sqrt(budget/(w*h));
 let width=Math.max(1,Math.floor(w*scale)),height=Math.max(1,Math.floor(h*scale));
 const actualScale=Math.min(width/w,height/h);width=Math.max(1,Math.ceil(w*actualScale));height=Math.max(1,Math.ceil(h*actualScale));
 while(width*height>budget&&width>1&&height>1){if(width/w>height/h)width--;else height--;}
 const finalScale=Math.min(width/w,height/h);
 return {polygon,visibleArea:area,ratio,effectiveRatio,density,budget,width,height,pixels:width*height,scale:finalScale,x,y,cssWidth:width/finalScale,cssHeight:height/finalScale};
}

// Same straight-alpha layer operation as the strict evaluator. Coarse sampling
// is a display approximation; erase ALWAYS changes alpha, never paints white.
export function composePixel(d,s,blend='normal'){
 const sa=clamp(s[3]),da=d[3];if(!sa)return d.slice();
 if(blend==='erase')return [d[0],d[1],d[2],Math.round(da*(1-sa)*255)/255];
 const a=sa+da*(1-sa),o=[0,0,0,Math.round(a*255)/255];
 for(let j=0;j<3;j++){const sc=s[j]/sa,b=blend==='multiply'?sc*d[j]:blend==='screen'?1-(1-sc)*(1-d[j]):sc;o[j]=Math.round(clamp(((1-sa)*da*d[j]+(1-da)*sa*sc+sa*da*b)/Math.max(a,1e-9))*255)/255;}
 if(!o[3])o[0]=o[1]=o[2]=0;return o;
}
export function proxySupported(p){return !!p?.__foundation&&['normal','erase','multiply','screen'].includes(p.blend)&&['round','ellipse','rect','bristle','star','leaf','mask'].includes(p.tip);}
function newTile(){return {prefix:new Float32Array(CELL*CELL*4),tail:new Float32Array(CELL*CELL*4)};}
function accumulate(dst,i,c,k,p){
 k*=c[6];const old=dst[i+3];let a,delta;
 if(p.__foundation.coverageUnion||continuous(p)){delta=Math.max(0,k*c[5]-old);for(let j=0;j<3;j++)dst[i+j]+=c[8+j]*delta;dst[i+3]+=delta;}
 else if(p.__foundation.material){a=k*c[5];for(let j=0;j<3;j++)dst[i+j]=dst[i+j]*(1-a)+c[8+j]*a;dst[i+3]+=a*(1-old);}
 else{delta=Math.max(0,c[5]-old)*k;for(let j=0;j<3;j++)dst[i+j]+=c[8+j]*delta;dst[i+3]+=delta;}
}
function paintAt(v,key,i){const t=v.tiles.get(key);if(!t)return [0,0,0,0];const a=t.prefix,b=t.tail,p=v.preset,opacity=p.__foundation.material?p.__foundation.opacity:1,out=[];
 for(let j=0;j<4;j++)out[j]=(p.__foundation.coverageUnion||continuous(p)?Math.max(a[i+j],b[i+j]):b[i+j]+a[i+j]*(1-b[i+3]))*opacity;return out;
}

/** Pixel upload backends share the identical CPU rasterizer for fair transport
 * comparisons. Offscreen 2D isn't assumed to be a separate GPU. */
export class ProxySink{
 constructor(source,transport='2d'){
  this.source=source;this.transport=transport;this.element=document.createElement('canvas');this.element.className='illustro-screen-proxy';this.element.setAttribute('aria-hidden','true');
  Object.assign(this.element.style,{position:'absolute',pointerEvents:'none',transformOrigin:'0 0',display:'none',background:'transparent',aspectRatio:'auto'});source.insertAdjacentElement('afterend',this.element);
  if(transport==='webgl2'){
   const g=this.element.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});if(!g)throw Error('Proxy WebGL2 unavailable');this.gl=g;
   const shader=(type,code)=>{const s=g.createShader(type);g.shaderSource(s,code);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));return s;};
   this.program=g.createProgram();for(const s of [shader(g.VERTEX_SHADER,'#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0,1);}'),shader(g.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;uniform sampler2D image;out vec4 color;void main(){ivec2 p=ivec2(gl_FragCoord.xy);color=texelFetch(image,ivec2(p.x,textureSize(image,0).y-1-p.y),0);}')]){g.attachShader(this.program,s);g.deleteShader(s);}g.linkProgram(this.program);if(!g.getProgramParameter(this.program,g.LINK_STATUS))throw Error(g.getProgramInfoLog(this.program));
   this.texture=g.createTexture();this.vao=g.createVertexArray();g.bindVertexArray(this.vao);g.bindTexture(g.TEXTURE_2D,this.texture);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);
  }else{
   this.context=this.element.getContext('2d',{alpha:true,desynchronized:false,willReadFrequently:true});if(!this.context)throw Error('Proxy Canvas2D unavailable');
   if(transport==='offscreen2d'){this.offscreen=new OffscreenCanvas(1,1);this.offscreenContext=this.offscreen.getContext('2d',{alpha:true,willReadFrequently:true});if(!this.offscreenContext)throw Error('Proxy OffscreenCanvas2D unavailable');}
  }
 }
 resize(plan){const e=this.element;e.width=plan.width;e.height=plan.height;const s=this.source;e.style.left=s.offsetLeft+plan.x+'px';e.style.top=s.offsetTop+plan.y+'px';e.style.width=plan.cssWidth+'px';e.style.height=plan.cssHeight+'px';
  // Match the host canvas' stacking context; no input handlers or fixed z-index.
  const z=getComputedStyle(s).zIndex;if(z!=='auto')e.style.zIndex=z;
  const poly=plan.polygon.map(p=>(p.x-plan.x)+'px '+(p.y-plan.y)+'px').join(',');e.style.clipPath=poly?'polygon('+poly+')':'none';
  if(this.gl){const g=this.gl;g.bindTexture(g.TEXTURE_2D,this.texture);g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,plan.width,plan.height,0,g.RGBA,g.UNSIGNED_BYTE,null);}
  if(this.offscreen){this.offscreen.width=plan.width;this.offscreen.height=plan.height;}
 }
 upload(image,rects){if(!rects.length)return;const e=this.element;e.style.display='block';
  if(this.gl){const g=this.gl;g.bindTexture(g.TEXTURE_2D,this.texture);g.pixelStorei(g.UNPACK_ROW_LENGTH,image.width);for(const [x,y,w,h]of rects){g.pixelStorei(g.UNPACK_SKIP_PIXELS,x);g.pixelStorei(g.UNPACK_SKIP_ROWS,y);g.texSubImage2D(g.TEXTURE_2D,0,x,y,w,h,g.RGBA,g.UNSIGNED_BYTE,image.data);}g.pixelStorei(g.UNPACK_ROW_LENGTH,0);g.pixelStorei(g.UNPACK_SKIP_PIXELS,0);g.pixelStorei(g.UNPACK_SKIP_ROWS,0);g.viewport(0,0,e.width,e.height);g.useProgram(this.program);g.uniform1i(g.getUniformLocation(this.program,'image'),0);g.enable(g.SCISSOR_TEST);for(const [x,y,w,h]of rects){g.scissor(x,e.height-y-h,w,h);g.drawArrays(g.TRIANGLES,0,3);}g.disable(g.SCISSOR_TEST);g.flush();}
  else if(this.offscreen){for(const [x,y,w,h]of rects){this.offscreenContext.putImageData(image,0,0,x,y,w,h);this.context.clearRect(x,y,w,h);this.context.drawImage(this.offscreen,x,y,w,h,x,y,w,h);}}
  else for(const [x,y,w,h]of rects)this.context.putImageData(image,0,0,x,y,w,h);
 }
 hide(){this.element.style.display='none';}
 destroy(){if(this.gl){this.gl.deleteTexture(this.texture);this.gl.deleteProgram(this.program);this.gl.deleteVertexArray(this.vao);}this.element.remove();}
}

export class ScreenProxy{
 constructor(backend,{ratio=1/32,transport='2d',coupled=false,sink=null}={}){
  this.backend=backend;this.ratio=ratio;this.coupled=coupled;this.sink=sink??new ProxySink(backend.canvas,transport);this.transport=transport;this.epoch=0;this.generation=0;this.states=new Map;this.pending=new Map;this.bases=new Map;this.dirty=new Set;this.footprints=new Map;this.folded=new Set;this.source=()=>[];this.ready=false;this.enabled=true;this.metrics={updates:0,updatedPixels:0,rasterPixels:0,commands:0,superseded:0,rebuilds:0,fallbacks:0,samples:[],retirements:0};
 }
 setSource(source,live=()=>[]){this.source=source;this.live=live;this.invalidate();}
 setEnabled(value){if(this.enabled===value)return;this.enabled=value;this.invalidate();}
 setView(view){this.view=Float64Array.from(view);this.invalidate();}
 suspend(){this.epoch++;this.ready=false;this.commits=[];this.finalizing=false;}
 invalidate(){this.suspend();this.states.clear();this.pending.clear();this.bases.clear();this.footprints.clear();this.folded.clear();this.dirty.clear();this.sink.hide();if(this.enabled&&this.view&&this.view[12]<.5&&this.view[14]<.5)this.rebuild();}
 configure(thin=false){this.plan=proxyPlan(this.view,this.ratio,thin,Math.min(MAX_PIXELS,Math.floor(MAX_BYTES/(Math.max(1,this.backend.surfaceStack.length)*4+64))));this.image=new ImageData(this.plan.width,this.plan.height);this.sink.resize(this.plan);const n=this.plan.pixels;this.docX=new Float64Array(n);this.docY=new Float64Array(n);this.inside=new Uint8Array(n);
  for(let y=0;y<this.plan.height;y++)for(let x=0;x<this.plan.width;x++){const i=y*this.plan.width+x,q=toDocument(this.view,this.plan.x+(x+.5)/this.plan.scale,this.plan.y+(y+.5)/this.plan.scale);this.docX[i]=q.x;this.docY[i]=q.y;this.inside[i]=+(q.x>=0&&q.y>=0&&q.x<this.view[4]&&q.y<this.view[5]);}
 }
 rebuild(){
  const epoch=this.epoch,entries=this.source(),built=new Map;if(entries.some(e=>!proxySupported(e.record.preset))){this.metrics.fallbacks++;return;}this.configure(this.thin??false);this.metrics.rebuilds++;let index=0,command=0,current=null;
  const step=()=>{if(epoch!==this.epoch||this.disposed)return;const at=performance.now();
   while(index<entries.length){const entry=entries[index];current??=this.makeState(entry.id,entry.record.preset,entry.surfaceKey);while(command<entry.record.commands.length){this.raster(current,[entry.record.commands[command++]],false);if(performance.now()-at>3){setTimeout(step,0);return;}}
    this.fold(current);this.folded.add(entry.id);built.set(entry.id,new Set(current.tiles.keys()));index++;command=0;current=null;
   }
   this.dirty.clear();for(const state of this.live?.()??[]){const keys=built.get(state.id);if(keys){this.footprints.set(state.id,keys);for(const key of keys)this.dirty.add(key);}else this.pending.set(state.id,state);}this.ready=true;this.flush();
  };step();
 }
 canUse(p){return this.enabled&&this.ready&&this.plan?.visibleArea>0&&proxySupported(p)&&this.view[12]<.5&&this.view[14]<.5;}
 makeState(id,preset,surfaceKey){return {id,preset,surfaceKey,tiles:new Map,tailKeys:new Set,cursor:0,last:null};}
 enqueue(state){if(!this.enabled)return false;if(!proxySupported(state.preset)){this.metrics.fallbacks++;return false;}
  // Resolution is stable during a stroke. Thin rescue changes only disposable
  // display buffers and never rounds input/command coordinates.
  const thin=state.preset.size*this.view?.[6]<2;if(thin&&!this.thin&&this.ready){this.thin=true;this.invalidate();}
  if(this.pending.has(state.id))this.metrics.superseded++;this.pending.set(state.id,state);if(this.coupled)return this.canUse(state.preset);
  if(!this.scheduled){this.scheduled=true;queueMicrotask(()=>{this.scheduled=false;this.safeFlush();});}return this.canUse(state.preset);
 }
 safeFlush(){try{this.flush();}catch(error){this.error=String(error);this.metrics.fallbacks++;this.enabled=false;this.invalidate();}}
 flush(){if(!this.ready||this.disposed)return;const start=performance.now(),tips=[];
  for(const [id,state]of this.pending){if(!this.canUse(state.preset))continue;let v=this.states.get(id);if(this.folded.has(id)){this.pending.delete(id);continue;}
   if(!v||state.resetPreview&&v.last!==state){if(v)for(const key of v.tiles.keys())this.dirty.add(key);v=this.makeState(id,state.preset,state.surfaceKey);this.states.set(id,v);}
   if(v.last===state){this.pending.delete(id);continue;}v.last=state;
   for(const key of v.tailKeys){const t=v.tiles.get(key);t?.tail.fill(0);this.dirty.add(key);}v.tailKeys.clear();
   const source=state.stableSource??state.stableCommands??[],end=state.stableEnd??source.length;if(end<v.cursor||end>source.length)throw Error('Proxy stable cursor mismatch');this.raster(v,source.slice(v.cursor,end),false);v.cursor=end;this.raster(v,state.commands??[],true);this.footprints.set(id,new Set(v.tiles.keys()));
   const tip=state.inputTip??state.tip;if(tip)tips.push({id,inputAt:tip.t,finished:!!state.finished});this.pending.delete(id);
  }
  this.present(start,tips);
 }
 raster(v,commands,tail){
  const plan=this.plan;if(!plan.scale)return;const p=v.preset,z=this.view[6]*plan.scale,angle=this.view[7],flip=this.view[10]*this.view[11],qPreset={...p,__foundation:undefined,grainScale:p.grainScale*z};
  for(const c of commands){this.metrics.commands++;const b=commandBounds(c),corners=[[b.x0,b.y0],[b.x1,b.y0],[b.x1,b.y1],[b.x0,b.y1]].map(([x,y])=>toScreen(this.view,x,y)),xs=corners.map(v=>v.x),ys=corners.map(v=>v.y),x0=Math.max(0,Math.floor((Math.min(...xs)-plan.x)*plan.scale)-2),y0=Math.max(0,Math.floor((Math.min(...ys)-plan.y)*plan.scale)-2),x1=Math.min(plan.width,Math.ceil((Math.max(...xs)-plan.x)*plan.scale)+2),y1=Math.min(plan.height,Math.ceil((Math.max(...ys)-plan.y)*plan.scale)+2);
   const a=toScreen(this.view,c[0],c[1]),from=toScreen(this.view,c[16],c[17]),ax=(a.x-plan.x)*plan.scale,ay=(a.y-plan.y)*plan.scale,fx=(from.x-plan.x)*plan.scale,fy=(from.y-plan.y)*plan.scale,dx=ax-fx,dy=ay-fy,den=Math.max(1e-6,dx*dx+dy*dy),packed=Float64Array.from(c);packed[0]=ax;packed[1]=ay;packed[2]*=z;packed[4]=angle+Math.atan2(Math.sin(c[4])*this.view[11],Math.cos(c[4])*this.view[10]);packed[7]=0;
   // Reflection changes orientation but not the size or sampling of the source.
   void flip;
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const at=y*plan.width+x;if(!this.inside[at])continue;this.metrics.rasterPixels++;let k;
    if(c[19]>0){const f=clamp(((x+.5-fx)*dx+(y+.5-fy)*dy)/den),r=(c[18]+(c[2]/2-c[18])*f)*z,d=Math.hypot(x+.5-fx-dx*f,y+.5-fy-dy*f),h=r*(c[19]===1?1:p.hardness);
     k=r<.75?clamp(1-d/Math.max(.75,r+.5))*Math.min(1,2*r):d<=h?1:clamp((r+.5-d)/Math.max(.5,r-h));
    }else k=referenceCoverage(packed,x+.5,y+.5,qPreset);
    if(c[7]&&k)k*=textureFactor(c,this.docX[at],this.docY[at],p);if(!k)continue;
    const tx=Math.floor(x/CELL),ty=Math.floor(y/CELL),key=tx+','+ty;let t=v.tiles.get(key);if(!t){if(this.bytes()+CELL*CELL*32>MAX_BYTES)throw Error('Screen proxy memory budget');t=newTile();v.tiles.set(key,t);}const i=((y%CELL)*CELL+x%CELL)*4;accumulate(t[tail?'tail':'prefix'],i,c,k,p);this.dirty.add(key);if(tail)v.tailKeys.add(key);
   }
  }
 }
 base(surfaceKey){let b=this.bases.get(surfaceKey);if(!b){b=new Uint8ClampedArray(this.plan.pixels*4);this.bases.set(surfaceKey,b);}return b;}
 fold(v){const base=this.base(v.surfaceKey);for(const key of v.tiles.keys()){const [tx,ty]=key.split(',').map(Number);for(let y=ty*CELL;y<Math.min(this.plan.height,(ty+1)*CELL);y++)for(let x=tx*CELL;x<Math.min(this.plan.width,(tx+1)*CELL);x++){const at=(y*this.plan.width+x)*4,i=((y%CELL)*CELL+x%CELL)*4,paint=paintAt(v,key,i);if(!paint[3])continue;const c=composePixel(Array.from(base.subarray(at,at+4),n=>n/255),paint,v.preset.blend);for(let j=0;j<4;j++)base[at+j]=Math.round(c[j]*255);}}
 }
 committed(id,record,surfaceKey){if(!this.ready)return;this.safeFlush();if(this.folded.has(id))return;this.commits.push({id,record,surfaceKey});this.finishCommit();}
 finishCommit(){if(this.finalizing||!this.ready||!this.commits.length)return;this.finalizing=true;const epoch=this.epoch,item=this.commits[0],v=this.makeState(item.id,item.record.preset,item.surfaceKey);let index=0;
  const step=()=>{if(this.disposed||epoch!==this.epoch)return;const start=performance.now();try{
    while(index<item.record.commands.length){this.raster(v,[item.record.commands[index++]],false);if(performance.now()-start>3){setTimeout(step,0);return;}}
    const old=this.footprints.get(item.id)??new Set;for(const key of v.tiles.keys())old.add(key);this.fold(v);this.folded.add(item.id);this.footprints.set(item.id,old);this.states.delete(item.id);this.pending.delete(item.id);for(const key of old)this.dirty.add(key);this.commits.shift();this.finalizing=false;
    if(item.presented)this.presented(item.id,epoch);else this.present(performance.now(),[]);this.finishCommit();
   }catch(error){this.error=String(error);this.enabled=false;this.metrics.fallbacks++;this.invalidate();}
  };setTimeout(step,0);
 }
 presented(id,epoch=this.epoch){if(epoch!==this.epoch)return;const item=this.commits?.find(c=>c.id===id);if(item){item.presented=true;return;}const keys=this.footprints.get(id);if(!keys)return;this.footprints.delete(id);this.folded.delete(id);this.states.delete(id);this.pending.delete(id);for(const key of keys)this.dirty.add(key);this.metrics.retirements++;this.present(performance.now(),[]);}
 cancel(id){const keys=this.footprints.get(id)??this.states.get(id)?.tiles.keys()??[];for(const key of keys)this.dirty.add(key);this.pending.delete(id);this.states.delete(id);this.footprints.delete(id);this.present(performance.now(),[]);}
 present(start,tips){if(!this.ready||!this.dirty.size)return;const rects=[],keys=[...this.dirty],stack=this.backend.surfaceStack,active=[...this.states.values()].sort((a,b)=>a.id-b.id),footprints=[...this.footprints.values()];this.dirty.clear();
  for(const key of keys){const [tx,ty]=key.split(',').map(Number),x0=tx*CELL,y0=ty*CELL,w=Math.min(CELL,this.plan.width-x0),h=Math.min(CELL,this.plan.height-y0);if(w<=0||h<=0)continue;rects.push([x0,y0,w,h]);const needed=footprints.some(s=>s.has(key));
   for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const pixel=y*this.plan.width+x,at=pixel*4;if(!needed||!this.inside[pixel]){this.image.data.fill(0,at,at+4);continue;}let composed=[0,0,0,0];
    for(const surface of stack){const base=this.bases.get(surface);let layer=base?Array.from(base.subarray(at,at+4),n=>n/255):[0,0,0,0];const i=((y%CELL)*CELL+x%CELL)*4;
     for(const v of active)if(v.surfaceKey===surface)layer=composePixel(layer,paintAt(v,key,i),v.preset.blend);
     const style=this.styles?.get(surface),opacity=style?.opacity??1;if(style?.visible===false)continue;composed=composePixel(composed,[layer[0]*layer[3]*opacity,layer[1]*layer[3]*opacity,layer[2]*layer[3]*opacity,layer[3]*opacity],style?.blend??'normal');
    }
    for(let j=0;j<3;j++)this.image.data[at+j]=Math.round((composed[j]*composed[3]+1-composed[3])*255);this.image.data[at+3]=255;
   }
  }
  this.sink.upload(this.image,rects);this.generation++;const end=performance.now(),pixels=rects.reduce((n,r)=>n+r[2]*r[3],0);this.metrics.updates++;this.metrics.updatedPixels+=pixels;
  if(this.measure)for(const t of tips){this.metrics.samples.push({...t,at:end,cpuMs:end-start,inputToUploadMs:Math.max(0,end-t.inputAt),updatedPixels:pixels,proxyPixels:this.plan.pixels,visibleArea:this.plan.visibleArea,viewEpoch:this.epoch,generation:this.generation});if(this.metrics.samples.length>2400)this.metrics.samples.shift();}
  if(!this.footprints.size)this.sink.hide();
 }
 bytes(){let bytes=(this.plan?.pixels??0)*(21+this.bases.size*4);for(const v of this.states.values())bytes+=v.tiles.size*CELL*CELL*32;return bytes;}
 summary(){return {scope:'CPU raster and canvas upload only; compositor, physical display and GPU execution unmeasured',transport:this.transport,coupled:this.coupled,ready:this.ready,viewEpoch:this.epoch,generation:this.generation,...this.plan,polygon:undefined,bytes:this.bytes(),byteBudget:MAX_BYTES,pendingStrokes:this.footprints.size,...this.metrics,samples:this.measure?this.metrics.samples:[]};}
 destroy(){this.disposed=true;this.epoch++;this.sink.destroy();this.states.clear();this.pending.clear();this.bases.clear();}
}
