// CPU brush mathematics only. No formal renderer, viewport, GPU fence, or
// completion-driven lifetime is connected to this rasterizer.
import {StrokeOverlay} from '@rt/stroke-overlay';
import {CanonicalBuilder,forceFadePreviewCommands,taper,commandBounds} from '@rt/model';

export class PaperRaster extends StrokeOverlay {
 constructor(width,height,changed){
  const sink=new PaperCellSink;
  super({width,height,surfaceStack:[],previews:new Map},{sink,documentSpace:true,mode:'cpu',sliceMs:2});
  this.changed=changed;this.inputs=new Map;this.measure=true;this.densityJobs=new Set;this.requestedDensity=0;this.densityUpgrades=0;this.densityDeferred=0;this.floatBytes=this.allocatedBytes;
  // The inherited allocator also accounts for retained RGBA and pinned frames.
  Object.defineProperty(this,'allocatedBytes',{configurable:true,enumerable:true,get:()=>this.floatBytes+this.sink.pixels*4+this.sink.snapshotBytes,set:value=>{this.floatBytes=Math.max(0,value-this.sink.pixels*4-this.sink.snapshotBytes);}});
  // PreviewPolicy's CPU/GPU switching belongs to the old display, not this one.
  this.policy={choices:new Map,forget(){},observe(){},summary(){return {route:'cpu',mode:'cpu'};}};
 }
 safeFlush(){super.safeFlush();if(this.error&&this.reportedError!==this.error){this.reportedError=this.error;this.onFault?.(this.error);}}
 presented(){throw Error('Formal completion cannot retire PaperRaster');}
 fallbackPresented(){throw Error('Formal fallback presentation is not a PaperRaster port');}
 setNavigationActive(value){if(value)throw Error('Navigation must not suspend PaperRaster');}
 canUse(){return true;}
 enqueue(state){
  if(state.id<=(this.retiredThrough??-1)||this.retiredIds?.has(state.id))return false;
  if(state.resetPreview&&this.finalizations.has(state.id))this.discardFinalization(state.id);
  this.pending.set(state.id,state);this.schedule();return true;
 }
 present(start,tips){
  const dirty=[...this.states.values()].filter(v=>!v.work&&v.coherent!==false&&v.dirty.size).map(v=>v.id);
  super.present(start,tips);for(const id of dirty){this.changed(id,true);const v=this.states.get(id);if(v?.last?.finished&&!v.work&&v.coherent!==false){this.floatBytes=Math.max(0,this.floatBytes-(v.bytes??0));v.bytes=0;for(const tile of v.tiles.values()){tile.prefix=null;tile.tail=null;}}}this.scheduleDensityUpgrade();
 }
 get residentBytes(){return this.allocatedBytes+this.preparedBytes;}
 queueFinalization(state,old){const saved=this.view;if(!this.refining)this.view=old.view;try{return super.queueFinalization(state,old);}finally{this.view=saved;}}
 refineDensity(density){this.requestedDensity=Math.max(1/128,Math.min(1,density));this.scheduleDensityUpgrade();}
 scheduleDensityUpgrade(){if(this.densityScheduled||!this.requestedDensity||this.disposed)return;this.densityScheduled=true;setTimeout(()=>{this.densityScheduled=false;this.upgradeDensity();},0);}
 estimateDensityBytes(state,density){
  const area=(commands,end=commands.length)=>{let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(let i=0;i<end;i++){const b=commandBounds(commands[i]);x0=Math.min(x0,b.x0);y0=Math.min(y0,b.y0);x1=Math.max(x1,b.x1);y1=Math.max(y1,b.y1);}if(x0===Infinity)return 0;const left=Math.max(0,Math.floor(x0*density/32)*32-32),top=Math.max(0,Math.floor(y0*density/32)*32-32),right=Math.min(this.backend.width*density,Math.ceil(x1*density/32)*32+32),bottom=Math.min(this.backend.height*density,Math.ceil(y1*density/32)*32+32);return Math.max(0,right-left)*Math.max(0,bottom-top);};
  const a=area(state.stableSource??[],state.stableEnd??state.stableSource?.length??0),b=area(state.commands??[]);return (a+b)*20;
 }
 upgradeDensity(){
  const density=this.requestedDensity;if(!density||!this.view)return;const w=this.backend.width,h=this.backend.height;
  this.setView(Float64Array.from([w*density,h*density,w,h,w,h,1,0,0,0,1,1,0,0,0,0]));
  for(const v of [...this.states.values()].sort((a,b)=>Number(!!a.last?.finished)-Number(!!b.last?.finished))){
   const state=v.finalState??this.pending.get(v.id)??v.last;if(!state||!(v.plan.scale<density*.99))continue;
   const finished=!!state.finished;if(finished&&this.finalizations.size)return;
   const bytes=this.estimateDensityBytes(state,density),current=this.residentBytes-(finished?0:v.bytes??0);
   if(current+bytes>64*1024*1024*.95){this.densityDeferred++;continue;}
   const next={...state,resetPreview:true};this.densityUpgrades++;
   if(finished){this.refining=true;try{this.queueFinalization(next,v);this.densityJobs.add(v.id);}finally{this.refining=false;}}
   else{this.removeState(v.id,true);this.enqueue(next);}
   return;
  }
 }
 begin({id,preset,seed,context={},surfaceKey,density,seamless=false}){
  for(const old of this.densityJobs)this.discardFinalization(old);this.densityJobs.clear();
  if(preset.format==='illustro-brush-preset'&&preset.forceFade?.enabled&&context.forceFadeGeometry===undefined)context={...context,forceFadeGeometry:'adaptive-v1'};
  const builder=new CanonicalBuilder(preset,seed,0,context);
  this.inputs.set(id,{id,builder,surfaceKey,stableSource:[],seamless,copies:new Map});
  const w=this.backend.width,h=this.backend.height,d=Math.max(1/128,Math.min(1,density));this.requestedDensity=d;
  this.setView(Float64Array.from([w*d,h*d,w,h,w,h,1,0,0,0,1,1,0,0,0,0]));
 }
 samples(id,samples){const a=this.inputs.get(id);if(!a)return;for(const sample of samples){a.builder.accept(sample);const ready=a.builder.ready();a.stableSource.push(...(forceFadePreviewCommands(ready,a.builder.p)??ready));}this.live(a);}
 live(a,finished=false){
  const b=a.builder,p=b.p,tail=b.commands.slice(b.published),commands=forceFadePreviewCommands(tail,p)??tail.map(c=>{const q=c.slice();q[2]*=taper(p,q[21],b.distance,finished);q[18]*=taper(p,q[22],b.distance,finished);return q;});
  this.enqueueCopies(a,{id:a.id,surfaceKey:a.surfaceKey,preset:p,stableSource:a.stableSource,stableEnd:a.stableSource.length,commands,finished});
 }
 end(id){const a=this.inputs.get(id);if(!a)return;const final=a.builder.finish();a.stableSource.push(...(forceFadePreviewCommands(final,a.builder.p)??final));this.live(a,true);this.finishedInputs??=new Map;this.finishedInputs.set(id,{id:a.id,seamless:a.seamless});this.inputs.delete(id);}
 final(id,record){
  if(id<=(this.retiredThrough??-1)||this.retiredIds?.has(id))return;
  const old=this.pending.get(id)??this.states.get(id)?.last;
  if(!old)return;
  const a=this.finishedInputs?.get(id);if(a)this.enqueueCopies({...a,copies:new Map},{...old,preset:record.preset,stableSource:record.commands,stableEnd:record.commands.length,commands:[],finished:true,resetPreview:true});else this.enqueue({...old,preset:record.preset,stableSource:record.commands,stableEnd:record.commands.length,commands:[],finished:true,resetPreview:true});
 }
 enqueueCopies(a,state){
  this.enqueue(state);if(!a.seamless)return;a.copies??=new Map;
  const w=this.backend.width,h=this.backend.height;
  for(const [dx,xi]of [[w,1],[-w,2],[0,0]])for(const [dy,yi]of [[h,1],[-h,2],[0,0]]){if(!dx&&!dy)continue;const id=a.id+xi*3+yi;let source=a.copies.get(id);if(!source)a.copies.set(id,source=[]);
   const translate=c=>{const q=c.slice();q[0]+=dx;q[1]+=dy;q[16]+=dx;q[17]+=dy;return q;};
   for(let i=source.length;i<state.stableEnd;i++)source.push(translate(state.stableSource[i]));
   this.enqueue({...state,id,stableSource:source,commands:state.commands.map(translate)});
  }
 }
 // Called exclusively by PaperDisplay after its frame was accepted on window.
 adopted(id){this.retiredThrough=Math.max(this.retiredThrough??-1,Math.floor((id-1)/9)*9-1);this.retiredIds??=new Set;this.retiredIds.add(id);for(const key of this.retiredIds)if(key<=this.retiredThrough)this.retiredIds.delete(key);this.finishedInputs?.delete(id);this.inputs.delete(id);this.removeState(id);this.densityJobs.delete(id);this.scheduleDensityUpgrade();if(!this.states.size){this.fallback=false;this.error=null;this.reportedError=null;this.onFault?.(null);this.schedule();}}
 drop(id){this.inputs.delete(id);this.finishedInputs?.delete(id);this.removeState(id);this.changed(id);}
}

