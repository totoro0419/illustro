import {type WorkEntry} from './workLibrary';
import {CoreDocument,type CoreRecoveryPacketV1,type LayerId,type PersistenceHandoff,type RevisionId} from '@illustro/core';
import workerUrl from './persistence.worker.ts?worker&url';
import {openDecodedPortableDocument,type PortableOpenResult,type PreservedPortableData} from './portable';
import type {DecodedPortableFile,PortableManifestSection,PortableSectionInput} from './format';
import type {ProjectionCache,ProjectionCacheV1,ProjectionCheckpointDeltaV2} from './projectionCache';
import {cloneProjectionTiles} from './projectionTransfer';
import {exactBlobBuffer} from './blobBuffer';
import {needsUnloadWarning} from './unloadGuard';
import {fingerprintOwnedBytes,fingerprintFileChunks} from './chunkFingerprint';
import {NavigationBarrier} from './navigationBarrier';
import type {SelectionRect} from '../strokeSelection';

export class ExternalFileConflict extends Error{
  constructor(readonly changedFile:File){
    super('保存先のファイルが別の画面やアプリで更新されています。');
  }
}
type WorkerReply={id:number;ok:boolean;result?:unknown;error?:string};
export type Candidate=Readonly<{documentId:string;writerEpochId:string;title:string;protectedThrough:string;updatedAt:number;savedRevisionId:string|null;lastGood:boolean;previousGood:boolean}>;
export type PersistenceState=Readonly<{
  currentRevision:RevisionId|null;savedRevision:RevisionId|null;dirty:boolean;protectionPending:boolean;protectedThrough:string;saving:boolean;recovered:boolean;
  storageError:string|null;backend:string;storagePersisted:boolean|null;storageUsage:number|null;storageQuota:number|null;queueLength:number;
  lastProtectionTime:number|null;lastExplicitSaveTime:number|null;saveDurationMs:number|null;snapshotCaptureMs:number|null;reloadDurationMs:number|null;recoveryDurationMs:number|null;
  lastGood:boolean;previousGood:boolean;offline:boolean;
}>;
type PreviewLayer=Readonly<{surfaceId:string;visible:boolean;opacity:number}>;
type Pending=Readonly<{selectedLayerId:LayerId;name:string;packet:CoreRecoveryPacketV1;blocks:readonly {id:string;bytes:Uint8Array}[];supportedAlgorithms:readonly string[];previewLayers:readonly PreviewLayer[]}>;
type SaveAttachments=()=>((root:CoreDocument['root'])=>Promise<readonly PortableSectionInput[]>);
type AnyWindow=Window&typeof globalThis&{showSaveFilePicker?:(options?:unknown)=>Promise<unknown>};

