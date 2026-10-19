import {commandBounds,referenceCoverage,continuous,capsuleCoverage,sweptCoverage} from '@rt/model';
import {PreviewPolicy,previewContext} from '@rt/preview-policy';
import {textureFactor} from '@rt/foundation';

// Only active/unpresented strokes live here. Completed artwork is borrowed from
// the existing GPU presentation, never reconstructed from semantic history.
const CELL=32,CHUNK=128,MAX_BYTES=64*1024*1024,clamp=v=>Math.max(0,Math.min(1,v));
export function polygonArea(p){let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i].x*q.y-q.x*p[i].y;}return Math.abs(a)*.5;}
export function clipPolygon(points,x0,y0,x1,y1){let p=points;for(const [axis,value,greater]of [['x',x0,true],['x',x1,false],['y',y0,true],['y',y1,false]]){const input=p;p=[];if(!input.length)break;let a=input.at(-1),ai=greater?a[axis]>=value:a[axis]<=value;for(const b of input){const bi=greater?b[axis]>=value:b[axis]<=value;if(ai!==bi){const t=(value-a[axis])/(b[axis]-a[axis]);p.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}if(bi)p.push(b);a=b;ai=bi;}}return p;}
export function toScreen(v,x,y){const c=Math.cos(v[7]),s=Math.sin(v[7]),dx=(x-v[4]/2)*v[10],dy=(y-v[5]/2)*v[11];return {x:v[2]/2+v[8]+v[6]*(dx*c-dy*s),y:v[3]/2+v[9]+v[6]*(dx*s+dy*c)};}
export function toDocument(v,x,y){const c=Math.cos(v[7]),s=Math.sin(v[7]),dx=(x-v[2]/2-v[8])/v[6],dy=(y-v[3]/2-v[9])/v[6];return {x:v[4]/2+(dx*c+dy*s)*v[10],y:v[5]/2+(-dx*s+dy*c)*v[11]};}
// Screen-to-screen affine reprojection of a pending stroke image. Completed
// artwork stays on its original high-quality GPU presentation path.
export function viewAffine(from,to){const map=(x,y)=>{const d=toDocument(from,x,y);return toScreen(to,d.x,d.y);},p=map(0,0),x=map(1,0),y=map(0,1);return [x.x-p.x,x.y-p.y,y.x-p.x,y.y-p.y,p.x,p.y];}
export function previewPlan(view,preset={},ratio='auto'){
 if(!view||!(view[0]>0&&view[1]>0&&view[2]>0&&view[3]>0&&view[6]>0))throw Error('Invalid overlay view');
 const polygon=clipPolygon([[0,0],[view[4],0],[view[4],view[5]],[0,view[5]]].map(([x,y])=>toScreen(view,x,y)),0,0,view[2],view[3]);
 const density=Math.min(view[0]/view[2],view[1]/view[3]),diameter=(preset.size??16)*view[6],material=!!preset.__foundation?.material||preset.id?.includes('pencil');
 // Measured full/half/quarter/... profiles: fine outlines and grain retain
 // physical density. Flat broad paint retains at least 1.4 samples/CSS px
 // (one for very wide paint), so low-DPR screens are not made extra coarse.
 const target=Math.min(density,diameter<24?2:diameter<128?1.4:1);
 let selected=ratio==='auto'?(material||diameter<12?1:[1/128,1/64,1/32,1/16,1/8,1/4,1/2,1].find(r=>density*Math.sqrt(r)>=target)):Number(ratio);
 if(![1,1/2,1/4,1/8,1/16,1/32,1/64,1/128].includes(selected))throw Error('Invalid overlay area ratio');
 const scale=density*Math.sqrt(selected),visibleArea=polygonArea(polygon);
 // At high zoom evaluate the SAME document-pixel coverage as the strict GPU
 // raster. Subpixel position, analytic AA and texture phase remain in document
 // coordinates. CSS compositing only magnifies these pixels; it does not
 // rerasterize the brush at display density. Explicit area-ratio QA stays intact.
 if(ratio==='auto'&&view[6]>=4){
  const rasterView=Float64Array.from([view[4],view[5],view[4],view[5],view[4],view[5],1,0,0,0,1,1,0,view[13],0,0]);
  const halo=2*view[6],poly=clipPolygon([[-halo,-halo],[view[2]+halo,-halo],[view[2]+halo,view[3]+halo],[-halo,view[3]+halo]].map(([x,y])=>toDocument(view,x,y)),0,0,view[4],view[5]);
  const xs=poly.map(p=>p.x),ys=poly.map(p=>p.y),clip=poly.length?[Math.max(0,Math.floor(Math.min(...xs))),Math.max(0,Math.floor(Math.min(...ys))),Math.min(view[4],Math.ceil(Math.max(...xs))),Math.min(view[5],Math.ceil(Math.max(...ys)))]:[0,0,0,0];
  return {polygon:poly,screenPolygon:polygon,visibleArea,density,ratio:1/(density*view[6])**2,requestedRatio:ratio,scale:1,screenWidth:view[4],screenHeight:view[5],width:view[4],height:view[5],visiblePixelBudget:(clip[2]-clip[0])*(clip[3]-clip[1]),diameter,rasterView,clip,sampling:'document-analytic',samplesPerDocumentPixel:1};
 }
 return {polygon,screenPolygon:polygon,visibleArea,density,ratio:selected,requestedRatio:ratio,scale,screenWidth:view[2],screenHeight:view[3],width:Math.ceil(view[2]*scale),height:Math.ceil(view[3]*scale),visiblePixelBudget:Math.ceil(visibleArea*scale*scale),diameter,sampling:'screen',samplesPerDocumentPixel:scale*view[6]};
}
export function directOverlaySupported(p,surfaceKey,backend){
 const style=backend.surfaceStyles?.get(surfaceKey);
 return !!p?.__foundation&&p.blend==='normal'&&surfaceKey===backend.surfaceStack.filter(key=>{const s=backend.surfaceStyles?.get(key);return s?.visible!==false&&(s?.opacity??1)>0;}).at(-1)&&(!style||(style.visible!==false&&(style.opacity??1)===1&&(style.blend??'normal')==='normal'&&!style.mask&&!style.clipping))&&!p.__foundation.readsCanvas;
}
export function thinCoverage(radius,distance){return 2*radius*clamp(1-distance);}
function accumulate(a,i,c,k,p){k*=c[6];const old=a[i+3];if(p.__foundation.coverageUnion||continuous(p)){const d=Math.max(0,k*c[5]-old);for(let j=0;j<3;j++)a[i+j]+=c[8+j]*d;a[i+3]+=d;}else if(p.__foundation.material){const x=k*c[5];for(let j=0;j<3;j++)a[i+j]=a[i+j]*(1-x)+c[8+j]*x;a[i+3]+=x*(1-old);}else{const d=Math.max(0,c[5]-old)*k;for(let j=0;j<3;j++)a[i+j]+=c[8+j]*d;a[i+3]+=d;}}

