import {commandBounds,referenceCoverage,continuous} from '@rt/model';
import {textureFactor} from '@rt/foundation';
import {coalesceRectangles} from '@rt/minification';

// Only active/unpresented strokes live here. Completed artwork is borrowed from
// the existing GPU presentation, never reconstructed from semantic history.
const CELL=32,CHUNK=128,MAX_BYTES=64*1024*1024,clamp=v=>Math.max(0,Math.min(1,v));
export function polygonArea(p){let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i].x*q.y-q.x*p[i].y;}return Math.abs(a)*.5;}
export function clipPolygon(points,x0,y0,x1,y1){let p=points;for(const [axis,value,greater]of [['x',x0,true],['x',x1,false],['y',y0,true],['y',y1,false]]){const input=p;p=[];if(!input.length)break;let a=input.at(-1),ai=greater?a[axis]>=value:a[axis]<=value;for(const b of input){const bi=greater?b[axis]>=value:b[axis]<=value;if(ai!==bi){const t=(value-a[axis])/(b[axis]-a[axis]);p.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}if(bi)p.push(b);a=b;ai=bi;}}return p;}
export function toScreen(v,x,y){const c=Math.cos(v[7]),s=Math.sin(v[7]),dx=(x-v[4]/2)*v[10],dy=(y-v[5]/2)*v[11];return {x:v[2]/2+v[8]+v[6]*(dx*c-dy*s),y:v[3]/2+v[9]+v[6]*(dx*s+dy*c)};}
export function toDocument(v,x,y){const c=Math.cos(v[7]),s=Math.sin(v[7]),dx=(x-v[2]/2-v[8])/v[6],dy=(y-v[3]/2-v[9])/v[6];return {x:v[4]/2+(dx*c+dy*s)*v[10],y:v[5]/2+(-dx*s+dy*c)*v[11]};}
export function previewPlan(view,preset={},ratio='auto'){
 if(!view||!(view[0]>0&&view[1]>0&&view[2]>0&&view[3]>0&&view[6]>0))throw Error('Invalid overlay view');
 const polygon=clipPolygon([[0,0],[view[4],0],[view[4],view[5]],[0,view[5]]].map(([x,y])=>toScreen(view,x,y)),0,0,view[2],view[3]);
 const density=Math.min(view[0]/view[2],view[1]/view[3]),diameter=(preset.size??16)*view[6],material=!!preset.__foundation?.material||preset.id?.includes('pencil');
 // Provisional profiles are compared by the browser quality/latency harness.
 // Grain and fine outlines keep every physical screen pixel. Broad flat paint
 // can use fewer pixels; a running stroke never changes its sampling grid.
 let selected=ratio==='auto'?(material||diameter<48?1:diameter<128?1/2:diameter<256?1/4:1/8):Number(ratio);
 if(![1,1/2,1/4,1/8,1/16,1/32,1/64,1/128].includes(selected))throw Error('Invalid overlay area ratio');
 const scale=density*Math.sqrt(selected),visibleArea=polygonArea(polygon);
 return {polygon,visibleArea,density,ratio:selected,requestedRatio:ratio,scale,screenWidth:view[2],screenHeight:view[3],width:Math.ceil(view[2]*scale),height:Math.ceil(view[3]*scale),visiblePixelBudget:Math.ceil(visibleArea*scale*scale),diameter};
}
export function directOverlaySupported(p,surfaceKey,backend){
 const style=backend.surfaceStyles?.get(surfaceKey);
 return !!p?.__foundation&&p.blend==='normal'&&surfaceKey===backend.surfaceStack.at(-1)&&(!style||(style.visible!==false&&(style.opacity??1)===1&&(style.blend??'normal')==='normal'&&!style.mask&&!style.clipping))&&!p.__foundation.readsCanvas;
}
function accumulate(a,i,c,k,p){k*=c[6];const old=a[i+3];if(p.__foundation.coverageUnion||continuous(p)){const d=Math.max(0,k*c[5]-old);for(let j=0;j<3;j++)a[i+j]+=c[8+j]*d;a[i+3]+=d;}else if(p.__foundation.material){const x=k*c[5];for(let j=0;j<3;j++)a[i+j]=a[i+j]*(1-x)+c[8+j]*x;a[i+3]+=x*(1-old);}else{const d=Math.max(0,c[5]-old)*k;for(let j=0;j<3;j++)a[i+j]+=c[8+j]*d;a[i+3]+=d;}}

