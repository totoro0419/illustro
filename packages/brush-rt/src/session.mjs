import {foundationDabs,predictFoundation,cursorState,geometryContext} from '@rt/foundation';
import {CanonicalBuilder,Stabilizer,predict,taper,continuous,limitFoundationDiameter,forceFadePreviewCommands,LatestMailbox,validateRecord,keysFor,STRIDE} from '@rt/model';
import {makeDab} from '@legacy/dynamics';
// A predicted stamp is emitted only when the next spatial/time deposit is due.
// The builder, random index and all canonical input remain unchanged.
export function predictedCommand(b,q){
 const prev=b.geometry.at(-1),p=b.p;if(!prev||!q)return null;
 const dx=q.x-prev.x,dy=q.y-prev.y,len=Math.hypot(dx,dy),dt=q.t-prev.t,solid=continuous(p),sweep=!!p.__foundation?.coverageUnion,segment=solid||sweep;
 const needed=Math.max(0,Math.max(.25,b.spacing??p.size*p.spacing)-b.carry);
 const spatial=len>0?needed/len:Infinity,temporal=p.exposureMs>0&&dt>0?(b.nextExposure-prev.t)/dt:Infinity;
 const f=segment?1:Math.min(spatial,temporal);if(!Number.isFinite(f)||f<0||f>1)return null;
 const sample={...q,x:prev.x+dx*f,y:prev.y+dy*f,t:prev.t+dt*f},distance=b.distance+len*f;
 const dab=b.foundation?foundationDabs(sample,p,b.index,b.seed,distance,len/Math.max(.001,dt/1000),Math.atan2(dy,dx),sample.t-b.start).dabs[0]:makeDab(sample,p,b.index,b.seed,distance,len/Math.max(.001,dt/1000),Math.atan2(dy,dx),sample.t-b.start);if(b.foundation&&solid)dab[2]=limitFoundationDiameter(p,dab[2],b.lastRadius,len);const c=new Float64Array(STRIDE);c.set(dab);
 c[16]=segment?prev.x:dab[0];c[17]=segment?prev.y:dab[1];c[18]=segment?b.lastRadius:dab[2]/2;c[19]=solid?1:sweep?2:0;c[20]=sample.t;c[21]=distance;c[22]=b.foundation&&!solid?Math.atan2(dy,dx):b.distance;c[23]=dab[2]/2;const forced=forceFadePreviewCommands([c],p);return forced?.[0]??c;
}
export class RealtimeSession {
 constructor(renderer,workerUrl=new URL('./canonical.worker.mjs',import.meta.url)){this.renderer=renderer;this.worker=new Worker(workerUrl,{type:'module'});this.records=[];this.redoRecords=[];this.id=0;this.seedSequence=0;this.staged=new Map;this.cancelTail=Promise.resolve();this.pendingInputs=new Map;this.active=null;this.pending=[];this.resolvers=new Map;this.strokePresets=new Map;this.strokeSurfaces=new Map;this.cancelledIds=new Set;this.tileRecords=new Map;this.recordTiles=new WeakMap;this.recordSurfaces=new WeakMap;this.recordIds=new WeakMap;this.recordOrder=new WeakMap;this.nextRecordOrder=0;this.historyPatchHits=0;this.historyReplayFallbacks=0;this.fullDocumentRebuilds=0;this.fullReplayStrokes=0;this.cancelledStrokeCount=0;this.prediction=true;this.browserPredictions=0;this.rawAccepted=0;this.lastRaw=null;this.errors=[];this.worker.onmessage=({data:m})=>{if(this.cancelledIds.has(m.id))return;if(m.type==='commands'){const surfaceKey=this.strokeSurfaces.get(m.id)??'default';this.renderer.document.append(m.id,this.strokePresets.get(m.id),m.commands,null,surfaceKey);}else if(m.type==='record'){this.finishPreview(m.id,m.record);if(this.renderer.strokeHandoff){this.staged.set(m.id,m.record);this.recordIds.set(m.record,m.id);this.recordSurfaces.set(m.record,this.strokeSurfaces.get(m.id)??'default');this.strokePresets.delete(m.id);this.strokeSurfaces.delete(m.id);this.pendingInputs.delete(m.id);this.resolvers.get(m.id)?.resolve(m.record);this.resolvers.delete(m.id);return;}const surfaceKey=this.strokeSurfaces.get(m.id)??'default',keys=this.renderer.document.end(m.id,m.record.preset,surfaceKey);this.records.push(m.record);this.recordIds.set(m.record,m.id);this.recordSurfaces.set(m.record,surfaceKey);this.indexRecord(m.record,keys,surfaceKey);this.strokePresets.delete(m.id);this.strokeSurfaces.delete(m.id);this.resolvers.get(m.id)?.resolve(m.record);this.resolvers.delete(m.id);}else if(m.type==='error'){this.pendingInputs.delete(m.id);this.errors.push(m.message);this.resolvers.get(m.id)?.reject(Error(m.message));this.resolvers.delete(m.id);}};this.worker.onerror=event=>{const error=Error(event.message||'Canonical worker failed');this.errors.push(error.message);for(const resolver of this.resolvers.values())resolver.reject(error);this.resolvers.clear();};}
 indexRecord(record,keys,surfaceKey='default'){const unique=[...new Set(keys)];this.recordTiles.set(record,unique);this.recordSurfaces.set(record,surfaceKey);if(!this.recordOrder.has(record))this.recordOrder.set(record,++this.nextRecordOrder);for(const key of unique){const qualified=surfaceKey+'\u0000'+key;let records=this.tileRecords.get(qualified);if(!records)this.tileRecords.set(qualified,records=[]);if(records.at(-1)!==record)records.push(record);}}
 unindexRecord(record){const keys=this.recordTiles.get(record),surfaceKey=this.recordSurfaces.get(record)??'default';if(!keys)throw Error('derived record index missing');for(const key of keys){const qualified=surfaceKey+'\u0000'+key,records=this.tileRecords.get(qualified),index=records?.lastIndexOf(record)??-1;if(index<0)throw Error('derived record index mismatch');records.splice(index,1);if(!records.length)this.tileRecords.delete(qualified);}}
 reindexRecord(record){const keys=this.recordTiles.get(record),surfaceKey=this.recordSurfaces.get(record)??'default';if(!keys)throw Error('derived record index missing');for(const key of keys){const qualified=surfaceKey+'\u0000'+key;let records=this.tileRecords.get(qualified);if(!records)this.tileRecords.set(qualified,records=[]);if(records.includes(record))throw Error('derived record already active');records.push(record);}}
 recordsForKeys(keys,surfaceKey='default'){const wanted=new Set;for(const key of keys)for(const record of this.tileRecords.get(surfaceKey+'\u0000'+key)??[])wanted.add(record);return [...wanted].sort((a,b)=>(this.recordOrder.get(a)??0)-(this.recordOrder.get(b)??0));}
 presetForRecord(r){return {...r.preset,__legacyStarAa:r.engine==='illustro-rt-2.4'};}
 begin(p,fast=0,context={},surfaceKey='default'){if(context.forceFadeGeometry==='legacy'){const {forceFadeGeometry,...legacy}=context;context=legacy;}else if(p.format==='illustro-brush-preset'&&p.forceFade?.enabled&&context.forceFadeGeometry===undefined)context={...context,forceFadeGeometry:'adaptive-v1'};if(this.active)throw Error('stroke already active');if(typeof surfaceKey!=='string'||!surfaceKey)throw Error('invalid stroke surface');this.renderer.proxy?.prepare(p);const id=this.renderer.strokeHandoff?this.id+1:++this.id;if(this.renderer.strokeHandoff)this.id+=9;const seed=[0x12345678,this.renderer.strokeHandoff?++this.seedSequence:id>>>0],builder=new CanonicalBuilder(p,seed,fast,context);this.active={id,surfaceKey,preset:builder.p,seed,fast:builder.fast,builder,stableSource:[],points:[],raw:[],distance:0,start:0,predicted:[]};this.strokePresets.set(id,this.active.preset);this.strokeSurfaces.set(id,surfaceKey);this.pending=[];this.worker.postMessage({type:'begin',id,preset:p,seed,fast,context,deferCommands:!!this.renderer.strokeHandoff});return id;}
 accept(s,notify=true){const a=this.active;if(!a||s.predicted)return;const last=a.raw.at(-1);if(last&&s.t<last.t)return;if(last&&s.t===last.t&&['x','y','pressure','pointerType','tilt','azimuth','twist'].every(k=>s[k]===last[k]))return;a.builder.accept(s);const q=a.builder.geometry.at(-1),prev=a.points.at(-1);const ready=a.builder.ready(),forcePreview=forceFadePreviewCommands(ready,a.preset);for(const c of forcePreview??ready)a.stableSource.push(c);if(prev)a.distance+=Math.hypot(q.x-prev.x,q.y-prev.y);else a.start=q.t;a.raw.push({...s});a.points.push(q);if(a.points.length>500000)throw Error('input retention limit');this.pending.push({...s});this.rawAccepted++;this.lastRaw=s;if(notify)this.updateLive(performance.now());}
 predictions(samples){if(!this.active)return;this.active.predicted=samples;this.browserPredictions+=samples.length;if(this.renderer.backend?.immediatePreview&&this.prediction&&this.active.preset?.__foundation?.preset?.prediction?.enabled)this.updateLive(performance.now());}
 flush(){if(this.pending.length&&this.active){this.worker.postMessage({type:'samples',id:this.active.id,samples:this.pending});this.pending=[];}}
 // Actual input already publishes its complete current appearance in accept().
 // Only a time-dependent prediction needs a new notification between inputs.
 // Preserve WebGL2 and legacy publication cadence.
 frame(now){this.flush();const a=this.active;if(!this.renderer.backend?.immediatePreview||!a?.builder.foundation||this.prediction&&a.preset.__foundation.preset.prediction.enabled)this.updateLive(now);return this.renderer.frame(now);}
 updateLive(now,finished=false,resetPreview=false){const a=this.active;if(!a)return;const b=a.builder,p=a.preset;
  // Forced release is an endpoint effect. While the pen is down, show only pressure-driven geometry.
  // finish() applies the forced release taper to the reserved tail after pointer-up.
  const total=b.distance,sourceTail=b.commands.slice(b.published),forcedTail=forceFadePreviewCommands(sourceTail,p),tail=forcedTail??sourceTail.map(c=>{const d=c.slice();d[2]*=taper(p,d[21],total,finished);d[18]*=taper(p,d[22],total,finished);return d;});
  const q=this.prediction&&!finished?(b.foundation?predictFoundation(a.points.slice(-3),now,a.predicted,p):predict(a.points.slice(-3),now,a.predicted)):null;
  const predicted=predictedCommand(b,q);if(predicted)tail.push(predicted);
  const inputTip=a.points.at(-1),actual=b.commands.at(-1),drawn=predicted??actual;
  const tip=actual?{...inputTip,x:actual[0],y:actual[1],t:predicted?inputTip.t:actual[20]}:inputTip;
  const previewTip=drawn?{...tip,x:drawn[0],y:drawn[1]}:tip;
  this.renderer.setLive({id:a.id,surfaceKey:a.surfaceKey,preset:p,stableSource:a.stableSource,stableEnd:a.stableSource.length,commands:tail,tip,inputTip,previewTip,predicted:!!predicted,rawTip:a.raw.at(-1),finished,resetPreview});
 }