export class PersistenceCoordinator{
  private destroyed=false;private workerFailure:Error|null=null;private navigationSequence=0;private navigationPending=0;
  private readonly navigationBarrier=new NavigationBarrier();
  private readonly worker=new Worker(workerUrl,{type:'module'});private nextId=1;private readonly pendingRequests=new Map<number,{resolve:(value:any)=>void;reject:(reason?:unknown)=>void}>();
  private queue:Pending[]=[];private idleHandle:number|null=null;private activeDrain:Promise<void>|null=null;private controller:Readonly<{document:CoreDocument;selectedLayerId:LayerId}>|null=null;
  private saveAttachmentProvider:SaveAttachments|null=null;
  setSaveAttachmentProvider(provider:SaveAttachments|null){this.saveAttachmentProvider=provider;}
  private preserved:PreservedPortableData|undefined;private selection:SelectionRect|null=null;private fileHandle:unknown=null;private externalFingerprint:string|null=null;private stateValue:PersistenceState=Object.freeze({
    currentRevision:null,savedRevision:null,dirty:true,protectionPending:false,protectedThrough:'0',saving:false,recovered:false,storageError:null,backend:'未初期化',
    storagePersisted:null,storageUsage:null,storageQuota:null,queueLength:0,lastProtectionTime:null,lastExplicitSaveTime:null,saveDurationMs:null,snapshotCaptureMs:null,reloadDurationMs:null,recoveryDurationMs:null,lastGood:false,previousGood:false,offline:!navigator.onLine,
  });
  constructor(private readonly onChange:(state:PersistenceState)=>void=()=>{}){
    this.worker.onmessage=(event:MessageEvent<WorkerReply>)=>{const pending=this.pendingRequests.get(event.data.id);if(!pending)return;this.pendingRequests.delete(event.data.id);event.data.ok?pending.resolve(event.data.result):pending.reject(new Error(event.data.error??'Persistence Worker error'));};
    this.worker.onerror=event=>this.failWorker(new Error(event.message||'作品の保護処理が停止しました。'));
    this.worker.onmessageerror=()=>this.failWorker(new Error('作品の保護処理との通信に失敗しました。'));
    addEventListener('online',this.onlineState);addEventListener('offline',this.onlineState);addEventListener('beforeunload',this.beforeUnload);document.addEventListener('visibilitychange',this.visibility,{capture:true});addEventListener('pagehide',this.pagehide,{capture:true});
  }
  get state(){return this.stateValue;}get preservedData(){return this.preserved;}
  async initialize(controller:Readonly<{document:CoreDocument;selectedLayerId:LayerId}>,savedRevision:RevisionId|null=null,preserved?:PreservedPortableData,recovered=false,selection:SelectionRect|null=null){
    // A previous document's Undo/Redo head write must not cross this switch.
    await this.flushPrepared();this.queue=[];this.controller=controller;this.preserved=preserved;this.selection=selection;const document=controller.document,snapshot=document.capturePersistenceSnapshot(),blocks=[...document.persistenceBlockPayloads(snapshot)].map(([id,bytes])=>({id,bytes}));
    const result=await this.request('init',{documentId:document.root.documentId,writerEpochId:document.writerEpochId,snapshot,blocks,savedRevisionId:savedRevision},blocks.map(x=>x.bytes.buffer as ArrayBuffer)) as any;
    this.patch({currentRevision:document.head,savedRevision,protectedThrough:String(result.protectedThrough??'0'),backend:String(result.backend??'unknown'),recovered,
      storageError:null,queueLength:0,protectionPending:false,saving:false,
      lastProtectionTime:null,lastExplicitSaveTime:null,saveDurationMs:null,snapshotCaptureMs:null,recoveryDurationMs:null,lastGood:Boolean(result.lastGood),previousGood:Boolean(result.previousGood)});
    // Quota and a persistent-storage permission request do not initialize
    // the journal. Leave them off the path to the first editable frame.
    if(this.stateValue.storagePersisted===null)void this.storageStatus(true);
  }
  noteCommit(document:CoreDocument,handoff:PersistenceHandoff){
    try{const packet=document.captureRecoveryPacket(handoff),blockMap=document.recoveryBlockPayloads(packet),blocks=[...blockMap].map(([id,bytes])=>({id,bytes})),algorithms=runtimeSupportedAlgorithms(packet);
      this.queue.push(Object.freeze({selectedLayerId:this.controller?.selectedLayerId??document.root.rootLayerIds[0]!,name:document.revision(handoff.resultRevisionId).root.name,packet,blocks:Object.freeze(blocks),supportedAlgorithms:algorithms,previewLayers:previewLayersFor(document,handoff.resultRevisionId)}));this.patch({currentRevision:document.head,queueLength:this.queue.length,protectionPending:true});this.schedule();}
    catch(error){this.patch({storageError:message(error)});}
  }
  noteNavigation(document:CoreDocument){
    const sequence=++this.navigationSequence,revisionId=document.head;
    this.navigationPending++;
    this.patch({currentRevision:revisionId,protectionPending:true});
    // Use the commit-only barrier here: the public flushPrepared also waits for
    // navigation jobs and would deadlock if a job waited for itself.
    const write=this.flushCommitted().then(()=>{
      if(this.controller?.document!==document||sequence!==this.navigationSequence||document.head!==revisionId)return;
      return this.request('set-head',{
        revisionId,name:document.root.name,width:document.root.width,height:document.root.height,
        selectedLayerId:this.controller?.selectedLayerId,previewLayers:previewLayersFor(document,revisionId),
      });
    }).catch(error=>this.patch({storageError:message(error)})).finally(()=>{
      this.navigationPending--;
      this.patch({protectionPending:this.queue.length>0||this.navigationPending>0||this.activeDrain!==null});
    });
    this.navigationBarrier.track(write);
  }
  private async flushCommitted(){
    this.cancelIdle();
    await this.drain();
    if(this.stateValue.storageError||this.queue.length)
      throw new Error(this.stateValue.storageError??'自動保存が完了していません。');
  }
  async flushPrepared(){
    // Navigation state itself is durable data: finish set-head after the raster
    // journal, including a new Undo/Redo issued while an older write completes.
    do{
      await this.flushCommitted();
      await this.navigationBarrier.waitUntilIdle();
    }while(this.navigationPending>0||this.queue.length>0||this.activeDrain!==null);
    if(this.stateValue.storageError)throw new Error(this.stateValue.storageError);
  }
  async listWorks():Promise<{works:WorkEntry[];lastWorkId:string|null}>{return this.request('library-list',{});}
  async bindWork(expectedEpoch:string|null=null){if(!this.controller)throw new Error('作品が開かれていません。');return this.request('library-bind',{selectedLayerId:this.controller.selectedLayerId,expectedEpoch,preserved:this.preserved,selection:this.selection});}
  async loadWork(documentId:string){const raw=await this.request('library-load',{documentId});
    const document=CoreDocument.restore({snapshot:raw.snapshot,blockPayloads:new Map(raw.blocks.map((b:{id:string;bytes:Uint8Array})=>[b.id,b.bytes]))});
    const selected=raw.entry.selectedLayerId;return {opened:{document,selectedLayerId:document.root.hasLayer(selected)?selected:document.root.rootLayerIds[0]!,preserved:raw.entry.preserved??{manifestExtras:{},optionalSections:[]},generationId:'library',snapshotRevisionId:document.head,selection:raw.entry.selection??null,projectionCache:raw.projectionCache??undefined} as PortableOpenResult,entry:raw.entry as WorkEntry,fallback:Boolean(raw.fallback)};}
  async readThumbnail(documentId:string,revisionId:string):Promise<Blob|null>{const result=await this.request('library-thumbnail-read',{documentId,revisionId});return result.image??null;}
  async repairThumbnail(documentId:string):Promise<{state:'pending'|'complete'|'current'|'unavailable'}>{return this.request('library-preview-step',{documentId});}
  async renameWork(documentId:string,name:string){await this.request('library-rename',{documentId,name});}
  async deleteWork(documentId:string){await this.request('library-delete',{documentId});}
  async restoreWork(documentId:string){await this.request('library-restore',{documentId});}
  async purgeWork(documentId:string){await this.request('library-purge',{documentId});}
  async resetWorks(){
    await this.flushPrepared();
    await this.request('library-reset',{});
    this.controller=null;this.queue=[];this.preserved=undefined;this.selection=null;this.fileHandle=null;this.externalFingerprint=null;
    this.patch({currentRevision:null,savedRevision:null,protectedThrough:'0',queueLength:0,protectionPending:false,recovered:false,storageError:null});
  }
  async selectWorkLayer(selectedLayerId:LayerId){const controller=this.controller;await this.flushPrepared();if(controller!==this.controller||controller?.selectedLayerId!==selectedLayerId)return;await this.request('library-selection',{selectedLayerId});}
  async updateSelection(selection:SelectionRect|null){
    this.selection=selection;
    if(this.controller)await this.request('library-editor-selection',{selection});
  }
  async storeThumbnail(documentId:string,revisionId:string,thumbnail:Blob){await this.request('library-thumbnail',{documentId,revisionId,thumbnail});}
  async barrier(){await this.flushPrepared();await this.request('flush',{});if(this.stateValue.storageError)throw new Error(this.stateValue.storageError);}
  async retry(){this.cancelIdle();await this.drain();if(this.queue.length)throw new Error(this.stateValue.storageError??'保存に失敗しました。');if(this.controller){const d=this.controller.document;await this.request('set-head',{revisionId:d.head,name:d.root.name,width:d.root.width,height:d.root.height,previewLayers:previewLayersFor(d,d.head)});}this.patch({storageError:null});}
  clearFileDestination(){this.fileHandle=null;this.externalFingerprint=null;}
  async listRecoveryCandidates():Promise<readonly Candidate[]>{const result=await this.request('list-recovery',{}) as any;this.applyStorage(result.storage);if(result.backend)this.patch({backend:String(result.backend)});return Object.freeze((Array.isArray(result.candidates)?result.candidates:[]) as Candidate[]);}
  async recover(candidate:Candidate,preview=false){
    const started=performance.now(),result=await this.request('load-recovery',{documentId:candidate.documentId,writerEpochId:candidate.writerEpochId}) as any,blocks=new Map<string,Uint8Array>();
    for(const item of result.blocks as {id:string;bytes:Uint8Array}[])blocks.set(item.id,item.bytes);
    const document=CoreDocument.restore({snapshot:result.snapshot,blockPayloads:blocks}),selected=document.root.rootLayerIds[0];if(!selected)throw new Error('回復した作品にレイヤーがありません。');
    const controller={document,selectedLayerId:selected},projectionCache=isProjectionCache(result.projectionCache)?result.projectionCache:undefined;if(!preview)this.patch({recoveryDurationMs:performance.now()-started,recovered:true});return Object.freeze({document,selectedLayerId:selected,selection:result.selection??null,savedRevision:(candidate.savedRevisionId&&document.hasRevision(candidate.savedRevisionId as RevisionId)?candidate.savedRevisionId as RevisionId:null),projectionCache});
  }
  async reloadLastGood(candidate?:Pick<Candidate,'documentId'|'writerEpochId'>){const payload=candidate?{documentId:candidate.documentId,writerEpochId:candidate.writerEpochId}:{};const raw=await this.request('load-last-good',payload) as any;return this.decodePortable(raw.bytes as Uint8Array);}
  async decodePortable(bytes:Uint8Array):Promise<PortableOpenResult>{
    const started=performance.now(),copy=bytes.slice(),raw=await this.request('decode-portable',{bytes:copy},[copy.buffer as ArrayBuffer]) as any;
    const sections=new Map<string,{descriptor:PortableManifestSection;bytes:Uint8Array}>();for(const item of raw.sections as {descriptor:PortableManifestSection;bytes:Uint8Array}[])sections.set(item.descriptor.id,item);
    const decoded:Object={manifest:raw.manifest,sections},opened=openDecodedPortableDocument(decoded as DecodedPortableFile),projectionCache=isProjectionCache(raw.projectionCache)?raw.projectionCache:undefined;this.patch({reloadDurationMs:performance.now()-started});return Object.freeze({...opened,...(projectionCache?{projectionCache}:{})});
  }
  async save(document:CoreDocument,selectedLayerId:LayerId,forceSaveCopy=false,pending?:Promise<RevisionId>,selection:SelectionRect|null=null){
    if(this.stateValue.saving)throw new Error('保存中です。');
    const existingHandle=this.fileHandle,previousFingerprint=this.externalFingerprint;
    const requestedRevision=document.head,requestedThrough=document.commitSequence,old=this.preserved??{manifestExtras:{},optionalSections:[]};
    const suggestedName=safeFileName(document.root.name)+(forceSaveCopy?'（コピー）':'')+'.illustro',started=performance.now();
    this.patch({saving:true});
    try{
      const w=window as AnyWindow;
      // Open the picker in the user's click, even when an accepted line is still finalizing.
      const picker=(!existingHandle||forceSaveCopy)&&w.showSaveFilePicker
        ? w.showSaveFilePicker({suggestedName,types:[{description:'Illustro作品',accept:{'application/octet-stream':['.illustro']}}]})
          .then(handle=>({handle,error:null}),error=>({handle:null,error}))
        : null;
      const attachments=this.saveAttachmentProvider?.();
      const saveRevision=pending?await pending:requestedRevision;
      const captureStart=performance.now(),snapshot=document.captureSaveSnapshot(saveRevision,requestedThrough),
        snapshotCaptureMs=performance.now()-captureStart,blockEntries=[...document.persistenceBlockPayloads(snapshot)].map(([id,bytes])=>({id,bytes})),
        generationId=crypto.randomUUID(),createdAt=Date.now();
      const destination=picker?await picker:null;
      if(destination?.error)throw destination.error;
      const extras=await attachments?.(document.revision(saveRevision).root)??[];
      const ids=new Set(extras.map(section=>section.id));
      if(ids.size!==extras.length||extras.some(section=>section.required))
        throw Error('追加の保存データが正しくありません。');
      const preserved:PreservedPortableData={
        manifestExtras:old.manifestExtras,
        optionalSections:[...old.optionalSections.filter(section=>{
          if(ids.has(section.id))return false;
          // The C06 selection state is a complete snapshot. In particular an
          // empty selection must remove the previous file's stale mask bytes.
          if(section.type==='font.asset.v1'&&section.id.startsWith('c10.font.'))return false;
          if(section.type==='selection.index.v1'||section.type==='selection.alpha.v1')
            return !section.id.startsWith('c06.selection.');
          return true;
        }),...extras]
      };
      const transfer=blockEntries.map(x=>x.bytes.buffer as ArrayBuffer);
      const raw=await this.request('encode-save',{snapshot,blocks:blockEntries,selectedLayerId,generationId,createdAt,preserved,selection},transfer) as {bytes:Uint8Array};
      const bytes=raw.bytes;
      let output:'picker'|'download';
      if(destination?.handle){
        const same=existingHandle as {isSameEntry?:(other:unknown)=>Promise<boolean>}|null;
        const reuse=existingHandle===destination.handle||await same?.isSameEntry?.(destination.handle)===true;
        const fingerprint=await this.writeExternal(destination.handle,bytes,reuse?previousFingerprint:null);
        this.fileHandle=destination.handle;this.externalFingerprint=fingerprint;output='picker';
      }else if(existingHandle&&!forceSaveCopy){
        this.externalFingerprint=await this.writeExternal(existingHandle,bytes,previousFingerprint);output='picker';
      }else{downloadBlob(bytes,suggestedName);output='download';}
      // A browser download click cannot confirm that the file was retained by the OS.
      // Only the file-picker path performs read-back verification.
      this.patch({lastExplicitSaveTime:output==='picker'?Date.now():this.stateValue.lastExplicitSaveTime,
        saveDurationMs:performance.now()-started,snapshotCaptureMs,saving:false});
      return Object.freeze({revisionId:saveRevision,bytes,byteLength:bytes.byteLength,output,generationId,verified:output==='picker'});
    }catch(error){this.patch({saving:false,saveDurationMs:performance.now()-started});throw error;}
  }
  async storeProjectionCheckpoint(cache:ProjectionCacheV1){
    if(!this.controller||this.controller.document.head!==cache.revisionId)return false;
    await this.flushPrepared();if(!this.controller||this.controller.document.head!==cache.revisionId)return false;
    const layers=cache.layers.map(layer=>({surfaceId:layer.surfaceId,pixels:layer.pixels.slice()})),transfer=layers.map(layer=>layer.pixels.buffer as ArrayBuffer);
    await this.request('store-projection-checkpoint',{revisionId:cache.revisionId,width:cache.width,height:cache.height,layers},transfer);return true;
  }
  async storeProjectionDelta(delta:ProjectionCheckpointDeltaV2){
    if(!this.controller||this.controller.document.head!==delta.revisionId)return false;
    await this.flushPrepared();if(!this.controller||this.controller.document.head!==delta.revisionId)return false;
    const controller=this.controller,valid=()=>!this.destroyed&&this.controller===controller&&controller.document.head===delta.revisionId,tiles=await cloneProjectionTiles(delta.tiles,valid);
    if(!tiles||!valid())return false;const transfer=tiles.map(tile=>tile.pixels.buffer as ArrayBuffer);
    await this.request('store-projection-delta',{replace:delta.replace===true,revisionId:delta.revisionId,width:delta.width,height:delta.height,tileSize:delta.tileSize,surfaceIds:[...delta.surfaceIds],tiles},transfer);return true;
  }
  async storageStatus(requestPersistence=false){
    const storage=navigator.storage;let persisted:boolean|null=null,usage:number|null=null,quota:number|null=null;
    try{persisted=storage?.persisted?await storage.persisted():null;if(requestPersistence&&persisted===false&&storage?.persist){try{persisted=await storage.persist();}catch{}}}catch{}
    try{const estimate=storage?.estimate?await storage.estimate():null;usage=estimate?.usage??null;quota=estimate?.quota??null;}catch{}
    this.patch({storagePersisted:persisted,storageUsage:usage,storageQuota:quota});return {persisted,usage,quota};
  }
  destroy(){this.destroyed=true;this.cancelIdle();this.failWorker(new Error('作品の保護処理が終了しました。'));this.worker.terminate();removeEventListener('online',this.onlineState);removeEventListener('offline',this.onlineState);removeEventListener('beforeunload',this.beforeUnload);document.removeEventListener('visibilitychange',this.visibility,{capture:true});removeEventListener('pagehide',this.pagehide,{capture:true});}
  private schedule(){if(this.idleHandle!==null||this.activeDrain)return;const idle=(window as unknown as {requestIdleCallback?:(fn:()=>void,o?:{timeout:number})=>number}).requestIdleCallback;if(idle)this.idleHandle=idle(()=>{this.idleHandle=null;void this.drain();},{timeout:120});else this.idleHandle=window.setTimeout(()=>{this.idleHandle=null;void this.drain();},60);}
  private cancelIdle(){if(this.idleHandle===null)return;const cancel=(window as unknown as {cancelIdleCallback?:(id:number)=>void}).cancelIdleCallback;if(cancel)cancel(this.idleHandle);else clearTimeout(this.idleHandle);this.idleHandle=null;}
  private async drain(){
    if(this.activeDrain)return this.activeDrain;
    const run=(async()=>{try{while(this.queue.length){const item=this.queue.shift()!,blocks=item.blocks.map(b=>({id:b.id,bytes:b.bytes.slice()})),transfers=blocks.map(x=>x.bytes.buffer as ArrayBuffer);try{const result=await this.request('protect',{selectedLayerId:item.selectedLayerId,name:item.name,packet:item.packet,blocks,supportedAlgorithms:item.supportedAlgorithms,previewLayers:item.previewLayers},transfers) as any;this.applyStorage(result.storage);this.patch({protectedThrough:String(result.protectedThrough??this.stateValue.protectedThrough),backend:String(result.backend??this.stateValue.backend),lastProtectionTime:Date.now(),storageError:null});}
      catch(error){this.queue.unshift(item);this.patch({storageError:message(error),protectionPending:true});break;}this.patch({queueLength:this.queue.length,protectionPending:this.queue.length>0});}}finally{this.patch({queueLength:this.queue.length,protectionPending:this.queue.length>0});}})();
    this.activeDrain=run;try{await run;}finally{if(this.activeDrain===run)this.activeDrain=null;if(this.queue.length&&!this.stateValue.storageError)this.schedule();}
  }
  private request(type:string,payload:Record<string,unknown>,transfer:Transferable[]=[]){
    if(this.workerFailure||this.destroyed)return Promise.reject(this.workerFailure??new Error('作品の保護処理が終了しました。'));
    const id=this.nextId++;
    return new Promise<any>((resolve,reject)=>{
      this.pendingRequests.set(id,{resolve,reject});
      try{this.worker.postMessage({id,type,...payload},transfer);}
      catch(error){this.pendingRequests.delete(id);reject(error);}
    });
  }
  private failWorker(error:Error){
    if(this.workerFailure)return;
    this.workerFailure=error;
    for(const pending of this.pendingRequests.values())pending.reject(error);
    this.pendingRequests.clear();
    this.patch({storageError:error.message});
  }
  private patch(patch:Partial<PersistenceState>){
    const next={...this.stateValue,...patch,offline:!navigator.onLine};if(this.navigationPending>0)next.protectionPending=true;
    next.dirty=next.savedRevision===null?true:next.currentRevision!==next.savedRevision;
    this.stateValue=Object.freeze(next);this.onChange(this.stateValue);
  }
  private applyStorage(value:unknown){if(!value||typeof value!=='object')return;const x=value as {persisted?:unknown;usage?:unknown;quota?:unknown};this.patch({storagePersisted:typeof x.persisted==='boolean'?x.persisted:null,storageUsage:typeof x.usage==='number'?x.usage:null,storageQuota:typeof x.quota==='number'?x.quota:null});}
  private async writeExternal(handle:unknown,bytes:Uint8Array,expectedFingerprint:string|null){
    type Writable={write:(b:Blob|BufferSource|string)=>Promise<void>;truncate?:(size:number)=>Promise<void>;close:()=>Promise<void>;abort?:()=>Promise<void>};
    const h=handle as {getFile:()=>Promise<File>;createWritable:(options?:{keepExistingData?:boolean})=>Promise<Writable>};if(!h?.getFile||!h?.createWritable)throw new Error('保存先を使用できません。');
    if(expectedFingerprint&&await fingerprintHandle(handle)!==expectedFingerprint)throw new ExternalFileConflict(await h.getFile());
    // encode-save transfers a uniquely owned byte buffer from the Worker. It is
    // not modified while this awaited write and read-back verification run.
    // Avoid cloning a potentially huge native save file before writing it.
    const stable=bytes,writable=await h.createWritable({keepExistingData:false});
    try{
      await writable.truncate?.(0);
      await writable.write(new Blob([exactBlobBuffer(stable)],{type:'application/octet-stream'}));
      await writable.truncate?.(stable.byteLength);
      await writable.close();
    }catch(error){try{await writable.abort?.();}catch{}throw error;}
    return await verifyExternalWrite(h,stable);
  }
  // This is a best-effort warning only. Android and background tab termination
  // may bypass beforeunload entirely, so checkpointing continues normally.
  private beforeUnload=(event:BeforeUnloadEvent)=>{
    if(this.destroyed||!this.controller||!needsUnloadWarning(this.stateValue))return;
    event.preventDefault();
    event.returnValue='';
  };
  private visibility=()=>{if(document.visibilityState==='hidden')void this.flushPrepared().catch(error=>this.patch({storageError:message(error)}));};private pagehide=()=>{void this.flushPrepared().catch(error=>this.patch({storageError:message(error)}));};private onlineState=()=>this.patch({offline:!navigator.onLine});
}