// A single growing image, rounded to reusable allocation bands. It contains
// just the union of pending stroke regions, not a viewport-sized artwork copy.
export class StrokeSink{
 constructor(source){this.source=source;this.element=document.createElement('canvas');this.element.className='illustro-stroke-overlay';this.element.setAttribute('aria-hidden','true');Object.assign(this.element.style,{position:'absolute',pointerEvents:'none',transformOrigin:'0 0',display:'none',background:'transparent',aspectRatio:'auto'});source.insertAdjacentElement('afterend',this.element);this.context=this.element.getContext('2d',{alpha:true,willReadFrequently:true});if(!this.context)throw Error('Overlay Canvas2D unavailable');this.scratch=document.createElement('canvas');this.scratch.width=CELL;this.scratch.height=CELL;this.scratchContext=this.scratch.getContext('2d',{willReadFrequently:true});this.allocations=0;}
 configure(plan,bounds){const scale=plan.scale,unit=CHUNK/scale,x=Math.max(0,Math.floor(bounds[0]/unit)*unit),y=Math.max(0,Math.floor(bounds[1]/unit)*unit),right=Math.min(plan.screenWidth,Math.ceil(bounds[2]/unit)*unit),bottom=Math.min(plan.screenHeight,Math.ceil(bounds[3]/unit)*unit),w=Math.max(1,Math.ceil((right-x)*scale)),h=Math.max(1,Math.ceil((bottom-y)*scale));
  if(this.rect&&this.scale===scale&&x>=this.rect[0]&&y>=this.rect[1]&&right<=this.rect[2]&&bottom<=this.rect[3])return false;
  this.rect=[x,y,right,bottom];this.scale=scale;const e=this.element;e.width=w;e.height=h;this.allocations++;Object.assign(e.style,{left:this.source.offsetLeft+x+'px',top:this.source.offsetTop+y+'px',width:w/scale+'px',height:h/scale+'px',transform:'none'});const z=getComputedStyle(this.source).zIndex;if(z!=='auto')e.style.zIndex=z;e.style.clipPath='polygon('+plan.polygon.map(p=>(p.x-x)+'px '+(p.y-y)+'px').join(',')+')';this.context.imageSmoothingEnabled=true;this.context.imageSmoothingQuality='high';return true;
 }
 draw(plan,rects,guards,cells){const c=this.context,s=this.scale,[ox,oy]=this.rect;
  for(const [x,y,w,h]of rects){const dx=(x-ox)*s,dy=(y-oy)*s,dw=w*s,dh=h*s;c.save();c.beginPath();c.rect(dx,dy,dw,dh);c.clip();c.clearRect(dx,dy,dw,dh);
   for(const item of cells){const [tx,ty]=item.key.split(',').map(Number),px=tx*CELL/plan.scale,py=ty*CELL/plan.scale,pw=item.image.width/plan.scale,ph=item.image.height/plan.scale;if(px+pw<x||py+ph<y||px>x+w||py>y+h)continue;this.scratchContext.putImageData(item.image,0,0);c.drawImage(this.scratch,0,0,item.image.width,item.image.height,(px-ox)*s,(py-oy)*s,pw*s,ph*s);}
   c.restore();
  }this.element.style.display='block';
 }
 hide(){this.element.style.display='none';this.rect=null;this.element.width=1;this.element.height=1;}
 showGuard(plan,g){if(!this.guardElement){this.guardElement=document.createElement('canvas');this.guardElement.className='illustro-transition-guard';this.guardElement.setAttribute('aria-hidden','true');Object.assign(this.guardElement.style,{position:'absolute',pointerEvents:'none'});this.element.before(this.guardElement);}const e=this.guardElement;e.width=g.width;e.height=g.height;Object.assign(e.style,{display:'block',left:this.source.offsetLeft+'px',top:this.source.offsetTop+'px',transform:'translate('+g.x+'px,'+g.y+'px) scale('+1/plan.density+')',transformOrigin:'0 0',width:g.width+'px',height:g.height+'px',clipPath:'polygon('+plan.polygon.map(p=>((p.x-g.x)*plan.density)+'px '+((p.y-g.y)*plan.density)+'px').join(',')+')'});const z=getComputedStyle(this.source).zIndex;if(z!=='auto')e.style.zIndex=z;e.getContext('2d',{alpha:false}).drawImage(g.bitmap,0,0);}
 hideGuard(){if(this.guardElement){this.guardElement.style.display='none';this.guardElement.width=1;this.guardElement.height=1;}}
 destroy(){this.element.remove();this.guardElement?.remove();}
 get pixels(){return this.rect?this.element.width*this.element.height:0;}
}

