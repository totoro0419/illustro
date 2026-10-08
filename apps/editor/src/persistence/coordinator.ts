import {CoreDocument,type CoreRecoveryPacketV1,type LayerId,type PersistenceHandoff,type RevisionId} from '@illustro/core';
import {validateRecord} from '@illustro/brush-rt';
import workerUrl from './persistence.worker.ts?worker&url';
import {openDecodedPortableDocument,type PortableOpenResult,type PreservedPortableData} from './portable';
import type {DecodedPortableFile,PortableManifestSection} from './format';
import type {ProjectionCacheV1} from './projectionCache';

type WorkerReply={id:number;ok:boolean;result?:unknown;error?:string};
export type Candidate=Readonly<{documentId:string;writerEpochId:string;title:string;protectedThrough:string;updatedAt:number;savedRevisionId:string|null;lastGood:boolean;previousGood:boolean}>;
export type PersistenceState=Readonly<{
  currentRevision:RevisionId|null;savedRevision:RevisionId|null;dirty:boolean;protectionPending:boolean;protectedThrough:string;saving:boolean;recovered:boolean;
  storageError:string|null;backend:string;storagePersisted:boolean|null;storageUsage:number|null;storageQuota:number|null;queueLength:number;
  lastProtectionTime:number|null;lastExplicitSaveTime:number|null;saveDurationMs:number|null;snapshotCaptureMs:number|null;reloadDurationMs:number|null;recoveryDurationMs:number|null;
  lastGood:boolean;previousGood:boolean;offline:boolean;
}>;
type Pending=Readonly<{packet:CoreRecoveryPacketV1;blocks:readonly {id:string;bytes:Uint8Array}[];supportedAlgorithms:readonly string[]}>;
type AnyWindow=Window&typeof globalThis&{showSaveFilePicker?:(options?:unknown)=>Promise<unknown>};