// A growing image per pending stroke, rounded to reusable allocation bands.
// A new short stroke never resizes or recomposes a preceding long stroke.
export class StrokeSink{
 constructor(source){this.source=source;this.element=document.createElement('canvas');this.element.className='illustro-stroke-overlay';this.element.setAttribute('aria-hidden','true');Object.assign(this.element.style,{position:'absolute',pointerEvents:'none',transformOrigin:'0 0',display:'none',background:'transparent',aspectRatio:'auto'});source.insertAdjacentElement('afterend',this.element);this.element.width=this.element.height=CHUNK;this.context=this.element.getContext('2d',{alpha:true,willReadFrequently:true});if(!this.context){this.element.remove();throw Error('Overlay Canvas2D unavailable');}this.allocations=1;this.retiredAllocations=0;this.layers=new Map;this.updateOrigin();}
 updateOrigin(){this.originX=this.source.offsetLeft;this.originY=this.source.offsetTop;this.zIndex=getComputedStyle(this.source).zIndex;if(this.rect){this.element.style.left=this.originX+this.rect[0]+'px';this.element.style.top=this.originY+this.rect[1]+'px';}if(this.guardElement){this.guardElement.style.left=this.originX+'px';this.guardElement.style.top=this.originY+'px';}for(const layer of this.layers.values())layer.updateOrigin();}
 forStroke(id){let layer=this.layers.get(id);if(!layer){const previous=[...this.layers.values()].at(-1);layer=new StrokeSink(this.source);(previous?.element??this.element).after(layer.element);this.layers.set(id,layer);}return layer;}
 reproject(from,to){this.element.style.imageRendering=to[13]>.5?'pixelated':'auto';for(const layer of this.layers.values())layer.reproject(from,to);if(!this.rect)return;const [a,b,c,d,e,f]=viewAffine(from,to),[x,y]=this.rect;this.element.style.transform=`matrix(${a},${b},${c},${d},${e+a*x+c*y-x},${f+b*x+d*y-y})`;}
 reprojectGuard(from,to,g){if(!this.guardElement)return;const [a,b,c,d,e,f]=viewAffine(from,to),z=1/g.density;this.guardElement.style.transform=`matrix(${a*z},${b*z},${c*z},${d*z},${e+a*g.x+c*g.y},${f+b*g.x+d*g.y})`;}
 retireStroke(id){const layer=this.layers.get(id);if(layer){this.retiredAllocations+=layer.totalAllocations;layer.destroy();this.layers.delete(id);}}
 get totalAllocations(){return this.allocations+this.retiredAllocations+[...this.layers.values()].reduce((n,s)=>n+s.totalAllocations,0);}
 configure(plan,bounds){const scale=plan.scale,unit=CHUNK/scale,x=Math.max(0,Math.floor(bounds[0]/unit)*unit),y=Math.max(0,Math.floor(bounds[1]/unit)*unit),right=Math.min(plan.screenWidth,Math.ceil(bounds[2]/unit)*unit),bottom=Math.min(plan.screenHeight,Math.ceil(bounds[3]/unit)*unit),w=Math.max(1,Math.ceil((right-x)*scale)),h=Math.max(1,Math.ceil((bottom-y)*scale));
  if(this.rect&&this.scale===scale&&x>=this.rect[0]&&y>=this.rect[1]&&right<=this.rect[2]&&bottom<=this.rect[3]){const [left,top]=this.rect;this.element.style.clipPath='polygon('+plan.polygon.map(p=>(p.x-left)+'px '+(p.y-top)+'px').join(',')+')';return false;}
  this.rect=[x,y,right,bottom];this.scale=scale;const e=this.element;if(e.width!==w||e.height!==h){if(e.width!==w)e.width=w;if(e.height!==h)e.height=h;this.allocations++;}else this.context.clearRect(0,0,w,h);Object.assign(e.style,{left:this.originX+x+'px',top:this.originY+y+'px',width:w/scale+'px',height:h/scale+'px',transform:'none'});const z=this.zIndex;if(z!=='auto')e.style.zIndex=z;e.style.clipPath='polygon('+plan.polygon.map(p=>(p.x-x)+'px '+(p.y-y)+'px').join(',')+')';this.context.imageSmoothingEnabled=true;this.context.imageSmoothingQuality='high';return true;
 }
 draw(plan,rects,guards,cells){const [ox,oy]=this.rect,x0=Math.round(ox*plan.scale),y0=Math.round(oy*plan.scale);
  // The output uses this exact raster grid. Direct replacement removes the
  // intermediate canvas, second copy and per-cell resampling/edge seams.
  for(const {key,image}of cells){const [x,y]=key.split(',').map(Number);this.context.putImageData(image,x*CELL-x0,y*CELL-y0);}this.element.style.display='block';
 }