export class StrokeOverlay{
 constructor(backend,{ratio='auto',sink=null}={}){this.backend=backend;this.ratio=ratio;this.sink=sink??new StrokeSink(backend.canvas);this.states=new Map;this.pending=new Map;this.footprints=new Map;this.cells=new Map;this.dirty=new Set;this.guards=[];this.epoch=0;this.generation=0;this.ready=false;this.enabled=true;this.fallback=false;this.suspended=false;this.allocatedBytes=0;this.metrics={updates:0,updatedPixels:0,rasterPixels:0,commands:0,historyReplayCommands:0,historyRebuilds:0,guardPixels:0,guardCaptures:0,superseded:0,rebuilds:0,fallbacks:0,retirements:0,samples:[],maxCpuMs:0};}
 setEnabled(value){this.enabled=value;this.invalidate();}
 setView(view){const old=new Map([...this.states.values()].filter(v=>v.last).map(v=>[v.id,v.last]));for(const [id,state]of this.pending)old.set(id,state);this.pending.clear();this.view=Float64Array.from(view);this.epoch++;this.closeGuards();this.clearRaster();this.ready=this.enabled&&!this.suspended;this.plan=previewPlan(this.view,this.preferred??{},this.ratio);for(const state of old.values())this.pending.set(state.id,state);if(this.ready)this.schedule();}
 prepare(preset){this.preferred=typeof preset==='number'?{size:preset}:preset;if(!this.view||this.states.size)return;this.plan=previewPlan(this.view,this.preferred,this.ratio);this.ready=this.enabled&&!this.suspended;}
 suspend(){this.suspended=true;this.ready=false;this.epoch++;}
 invalidate(){this.epoch++;this.closeGuards();this.clearRaster();this.pending.clear();this.fallback=false;this.suspended=false;this.ready=this.enabled&&!!this.view;if(this.view)this.plan=previewPlan(this.view,this.preferred??{},this.ratio);}
 clearRaster(){this.states.clear();this.footprints.clear();this.cells.clear();this.dirty.clear();this.allocatedBytes=0;this.sink.hide();}
 canUse(p,surfaceKey=this.backend.surfaceStack.at(-1)){return this.enabled&&this.ready&&!this.fallback&&this.plan?.visibleArea>0&&this.view[12]<.5&&this.view[14]<.5&&(!this.backend.device||this.backend.viewportCache?.enabled&&this.view[0]*this.view[1]*4<=this.backend.viewportCache.budget)&&directOverlaySupported(p,surfaceKey,this.backend);}
 enqueue(state){if(!this.enabled||!this.view||this.suspended)return false;
  if(this.fallback&&!this.states.size&&!this.backend.previews.size)this.fallback=false;
  if(!this.canUse(state.preset,state.surfaceKey)){this.fallback=true;this.metrics.fallbacks++;return false;}
  const wanted=previewPlan(this.view,state.preset,this.ratio);if(wanted.scale>this.plan.scale){this.preferred=state.preset;this.setView(this.view);}else if(!this.states.size&&!this.pending.size)this.prepare(state.preset);
  if(this.pending.has(state.id))this.metrics.superseded++;this.pending.set(state.id,state);this.schedule();return true;
 }
 schedule(){if(this.scheduled)return;this.scheduled=true;queueMicrotask(()=>{this.scheduled=false;this.safeFlush();});}
 safeFlush(){try{this.flush();}catch(error){this.error=String(error);this.fallback=true;this.metrics.fallbacks++;}}
 flush(){if(!this.ready||this.disposed||this.fallback)return;const start=performance.now(),tips=[];
  for(const [id,state]of this.pending){let v=this.states.get(id);if(!v||state.resetPreview&&v.last!==state){if(v)this.removeState(id);v={id,preset:state.preset,surfaceKey:state.surfaceKey,tiles:new Map,tailKeys:new Set,cursor:0,last:null};this.states.set(id,v);}if(v.last===state){this.pending.delete(id);continue;}
   const oldTail=[...v.tailKeys];for(const key of oldTail){v.tiles.get(key)?.tail?.fill(0);this.dirty.add(key);}v.tailKeys.clear();
   const source=state.stableSource??state.stableCommands??[],end=state.stableEnd??source.length;if(end<v.cursor||end>source.length)throw Error('Overlay stable cursor mismatch');this.raster(v,source,v.cursor,end,false);v.cursor=end;this.raster(v,state.commands??[],0,(state.commands??[]).length,true);v.last=state;
   for(const key of oldTail)if(!v.tailKeys.has(key)){const t=v.tiles.get(key);if(t?.tail){this.allocatedBytes-=t.tail.byteLength;t.tail=null;}}
   this.footprints.set(id,new Set(v.tiles.keys()));const tip=state.inputTip??state.tip;if(tip)tips.push({id,inputAt:tip.t,finished:!!state.finished});this.pending.delete(id);
  }this.present(start,tips);
 }
 raster(v,commands,start,end,tail){const plan=this.plan,view=this.view,p=v.preset,z=view[6]*plan.scale,angle=view[7],cos=Math.cos(angle),sin=Math.sin(angle),stepX=cos*view[10]/z,stepY=-sin*view[11]/z,qPreset={...p,__foundation:undefined,grainScale:p.grainScale*z};
  for(let n=start;n<end;n++){const c=commands[n];this.metrics.commands++;const b=commandBounds(c),corners=[[b.x0,b.y0],[b.x1,b.y0],[b.x1,b.y1],[b.x0,b.y1]].map(([x,y])=>toScreen(view,x,y)),xs=corners.map(q=>q.x),ys=corners.map(q=>q.y),x0=Math.max(0,Math.floor(Math.min(...xs)*plan.scale)-2),y0=Math.max(0,Math.floor(Math.min(...ys)*plan.scale)-2),x1=Math.min(plan.width,Math.ceil(Math.max(...xs)*plan.scale)+2),y1=Math.min(plan.height,Math.ceil(Math.max(...ys)*plan.scale)+2);
   const a=toScreen(view,c[0],c[1]),f=toScreen(view,c[16],c[17]),ax=a.x*plan.scale,ay=a.y*plan.scale,fx=f.x*plan.scale,fy=f.y*plan.scale,dx=ax-fx,dy=ay-fy,den=Math.max(1e-6,dx*dx+dy*dy),packed=Float64Array.from(c);packed[0]=ax;packed[1]=ay;packed[2]*=z;packed[4]=angle+Math.atan2(Math.sin(c[4])*view[11],Math.cos(c[4])*view[10]);packed[7]=0;
   for(let ty=Math.floor(y0/CELL);ty<Math.ceil(y1/CELL);ty++)for(let tx=Math.floor(x0/CELL);tx<Math.ceil(x1/CELL);tx++){const key=tx+','+ty,name=tail?'tail':'prefix',left=Math.max(x0,tx*CELL),right=Math.min(x1,(tx+1)*CELL),top=Math.max(y0,ty*CELL),bottom=Math.min(y1,(ty+1)*CELL);let tile=v.tiles.get(key),pixels=tile?.[name],changed=false;
    for(let y=top;y<bottom;y++){const row=toDocument(view,(left+.5)/plan.scale,(y+.5)/plan.scale);let docX=row.x,docY=row.y;
     for(let x=left;x<right;x++,docX+=stepX,docY+=stepY){if(docX<0||docY<0||docX>=view[4]||docY>=view[5])continue;this.metrics.rasterPixels++;let k;
      if(c[19]>0){const t=clamp(((x+.5-fx)*dx+(y+.5-fy)*dy)/den),r=(c[18]+(c[2]/2-c[18])*t)*z,px=x+.5-fx-dx*t,py=y+.5-fy-dy*t,d=Math.sqrt(px*px+py*py),h=r*(c[19]===1?1:p.hardness);k=r<.5?clamp(.5+r-d)*Math.min(1,2*r):d<=h?1:clamp((r+.5-d)/Math.max(.5,r-h));}
      else k=referenceCoverage(packed,x+.5,y+.5,qPreset);
      if(c[7]&&k)k*=textureFactor(c,docX,docY,p);if(!k)continue;
      if(!tile){tile={prefix:null,tail:null};v.tiles.set(key,tile);let ids=this.cells.get(key);if(!ids)this.cells.set(key,ids=new Set);ids.add(v.id);}if(!pixels){const bytes=CELL*CELL*16;if(this.allocatedBytes+bytes>MAX_BYTES)throw Error('Overlay memory pressure; exact GPU feedback retained');pixels=tile[name]=new Float32Array(CELL*CELL*4);this.allocatedBytes+=bytes;}const i=((y%CELL)*CELL+x%CELL)*4;accumulate(pixels,i,c,k,p);changed=true;
     }
    }if(changed){this.dirty.add(key);if(tail)v.tailKeys.add(key);}
   }
  }
 }