// Sparse cells avoid a full document-sized rectangle for a long diagonal line.
// The float coverage budget is 64 MiB; these RGBA8 cells use at most one quarter
// of that coverage storage. No large per-stroke backing canvas is allocated.
class PaperCellSink {
 constructor(shared=null){this.shared=shared??{pins:new WeakMap,live:new WeakSet,heldBytes:0};this.layers=new Map;this.cells=new Map;this.changedPages=new Set;this.allocations=0;}
 forStroke(id){let layer=this.layers.get(id);if(!layer)this.layers.set(id,layer=new PaperCellSink(this.shared));return layer;}
 detach(canvas){if(!this.shared.live.has(canvas))return;this.shared.live.delete(canvas);if(this.shared.pins.has(canvas))this.shared.heldBytes+=32*32*4;}
 clearCells(){for(const canvas of this.cells.values())this.detach(canvas);this.cells.clear();}
 configure(plan,bounds){const changed=this.scale!==undefined&&this.scale!==plan.scale;if(changed){if(this.rect)this.mark(this.rect);this.clearCells();}this.scale=plan.scale;this.rect=bounds;return changed;}
 mark(rect){for(let y=Math.max(0,Math.floor(rect[1]/512));y<Math.ceil(rect[3]/512);y++)for(let x=Math.max(0,Math.floor(rect[0]/512));x<Math.ceil(rect[2]/512);x++)this.changedPages.add(x+','+y);}
 draw(_plan,_rects,_guards,cells){for(const {key,image}of cells){const [x,y]=key.split(',').map(Number);this.mark([x*32/this.scale,y*32/this.scale,(x+1)*32/this.scale,(y+1)*32/this.scale]);let ink=false;for(let i=3;i<image.data.length;i+=4)if(image.data[i]){ink=true;break;}let c=this.cells.get(key);if(!ink){if(c)this.detach(c);this.cells.delete(key);continue;}if(!c||this.shared.pins.has(c)){if(c)this.detach(c);c=new OffscreenCanvas(32,32);this.shared.live.add(c);this.cells.set(key,c);this.allocations++;}c.getContext('2d',{willReadFrequently:true}).putImageData(image,0,0);}}
 snapshot(){const layers=new Map,canvases=[];for(const [id,layer]of this.layers){const cells=new Map(layer.cells);layers.set(id,{scale:layer.scale,rect:layer.rect?.slice(),cells});for(const canvas of cells.values()){this.shared.pins.set(canvas,(this.shared.pins.get(canvas)??0)+1);canvases.push(canvas);}}let released=false;return {layers,release:()=>{if(released)return;released=true;for(const canvas of canvases){const n=this.shared.pins.get(canvas);if(n>1)this.shared.pins.set(canvas,n-1);else{this.shared.pins.delete(canvas);if(!this.shared.live.has(canvas))this.shared.heldBytes-=32*32*4;}}}};}
 reproject(){}
 updateOrigin(){}
 retireStroke(id){this.layers.get(id)?.destroy();this.layers.delete(id);}
 get snapshotBytes(){return this.shared.heldBytes;}
 get pixels(){return this.cells.size*32*32+[...this.layers.values()].reduce((n,s)=>n+s.pixels,0);}
 get totalAllocations(){return this.allocations+[...this.layers.values()].reduce((n,s)=>n+s.totalAllocations,0);}
 hide(){for(const layer of this.layers.values())layer.destroy();this.layers.clear();this.clearCells();}
 destroy(){this.hide();}
}