 hide(){for(const id of [...this.layers.keys()])this.retireStroke(id);this.element.style.display='none';this.rect=null;if(this.element.width*this.element.height>CHUNK*CHUNK){this.element.width=this.element.height=CHUNK;this.allocations++;}else this.context.clearRect(0,0,this.element.width,this.element.height);}
 showGuard(plan,g){if(!this.guardElement){this.guardElement=document.createElement('canvas');this.guardElement.className='illustro-transition-guard';this.guardElement.setAttribute('aria-hidden','true');Object.assign(this.guardElement.style,{position:'absolute',pointerEvents:'none'});this.element.before(this.guardElement);}const e=this.guardElement;e.width=g.width;e.height=g.height;Object.assign(e.style,{display:'block',left:this.originX+'px',top:this.originY+'px',transform:'translate('+g.x+'px,'+g.y+'px) scale('+1/plan.density+')',transformOrigin:'0 0',width:g.width+'px',height:g.height+'px',clipPath:'polygon('+plan.polygon.map(p=>((p.x-g.x)*plan.density)+'px '+((p.y-g.y)*plan.density)+'px').join(',')+')'});const z=this.zIndex;if(z!=='auto')e.style.zIndex=z;e.getContext('2d',{alpha:false}).drawImage(g.bitmap,0,0);}
 hideGuard(){if(this.guardElement){this.guardElement.style.display='none';this.guardElement.width=1;this.guardElement.height=1;}}
 destroy(){for(const layer of this.layers.values())layer.destroy();this.layers.clear();this.element.remove();this.guardElement?.remove();}
 get pixels(){return this.element.width*this.element.height+[...this.layers.values()].reduce((n,s)=>n+s.pixels,0);}
}

