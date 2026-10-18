import {HistoryArchive,HISTORY_BYTES,historyYield,newHistoryImage,copyHistoryImage,releaseHistoryImage,readHistoryImages,uploadHistoryImage} from '@rt/history-io';

const qualified=(surface,key)=>surface+'\u0000'+key;
/** Immutable, shared tile versions. A patch owns only changed tiles; its before
 * version is the previous patch's after version. GPU eviction never deletes a
 * patch. Only an explicit archive failure may use the canonical recovery path. */
export class TileHistory {
 constructor(backend,options={}){
  this.backend=backend;this.archive=options.archive??new HistoryArchive(options);this.patches=new Map;this.current=new Map;this.versions=new Map;this.nextId=0;this.gpuBytes=0;this.peakGpuBytes=0;this.gpuBudget=options.gpuBudget??16*1024*1024;this.busy=false;this.closed=false;this.epoch=0;this.readbackBytes=0;
  this.metrics={copies:0,sharedBefore:0,spilled:0,hotTiles:0,coldTiles:0,emptyTiles:0,restores:0,recoveryFallbacks:0,storageErrors:0,maxSliceMs:0};
 }
 retain(v){if(v)v.refs++;return v;}
 release(v){if(!v||--v.refs>0)return;this.versions.delete(v.id);v.evict=true;this.evict(v);if(v.archived)this.archive.drop([v.id]);}
 snapshot(source,encoder){
  const gpu=newHistoryImage(this.backend);copyHistoryImage(this.backend,source,gpu,encoder);
  const v={id:++this.nextId,refs:0,gpu,archived:false,pins:0};this.versions.set(v.id,v);this.gpuBytes+=HISTORY_BYTES;this.peakGpuBytes=Math.max(this.peakGpuBytes,this.gpuBytes);this.metrics.copies++;return v;
 }
 state(t,v){return {version:v,committedId:t.committedId??-1,preset:t.preset,archiveId:this.backend.layered?undefined:this.backend.archiveIds.get(t.key)};}
 before(id,key,t,preset,encoder){
  if(this.backend.presentationHeld)return;
  let patch=this.patches.get(id);if(!patch)this.patches.set(id,patch={state:'applied',tiles:new Map});
  const q=qualified(t.surfaceKey,key);if(patch.tiles.has(q))return;
  let previous=this.current.get(q);
  if(!previous||previous.committedId!==(t.committedId??-1)){
   if(previous)this.release(previous.version);
   const v=t.uncommittedOwner===id?null:this.snapshot(t.layer[t.l],encoder);
   previous=this.state(t,this.retain(v));this.current.set(q,previous);
  }else this.metrics.sharedBefore++;
  patch.tiles.set(q,{surfaceKey:t.surfaceKey,key,before:{...previous,version:this.retain(previous.version)},after:null,afterPreset:preset});
 }
 after(id,key,t,encoder){
  const q=qualified(t.surfaceKey,key),p=this.patches.get(id)?.tiles.get(q);if(!p||p.after)return;
  const v=this.snapshot(t.layer[t.l],encoder);p.after=this.state(t,this.retain(v));
  this.release(this.current.get(q)?.version);this.current.set(q,{...p.after,version:this.retain(v)});
 }
 get pressure(){return this.gpuBytes>this.gpuBudget+8*HISTORY_BYTES;}
 schedule(){if(this.closed||this.busy||this.maintenance)return;if(this.gpuBytes<=this.gpuBudget)return;
  this.maintenance=this.trim().catch(()=>{this.metrics.storageErrors++;}).finally(()=>{this.maintenance=null;});
 }
 async trim(){
  while(!this.closed&&!this.busy&&this.gpuBytes>this.gpuBudget){
   const victims=[...this.versions.values()].filter(v=>v.gpu&&!v.pins).slice(0,8);if(!victims.length)return;
   const epoch=this.epoch;for(const v of victims)v.pins++;
   try{
    const pending=victims.filter(v=>!v.archived);this.readbackBytes=pending.length*HISTORY_BYTES;
    const pixels=await readHistoryImages(this.backend,pending.map(v=>v.gpu));
    for(let i=0;i<pending.length;i++){if(this.busy)break;const v=pending[i];try{const result=await this.archive.put(v.id,pixels[i]);v.archived=result.available;v.archiveFailed=!result.available;this.metrics.spilled++;}catch{v.archiveFailed=true;this.metrics.storageErrors++;}}
    if(epoch!==this.epoch)return;
   }catch(error){for(const v of victims)v.archiveFailed=true;this.metrics.storageErrors++;
   }finally{this.readbackBytes=0;for(const v of victims){v.pins--;v.evict=!!(v.archived||v.archiveFailed||!v.refs);this.evict(v);if(!v.refs&&v.archived)this.archive.drop([v.id]);}}
   await historyYield();
  }
 }
 evict(v){if(v.gpu&&!v.pins&&v.evict){releaseHistoryImage(this.backend,v.gpu);this.gpuBytes-=HISTORY_BYTES;v.gpu=null;}}
 complete(plan){for(const v of plan?.pinned??[]){v.pins--;this.evict(v);}this.busy=false;}
 async plan(steps){
  const states=new Map,tiles=new Map;let slice=performance.now();
  for(const {id,direction}of steps){const patch=this.patches.get(id),state=states.get(id)??patch?.state;
   if(!patch||state!==(direction==='undo'?'applied':'undone'))return null;
   for(const [q,p]of patch.tiles){const target=direction==='undo'?p.before:p.after;if(!target||!p.after)return null;tiles.set(q,{...p,target});if(performance.now()-slice>6){await historyYield();slice=performance.now();}}
   states.set(id,direction==='undo'?'undone':'applied');
  }
  return {states,tiles};
 }
 /** Prepare in the unused document ping-pong slots. Neither the displayed
  * composite nor authoritative layer slots change until every read succeeds. */
 async prepare(steps){
  this.busy=true;const plan=await this.plan(steps);if(!plan){this.busy=false;return null;}
  plan.pinned=[...new Set([...plan.tiles.values()].map(p=>p.target.version).filter(v=>v?.gpu))];for(const v of plan.pinned)v.pins++;
  const staged=[];let complete=false,slice=performance.now();try{
   const entries=[];
   for(const [q,p]of plan.tiles){if(p.target.version)entries.push([q,p]);else{const t=this.backend.tiles.get(q);staged.push({q,t,state:p.target});this.metrics.emptyTiles++;}}
   for(let offset=0;offset<entries.length;offset+=8){
    const batch=entries.slice(offset,offset+8),cold=new Map;
    // Fetch and validate the whole small batch before issuing any GPU copies.
    const missing=batch.filter(([,p])=>p.target.version&&!p.target.version.gpu);
    if(missing.some(([,p])=>!p.target.version.archived)){this.metrics.recoveryFallbacks++;return null;}
    const loaded=!missing.length?[]:this.archive.getMany?await this.archive.getMany(missing.map(([,p])=>p.target.version.id)):await Promise.all(missing.map(([,p])=>this.archive.get(p.target.version.id)));
    for(let i=0;i<missing.length;i++){const [q,p]=missing[i],result=loaded[i];if(result.missing){p.target.version.archived=false;this.metrics.recoveryFallbacks++;return null;}cold.set(q,result.pixels);}
    if(missing.length)slice=performance.now(); // Worker I/O already admitted UI tasks.
    const b=this.backend,encoder=b.device?.createCommandEncoder(),start=performance.now();
    for(const [q,p]of batch){const t=b.tiles.get(q)??b.tile(p.key,p.surfaceKey),target=t.layer[1-t.l],v=p.target.version;
     if(v.gpu){copyHistoryImage(b,v.gpu,target,encoder);this.metrics.hotTiles++;}
     else{uploadHistoryImage(b,cold.get(q),target);this.metrics.coldTiles++;}
     staged.push({q,t,state:p.target});
    }
    if(encoder)b.device.queue.submit([encoder.finish()]);this.metrics.maxSliceMs=Math.max(this.metrics.maxSliceMs,performance.now()-start);if(performance.now()-slice>=4){await historyYield();slice=performance.now();}
   }
   complete=true;return {...plan,staged};
  }catch(error){this.metrics.storageErrors++;return null;}finally{if(!complete){if(this.backend.device)await this.backend.device.queue.onSubmittedWorkDone();this.complete(plan);}}
 }
 publish(plan){
  for(const {q,t,state}of plan.staged){
   if(!state.version){if(t){for(const image of t.layer)releaseHistoryImage(this.backend,image);if(t.stroke)for(const image of t.stroke)releaseHistoryImage(this.backend,image);this.backend.tiles.delete(q);}}
   else{t.l=1-t.l;t.committedId=state.committedId;t.preset=state.preset;t.active=null;}
   if(!this.backend.layered){const key=q.slice(q.indexOf('\u0000')+1);if(state.archiveId===undefined)this.backend.archiveIds.delete(key);else this.backend.archiveIds.set(key,state.archiveId);}
   this.release(this.current.get(q)?.version);this.current.set(q,{...state,version:this.retain(state.version)});
  }
  for(const [id,state]of plan.states)this.patches.get(id).state=state;this.metrics.restores++;
 }
 drop(ids){for(const id of ids){const patch=this.patches.get(id);if(!patch)continue;for(const p of patch.tiles.values()){this.release(p.before.version);this.release(p.after?.version);}this.patches.delete(id);}}
 invalidate(surface,keys){for(const key of keys){const q=qualified(surface,key),state=this.current.get(q);if(state)this.release(state.version);this.current.delete(q);}}
 clear(){this.epoch++;this.drop([...this.patches.keys()]);for(const state of this.current.values())this.release(state.version);this.current.clear();}
 summary(){return {...this.metrics,gpuBytes:this.gpuBytes,gpuBudget:this.gpuBudget,peakGpuBytes:this.peakGpuBytes,readbackBytes:this.readbackBytes,patches:this.patches.size,versions:this.versions.size,pressure:this.pressure,archive:this.archive.metrics};}
 destroy(){this.closed=true;this.clear();void Promise.resolve(this.maintenance).finally(()=>this.archive.destroy());}
}
