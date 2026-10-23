// CPU brush mathematics only. No formal renderer, viewport, GPU fence, or
// completion-driven lifetime is connected to this rasterizer.
import {StrokeOverlay} from '@rt/stroke-overlay';
import {CanonicalBuilder,forceFadePreviewCommands,taper} from '@rt/model';

export class PaperRaster extends StrokeOverlay {
 constructor(width,height,changed){
  const sink=new PaperCellSink;
  super({width,height,surfaceStack:[],previews:new Map},{sink,documentSpace:true,mode:'cpu',sliceMs:2});
  this.changed=changed;this.inputs=new Map;this.measure=true;
  // PreviewPolicy's CPU/GPU switching belongs to the old display, not this one.
  this.policy={choices:new Map,forget(){},observe(){},summary(){return {route:'cpu',mode:'cpu'};}};
 }
 canUse(){return true;}
 enqueue(state){
  if(state.id<=(this.retiredThrough??-1)||this.retiredIds?.has(state.id))return false;
  if(state.resetPreview&&this.finalizations.has(state.id))this.discardFinalization(state.id);
  this.pending.set(state.id,state);this.schedule();return true;
 }
 present(start,tips){
  const dirty=[...this.states.values()].filter(v=>!v.work&&v.coherent!==false&&v.dirty.size).map(v=>v.id);
  super.present(start,tips);for(const id of dirty)this.changed(id);
 }
 begin({id,preset,seed,context={},surfaceKey,density,seamless=false}){
  if(preset.format==='illustro-brush-preset'&&preset.forceFade?.enabled&&context.forceFadeGeometry===undefined)context={...context,forceFadeGeometry:'adaptive-v1'};
  const builder=new CanonicalBuilder(preset,seed,0,context);
  this.inputs.set(id,{id,builder,surfaceKey,stableSource:[],seamless,copies:new Map});
  const w=this.backend.width,h=this.backend.height,d=Math.max(1/128,Math.min(1,density));
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
 adopted(id){this.retiredThrough=Math.max(this.retiredThrough??-1,Math.floor((id-1)/9)*9-1);this.retiredIds??=new Set;this.retiredIds.add(id);for(const key of this.retiredIds)if(key<=this.retiredThrough)this.retiredIds.delete(key);this.finishedInputs?.delete(id);this.inputs.delete(id);this.removeState(id);}
 drop(id){this.inputs.delete(id);this.finishedInputs?.delete(id);this.removeState(id);this.changed(id);}
}

// Sparse cells avoid a full document-sized rectangle for a long diagonal line.
// The float coverage budget is 64 MiB; these RGBA8 cells use at most one quarter
// of that coverage storage. No large per-stroke backing canvas is allocated.
class PaperCellSink {
 constructor(){this.layers=new Map;this.cells=new Map;this.allocations=0;}
 forStroke(id){let layer=this.layers.get(id);if(!layer)this.layers.set(id,layer=new PaperCellSink);return layer;}
 configure(plan,bounds){const changed=this.scale!==undefined&&this.scale!==plan.scale;if(changed)this.cells.clear();this.scale=plan.scale;this.rect=bounds;return changed;}
 draw(_plan,_rects,_guards,cells){for(const {key,image}of cells){let ink=false;for(let i=3;i<image.data.length;i+=4)if(image.data[i]){ink=true;break;}if(!ink){this.cells.delete(key);continue;}let c=this.cells.get(key);if(!c){c=new OffscreenCanvas(32,32);this.cells.set(key,c);this.allocations++;}c.getContext('2d').putImageData(image,0,0);}}
 reproject(){}
 updateOrigin(){}
 retireStroke(id){this.layers.get(id)?.destroy();this.layers.delete(id);}
 get pixels(){return this.cells.size*32*32+[...this.layers.values()].reduce((n,s)=>n+s.pixels,0);}
 get totalAllocations(){return this.allocations+[...this.layers.values()].reduce((n,s)=>n+s.totalAllocations,0);}
 hide(){this.layers.clear();this.cells.clear();}
 destroy(){this.hide();}
}