function previewLayersFor(document:CoreDocument,revisionId:RevisionId):readonly PreviewLayer[]{
  const root=document.revision(revisionId).root;
  return root.rootLayerIds.map(id=>{const layer=root.getLayer(id);return {surfaceId:layer.surface.descriptor.surfaceId,visible:root.isLayerVisible(id),opacity:layer.opacity,...(layer.baseColor?{baseColor:layer.baseColor}:{})};});
}
function runtimeSupportedAlgorithms(packet:CoreRecoveryPacketV1){
  const supported=new Set<string>();for(const operation of packet.revision.command.operations)for(const ref of operation.algorithmVersionRefs)supported.add(ref);return Object.freeze([...supported]);
}
async function fingerprintHandle(handle:unknown){
  const file=await (handle as {getFile:()=>Promise<File>}).getFile();
  return file.size+':'+file.lastModified+':'+await fingerprintFileChunks(file);
}
async function verifyExternalWrite(handle:{getFile:()=>Promise<File>},expected:Uint8Array){
  const expectedHash=await fingerprintOwnedBytes(expected),delays=[0,30,80,160,320,640,1200,2000];
  let lastSize:number|null=null,lastReason='読み戻しできませんでした';
  for(const delay of delays){
    if(delay)await sleep(delay);
    try{
      const file=await handle.getFile();lastSize=file.size;
      if(file.size!==expected.byteLength){lastReason='保存先のサイズが反映待ちです';continue;}
      // Verify every byte indirectly, via the same ordered chunk fingerprint as
      // the encoded source, without loading the entire saved file into RAM.
      const actualHash=await fingerprintFileChunks(file);
      if(actualHash===expectedHash)return file.size+':'+file.lastModified+':'+actualHash;
      lastReason='保存先の内容がまだ反映されていません';
    }catch(error){lastReason=message(error);}
  }
  const sizeText=lastSize===null?'不明':String(lastSize);
  throw new Error('保存先の検証に失敗しました。書き込み後のファイルが端末側で正しく確認できませんでした（確認サイズ '+sizeText+' B / 予定 '+expected.byteLength+' B、'+lastReason+'）。');
}
function sleep(ms:number){return new Promise<void>(resolve=>setTimeout(resolve,ms));}
function downloadBlob(bytes:Uint8Array,name:string){const blob=new Blob([exactBlobBuffer(bytes)],{type:'application/octet-stream'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.style.display='none';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30_000);}
function safeFileName(value:string){return (value.trim()||'Illustro作品').replace(/[\\/:*?"<>|\u0000-\u001f]+/g,'_').slice(0,120);}
function message(error:unknown){return error instanceof Error?error.message:String(error);}

export function isProjectionCache(value:unknown):value is ProjectionCache{
  if(!value||typeof value!=='object')return false;
  const x=value as ProjectionCache;
  if(typeof x.revisionId!=='string'||!Number.isSafeInteger(x.width)||!Number.isSafeInteger(x.height)||x.width<1||x.height<1||!Array.isArray(x.layers))return false;
  if(x.version===1)return x.layers.every(layer=>typeof layer?.surfaceId==='string'&&layer.pixels instanceof Uint8Array&&layer.pixels.byteLength===x.width*x.height*4);
  if(x.version!==2||x.tileSize!==128)return false;
  const maxX=Math.ceil(x.width/128),maxY=Math.ceil(x.height/128),surfaces=new Set<string>();
  for(const layer of x.layers){
    if(!layer||typeof layer.surfaceId!=='string'||surfaces.has(layer.surfaceId)||!Array.isArray(layer.tiles))return false;
    surfaces.add(layer.surfaceId);const keys=new Set<string>();
    for(const tile of layer.tiles){
      if(!tile||typeof tile.key!=='string'||!/^\d+,\d+$/.test(tile.key)||keys.has(tile.key)||!(tile.pixels instanceof Uint8Array)||tile.pixels.byteLength!==128*128*4)return false;
      const [tx,ty]=tile.key.split(',').map(Number);if(!Number.isSafeInteger(tx)||!Number.isSafeInteger(ty)||tx<0||ty<0||tx>=maxX||ty>=maxY)return false;
      keys.add(tile.key);
    }
  }
  return true;
}