 composedCell(key){const image=new ImageData(CELL,CELL),layers=[...(this.cells.get(key)??[])].sort((a,b)=>a-b).map(id=>{const v=this.states.get(id),t=v?.tiles.get(key);return t?{a:t.prefix,b:t.tail,union:v.preset.__foundation.coverageUnion||continuous(v.preset),opacity:v.preset.__foundation.material?v.preset.__foundation.opacity:1}:null;}).filter(Boolean);
  for(let i=0;i<image.data.length;i+=4){let r=0,g=0,b=0,a=0;for(const v of layers){const ba=v.b?.[i+3]??0,invTail=1-ba,opacity=v.opacity,alpha=(v.union?Math.max(v.a?.[i+3]??0,ba):ba+(v.a?.[i+3]??0)*invTail)*opacity,inv=1-alpha;
   r=(v.union?Math.max(v.a?.[i]??0,v.b?.[i]??0):(v.b?.[i]??0)+(v.a?.[i]??0)*invTail)*opacity+r*inv;
   g=(v.union?Math.max(v.a?.[i+1]??0,v.b?.[i+1]??0):(v.b?.[i+1]??0)+(v.a?.[i+1]??0)*invTail)*opacity+g*inv;
   b=(v.union?Math.max(v.a?.[i+2]??0,v.b?.[i+2]??0):(v.b?.[i+2]??0)+(v.a?.[i+2]??0)*invTail)*opacity+b*inv;a=alpha+a*inv;
  }if(a){image.data[i]=Math.round(clamp(r/a)*255);image.data[i+1]=Math.round(clamp(g/a)*255);image.data[i+2]=Math.round(clamp(b/a)*255);image.data[i+3]=Math.round(clamp(a)*255);}}return {key,image};}