export class StrokeOverlay{
 constructor(backend,{ratio='auto',sink=null,mode='auto',sliceMs=3,onFallback=null,liveStates=null}={}){this.backend=backend;this.policy=new PreviewPolicy({mode});this.onFallback=onFallback;this.liveStates=liveStates;this.sliceMs=Math.max(.25,Math.min(4,sliceMs));this.ratio=ratio;this.sink=sink;this.states=new Map;this.finalizations=new Map;this.preparedBytes=0;this.pending=new Map;this.footprints=new Map;this.cells=new Map;this.dirty=new Set;this.guards=[];this.guardGeneration=0;this.epoch=0;this.generation=0;this.ready=false;this.enabled=true;this.fallback=false;this.suspended=false;this.allocatedBytes=0;this.metrics={updates:0,updatedPixels:0,rasterPixels:0,skippedRasterPixels:0,commands:0,historyReplayCommands:0,historyRebuilds:0,guardPixels:0,guardCaptures:0,guardCaptureMs:0,peakBytes:0,peakPixels:0,superseded:0,rebuilds:0,fallbacks:0,retirements:0,samples:[],maxCpuMs:0,backgroundSlices:0,maxBackgroundMs:0,foregroundSlices:0,maxSliceMs:0,cancelledUpdates:0,deadlineFallbacks:0,finalizationSwaps:0,obsoleteFinalizations:0};}
 setEnabled(value){this.enabled=value;this.invalidate();}
 setNavigationActive(value){this.navigationActive=!!value;if(value){
  // A gesture borrows the last coherent image. Cancel display-only work;
  // semantic input and strict GPU work remain owned by the session/renderer.
  this.pending.clear();for(const v of this.states.values()){v.work=null;if(v.prepared){this.preparedBytes-=v.prepared.size*CELL*CELL*4;delete v.prepared;}}
  for(const id of [...this.finalizations.keys()])this.discardFinalization(id);
 }}
 setView(view){
  const old=new Map([...this.states.values()].filter(v=>v.last).map(v=>[v.id,v.finalState??v.last]));for(const [id,state]of this.pending)old.set(id,state);
  const sameSpace=this.view&&[0,1,2,3,4,5,12,14].every(i=>this.view[i]===view[i]);
  const reusable=this.sink?.reproject&&sameSpace;
  this.view=Float64Array.from(view);if(!sameSpace)this.sink?.updateOrigin?.();this.epoch++;
  if(reusable){
   // No coverage evaluation, image allocation or upload during navigation.
   for(const id of [...this.finalizations.keys()])this.discardFinalization(id);
   for(const v of this.states.values())this.sink.forStroke(v.id).reproject(v.view??this.view,this.view);
   for(const g of this.guards)this.sink.reprojectGuard?.(g.view,this.view,g);
   this.ready=this.enabled&&!this.suspended;this.plan=previewPlan(this.view,this.preferred??{},this.ratio);return;
  }
  this.pending.clear();this.closeGuards();this.clearRaster();this.ready=this.enabled&&!this.suspended;this.plan=previewPlan(this.view,this.preferred??{},this.ratio);
  for(const state of old.values())this.pending.set(state.id,state);if(this.ready)this.schedule();
 }
 prepare(preset){this.preferred=typeof preset==='number'?{size:preset}:preset;if(!this.view||this.states.size)return;this.plan=previewPlan(this.view,this.preferred,this.ratio);this.ready=this.enabled&&!this.suspended;}
 resumeAfterHistory(){this.suspended=false;this.ready=this.enabled&&!!this.view;this.schedule();}
 suspend(){this.suspended=true;this.ready=false;this.epoch++;}
 invalidate(){this.epoch++;this.closeGuards();this.clearRaster();this.pending.clear();this.fallback=false;this.suspended=false;this.ready=this.enabled&&!!this.view;if(this.view)this.plan=previewPlan(this.view,this.preferred??{},this.ratio);}
 clearRaster(){clearTimeout(this.workHandle);this.workHandle=null;this.scheduled=false;this.finalizations.clear();this.preparedBytes=0;this.states.clear();this.footprints.clear();this.cells.clear();this.dirty.clear();this.allocatedBytes=0;this.sink?.hide();}
 canUse(p,surfaceKey=this.backend.surfaceStack.at(-1),id=null){return (id===null||this.policy.choices.get(id)?.route!=='gpu')&& this.enabled&&this.ready&&!this.fallback&&this.plan?.visibleArea>0&&this.view[12]<.5&&this.view[14]<.5&&(!this.backend.device||this.backend.viewportCache?.enabled&&this.view[0]*this.view[1]*4<=this.backend.viewportCache.budget)&&directOverlaySupported(p,surfaceKey,this.backend);}
 enqueue(state){if(!this.enabled||!this.view||this.suspended)return false;
  if(this.fallback&&!this.states.size&&!this.backend.previews.size)this.fallback=false;
  const eligible=this.canUse(state.preset,state.surfaceKey),key=this.policy.choices.get(state.id)?.key??previewContext(this.view,state.preset,this.backend);
  const cpuOrderPending=[...this.states.keys(),...this.pending.keys()].some(id=>id<state.id),newerGpuPending=[...this.policy.choices.values()].some(c=>c.id>state.id&&c.route==='gpu'&&(!this.liveStates||this.liveStates.has(c.id)));
  const choice=this.policy.choose(state.id,key,{cpuAvailable:eligible,cpuOrderPending,newerGpuPending,gpuAvailable:!this.backend.lost&&!this.backend.error,gpuWaitMs:this.gpuWaitMs??0,memoryPressure:this.allocatedBytes+this.preparedBytes+(this.sink?.pixels??0)*4>MAX_BYTES*.8});
  if(choice.route==='gpu'){
   if((!eligible||cpuOrderPending||this.footprints.has(state.id))&&(this.states.size||this.pending.size)){this.fallback=true;this.metrics.fallbacks++;}
   if(!choice.cpuHasPresented&&(this.states.has(state.id)||this.pending.has(state.id)))this.removeState(state.id,true);
   return false;
  }
  if(!eligible){this.fallback=true;this.metrics.fallbacks++;return false;}
  if(!this.sink)try{this.sink=new StrokeSink(this.backend.canvas);}catch(error){this.backend.info??={};this.backend.info.proxyUnavailable=String(error);this.policy.choose(state.id,key,{cpuAvailable:false});choice.reason='仮線用の画面を用意できないため、直接表示';this.setEnabled(false);this.metrics.fallbacks++;return false;}
  this.preferred=state.preset;this.plan=previewPlan(this.view,state.preset,this.ratio);
  if(this.pending.has(state.id))this.metrics.superseded++;this.pending.set(state.id,state);this.schedule();return true;
 }
 schedule(){if(this.scheduled||this.disposed||!this.ready||this.navigationActive||!this.pending.size)return;this.scheduled=true;const run=()=>{this.scheduled=false;this.workHandle=null;if(!this.navigationActive)this.safeFlush();};
  // A task boundary allows input, paint and Undo to run. Microtasks cannot do so.
  if(globalThis.scheduler?.postTask)globalThis.scheduler.postTask(run,{priority:'user-visible'}).catch(error=>{this.error=String(error);});else this.workHandle=setTimeout(run,0);
 }
 safeFlush(){try{this.flush();}catch(error){this.error=String(error);this.fallback=true;this.metrics.fallbacks++;}}
 flush(){if(!this.ready||this.disposed||this.fallback)return;const start=performance.now(),deadline=start+this.sliceMs,tips=[];let advanced=false;
  // New active input precedes released strokes. There is one latest notification
  // and at most one resumable job per stroke, never a FIFO of old pointer moves.
  for(const [id,state]of [...this.pending].sort((a,b)=>Number(!!a[1].finished)-Number(!!b[1].finished)||b[0]-a[0])){
   let v=this.states.get(id);
   if(v&&state.finished&&state.resetPreview&&v.last!==state){this.queueFinalization(state,v);this.pending.delete(id);continue;}
   if(!v||state.resetPreview&&v.last!==state&&!v.work){if(v){this.removeState(id,true);this.pending.set(id,state);}const plan=previewPlan(this.view,state.preset,this.ratio);v={id,preset:state.preset,surfaceKey:state.surfaceKey,view:plan.rasterView??this.view.slice(),plan,tiles:new Map,tailKeys:new Set,dirty:new Set,cursor:0,last:null};this.states.set(id,v);}
   const choice=this.policy.choices.get(id);
   // If this stroke has never been shown, switching cannot double-paint or
   // remove an existing image. Shed private CPU work after a measured 50ms
   // no-feedback deadline and retry the SAME immutable input on the GPU.
   if(!v.last&&choice&&!choice.cpuHasPresented&&this.onFallback&&!this.backend.lost&&!this.backend.error&&performance.now()-choice.at>50&&this.policy.fallbackCpu(id,performance.now()-choice.at)){this.metrics.deadlineFallbacks++;if([...this.states.keys(),...this.pending.keys()].some(other=>other<id))this.fallback=true;this.removeState(id,true);this.onFallback(state);continue;}
   if(v.last===state&&!v.work){this.pending.delete(id);continue;}
   if(!v.work){v.work=this.updateWork(v,state);}
   // Stable work already started is resumed exactly once. Obsolete mutable-tail
   // work aborts at the next cell boundary; no partial deposit is replayed.
   do{const step=v.work.next();advanced=true;if(step.done){v.work=null;if(v.last===this.pending.get(id))this.pending.delete(id);if(v.last){const tip=v.last.inputTip??v.last.tip;if(tip)tips.push({id,inputAt:tip.t,finished:!!v.last.finished});}break;}}while(performance.now()<deadline);
   if(performance.now()>=deadline)break;
  }
  if(advanced){this.metrics.foregroundSlices++;this.present(start,tips);const ms=performance.now()-start;this.metrics.maxSliceMs=Math.max(this.metrics.maxSliceMs,ms);}
  this.schedule();
 }
 *updateWork(v,state){
  v.coherent=false;if(v.prepared){this.preparedBytes-=v.prepared.size*CELL*CELL*4;delete v.prepared;}
  const source=state.stableSource??state.stableCommands??[],end=state.stableEnd??source.length;
  if(end<v.cursor||end>source.length)throw Error('Overlay stable cursor mismatch');
  const oldTail=[...v.tailKeys];for(const key of oldTail){const t=v.tiles.get(key);t?.tail?.fill(0);if(t)t.tailLowerBound=0;v.dirty.add(key);}v.tailKeys.clear();
  for(let n=v.cursor;n<end;n++){yield* this.rasterWork(v,source,n,n+1,false);v.cursor=n+1;}
  if(this.pending.get(v.id)!==state){this.metrics.cancelledUpdates++;return;}
  const tail=this.rasterWork(v,state.commands??[],0,(state.commands??[]).length,true);
  for(const step of tail){yield step;if(this.pending.get(v.id)!==state){this.metrics.cancelledUpdates++;return;}}
  // Convert dirty cells cooperatively too: moving raster into tasks must not
  // leave a large synchronous Float32 -> RGBA8 conversion at publication.
  v.prepared=new Map;
  for(const key of v.dirty){if(this.pending.get(v.id)!==state){this.metrics.cancelledUpdates++;return;}if(this.allocatedBytes+this.preparedBytes+CELL*CELL*4>MAX_BYTES)throw Error('Overlay preparation memory pressure; exact GPU feedback retained');v.prepared.set(key,this.composedCell(key,[v.id]));this.preparedBytes+=CELL*CELL*4;yield;}
  if(this.pending.get(v.id)!==state){this.metrics.cancelledUpdates++;return;}
  v.last=state;v.coherent=true;
  for(const key of oldTail)if(!v.tailKeys.has(key)){const t=v.tiles.get(key);if(t?.tail){this.allocatedBytes-=t.tail.byteLength;v.bytes-=t.tail.byteLength;t.tail=null;}}
  this.footprints.set(v.id,new Set(v.tiles.keys()));
  // Only a complete, current prefix/tail pair is publishable. Superseded partial
  // pixels remain private, and can never resurrect after cancel / view changes.
  for(const key of v.dirty)this.dirty.add(key);
 }
 *rasterWork(v,commands,start,end,tail){const plan=v.plan??this.plan,view=v.view??this.view,p=v.preset,z=view[6]*plan.scale,angle=view[7],cos=Math.cos(angle),sin=Math.sin(angle),stepX=cos*view[10]/z,stepY=-sin*view[11]/z,qPreset={...p,__foundation:undefined,grainScale:p.grainScale*z};
  for(let n=start;n<end;n++){const c=commands[n];this.metrics.commands++;const b=commandBounds(c),corners=[[b.x0,b.y0],[b.x1,b.y0],[b.x1,b.y1],[b.x0,b.y1]].map(([x,y])=>toScreen(view,x,y)),xs=corners.map(q=>q.x),ys=corners.map(q=>q.y),x0=Math.max(plan.clip?.[0]??0,Math.floor(Math.min(...xs)*plan.scale)-2),y0=Math.max(plan.clip?.[1]??0,Math.floor(Math.min(...ys)*plan.scale)-2),x1=Math.min(plan.clip?.[2]??plan.width,Math.ceil(Math.max(...xs)*plan.scale)+2),y1=Math.min(plan.clip?.[3]??plan.height,Math.ceil(Math.max(...ys)*plan.scale)+2);
   const a=toScreen(view,c[0],c[1]),f=toScreen(view,c[16],c[17]),ax=a.x*plan.scale,ay=a.y*plan.scale,fx=f.x*plan.scale,fy=f.y*plan.scale,dx=ax-fx,dy=ay-fy,den=Math.max(1e-6,dx*dx+dy*dy),packed=Float64Array.from(c);packed[0]=ax;packed[1]=ay;packed[2]*=z;packed[4]=angle+Math.atan2(Math.sin(c[4])*view[11],Math.cos(c[4])*view[10]);packed[7]=0;
   for(let ty=Math.floor(y0/CELL);ty<Math.ceil(y1/CELL);ty++)for(let tx=Math.floor(x0/CELL);tx<Math.ceil(x1/CELL);tx++){const key=tx+','+ty,name=tail?'tail':'prefix',left=Math.max(x0,tx*CELL),right=Math.min(x1,(tx+1)*CELL),top=Math.max(y0,ty*CELL),bottom=Math.min(y1,(ty+1)*CELL);let tile=v.tiles.get(key),pixels=tile?.[name],changed=false;const union=p.__foundation.coverageUnion||continuous(p),ceiling=c[5]*c[6];
    if(union&&(tail?Math.max(tile?.prefixLowerBound??0,tile?.tailLowerBound??0):tile?.prefixLowerBound??0)>=ceiling){this.metrics.skippedRasterPixels+=(right-left)*(bottom-top);yield;continue;}
    const corners=[[tx*CELL+.5,ty*CELL+.5],[(tx+1)*CELL-.5,ty*CELL+.5],[tx*CELL+.5,(ty+1)*CELL-.5],[(tx+1)*CELL-.5,(ty+1)*CELL-.5]],full=union&&!c[7]&&c[19]===1&&left===tx*CELL&&right===(tx+1)*CELL&&top===ty*CELL&&bottom===(ty+1)*CELL&&corners.every(([x,y])=>{const doc=toDocument(view,x/plan.scale,y/plan.scale),t=clamp(((x-fx)*dx+(y-fy)*dy)/den),radius=(c[18]+(c[2]/2-c[18])*t)*z;return doc.x>=0&&doc.y>=0&&doc.x<view[4]&&doc.y<view[5]&&Math.hypot(x-fx-dx*t,y-fy-dy*t)<=radius-.5;});
    for(let y=top;y<bottom;y++){const row=toDocument(view,(left+.5)/plan.scale,(y+.5)/plan.scale);let docX=row.x,docY=row.y;
     for(let x=left;x<right;x++,docX+=stepX,docY+=stepY){if(docX<0||docY<0||docX>=view[4]||docY>=view[5])continue;this.metrics.rasterPixels++;let k;
      if(plan.sampling==='document-analytic')k=c[19]===1?capsuleCoverage(c,docX,docY):c[19]===2?sweptCoverage(c,docX,docY,p):referenceCoverage(c,docX,docY,p);
      else if(c[19]>0){const t=clamp(((x+.5-fx)*dx+(y+.5-fy)*dy)/den),r=(c[18]+(c[2]/2-c[18])*t)*z,px=x+.5-fx-dx*t,py=y+.5-fy-dy*t,d=Math.sqrt(px*px+py*py),h=r*(c[19]===1?1:p.hardness);k=r<.5?thinCoverage(r,d):c[19]===1?clamp(r+.5-d):d<=h?1:clamp((r+.5-d)/Math.max(.5,r-h));}
      else k=referenceCoverage(packed,x+.5,y+.5,qPreset);
      if(plan.sampling!=='document-analytic'&&c[7]&&k)k*=textureFactor(c,docX,docY,p);if(!k)continue;
      if(!tile){tile={prefix:null,tail:null};v.tiles.set(key,tile);if(!v.private){let ids=this.cells.get(key);if(!ids)this.cells.set(key,ids=new Set);ids.add(v.id);}}if(!pixels){const bytes=CELL*CELL*16;if(this.allocatedBytes+this.preparedBytes+bytes>MAX_BYTES)throw Error('Overlay memory pressure; exact GPU feedback retained');pixels=tile[name]=new Float32Array(CELL*CELL*4);this.allocatedBytes+=bytes;v.bytes=(v.bytes??0)+bytes;}const i=((y%CELL)*CELL+x%CELL)*4;accumulate(pixels,i,c,k,p);changed=true;
     }
     if((y-top)%4===3)yield;
    }if(changed){if(full){const name=tail?'tailLowerBound':'prefixLowerBound';tile[name]=Math.max(tile[name]??0,ceiling);}v.dirty.add(key);if(!v.private&&!v.work)this.dirty.add(key);if(tail)v.tailKeys.add(key);}yield;
   }
   // Offscreen commands also form cooperative boundaries; a long invisible
   // prefix must not run to completion inside one generator step.
   yield;
  }
 }