export class PersistenceCoordinator{
  private readonly worker=new Worker(workerUrl,{type:'module'});private nextId=1;private readonly pendingRequests=new Map<number,{resolve:(value:any)=>void;reject:(reason?:unknown)=>void}>();
  private queue:Pending[]=[];private idleHandle:number|null=null;private activeDrain:Promise<void>|null=null;private controller:Readonly<{document:CoreDocument;selectedLayerId:LayerId}>|null=null;
  private preserved:PreservedPortableData|undefined;private fileHandle:unknown=null;private externalFingerprint:string|null=null;private stateValue:PersistenceState=Object.freeze({
    currentRevision:null,savedRevision:null,dirty:true,protectionPending:false,protectedThrough:'0',saving:false,recovered:false,storageError:null,backend:'未初期化',
    storagePersisted:null,storageUsage:null,storageQuota:null,queueLength:0,lastProtectionTime:null,lastExplicitSaveTime:null,saveDurationMs:null,snapshotCaptureMs:null,reloadDurationMs:null,recoveryDurationMs:null,lastGood:false,previousGood:false,offline:!navigator.onLine,
  });
  constructor(private readonly onChange:(state:PersistenceState)=>void=()=>{}){
    this.worker.onmessage=(event:MessageEvent<WorkerReply>)=>{const pending=this.pendingRequests.get(event.data.id);if(!pending)return;this.pendingRequests.delete(event.data.id);event.data.ok?pending.resolve(event.data.result):pending.reject(new Error(event.data.error??'Persistence Worker error'));};
    this.worker.onerror=event=>this.patch({storageError:event.message||'Persistence Worker error'});
    addEventListener('online',this.onlineState);addEventListener('offline',this.onlineState);document.addEventListener('visibilitychange',this.visibility,{capture:true});addEventListener('pagehide',this.pagehide,{capture:true});
  }
  get state(){return this.stateValue;}get preservedData(){return this.preserved;}
  async initialize(controller:Readonly<{document:CoreDocument;selectedLayerId:LayerId}>,savedRevision:RevisionId|null=null,preserved?:PreservedPortableData,recovered=false){
    this.cancelIdle();await this.drain();this.queue=[];this.controller=controller;this.preserved=preserved;const document=controller.document,snapshot=document.capturePersistenceSnapshot(),blocks=[...document.persistenceBlockPayloads(snapshot)].map(([id,bytes])=>({id,bytes}));
    const storage=await this.storageStatus(true);const result=await this.request('init',{documentId:document.root.documentId,writerEpochId:document.writerEpochId,snapshot,blocks,savedRevisionId:savedRevision},blocks.map(x=>x.bytes.buffer as ArrayBuffer)) as any;
    this.patch({currentRevision:document.head,savedRevision,protectedThrough:String(result.protectedThrough??'0'),backend:String(result.backend??'unknown'),recovered,
      storagePersisted:storage.persisted,storageUsage:storage.usage,storageQuota:storage.quota,storageError:null,queueLength:0,protectionPending:false,saving:false,
      lastProtectionTime:null,lastExplicitSaveTime:null,saveDurationMs:null,snapshotCaptureMs:null,recoveryDurationMs:null,lastGood:Boolean(result.lastGood),previousGood:Boolean(result.previousGood)});
  }
  noteCommit(document:CoreDocument,handoff:PersistenceHandoff){
    try{const packet=document.captureRecoveryPacket(handoff),blockMap=document.recoveryBlockPayloads(packet),blocks=[...blockMap].map(([id,bytes])=>({id,bytes})),algorithms=runtimeSupportedAlgorithms(packet);
      this.queue.push(Object.freeze({packet,blocks:Object.freeze(blocks),supportedAlgorithms:algorithms}));this.patch({currentRevision:document.head,queueLength:this.queue.length,protectionPending:true});this.schedule();}
    catch(error){this.patch({storageError:message(error)});}
  }
  noteNavigation(document:CoreDocument){
    this.patch({currentRevision:document.head});void this.request('set-head',{revisionId:document.head}).catch(error=>this.patch({storageError:message(error)}));
  }
  async flushPrepared(){this.cancelIdle();await this.drain();}
  async listRecoveryCandidates():Promise<readonly Candidate[]>{const result=await this.request('list-recovery',{}) as any;this.applyStorage(result.storage);if(result.backend)this.patch({backend:String(result.backend)});return Object.freeze((Array.isArray(result.candidates)?result.candidates:[]) as Candidate[]);}
  async recover(candidate:Candidate){
    const started=performance.now(),result=await this.request('load-recovery',{documentId:candidate.documentId,writerEpochId:candidate.writerEpochId}) as any,blocks=new Map<string,Uint8Array>();
    for(const item of result.blocks as {id:string;bytes:Uint8Array}[])blocks.set(item.id,item.bytes);
    const document=CoreDocument.restore({snapshot:result.snapshot,blockPayloads:blocks}),selected=document.root.rootLayerIds[0];if(!selected)throw new Error('回復した作品にレイヤーがありません。');
    const controller={document,selectedLayerId:selected},projectionCache=isProjectionCache(result.projectionCache)?result.projectionCache:undefined;this.patch({recoveryDurationMs:performance.now()-started,recovered:true});return Object.freeze({document,selectedLayerId:selected,savedRevision:(candidate.savedRevisionId&&document.hasRevision(candidate.savedRevisionId as RevisionId)?candidate.savedRevisionId as RevisionId:null),projectionCache});
  }
  async reloadLastGood(candidate?:Pick<Candidate,'documentId'|'writerEpochId'>){const payload=candidate?{documentId:candidate.documentId,writerEpochId:candidate.writerEpochId}:{};const raw=await this.request('load-last-good',payload) as any;return this.decodePortable(raw.bytes as Uint8Array);}
  async decodePortable(bytes:Uint8Array):Promise<PortableOpenResult>{
    const started=performance.now(),copy=bytes.slice(),raw=await this.request('decode-portable',{bytes:copy},[copy.buffer as ArrayBuffer]) as any;
    const sections=new Map<string,{descriptor:PortableManifestSection;bytes:Uint8Array}>();for(const item of raw.sections as {descriptor:PortableManifestSection;bytes:Uint8Array}[])sections.set(item.descriptor.id,item);
    const decoded:Object={manifest:raw.manifest,sections},opened=openDecodedPortableDocument(decoded as DecodedPortableFile),projectionCache=isProjectionCache(raw.projectionCache)?raw.projectionCache:undefined;this.patch({reloadDurationMs:performance.now()-started});return Object.freeze({...opened,...(projectionCache?{projectionCache}:{})});
  }
  async save(document:CoreDocument,selectedLayerId:LayerId,forceSaveCopy=false){
    if(this.stateValue.saving)throw new Error('保存中です。');this.patch({saving:true,storageError:null});const started=performance.now();
    try{
      let handlePromise:Promise<unknown>|null=null;const w=window as AnyWindow;if(!this.fileHandle||forceSaveCopy){if(w.showSaveFilePicker)handlePromise=w.showSaveFilePicker({suggestedName:safeFileName(document.root.name)+'.illustro',types:[{description:'Illustro作品',accept:{'application/octet-stream':['.illustro']}}]});}
      const saveRevision=document.head,captureStart=performance.now(),snapshot=document.capturePersistenceSnapshot(saveRevision),snapshotCaptureMs=performance.now()-captureStart,blockEntries=[...document.persistenceBlockPayloads(snapshot)].map(([id,bytes])=>({id,bytes})),generationId=crypto.randomUUID(),createdAt=Date.now();
      const transfer=blockEntries.map(x=>x.bytes.buffer as ArrayBuffer),raw=await this.request('encode-save',{snapshot,blocks:blockEntries,selectedLayerId,generationId,createdAt,preserved:this.preserved},transfer) as any,bytes=raw.bytes as Uint8Array;
      let output:'picker'|'download';if(handlePromise){const handle=await handlePromise;await this.writeExternal(handle,bytes,false);this.fileHandle=handle;this.externalFingerprint=await fingerprintHandle(handle);output='picker';}
      else if(this.fileHandle&&!forceSaveCopy){await this.writeExternal(this.fileHandle,bytes,true);this.externalFingerprint=await fingerprintHandle(this.fileHandle);output='picker';}
      else{downloadBlob(bytes,safeFileName(document.root.name)+'.illustro');output='download';}
      const activationBytes=bytes.slice(),activation=await this.request('activate-last-good',{bytes:activationBytes,savedRevisionId:saveRevision},[activationBytes.buffer as ArrayBuffer]) as any;
      this.patch({savedRevision:saveRevision,currentRevision:document.head,lastExplicitSaveTime:Date.now(),saveDurationMs:performance.now()-started,snapshotCaptureMs,
        lastGood:Boolean(activation.lastGood),previousGood:Boolean(activation.previousGood),backend:String(activation.backend??this.stateValue.backend),saving:false});
      return Object.freeze({revisionId:saveRevision,bytes,byteLength:bytes.byteLength,output,generationId});
    }catch(error){this.patch({saving:false,storageError:message(error),saveDurationMs:performance.now()-started});throw error;}
  }
  async saveCopy(document:CoreDocument,selectedLayerId:LayerId){return this.save(document,selectedLayerId,true);}
  async storeProjectionCheckpoint(cache:ProjectionCacheV1){
    if(!this.controller||this.controller.document.head!==cache.revisionId)return false;
    await this.flushPrepared();if(!this.controller||this.controller.document.head!==cache.revisionId)return false;
    const layers=cache.layers.map(layer=>({surfaceId:layer.surfaceId,pixels:layer.pixels.slice()})),transfer=layers.map(layer=>layer.pixels.buffer as ArrayBuffer);
    await this.request('store-projection-checkpoint',{revisionId:cache.revisionId,width:cache.width,height:cache.height,layers},transfer);return true;
  }
  async storageStatus(requestPersistence=false){
    const storage=navigator.storage;let persisted:boolean|null=null,usage:number|null=null,quota:number|null=null;
    try{persisted=storage?.persisted?await storage.persisted():null;if(requestPersistence&&persisted===false&&storage?.persist){try{persisted=await storage.persist();}catch{}}}catch{}
    try{const estimate=storage?.estimate?await storage.estimate():null;usage=estimate?.usage??null;quota=estimate?.quota??null;}catch{}
    this.patch({storagePersisted:persisted,storageUsage:usage,storageQuota:quota});return {persisted,usage,quota};
  }
  destroy(){this.cancelIdle();this.worker.terminate();removeEventListener('online',this.onlineState);removeEventListener('offline',this.onlineState);document.removeEventListener('visibilitychange',this.visibility,{capture:true});removeEventListener('pagehide',this.pagehide,{capture:true});}
  private schedule(){if(this.idleHandle!==null||this.activeDrain)return;const idle=(window as unknown as {requestIdleCallback?:(fn:()=>void,o?:{timeout:number})=>number}).requestIdleCallback;if(idle)this.idleHandle=idle(()=>{this.idleHandle=null;void this.drain();},{timeout:750});else this.idleHandle=window.setTimeout(()=>{this.idleHandle=null;void this.drain();},120);}
  private cancelIdle(){if(this.idleHandle===null)return;const cancel=(window as unknown as {cancelIdleCallback?:(id:number)=>void}).cancelIdleCallback;if(cancel)cancel(this.idleHandle);else clearTimeout(this.idleHandle);this.idleHandle=null;}
  private async drain(){
    if(this.activeDrain)return this.activeDrain;
    const run=(async()=>{try{while(this.queue.length){const item=this.queue.shift()!,transfers=item.blocks.map(x=>x.bytes.buffer as ArrayBuffer);try{const result=await this.request('protect',{packet:item.packet,blocks:item.blocks,supportedAlgorithms:item.supportedAlgorithms},transfers) as any;this.applyStorage(result.storage);this.patch({protectedThrough:String(result.protectedThrough??this.stateValue.protectedThrough),backend:String(result.backend??this.stateValue.backend),lastProtectionTime:Date.now(),storageError:null});}
      catch(error){this.patch({storageError:message(error)});break;}this.patch({queueLength:this.queue.length,protectionPending:this.queue.length>0});}}finally{this.patch({queueLength:this.queue.length,protectionPending:this.queue.length>0});}})();
    this.activeDrain=run;try{await run;}finally{if(this.activeDrain===run)this.activeDrain=null;if(this.queue.length)this.schedule();}
  }
  private request(type:string,payload:Record<string,unknown>,transfer:Transferable[]=[]){const id=this.nextId++;return new Promise<any>((resolve,reject)=>{this.pendingRequests.set(id,{resolve,reject});this.worker.postMessage({id,type,...payload},transfer);});}
  private patch(patch:Partial<PersistenceState>){
    const next={...this.stateValue,...patch,offline:!navigator.onLine};
    next.dirty=next.savedRevision===null?true:next.currentRevision!==next.savedRevision;
    this.stateValue=Object.freeze(next);this.onChange(this.stateValue);
  }
  private applyStorage(value:unknown){if(!value||typeof value!=='object')return;const x=value as {persisted?:unknown;usage?:unknown;quota?:unknown};this.patch({storagePersisted:typeof x.persisted==='boolean'?x.persisted:null,storageUsage:typeof x.usage==='number'?x.usage:null,storageQuota:typeof x.quota==='number'?x.quota:null});}
  private async writeExternal(handle:unknown,bytes:Uint8Array,checkConflict:boolean){
    const h=handle as {getFile:()=>Promise<File>;createWritable:()=>Promise<{write:(b:Blob|BufferSource|string)=>Promise<void>;close:()=>Promise<void>;abort?:()=>Promise<void>}>};if(!h?.getFile||!h?.createWritable)throw new Error('保存先を使用できません。');
    if(checkConflict&&this.externalFingerprint){const current=await fingerprintHandle(handle);if(current!==this.externalFingerprint&&!confirm('保存先のファイルが外部で変更されています。上書きしますか？\nキャンセルした場合は「別名保存」を使えます。'))throw new Error('外部変更を検出したため上書きを中止しました。');}
    const writable=await h.createWritable();try{await writable.write(new Blob([bytes.slice().buffer as ArrayBuffer],{type:'application/octet-stream'}));await writable.close();}catch(error){try{await writable.abort?.();}catch{}throw error;}
    const file=await h.getFile(),written=new Uint8Array(await file.arrayBuffer());if(!(await sameDigest(bytes,written)))throw new Error('保存先の検証に失敗しました。');
  }
  private visibility=()=>{if(document.visibilityState==='hidden')void this.flushPrepared();};private pagehide=()=>{void this.flushPrepared();};private onlineState=()=>this.patch({offline:!navigator.onLine});
}

