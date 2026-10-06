import {foundationDabs,predictFoundation,cursorState,geometryContext} from '@rt/foundation';
import {CanonicalBuilder,Stabilizer,predict,taper,continuous,limitFoundationDiameter,forceFadePreviewCommands,LatestMailbox,validateRecord,STRIDE} from '@rt/model';
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
 constructor(renderer,workerUrl=new URL('./canonical.worker.mjs',import.meta.url)){this.renderer=renderer;this.worker=new Worker(workerUrl,{type:'module'});this.records=[];this.redoRecords=[];this.id=0;this.active=null;this.pending=[];this.resolvers=new Map;this.strokePresets=new Map;this.cancelledIds=new Set;this.tileRecords=new Map;this.recordTiles=new WeakMap;this.recordOrder=new WeakMap;this.nextRecordOrder=0;this.prediction=true;this.browserPredictions=0;this.rawAccepted=0;this.lastRaw=null;this.errors=[];this.worker.onmessage=({data:m})=>{if(this.cancelledIds.has(m.id))return;if(m.type==='commands'){this.renderer.document.append(m.id,this.strokePresets.get(m.id),m.commands);}else if(m.type==='record'){const keys=this.renderer.document.end(m.id,m.record.preset);this.records.push(m.record);this.indexRecord(m.record,keys);this.strokePresets.delete(m.id);this.resolvers.get(m.id)?.resolve(m.record);this.resolvers.delete(m.id);}else if(m.type==='error'){this.errors.push(m.message);this.resolvers.get(m.id)?.reject(Error(m.message));this.resolvers.delete(m.id);}};}
 indexRecord(record,keys){const unique=[...new Set(keys)];this.recordTiles.set(record,unique);if(!this.recordOrder.has(record))this.recordOrder.set(record,++this.nextRecordOrder);for(const key of unique){let records=this.tileRecords.get(key);if(!records)this.tileRecords.set(key,records=[]);if(records.at(-1)!==record)records.push(record);}}
 unindexRecord(record){const keys=this.recordTiles.get(record);if(!keys)throw Error('derived record index missing');for(const key of keys){const records=this.tileRecords.get(key),index=records?.lastIndexOf(record)??-1;if(index<0)throw Error('derived record index mismatch');records.splice(index,1);if(!records.length)this.tileRecords.delete(key);}}
 reindexRecord(record){const keys=this.recordTiles.get(record);if(!keys)throw Error('derived record index missing');for(const key of keys){let records=this.tileRecords.get(key);if(!records)this.tileRecords.set(key,records=[]);if(records.includes(record))throw Error('derived record already active');records.push(record);}}
 recordsForKeys(keys){const wanted=new Set;for(const key of keys)for(const record of this.tileRecords.get(key)??[])wanted.add(record);return [...wanted].sort((a,b)=>(this.recordOrder.get(a)??0)-(this.recordOrder.get(b)??0));}
 presetForRecord(r){return {...r.preset,__legacyStarAa:r.engine==='illustro-rt-2.4'};}
 begin(p,fast=0,context={}){if(this.active)throw Error('stroke already active');const id=++this.id,seed=[0x12345678,id>>>0],builder=new CanonicalBuilder(p,seed,fast,context);this.active={id,preset:builder.p,seed,fast:builder.fast,builder,stableSource:[],points:[],raw:[],distance:0,start:0,predicted:[]};this.strokePresets.set(id,this.active.preset);this.pending=[];this.redoRecords=[];this.worker.postMessage({type:'begin',id,preset:p,seed,fast,context});return id;}
 accept(s){const a=this.active;if(!a||s.predicted)return;const last=a.raw.at(-1);if(last&&s.t<last.t)return;if(last&&s.t===last.t&&['x','y','pressure','pointerType','tilt','azimuth','twist'].every(k=>s[k]===last[k]))return;a.builder.accept(s);const q=a.builder.geometry.at(-1),prev=a.points.at(-1);const ready=a.builder.ready(),forcePreview=forceFadePreviewCommands(ready,a.preset);for(const c of forcePreview??ready)a.stableSource.push(c);if(prev)a.distance+=Math.hypot(q.x-prev.x,q.y-prev.y);else a.start=q.t;a.raw.push({...s});a.points.push(q);if(a.points.length>500000)throw Error('input retention limit');this.pending.push({...s});this.rawAccepted++;this.lastRaw=s;this.updateLive(performance.now());}
 predictions(samples){if(!this.active)return;this.active.predicted=samples;this.browserPredictions+=samples.length;}
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
  this.renderer.setLive({id:a.id,preset:p,stableSource:a.stableSource,stableEnd:a.stableSource.length,commands:tail,tip,inputTip,previewTip,predicted:!!predicted,rawTip:a.raw.at(-1),finished,resetPreview});
 }

 end(release=null){const a=this.active;if(!a)return Promise.resolve(null);this.flush();const finalized=a.builder.finish(),forceFade=!!a.builder.p.__foundation?.preset.forceFade?.enabled;if(forceFade){const commands=a.builder.record().commands.map(c=>Float64Array.from(c));a.stableSource.length=0;a.stableSource.push(...commands);a.builder.published=a.builder.commands.length;}else for(const c of finalized)a.stableSource.push(c);this.updateLive(performance.now(),true,forceFade);this.renderer.markEnded(a.id);this.worker.postMessage({type:'end',id:a.id,release});this.active=null;const promise=new Promise((resolve,reject)=>{this.resolvers.set(a.id,{resolve,reject});});this.resolvers.get(a.id).promise=promise;return promise.then(record=>{this.renderer.needsFrame=true;return record;});}
 async cancel(){if(!this.active)return;this.cancelledIds.add(this.active.id);this.worker.postMessage({type:'cancel',id:this.active.id});this.active=null;this.pending=[];await this.rebuild();}
 async rebuild(){await this.renderer.reset();this.tileRecords.clear();for(const r of this.records){const id=++this.id,preset=this.presetForRecord(r);this.renderer.document.append(id,preset,r.commands);const keys=this.renderer.document.end(id,preset);this.indexRecord(r,keys);}await this.renderer.drain();}
 async rebuildDirty(keys){const records=this.recordsForKeys(keys),entries=records.map(r=>({id:++this.id,preset:this.presetForRecord(r),commands:r.commands}));await this.renderer.rebuildTiles(keys,entries);}
 async undoDerived(expected,keys){await this.settle();const record=this.records.at(-1);if(record!==expected)throw Error('Document/Renderer undo mismatch');if(!keys.length)throw Error('history dirty footprint missing');this.records.pop();this.redoRecords.push(record);this.unindexRecord(record);await this.rebuildDirty(keys);}
 async redoDerived(expected,keys){await this.settle();const record=this.redoRecords.at(-1);if(record!==expected)throw Error('Document/Renderer redo mismatch');this.redoRecords.pop();this.records.push(record);this.reindexRecord(record);await this.rebuildDirty(keys);}
 discardRedo(){this.redoRecords=[];}
 async settle(){if(this.active)await this.end();await Promise.all([...this.resolvers.values()].map(r=>r.promise));}
 async undo(){await this.settle();if(this.records.length)this.redoRecords.push(this.records.pop());await this.rebuild();}
 async redo(){await this.settle();if(this.redoRecords.length)this.records.push(this.redoRecords.pop());await this.rebuild();}
 export(){if(this.active||this.resolvers.size)throw Error('finish active strokes before export');return {format:'illustro-rt-document-2',width:this.renderer.document.width,height:this.renderer.document.height,strokes:this.records};}
 async load(doc){await this.settle();if(doc.format!=='illustro-rt-document-2'||doc.width!==this.renderer.document.width||doc.height!==this.renderer.document.height||!Array.isArray(doc.strokes)||doc.strokes.length>10000)throw Error('unsupported document');const records=doc.strokes.map(validateRecord);this.records=records;this.redoRecords=[];await this.rebuild();}
 cursor(p,s,context={}){return cursorState(p,s,context);}
 async geometry(p,samples){this.begin(p,0,geometryContext(samples));for(const sample of samples)this.accept({...sample,origin:'geometry'});return this.end();}
 destroy(){this.worker.terminate();this.renderer.destroy();}
}