 composedCell(key,only=null,override=null){const image=new ImageData(CELL,CELL),layers=[...(only??this.cells.get(key)??[])].sort((a,b)=>a-b).map(id=>{const v=override??this.states.get(id),t=v?.tiles.get(key);return t?{a:t.prefix,b:t.tail,union:v.preset.__foundation.coverageUnion||continuous(v.preset),opacity:v.preset.__foundation.material?v.preset.__foundation.opacity:1}:null;}).filter(Boolean);
  for(let i=0;i<image.data.length;i+=4){let r=0,g=0,b=0,a=0;for(const v of layers){const ba=v.b?.[i+3]??0,invTail=1-ba,opacity=v.opacity,alpha=(v.union?Math.max(v.a?.[i+3]??0,ba):ba+(v.a?.[i+3]??0)*invTail)*opacity,inv=1-alpha;
   r=(v.union?Math.max(v.a?.[i]??0,v.b?.[i]??0):(v.b?.[i]??0)+(v.a?.[i]??0)*invTail)*opacity+r*inv;
   g=(v.union?Math.max(v.a?.[i+1]??0,v.b?.[i+1]??0):(v.b?.[i+1]??0)+(v.a?.[i+1]??0)*invTail)*opacity+g*inv;
   b=(v.union?Math.max(v.a?.[i+2]??0,v.b?.[i+2]??0):(v.b?.[i+2]??0)+(v.a?.[i+2]??0)*invTail)*opacity+b*inv;a=alpha+a*inv;
  }if(a){image.data[i]=Math.round(clamp(r/a)*255);image.data[i+1]=Math.round(clamp(g/a)*255);image.data[i+2]=Math.round(clamp(b/a)*255);image.data[i+3]=Math.round(clamp(a)*255);if(!image.data[i+3])image.data[i]=image.data[i+1]=image.data[i+2]=0;}}return {key,image};}