function runtimeSupportedAlgorithms(packet:CoreRecoveryPacketV1){
  const supported=new Set<string>();for(const operation of packet.revision.command.operations){if(operation.kind!=='brush.stroke')continue;const record=validateRecord(operation.parameters.strokeRecord);supported.add('engine:'+record.engine);supported.add('reconstruction:'+record.smoothing);supported.add('prng:'+record.random);supported.add('stroke-schema:'+record.version);}
  return Object.freeze([...supported]);
}
async function fingerprintHandle(handle:unknown){const file=await (handle as {getFile:()=>Promise<File>}).getFile(),bytes=new Uint8Array(await file.arrayBuffer()),hash=await hashHex(bytes);return file.size+':'+file.lastModified+':'+hash;}
async function sameDigest(a:Uint8Array,b:Uint8Array){if(a.byteLength!==b.byteLength)return false;return await hashHex(a)===await hashHex(b);}
async function hashHex(bytes:Uint8Array){const copy=bytes.byteOffset===0&&bytes.byteLength===bytes.buffer.byteLength?bytes:bytes.slice(),hash=new Uint8Array(await crypto.subtle.digest('SHA-256',copy as Uint8Array<ArrayBuffer>));return [...hash].map(x=>x.toString(16).padStart(2,'0')).join('');}
function downloadBlob(bytes:Uint8Array,name:string){const blob=new Blob([bytes.slice().buffer as ArrayBuffer],{type:'application/octet-stream'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.style.display='none';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30_000);}
function safeFileName(value:string){return (value.trim()||'Illustro作品').replace(/[\\/:*?"<>|\u0000-\u001f]+/g,'_').slice(0,120);}
function message(error:unknown){return error instanceof Error?error.message:String(error);}

function isProjectionCache(value:unknown):value is ProjectionCacheV1{
  if(!value||typeof value!=='object')return false;const x=value as ProjectionCacheV1;
  return x.version===1&&typeof x.revisionId==='string'&&Number.isSafeInteger(x.width)&&Number.isSafeInteger(x.height)&&x.width>0&&x.height>0&&Array.isArray(x.layers)&&x.layers.every(layer=>typeof layer?.surfaceId==='string'&&layer.pixels instanceof Uint8Array&&layer.pixels.byteLength===x.width*x.height*4);
}