 bounds(){const keys=[...this.cells.keys()];if(!keys.length)return null;const xs=[],ys=[];for(const key of keys){const [x,y]=key.split(',').map(Number);xs.push(x*CELL/this.plan.scale);ys.push(y*CELL/this.plan.scale);}return [Math.max(0,Math.min(...xs)),Math.max(0,Math.min(...ys)),Math.min(this.view[2],Math.max(...xs)+CELL/this.plan.scale),Math.min(this.view[3],Math.max(...ys)+CELL/this.plan.scale)];}
 present(start,tips=[]){if(!this.ready||this.disposed||!this.dirty.size)return;const bounds=this.bounds();if(!bounds){this.sink.hide();this.dirty.clear();return;}const resized=this.sink.configure(this.plan,bounds);if(resized)for(const key of this.cells.keys())this.dirty.add(key);const keys=[...this.dirty];this.dirty.clear();const rects=coalesceRectangles(keys.map(k=>{const [x,y]=k.split(',').map(Number);return [x*CELL/this.plan.scale,y*CELL/this.plan.scale,(x+1)*CELL/this.plan.scale,(y+1)*CELL/this.plan.scale];})).map(([x,y,x1,y1])=>[x,y,x1-x,y1-y]),cells=keys.map(k=>this.composedCell(k));this.sink.draw(this.plan,rects,this.guards,cells);this.generation++;const end=performance.now(),updatedPixels=rects.reduce((n,r)=>n+Math.ceil(r[2]*this.sink.scale)*Math.ceil(r[3]*this.sink.scale),0);this.metrics.updates++;this.metrics.updatedPixels+=updatedPixels;this.metrics.maxCpuMs=Math.max(this.metrics.maxCpuMs,end-start);if(this.measure)for(const t of tips){this.metrics.samples.push({...t,at:end,cpuMs:end-start,inputToUploadMs:Math.max(0,end-t.inputAt),updatedPixels,proxyPixels:this.sink.pixels,visibleArea:this.plan.visibleArea,viewEpoch:this.epoch,generation:this.generation});if(this.metrics.samples.length>3000)this.metrics.samples.shift();}}
 removeState(id){const v=this.states.get(id);if(v){for(const [key,tile]of v.tiles){this.allocatedBytes-=(tile.prefix?.byteLength??0)+(tile.tail?.byteLength??0);this.cells.get(key)?.delete(id);if(!this.cells.get(key)?.size)this.cells.delete(key);this.dirty.add(key);}this.states.delete(id);}this.pending.delete(id);this.footprints.delete(id);}
 presented(id,epoch=this.epoch){if(epoch!==this.epoch)return;this.removeState(id);this.metrics.retirements++;this.schedulePresentation();}
 cancel(id){this.removeState(id);this.schedulePresentation();}
 schedulePresentation(){if(this.presentScheduled)return;this.presentScheduled=true;queueMicrotask(()=>{this.presentScheduled=false;this.present(performance.now());});}
 async protect(){this.safeFlush();if(this.guards.length||!this.cells.size)return true;const epoch=this.epoch,plan=this.plan,source=this.backend.canvas,bounds=this.bounds();if(!bounds)return true;
  // A cropped, full-DPR snapshot is a SHORT-LIVED transition guard, not a
  // historical proxy base. It prevents transparent feedback double-painting
  // while the independently owned GPU canvas publishes its exact result.
  const x=Math.max(0,Math.floor(Math.floor(bounds[0])*plan.density)),y=Math.max(0,Math.floor(Math.floor(bounds[1])*plan.density)),w=Math.min(source.width-x,Math.ceil(Math.ceil(bounds[2])*plan.density)-x),h=Math.min(source.height-y,Math.ceil(Math.ceil(bounds[3])*plan.density)-y);if(w<=0||h<=0)return true;
  const bitmap=await transitionSnapshot(this.backend,x,y,w,h);if(this.disposed||epoch!==this.epoch){bitmap.close();return false;}this.guards=[{bitmap,x:x/plan.density,y:y/plan.density,width:w,height:h}];this.metrics.guardCaptures++;this.metrics.guardPixels+=w*h;this.sink.showGuard?.(plan,this.guards[0]);return true;
 }
 closeGuards(){for(const g of this.guards)g.bitmap.close();this.guards=[];this.sink.hideGuard?.();}
 fallbackPresented(submittedAt,epoch,fallbackRendered=false){if(epoch!==this.epoch)return;if(this.fallback&&fallbackRendered){this.closeGuards();this.clearRaster();this.pending.clear();return;}if(this.guards.length){this.closeGuards();for(const key of this.cells.keys())this.dirty.add(key);this.schedulePresentation();}}
 summary(){return {scope:'CPU stroke raster/upload and cropped transition snapshots; physical display/GPU execution unmeasured',kind:'stroke-only',transport:'2d',coupled:false,ready:this.ready,viewEpoch:this.epoch,generation:this.generation,...this.plan,polygon:undefined,pixels:this.sink.pixels,width:this.sink.element?.width??0,height:this.sink.element?.height??0,bytes:this.allocatedBytes+this.sink.pixels*4+this.guards.reduce((n,g)=>n+g.width*g.height*4,0),rasterByteBudget:MAX_BYTES,pendingStrokes:this.footprints.size,fallback:this.fallback,allocations:this.sink.allocations,...this.metrics,samples:this.measure?this.metrics.samples:[]};}
 destroy(){this.disposed=true;this.epoch++;this.closeGuards();this.clearRaster();this.pending.clear();this.sink.destroy();}
}