 bounds(){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const v of this.states.values()){const scale=(v.plan??this.plan).scale,affine=viewAffine(v.view??this.view,this.view),[a,b,c,d,e,f]=affine;for(const key of v.tiles.keys()){const [tx,ty]=key.split(',').map(Number);for(const x of [tx*CELL/scale,(tx+1)*CELL/scale])for(const y of [ty*CELL/scale,(ty+1)*CELL/scale]){const xx=a*x+c*y+e,yy=b*x+d*y+f;x0=Math.min(x0,xx);y0=Math.min(y0,yy);x1=Math.max(x1,xx);y1=Math.max(y1,yy);}}}return x0===Infinity?null:[Math.max(0,x0),Math.max(0,y0),Math.min(this.view[2],x1),Math.min(this.view[3],y1)];}
 // Each pending stroke owns its bitmap. Growing/removing the preceding long
 // stroke never clears or recomposes a newer stroke's image.
 present(start,tips=[]){if(!this.ready||this.disposed||!this.dirty.size)return;this.dirty.clear();let updatedPixels=0,changed=false;
  for(const v of [...this.states.values()].filter(v=>!v.work&&v.coherent!==false).sort((a,b)=>Number(!!a.last?.finished)-Number(!!b.last?.finished))){if(!v.dirty.size)continue;const plan=v.plan??this.plan,view=v.view??this.view;const keys=[...v.tiles.keys()];if(!keys.length)continue;let x0=Infinity,y0=Infinity,x1=0,y1=0;for(const key of keys){const [x,y]=key.split(',').map(Number);x0=Math.min(x0,x*CELL);y0=Math.min(y0,y*CELL);x1=Math.max(x1,(x+1)*CELL);y1=Math.max(y1,(y+1)*CELL);}const bounds=[Math.max(0,x0/plan.scale),Math.max(0,y0/plan.scale),Math.min(view[2],x1/plan.scale),Math.min(view[3],y1/plan.scale)],sink=this.sink.forStroke?.(v.id)??this.sink,resized=sink.configure(plan,bounds);if(resized)for(const key of keys)v.dirty.add(key);const dirty=[...v.dirty];v.dirty.clear();const cells=dirty.map(key=>v.prepared?.get(key)??this.composedCell(key,[v.id]));sink.draw(plan,[],[],cells);const choice=this.policy.choices.get(v.id);if(choice)choice.cpuHasPresented=true;sink.reproject?.(view,this.view);updatedPixels+=dirty.length*CELL*CELL;changed=true;if(v.prepared){this.preparedBytes-=v.prepared.size*CELL*CELL*4;delete v.prepared;}}
  if(!changed)return;this.generation++;const end=performance.now();this.metrics.updates++;this.metrics.updatedPixels+=updatedPixels;this.metrics.peakPixels=Math.max(this.metrics.peakPixels,(this.sink?.pixels??0));this.metrics.peakBytes=Math.max(this.metrics.peakBytes,this.allocatedBytes+this.preparedBytes+(this.sink?.pixels??0)*4);this.metrics.maxCpuMs=Math.max(this.metrics.maxCpuMs,end-start);for(const t of tips)if(!t.finished)this.policy.observe(t.id,'cpu',{latency:Math.max(0,end-t.inputAt),cpuMs:end-start,bytes:this.allocatedBytes});if(this.measure)for(const t of tips){this.metrics.samples.push({...t,at:end,cpuMs:end-start,inputToUploadMs:Math.max(0,end-t.inputAt),updatedPixels,proxyPixels:(this.sink?.pixels??0),visibleArea:this.plan.visibleArea,viewEpoch:this.epoch,generation:this.generation});if(this.metrics.samples.length>3000)this.metrics.samples.shift();}
 }
 discardFinalization(id){const job=this.finalizations.get(id);if(!job)return;this.allocatedBytes-=job.v.bytes??0;this.preparedBytes-=(job.v.prepared?.size??0)*CELL*CELL*4;this.finalizations.delete(id);this.metrics.obsoleteFinalizations++;}
 queueFinalization(state,old){old.finalState=state;this.discardFinalization(state.id);if(this.navigationActive)return;const v={id:state.id,preset:state.preset,surfaceKey:state.surfaceKey,view:(previewPlan(this.view,state.preset,this.ratio).rasterView??this.view).slice(),plan:previewPlan(this.view,state.preset,this.ratio),tiles:new Map,tailKeys:new Set,dirty:new Set,cursor:state.stableEnd??state.stableSource.length,last:state,private:true,prepared:new Map};const steps=this.finalizeWork(v,state,old);this.finalizations.set(state.id,{v,state,steps,epoch:this.epoch});this.scheduleFinalizations();}
 *finalizeWork(v,state,old){yield* this.rasterWork(v,state.stableSource??[],0,state.stableEnd??state.stableSource.length,false);yield* this.rasterWork(v,state.commands??[],0,(state.commands??[]).length,true);for(const key of new Set([...old.tiles.keys(),...v.tiles.keys()])){v.prepared.set(key,this.composedCell(key,[v.id],v));this.preparedBytes+=CELL*CELL*4;v.dirty.add(key);yield;}}
 scheduleFinalizations(){if(this.finalizationScheduled||!this.finalizations.size||this.disposed)return;this.finalizationScheduled=true;const run=()=>{this.finalizationScheduled=false;if(this.disposed||!this.finalizations.size)return;const start=performance.now(),job=this.finalizations.values().next().value;try{let step;do{step=job.steps.next();}while(!step.done&&performance.now()-start<3);this.metrics.backgroundSlices++;this.metrics.peakBytes=Math.max(this.metrics.peakBytes,this.allocatedBytes+this.preparedBytes+(this.sink?.pixels??0)*4);this.metrics.maxBackgroundMs=Math.max(this.metrics.maxBackgroundMs,performance.now()-start);if(step.done&&job.epoch===this.epoch&&this.finalizations.get(job.v.id)===job){this.finalizations.delete(job.v.id);this.removeState(job.v.id,true);job.v.private=false;this.states.set(job.v.id,job.v);for(const key of job.v.tiles.keys()){let ids=this.cells.get(key);if(!ids)this.cells.set(key,ids=new Set);ids.add(job.v.id);}this.footprints.set(job.v.id,new Set(job.v.tiles.keys()));for(const key of job.v.dirty)this.dirty.add(key);this.metrics.finalizationSwaps++;this.present(performance.now(),[{id:job.v.id,inputAt:job.state.inputTip?.t??performance.now(),finished:true}]);}}catch(error){this.discardFinalization(job.v.id);this.error=String(error);this.fallback=true;this.metrics.fallbacks++;}this.scheduleFinalizations();};if(globalThis.scheduler?.postTask)globalThis.scheduler.postTask(run,{priority:'background'}).catch(error=>{this.error=String(error);});else setTimeout(run,0);}
 removeState(id,keepSink=false){this.discardFinalization(id);if(!keepSink)this.policy.forget(id);const v=this.states.get(id);if(v){v.work=null;if(v.prepared)this.preparedBytes-=v.prepared.size*CELL*CELL*4;for(const [key,tile]of v.tiles){this.allocatedBytes-=(tile.prefix?.byteLength??0)+(tile.tail?.byteLength??0);this.cells.get(key)?.delete(id);if(!this.cells.get(key)?.size)this.cells.delete(key);}this.states.delete(id);}if(!keepSink)this.sink?.retireStroke?.(id);this.pending.delete(id);this.footprints.delete(id);}
 presented(id,epoch=this.epoch){if(epoch!==this.epoch)return;this.removeState(id);this.metrics.retirements++;}
 cancel(id){this.removeState(id);}

 async protect(){if(this.guards.length||!this.cells.size)return true;const epoch=this.epoch,guardGeneration=this.guardGeneration,plan={...this.plan,polygon:this.plan.screenPolygon??this.plan.polygon},source=this.backend.canvas,bounds=this.bounds();if(!bounds)return true;
  // A cropped, full-DPR snapshot is a SHORT-LIVED transition guard, not a
  // historical proxy base. It prevents transparent feedback double-painting
  // while the independently owned GPU canvas publishes its exact result.
  const x=Math.max(0,Math.floor(Math.floor(bounds[0])*plan.density)),y=Math.max(0,Math.floor(Math.floor(bounds[1])*plan.density)),w=Math.min(source.width-x,Math.ceil(Math.ceil(bounds[2])*plan.density)-x),h=Math.min(source.height-y,Math.ceil(Math.ceil(bounds[3])*plan.density)-y);if(w<=0||h<=0)return true;
  const started=performance.now(),bitmap=await transitionSnapshot(this.backend,x,y,w,h);if(this.disposed||epoch!==this.epoch||guardGeneration!==this.guardGeneration){bitmap.close();return false;}this.guards=[{bitmap,x:x/plan.density,y:y/plan.density,width:w,height:h,density:plan.density,view:this.view.slice()}];this.metrics.guardCaptures++;this.metrics.guardPixels+=w*h;this.metrics.guardCaptureMs+=performance.now()-started;this.metrics.peakBytes=Math.max(this.metrics.peakBytes,this.allocatedBytes+(this.sink?.pixels??0)*4+w*h*12);this.sink.showGuard?.(plan,this.guards[0]);if(this.sink.showGuard){bitmap.close();this.guards[0].bitmap=null;}return true;
 }
 closeGuards(){this.guardGeneration++;for(const g of this.guards)g.bitmap?.close();this.guards=[];this.sink?.hideGuard?.();}
 fallbackPresented(submittedAt,epoch,fallbackRendered=false){if(epoch!==this.epoch)return;if(this.fallback&&fallbackRendered){this.closeGuards();this.clearRaster();this.pending.clear();return;}if(this.guards.length)this.closeGuards();}
 summary(){return {scope:'CPU stroke raster/upload and cropped transition snapshots; physical display/GPU execution unmeasured',kind:'stroke-only',transport:'2d',coupled:false,ready:this.ready,viewEpoch:this.epoch,generation:this.generation,...this.plan,polygon:undefined,screenPolygon:undefined,rasterView:undefined,selection:this.policy.summary(),pixels:(this.sink?.pixels??0),width:this.sink?.element?.width??0,height:this.sink?.element?.height??0,bytes:this.allocatedBytes+this.preparedBytes+(this.sink?.pixels??0)*4+this.guards.reduce((n,g)=>n+g.width*g.height*4,0),rasterByteBudget:MAX_BYTES,pendingStrokes:this.footprints.size,fallback:this.fallback,allocations:this.sink?.totalAllocations??this.sink?.allocations??0,pendingFinalizations:this.finalizations.size,...this.metrics,samples:this.measure?this.metrics.samples:[]};}
 destroy(){this.disposed=true;this.epoch++;this.closeGuards();this.clearRaster();this.pending.clear();this.sink?.destroy();}
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