 // The canonical worker owns the complete final record. Do not regenerate and
 // copy that same long Force Fade record on the pointerup task as well.
 finishPreview(id,record){if(this.renderer.hiddenStrokeIds?.has(id))return;if(!this.renderer.strokeHandoff||!record.preset.__foundation?.preset.forceFade?.enabled)return;const old=this.renderer.previewStates.get(id);if(!old)return;const state={...old,stableSource:record.commands,stableEnd:record.commands.length,commands:[],finished:true,resetPreview:true};this.renderer.previewStates.set(id,state);if(this.renderer.proxy?.enqueue(state))this.renderer.backend.overlayHoldIds.add(id);this.renderer.needsFrame=true;this.renderer.requestWork();}
 end(release=null){const a=this.active;if(!a)return Promise.resolve(null);this.flush();const finalized=a.builder.finish(),forceFade=!!a.builder.p.__foundation?.preset.forceFade?.enabled;
  if(forceFade&&!this.renderer.strokeHandoff){const commands=a.builder.record().commands.map(c=>Float64Array.from(c));a.stableSource.length=0;for(const c of commands)a.stableSource.push(c);a.builder.published=a.builder.commands.length;}
  else for(const c of forceFade?forceFadePreviewCommands(finalized,a.preset):finalized)a.stableSource.push(c);
  this.updateLive(performance.now(),true,forceFade&&!this.renderer.strokeHandoff);if(!this.renderer.strokeHandoff)this.renderer.markEnded(a.id);this.pendingInputs.set(a.id,a.raw.length);this.worker.postMessage({type:'end',id:a.id,release});this.active=null;const promise=new Promise((resolve,reject)=>{this.resolvers.set(a.id,{resolve,reject});});this.resolvers.get(a.id).promise=promise;return promise.then(record=>{this.renderer.needsFrame=true;return record;});}