// WebGPU canvas textures are automatically expired after presentation. Read a
// cropped region of the retained screen cache instead, once per handoff. Never
// read the artwork or the whole viewport every input/frame.
async function transitionSnapshot(b,x,y,w,h){
 if(!b.device)return createImageBitmap(b.canvas,x,y,w,h);
 if(!b.viewportCache?.valid||!b.viewportCache.view?.every((v,i)=>v===b.viewTransform[i]))await b.presentCurrent();
 const image=b.viewportCache?.valid&&b.viewportCache.image;if(!image)throw Error('Retained presentation unavailable');
 const d=b.device,stride=Math.ceil(w*4/256)*256,buffer=d.createBuffer({size:stride*h,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
 try{const e=d.createCommandEncoder();e.copyTextureToBuffer({texture:image,origin:{x,y}},{buffer,bytesPerRow:stride},[w,h]);d.queue.submit([e.finish()]);await buffer.mapAsync(GPUMapMode.READ);const raw=new Uint8Array(buffer.getMappedRange()),data=new ImageData(w,h),bgra=b.format.startsWith('bgra');
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const from=yy*stride+xx*4,to=(yy*w+xx)*4;data.data[to]=raw[from+(bgra?2:0)];data.data[to+1]=raw[from+1];data.data[to+2]=raw[from+(bgra?0:2)];data.data[to+3]=255;}buffer.unmap();return await createImageBitmap(data);
 }finally{buffer.destroy();}
}