 // Gesture handoff/pointer cancellation discards only unfinished coverage.
 // Completed layer pixels and the formal record/redo indexes remain authoritative.
 async cancel(){if(!this.active)return;const id=this.active.id;this.cancelledIds.add(id);this.worker.postMessage({type:'cancel',id});this.strokePresets.delete(id);this.strokeSurfaces.delete(id);this.active=null;this.pending=[];this.cancelledStrokeCount++;await this.queueCancel(id);}
 queueCancel(id){const promise=this.cancelTail.then(()=>this.renderer.cancelStroke(id));this.cancelTail=promise.catch(()=>{});return promise;}
 get pendingRawCount(){let count=0;for(const n of this.pendingInputs.values())count+=n;return count;}
 async discardUncommitted(record){const id=this.recordIds.get(record);if(id===undefined||!this.staged.delete(id))throw Error('Uncommitted record missing');await this.queueCancel(id);}
 // Parked entries have no authoritative GPU work. Their worker record remains
 // in staged until Redo, or is explicitly forgotten when a new edit branches.
 forgetStaged(record){const id=this.recordIds.get(record);if(id===undefined)return;this.staged.delete(id);this.renderer.forgetStrokePreview(id);this.recordIds.delete(record);}
 commitUndoneRecord(record,additional=[],surfaceKey='default'){
  const id=this.recordIds.get(record);if(id===undefined||this.staged.get(id)!==record)throw Error('Stroke was not staged');
  const group=[];for(const [index,item]of [record,...additional].entries()){
   let current=id;if(index){const dx=item.commands[0][0]-record.commands[0][0],dy=item.commands[0][1]-record.commands[0][1];current=id+(dx===0?0:dx>0?3:6)+(dy===0?0:dy>0?1:2);}
   const keys=new Set;for(const c of item.commands)for(const key of keysFor(c,this.renderer.document.width,this.renderer.document.height))keys.add(key);if(!keys.size)continue;
   this.recordIds.set(item,current);this.recordSurfaces.set(item,surfaceKey);this.indexRecord(item,keys,surfaceKey);this.unindexRecord(item);group.push(item);
   const h=this.renderer.backend.imageHistory;if(h){h.interrupt(current);h.patches.get(current).state='undone';}
  }this.redoRecords.push(...group.reverse());this.staged.delete(id);
 }
 // The Core transaction owns authority. Formal GPU work is enqueued only after it succeeds.
 commitRecord(record,additional=[],surfaceKey='default'){
  const id=this.recordIds.get(record);if(id===undefined||this.staged.get(id)!==record)throw Error('Stroke was not staged');
  const ids=[];for(const [index,item]of [record,...additional].entries()){
   let current=id;if(index){const dx=item.commands[0][0]-record.commands[0][0],dy=item.commands[0][1]-record.commands[0][1],x=dx===0?0:dx>0?1:2,y=dy===0?0:dy>0?1:2;current=id+x*3+y;}
   const preset=this.presetForRecord(item);this.renderer.document.append(current,preset,item.commands,null,surfaceKey);const keys=this.renderer.document.end(current,preset,surfaceKey);
   if(!keys.length)continue;this.recordIds.set(item,current);this.recordSurfaces.set(item,surfaceKey);this.records.push(item);this.indexRecord(item,keys,surfaceKey);this.renderer.markEnded(current);ids.push(current);
  }
  this.staged.delete(id);this.renderer.needsFrame=true;this.renderer.requestWork();return ids;
 }
 async appendSupplemental(records,surfaceKey='default'){
  if(this.active||this.resolvers.size)throw Error('finish active stroke before seamless copy');
  if(!Array.isArray(records)||records.length>8)throw Error('too many seamless copies');
  for(const record of records){validateRecord(record);const id=++this.id,preset=this.presetForRecord(record);
   this.recordSurfaces.set(record,surfaceKey);this.recordIds.set(record,id);
   this.renderer.document.append(id,preset,record.commands,null,surfaceKey);
   const keys=this.renderer.document.end(id,preset,surfaceKey);
   this.records.push(record);this.indexRecord(record,keys,surfaceKey);
  }
  await this.renderer.drain();
 }
 async rebuild(){try{this.fullDocumentRebuilds++;await this.renderer.reset();this.tileRecords.clear();for(const r of this.records){this.seedSequence=Math.max(this.seedSequence,r.seed?.[1]??0);this.fullReplayStrokes++;const id=++this.id,preset=this.presetForRecord(r),surfaceKey=this.recordSurfaces.get(r)??'default';this.recordIds.set(r,id);this.renderer.document.append(id,preset,r.commands,null,surfaceKey);const keys=this.renderer.document.end(id,preset,surfaceKey);this.indexRecord(r,keys,surfaceKey);}await this.renderer.drain();}finally{this.renderer.proxy?.invalidate();}}
 async rebuildDirty(keys,surfaceKey='default'){const records=this.recordsForKeys(keys,surfaceKey),entries=records.map(r=>({id:++this.id,preset:this.presetForRecord(r),commands:r.commands}));await this.renderer.rebuildTiles(keys,entries,surfaceKey);}
 async navigateDerived(steps){try{
  if(this.active)throw Error('Cannot navigate during active input');if(!steps.length){this.renderer.resumeHistory();await this.renderer.drain();return;}
  const records=[...this.records],redo=[...this.redoRecords],plans=[];
  for(const step of steps){const {direction,record,keys,surfaceKey}=step,source=direction==='undo'?records:redo,target=direction==='undo'?redo:records;
   if(source.at(-1)!==record)throw Error('Document/Renderer '+direction+' mismatch');if((this.recordSurfaces.get(record)??'default')!==surfaceKey)throw Error('Document/Renderer surface mismatch');if(!keys.length)throw Error('history dirty footprint missing');source.pop();target.push(record);plans.push({...step,id:this.recordIds.get(record)});
  }
  if(this.renderer.backend?.imageHistory){
   if(this.renderer.document.jobs.length)return await this.navigateImageHistory(plans,records,redo);
   // Fully deposited strokes keep the established PR35 path. Only unfinished
   // formal work needs interruption and partial before-image restoration.
   this.renderer.resumeHistory();await this.renderer.drain(false);if(this.renderer.strokeFrames.size||this.renderer.backend.overlayDirty?.size)await this.renderer.drain();
  }
  await this.renderer.prepareHistory();
  const pendingIds=new Set(this.renderer.document.jobs.map(j=>j.id)),pendingKeys=new Map,pendingEntries=[];
  for(const record of this.records)if(pendingIds.has(this.recordIds.get(record))){const surface=this.recordSurfaces.get(record)??'default',recordKeys=this.recordTiles.get(record)??[];pendingEntries.push({record,id:this.recordIds.get(record),surfaceKey:surface,keys:recordKeys});let keys=pendingKeys.get(surface);if(!keys)pendingKeys.set(surface,keys=new Set);for(const key of recordKeys)keys.add(key);}
  const retained=new Set(records),{discarded,baseReused}=this.renderer.discardPendingForHistory(pendingEntries,pendingEntries.every(p=>!retained.has(p.record)));
  this.records=records;this.redoRecords=redo;for(const p of plans){if(p.direction==='undo')this.unindexRecord(p.record);else this.reindexRecord(p.record);}
  // Core and the record index have visited every requested head in order. Only
  // the derived image can cancel adjacent inverse moves of the same record.
  const renderPlans=[];for(const p of baseReused?plans.filter(p=>!pendingIds.has(p.id)):plans){const last=renderPlans.at(-1);if(last?.record===p.record&&last.direction!==p.direction)renderPlans.pop();else renderPlans.push(p);}
  if(baseReused&&!renderPlans.length){await this.renderer.drain();return;}
  if((!discarded||baseReused)&&await this.renderer.applyHistory(renderPlans)){this.historyPatchHits+=renderPlans.length;return;}
  this.historyReplayFallbacks+=renderPlans.length;
  if(!discarded&&renderPlans.every(p=>p.direction==='redo')){
   // Redo is an exact suffix: reuse the completed base and evaluate only that suffix.
   for(const p of renderPlans){if(p.id!==undefined)this.renderer.dropHistory([p.id]);const id=++this.id,preset=this.presetForRecord(p.record);this.recordIds.set(p.record,id);this.renderer.document.append(id,preset,p.record.commands,null,p.surfaceKey);this.renderer.document.end(id,preset,p.surfaceKey);}await this.renderer.drain();return;
  }
  // A cold batch reconstructs each changed tile once at the final logical head.
  const groups=baseReused?new Map:pendingKeys;for(const p of renderPlans){let keys=groups.get(p.surfaceKey);if(!keys)groups.set(p.surfaceKey,keys=new Set);for(const key of p.keys)keys.add(key);}
  await this.renderer.rebuildTileGroups([...groups].map(([surfaceKey,keys])=>({surfaceKey,keys:[...keys],entries:this.recordsForKeys(keys,surfaceKey).map(record=>({id:++this.id,preset:this.presetForRecord(record),commands:record.commands}))})));
 }finally{this.renderer.refreshHistoryPreviews?.();}}
 async navigateImageHistory(plans,records,redo){
  const r=this.renderer,renderPlans=[];
  try{
  for(const p of plans){const last=renderPlans.at(-1);if(last?.record===p.record&&last.direction!==p.direction)renderPlans.pop();else renderPlans.push(p);}
  await r.prepareHistory();await r.discardImageHistoryPending(renderPlans);
  // Only retained strokes may finish. A removed suffix is already absent from
  // the queue, while its partial before images remain owned by TileHistory.
  if(r.document.jobs.length||r.strokeFrames.size||r.backend.overlayDirty?.size){r.resumeHistory();await r.drain();await r.prepareHistory();}
  this.records=records;this.redoRecords=redo;
  for(const p of plans){if(p.direction==='undo')this.unindexRecord(p.record);else this.reindexRecord(p.record);}
  if(await r.applyHistory(renderPlans)){this.historyPatchHits+=renderPlans.length;return;}
  this.historyReplayFallbacks+=renderPlans.length;
  if(renderPlans.every(p=>p.direction==='redo')){
   // An interrupted after image is intentionally incomplete. Redo recreates
   // that suffix from its unchanged canonical record, then caches full images.
   for(const p of renderPlans){if(p.id!==undefined)r.dropHistory([p.id]);const id=++this.id,preset=this.presetForRecord(p.record);this.recordIds.set(p.record,id);r.document.append(id,preset,p.record.commands,null,p.surfaceKey);r.document.end(id,preset,p.surfaceKey);}
   r.resumeHistory();await r.drain();return;
  }
  // Missing/failed lower-tier data and exceptional mixed navigation retain the
  // exact recovery path. No interrupted image is mistaken for a complete one.
  const groups=new Map;for(const p of renderPlans){let keys=groups.get(p.surfaceKey);if(!keys)groups.set(p.surfaceKey,keys=new Set);for(const key of p.keys)keys.add(key);}
  r.resumeHistory();await r.rebuildTileGroups([...groups].map(([surfaceKey,keys])=>({surfaceKey,keys:[...keys],entries:this.recordsForKeys(keys,surfaceKey).map(record=>({id:++this.id,preset:this.presetForRecord(record),commands:record.commands}))})));
  }finally{r.resumeHistory();}
 }
 async undoDerived(expected,keys,surfaceKey='default'){try{await this.settle();const record=this.records.at(-1);if(record!==expected)throw Error('Document/Renderer undo mismatch');if((this.recordSurfaces.get(record)??'default')!==surfaceKey)throw Error('Document/Renderer surface mismatch');if(!keys.length)throw Error('history dirty footprint missing');const id=this.recordIds.get(record);this.records.pop();this.redoRecords.push(record);this.unindexRecord(record);const hot=id!==undefined&&await this.renderer.undoCommit(id);if(hot)this.historyPatchHits++;else{this.historyReplayFallbacks++;await this.rebuildDirty(keys,surfaceKey);}}finally{this.renderer.proxy?.invalidate();}}
 async redoDerived(expected,keys,surfaceKey='default'){try{await this.settle();const record=this.redoRecords.at(-1);if(record!==expected)throw Error('Document/Renderer redo mismatch');if((this.recordSurfaces.get(record)??'default')!==surfaceKey)throw Error('Document/Renderer surface mismatch');if(!keys.length)throw Error('history dirty footprint missing');const id=this.recordIds.get(record);this.redoRecords.pop();this.records.push(record);this.reindexRecord(record);const hot=id!==undefined&&await this.renderer.redoCommit(id);if(hot)this.historyPatchHits++;else{this.historyReplayFallbacks++;await this.rebuildDirty(keys,surfaceKey);}}finally{this.renderer.proxy?.invalidate();}}
 async rollbackLatest(expected){try{await this.settle();const record=this.records.at(-1);if(record!==expected)throw Error('Renderer rollback mismatch');const keys=[...(this.recordTiles.get(record)??[])],surfaceKey=this.recordSurfaces.get(record)??'default',id=this.recordIds.get(record);this.records.pop();this.unindexRecord(record);const hot=id!==undefined&&await this.renderer.undoCommit(id);if(!hot&&keys.length)await this.rebuildDirty(keys,surfaceKey);if(id!==undefined)this.renderer.dropHistory([id]);}finally{this.renderer.proxy?.invalidate();}}
 discardRedo(){const ids=this.redoRecords.map(r=>this.recordIds.get(r)).filter(id=>id!==undefined);this.renderer.dropHistory(ids);this.redoRecords=[];}
 setSurfaceStack(surfaceKeys){this.renderer.setSurfaceStack(surfaceKeys);}
 async settle(){if(this.active)await this.end();await Promise.all([...this.resolvers.values()].map(r=>r.promise));}
 async undo(){await this.settle();if(this.records.length)this.redoRecords.push(this.records.pop());await this.rebuild();}
 async redo(){await this.settle();if(this.redoRecords.length)this.records.push(this.redoRecords.pop());await this.rebuild();}
 export(){if(this.active||this.resolvers.size)throw Error('finish active strokes before export');return {format:'illustro-rt-document-2',width:this.renderer.document.width,height:this.renderer.document.height,strokes:this.records};}
 async load(doc){await this.settle();if(doc.format!=='illustro-rt-document-2'||doc.width!==this.renderer.document.width||doc.height!==this.renderer.document.height||!Array.isArray(doc.strokes)||doc.strokes.length>10000)throw Error('unsupported document');const records=doc.strokes.map(validateRecord);this.records=records;this.redoRecords=[];await this.rebuild();}
 cursor(p,s,context={}){return cursorState(p,s,context);}
 async geometry(p,samples){this.begin(p,0,geometryContext(samples));for(const sample of samples)this.accept({...sample,origin:'geometry'});return this.end();}
 destroy(){this.worker.terminate();for(const r of this.resolvers.values())r.reject(Error('Session destroyed'));this.resolvers.clear();this.renderer.destroy();}
}
