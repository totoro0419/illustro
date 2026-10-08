import {mergeCoreRecovery,type CorePersistenceSnapshotV1,type CoreRecoveryPacketV1} from '@illustro/core';
import {decodeIllustroFile,encodeIllustroFile,type PortableSectionInput} from './format';

type RequestMessage={id:number;type:string;[key:string]:unknown};
type Session={documentId:string;writerEpochId:string;path:string};
type Entry={name:string;kind:'file'|'directory'};
type StoreMode='opfs-sync'|'opfs-async'|'indexeddb';
type ProjectionEncoding='raw-rgba8'|'gzip-rgba8';
type ProjectionIndex=Readonly<{version:1;generationId:string;revisionId:string;width:number;height:number;layers:readonly Readonly<{surfaceId:string;encoding:ProjectionEncoding;rawLength:number}>[]}>;
type ProjectionCache=Readonly<{version:1;revisionId:string;width:number;height:number;layers:readonly Readonly<{surfaceId:string;pixels:Uint8Array}>[]}>;

const out=self as unknown as {postMessage:(value:unknown,transfer?:Transferable[])=>void};
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const FRAME_MAGIC=encoder.encode('ILJRNL01'),FRAME_HEADER=12,FRAME_HASH=32;
let storePromise:Promise<WorkingStore>|null=null,currentSession:Session|null=null,serial=Promise.resolve();

self.onmessage=(event:MessageEvent<RequestMessage>)=>{
  const message=event.data;serial=serial.then(()=>handle(message)).catch(error=>reply(message.id,false,undefined,error));
};

async function handle(message:RequestMessage){
  const store=await getStore();
  switch(message.type){
    case 'init':{
      const documentId=uuid(message.documentId,'document id'),writerEpochId=uuid(message.writerEpochId,'writer epoch'),snapshot=message.snapshot as CorePersistenceSnapshotV1,blocks=blockInputs(message.blocks);
      if(snapshot?.schema!=='illustro.core.snapshot'||snapshot.schemaVersion!==1)throw new Error('invalid recovery base snapshot');
      const path=sessionPath(documentId,writerEpochId);currentSession={documentId,writerEpochId,path};
      await writeBlocks(store,path,blocks);await putVerified(store,path+'/base.frame',await frameJson(snapshot));
      const now=Date.now(),savedRevisionId=message.savedRevisionId===null||message.savedRevisionId===undefined?null:uuid(message.savedRevisionId,'saved revision'),meta={version:1,documentId,writerEpochId,createdAt:now,updatedAt:now,savedRevisionId};
      await putVerified(store,path+'/meta.frame',await frameJson(meta));
      const storage=await storageInfo();reply(message.id,true,{backend:store.mode,protectedThrough:'0',storage});break;
    }
    case 'protect':{
      const session=requireSession(message),packet=message.packet as CoreRecoveryPacketV1,blocks=blockInputs(message.blocks),supported=new Set(stringArray(message.supportedAlgorithms,'supported algorithms'));
      validateClosure(packet,blocks,supported);await writeBlocks(store,session.path,blocks);
      const seq=BigInt(packet.handoff.commitSequence),finalPath=session.path+'/commits/'+seq.toString().padStart(20,'0')+'.frame',bytes=await frameJson(packet),existing=await store.get(finalPath);
      if(existing){if(!(await equalDigest(existing,bytes)))throw new Error('duplicate recovery packet differs');}
      else await putVerified(store,finalPath,bytes);
      const protectedThrough=await scanProtected(store,session);await writeHead(store,session,packet.revision.id);
      await touchMeta(store,session);reply(message.id,true,{protectedThrough:protectedThrough.toString(),backend:store.mode,storage:await storageInfo()});break;
    }
    case 'set-head':{
      const session=requireSession(message),revisionId=uuid(message.revisionId,'revision id');await writeHead(store,session,revisionId);await touchMeta(store,session);
      reply(message.id,true,{backend:store.mode});break;
    }
    case 'flush':{
      reply(message.id,true,{protectedThrough:currentSession?(await scanProtected(store,currentSession)).toString():'0',backend:store.mode});break;
    }
    case 'store-projection-checkpoint':{
      const session=requireSession(message),revisionId=uuid(message.revisionId,'projection revision'),width=dimension(message.width,'projection width'),height=dimension(message.height,'projection height'),layers=projectionLayerInputs(message.layers,width,height);
      await storeProjectionCheckpoint(store,session,revisionId,width,height,layers);await touchMeta(store,session);
      reply(message.id,true,{backend:store.mode,revisionId});break;
    }
    case 'list-recovery':{
      const candidates=await listRecoveryCandidates(store);reply(message.id,true,{candidates,backend:store.mode,storage:await storageInfo()});break;
    }
    case 'load-recovery':{
      const documentId=uuid(message.documentId,'document id'),writerEpochId=uuid(message.writerEpochId,'writer epoch'),session={documentId,writerEpochId,path:sessionPath(documentId,writerEpochId)};
      const loaded=await loadRecovery(store,session),projectionCache=await loadProjectionCheckpointRaw(store,session,new Set((loaded.snapshot.revisions as readonly {id:string}[]).map(r=>r.id)));const transfers:Transferable[]=[];
      for(const block of loaded.blocks)transfers.push(block.bytes.buffer as ArrayBuffer);for(const layer of projectionCache?.layers??[])transfers.push(layer.pixels.buffer as ArrayBuffer);
      reply(message.id,true,{...loaded,projectionCache},undefined,transfers);break;
    }
    case 'encode-save':{
      const snapshot=message.snapshot as CorePersistenceSnapshotV1;if(snapshot?.schema!=='illustro.core.snapshot'||snapshot.schemaVersion!==1)throw new Error('invalid save snapshot');
      const selectedLayerId=uuid(message.selectedLayerId,'selected layer'),blocks=blockInputs(message.blocks),generationId=uuid(message.generationId,'generation id'),createdAt=integer(message.createdAt,'createdAt',0);
      const sectionInputs:PortableSectionInput[]=[{id:'document',type:'document.core.v1',required:true,bytes:encoder.encode(JSON.stringify(snapshot))}];
      const byId=new Map(blocks.map(x=>[x.id,x.bytes]));for(const descriptor of snapshot.blocks){const bytes=byId.get(descriptor.id);if(!bytes)throw new Error('save block dependency missing');sectionInputs.push({id:'block:'+descriptor.id,type:'raster.block.v1',required:true,bytes});}
      sectionInputs.push({id:'editor-state',type:'editor.state.v1',required:false,bytes:encoder.encode(JSON.stringify({version:1,selectedLayerId}))});
      const preserved=preservedSections(message.preserved);for(const section of preserved.sections){if(section.required)throw new Error('unknown preserved section cannot be required');if(sectionInputs.some(x=>x.id===section.id))continue;sectionInputs.push(section);}
      const target=snapshot.revisions.find(r=>r.id===snapshot.snapshotRevisionId);if(!target)throw new Error('save target missing');
      if(currentSession&&currentSession.documentId===target.root.documentId){
        const checkpoint=await loadProjectionCheckpointEncoded(store,currentSession,new Set(snapshot.revisions.map(r=>r.id)));
        if(checkpoint){
          const index={version:1,revisionId:checkpoint.index.revisionId,width:checkpoint.index.width,height:checkpoint.index.height,layers:checkpoint.index.layers.map(layer=>({surfaceId:layer.surfaceId,encoding:layer.encoding,rawLength:layer.rawLength,sectionId:'render-cache-layer:'+layer.surfaceId}))};
          sectionInputs.push({id:'render-cache',type:'render.cache.index.v1',required:false,bytes:encoder.encode(JSON.stringify(index))});
          for(const layer of checkpoint.layers)sectionInputs.push({id:'render-cache-layer:'+layer.surfaceId,type:'render.cache.layer.v1',required:false,bytes:layer.bytes});
        }
      }
      const bytes=await encodeIllustroFile({generationId,documentId:target.root.documentId,snapshotRevisionId:snapshot.snapshotRevisionId,createdAt,sections:sectionInputs,manifestExtras:preserved.manifestExtras});
      await decodeIllustroFile(bytes,{knownRequiredTypes:new Set(['document.core.v1','raster.block.v1'])});
      const transfers=[bytes.buffer as ArrayBuffer];reply(message.id,true,{bytes,durationMs:0},undefined,transfers);break;
    }
    case 'activate-last-good':{
      const session=requireSession(message),bytes=uint8(message.bytes,'save bytes');await decodeIllustroFile(bytes,{knownRequiredTypes:new Set(['document.core.v1','raster.block.v1'])});
      const lastPath=session.path+'/saves/last.illustro',previousPath=session.path+'/saves/previous.illustro',candidatePath=session.path+'/saves/candidate.illustro';
      await putVerified(store,candidatePath,bytes);const previous=await store.get(lastPath);if(previous){await decodeIllustroFile(previous,{knownRequiredTypes:new Set(['document.core.v1','raster.block.v1'])});await putVerified(store,previousPath,previous);}
      await putVerified(store,lastPath,bytes);const verified=await store.get(lastPath);if(!verified)throw new Error('Last Good activation missing');await decodeIllustroFile(verified,{knownRequiredTypes:new Set(['document.core.v1','raster.block.v1'])});
      await store.remove(candidatePath);await touchMeta(store,session,String(message.savedRevisionId??''));reply(message.id,true,{lastGood:true,previousGood:Boolean(previous),backend:store.mode});break;
    }
    case 'load-last-good':{
      const session=readSession(message),last=await store.get(session.path+'/saves/last.illustro'),previous=await store.get(session.path+'/saves/previous.illustro');let chosen:Uint8Array|null=null,source:'last'|'previous'|null=null;
      if(last)try{await decodeIllustroFile(last,{knownRequiredTypes:new Set(['document.core.v1','raster.block.v1'])});chosen=last;source='last';}catch{}
      if(!chosen&&previous)try{await decodeIllustroFile(previous,{knownRequiredTypes:new Set(['document.core.v1','raster.block.v1'])});chosen=previous;source='previous';}catch{}
      if(!chosen)throw new Error('正常に保存できた作品がありません。');reply(message.id,true,{bytes:chosen,source},undefined,[chosen.buffer as ArrayBuffer]);break;
    }
    case 'decode-portable':{
      const bytes=uint8(message.bytes,'portable bytes'),decoded=await decodeIllustroFile(bytes,{knownRequiredTypes:new Set(['document.core.v1','raster.block.v1'])}),projectionCache=await decodeProjectionCache(decoded);
      const sections=[...decoded.sections.values()].map(({descriptor,bytes})=>({descriptor,bytes})),transfers=sections.map(x=>x.bytes.buffer as ArrayBuffer);
      for(const layer of projectionCache?.layers??[])transfers.push(layer.pixels.buffer as ArrayBuffer);
      reply(message.id,true,{manifest:decoded.manifest,sections,projectionCache},undefined,transfers);break;
    }
    default:throw new Error('unknown persistence worker request');
  }
}

function requireSession(message:RequestMessage):Session{
  if(!currentSession)throw new Error('persistence session not initialized');const documentId=String(message.documentId??currentSession.documentId),writerEpochId=String(message.writerEpochId??currentSession.writerEpochId);
  if(documentId!==currentSession.documentId||writerEpochId!==currentSession.writerEpochId)throw new Error('session isolation mismatch');return currentSession;
}
function readSession(message:RequestMessage):Session{
  if(message.documentId!==undefined||message.writerEpochId!==undefined){
    if(message.documentId===undefined||message.writerEpochId===undefined)throw new Error('incomplete persisted session identity');
    const documentId=uuid(message.documentId,'document id'),writerEpochId=uuid(message.writerEpochId,'writer epoch');return {documentId,writerEpochId,path:sessionPath(documentId,writerEpochId)};
  }
  if(!currentSession)throw new Error('persistence session not initialized');return currentSession;
}
function validateClosure(packet:CoreRecoveryPacketV1,blocks:readonly {id:string;bytes:Uint8Array}[],supported:Set<string>){
  if(!packet||packet.schema!=='illustro.core.recovery-packet'||packet.schemaVersion!==1)throw new Error('invalid recovery packet');if(!currentSession||packet.handoff.documentId!==currentSession.documentId||packet.handoff.writerEpochId!==currentSession.writerEpochId)throw new Error('recovery session mismatch');
  if(packet.handoff.requiredResourceIds.length)throw new Error('M05 recovery resource dependency unavailable');for(const ref of packet.handoff.requiredAlgorithmVersionRefs)if(!supported.has(ref))throw new Error('algorithm dependency unavailable: '+ref);
  const required=new Set(packet.handoff.requiredBlockIds),provided=new Set(blocks.map(x=>x.id));if(required.size!==provided.size||[...required].some(id=>!provided.has(id)))throw new Error('recovery block dependency closure incomplete');
  const descriptorIds=new Set(packet.blocks.map(x=>x.id));if(descriptorIds.size!==required.size||[...required].some(id=>!descriptorIds.has(id)))throw new Error('recovery block descriptor closure incomplete');
}
async function writeBlocks(store:WorkingStore,path:string,blocks:readonly {id:string;bytes:Uint8Array}[]){
  for(const block of blocks){uuid(block.id,'block id');const file=path+'/blocks/'+block.id+'.bin',existing=await store.get(file);if(existing){if(!(await equalDigest(existing,block.bytes)))throw new Error('stored block collision');continue;}await putVerified(store,file,block.bytes);}
}
async function scanProtected(store:WorkingStore,session:Session){
  const entries=await store.entries(session.path+'/commits'),seqs=entries.filter(x=>x.kind==='file'&&/^\d{20}\.frame$/.test(x.name)).map(x=>BigInt(x.name.slice(0,20))).sort((a,b)=>a<b?-1:a>b?1:0);
  let expected=1n;for(const seq of seqs){if(seq!==expected)break;const bytes=await store.get(session.path+'/commits/'+seq.toString().padStart(20,'0')+'.frame');if(!bytes)break;
    try{const packet=await unframeJson(bytes) as CoreRecoveryPacketV1;if(packet?.schema!=='illustro.core.recovery-packet'||packet.handoff?.writerEpochId!==session.writerEpochId||packet.handoff?.commitSequence!==seq.toString())break;}catch{break;}expected++;}
  return expected-1n;
}
async function loadRecovery(store:WorkingStore,session:Session){
  const baseBytes=await store.get(session.path+'/base.frame');if(!baseBytes)throw new Error('recovery base missing');const base=await unframeJson(baseBytes),protectedThrough=await scanProtected(store,session),packets:unknown[]=[];
  for(let seq=1n;seq<=protectedThrough;seq++){const bytes=await store.get(session.path+'/commits/'+seq.toString().padStart(20,'0')+'.frame');if(!bytes)throw new Error('recovery packet gap');packets.push(await unframeJson(bytes));}
  let headRevisionId:string|undefined;const headBytes=await store.get(session.path+'/head.frame');if(headBytes){try{const head=await unframeJson(headBytes) as {revisionId?:unknown};if(typeof head.revisionId==='string')headRevisionId=head.revisionId;}catch{}}
  const snapshot=mergeCoreRecovery(base,packets,headRevisionId),blocks:Array<{id:string;bytes:Uint8Array}>=[];
  for(const descriptor of snapshot.blocks){const bytes=await store.get(session.path+'/blocks/'+descriptor.id+'.bin');if(!bytes)throw new Error('recovery block dependency missing');blocks.push({id:descriptor.id,bytes});}
  return {snapshot,blocks,protectedThrough:protectedThrough.toString(),documentId:session.documentId,writerEpochId:session.writerEpochId};
}
async function storeProjectionCheckpoint(store:WorkingStore,session:Session,revisionId:string,width:number,height:number,layers:readonly {surfaceId:string;pixels:Uint8Array}[]){
  const generationId=crypto.randomUUID(),indexLayers:Array<{surfaceId:string;encoding:ProjectionEncoding;rawLength:number}>=[];
  for(const layer of layers){const encoded=await encodeProjectionPixels(layer.pixels),file=session.path+'/projection-data/'+generationId+'/'+layer.surfaceId+'.bin';await putVerified(store,file,encoded.bytes);indexLayers.push({surfaceId:layer.surfaceId,encoding:encoded.encoding,rawLength:layer.pixels.byteLength});}
  const index:ProjectionIndex=Object.freeze({version:1,generationId,revisionId,width,height,layers:Object.freeze(indexLayers.map(x=>Object.freeze(x)))});
  await putVerified(store,session.path+'/projection.frame',await frameJson(index));
}
async function loadProjectionCheckpointEncoded(store:WorkingStore,session:Session,allowedRevisions:ReadonlySet<string>){
  const frame=await store.get(session.path+'/projection.frame');if(!frame)return null;
  try{
    const index=parseProjectionIndex(await unframeJson(frame));if(!allowedRevisions.has(index.revisionId))return null;
    const layers:Array<{surfaceId:string;bytes:Uint8Array}>=[];
    for(const layer of index.layers){const bytes=await store.get(session.path+'/projection-data/'+index.generationId+'/'+layer.surfaceId+'.bin');if(!bytes)return null;layers.push({surfaceId:layer.surfaceId,bytes});}
    return {index,layers};
  }catch{return null;}
}
async function loadProjectionCheckpointRaw(store:WorkingStore,session:Session,allowedRevisions:ReadonlySet<string>):Promise<ProjectionCache|null>{
  const encoded=await loadProjectionCheckpointEncoded(store,session,allowedRevisions);if(!encoded)return null;
  try{
    const layers=[] as Array<{surfaceId:string;pixels:Uint8Array}>;
    for(const descriptor of encoded.index.layers){const item=encoded.layers.find(x=>x.surfaceId===descriptor.surfaceId);if(!item)return null;const pixels=await decodeProjectionPixels(item.bytes,descriptor.encoding,descriptor.rawLength);layers.push({surfaceId:descriptor.surfaceId,pixels});}
    return Object.freeze({version:1 as const,revisionId:encoded.index.revisionId,width:encoded.index.width,height:encoded.index.height,layers:Object.freeze(layers.map(x=>Object.freeze(x)))});
  }catch{return null;}
}
async function decodeProjectionCache(decoded:Awaited<ReturnType<typeof decodeIllustroFile>>):Promise<ProjectionCache|null>{
  const section=decoded.sections.get('render-cache');if(!section||section.descriptor.type!=='render.cache.index.v1'||section.descriptor.required)return null;
  try{
    const raw=JSON.parse(decoder.decode(section.bytes)) as Record<string,unknown>,version=raw.version;if(version!==1) return null;
    const revisionId=uuid(raw.revisionId,'projection revision'),width=dimension(raw.width,'projection width'),height=dimension(raw.height,'projection height'),list=raw.layers;
    if(!Array.isArray(list)||list.length>100000)return null;const seen=new Set<string>(),layers:Array<{surfaceId:string;pixels:Uint8Array}>=[];
    for(const item of list){if(!item||typeof item!=='object')return null;const x=item as Record<string,unknown>,surfaceId=uuid(x.surfaceId,'projection surface');if(seen.has(surfaceId))return null;seen.add(surfaceId);
      const encoding=projectionEncoding(x.encoding),rawLength=integer(x.rawLength,'projection raw length',0),sectionId=String(x.sectionId??'');if(rawLength!==width*height*4||sectionId!=='render-cache-layer:'+surfaceId)return null;
      const payload=decoded.sections.get(sectionId);if(!payload||payload.descriptor.type!=='render.cache.layer.v1'||payload.descriptor.required)return null;
      layers.push({surfaceId,pixels:await decodeProjectionPixels(payload.bytes,encoding,rawLength)});
    }
    return Object.freeze({version:1 as const,revisionId,width,height,layers:Object.freeze(layers.map(x=>Object.freeze(x)))});
  }catch{return null;}
}
function parseProjectionIndex(value:unknown):ProjectionIndex{
  if(!value||typeof value!=='object')throw new Error('invalid projection index');const x=value as Record<string,unknown>;if(x.version!==1)throw new Error('unsupported projection index');
  const generationId=uuid(x.generationId,'projection generation'),revisionId=uuid(x.revisionId,'projection revision'),width=dimension(x.width,'projection width'),height=dimension(x.height,'projection height');
  if(!Array.isArray(x.layers)||x.layers.length>100000)throw new Error('invalid projection layers');const seen=new Set<string>(),layers=x.layers.map(value=>{if(!value||typeof value!=='object')throw new Error('invalid projection layer');const item=value as Record<string,unknown>,surfaceId=uuid(item.surfaceId,'projection surface');if(seen.has(surfaceId))throw new Error('duplicate projection surface');seen.add(surfaceId);
    const encoding=projectionEncoding(item.encoding),rawLength=integer(item.rawLength,'projection raw length',0);if(rawLength!==width*height*4)throw new Error('projection size mismatch');return Object.freeze({surfaceId,encoding,rawLength});});
  return Object.freeze({version:1 as const,generationId,revisionId,width,height,layers:Object.freeze(layers)});
}
function projectionLayerInputs(value:unknown,width:number,height:number){
  if(!Array.isArray(value)||value.length>100000)throw new Error('invalid projection layer list');const expected=width*height*4,seen=new Set<string>();
  return value.map(item=>{if(!item||typeof item!=='object')throw new Error('invalid projection layer');const x=item as {surfaceId?:unknown;pixels?:unknown},surfaceId=uuid(x.surfaceId,'projection surface'),pixels=uint8(x.pixels,'projection pixels');if(seen.has(surfaceId))throw new Error('duplicate projection surface');seen.add(surfaceId);if(pixels.byteLength!==expected)throw new Error('projection pixel size mismatch');return {surfaceId,pixels};});
}
async function encodeProjectionPixels(bytes:Uint8Array):Promise<{encoding:ProjectionEncoding;bytes:Uint8Array}>{
  const Compression=(globalThis as unknown as {CompressionStream?:new(format:'gzip')=>TransformStream<Uint8Array,Uint8Array>}).CompressionStream;
  if(!Compression)return {encoding:'raw-rgba8',bytes:bytes.slice()};
  try{const stream=new Blob([bytes.slice().buffer as ArrayBuffer]).stream().pipeThrough(new Compression('gzip')),compressed=new Uint8Array(await new Response(stream).arrayBuffer());if(compressed.byteLength+64<bytes.byteLength)return {encoding:'gzip-rgba8',bytes:compressed};}catch{}
  return {encoding:'raw-rgba8',bytes:bytes.slice()};
}
async function decodeProjectionPixels(bytes:Uint8Array,encoding:ProjectionEncoding,rawLength:number){
  if(encoding==='raw-rgba8'){if(bytes.byteLength!==rawLength)throw new Error('projection raw size mismatch');return bytes.slice();}
  const Decompression=(globalThis as unknown as {DecompressionStream?:new(format:'gzip')=>TransformStream<Uint8Array,Uint8Array>}).DecompressionStream;if(!Decompression)throw new Error('gzip projection cache unsupported');
  const stream=new Blob([bytes.slice().buffer as ArrayBuffer]).stream().pipeThrough(new Decompression('gzip')),out=new Uint8Array(await new Response(stream).arrayBuffer());if(out.byteLength!==rawLength)throw new Error('projection inflate size mismatch');return out;
}
function projectionEncoding(value:unknown):ProjectionEncoding{if(value==='raw-rgba8'||value==='gzip-rgba8')return value;throw new Error('invalid projection encoding');}
function dimension(value:unknown,name:string){const n=integer(value,name,1);if(n>8192)throw new Error(name+' too large');return n;}

async function listRecoveryCandidates(store:WorkingStore){
  const out:Array<Record<string,unknown>>=[],root='m05/sessions';for(const doc of await store.entries(root)){if(doc.kind!=='directory'||!isUuid(doc.name))continue;for(const epoch of await store.entries(root+'/'+doc.name)){if(epoch.kind!=='directory'||!isUuid(epoch.name))continue;
      const session={documentId:doc.name,writerEpochId:epoch.name,path:root+'/'+doc.name+'/'+epoch.name};try{const baseBytes=await store.get(session.path+'/base.frame');if(!baseBytes)continue;const base=await unframeJson(baseBytes) as CorePersistenceSnapshotV1,protectedThrough=await scanProtected(store,session);
        const target=base.revisions.find(x=>x.id===base.snapshotRevisionId),metaBytes=await store.get(session.path+'/meta.frame'),meta=metaBytes?await unframeJson(metaBytes) as Record<string,unknown>:{};
        const lastGood=await store.exists(session.path+'/saves/last.illustro'),previousGood=await store.exists(session.path+'/saves/previous.illustro');
        out.push({documentId:session.documentId,writerEpochId:session.writerEpochId,title:target?.root.name??'作品',protectedThrough:protectedThrough.toString(),updatedAt:typeof meta.updatedAt==='number'?meta.updatedAt:0,savedRevisionId:typeof meta.savedRevisionId==='string'?meta.savedRevisionId:null,lastGood,previousGood});}catch{} }}
  return out.sort((a,b)=>(Number(b.updatedAt)||0)-(Number(a.updatedAt)||0));
}
async function writeHead(store:WorkingStore,session:Session,revisionId:string){await putVerified(store,session.path+'/head.frame',await frameJson({version:1,revisionId:uuid(revisionId,'revision id')}));}
async function touchMeta(store:WorkingStore,session:Session,savedRevisionId?:string){
  const path=session.path+'/meta.frame',old=await store.get(path);let meta:Record<string,unknown>={version:1,documentId:session.documentId,writerEpochId:session.writerEpochId,createdAt:Date.now()};
  if(old)try{meta=await unframeJson(old) as Record<string,unknown>;}catch{}meta={...meta,updatedAt:Date.now(),...(savedRevisionId?{savedRevisionId}:{})};await putVerified(store,path,await frameJson(meta));
}
function sessionPath(documentId:string,writerEpochId:string){return 'm05/sessions/'+documentId+'/'+writerEpochId;}

class WorkingStore{
  mode:StoreMode='indexeddb';private root:FileSystemDirectoryHandle|null=null;private db:IDBDatabase|null=null;
  static async create(){const value=new WorkingStore(),storage=(navigator as unknown as {storage?:{getDirectory?:()=>Promise<FileSystemDirectoryHandle>}}).storage;
    if(storage?.getDirectory){try{value.root=await storage.getDirectory();value.mode='opfs-async';return value;}catch{}}
    value.db=await openDb();value.mode='indexeddb';return value;
  }
  async put(path:string,bytes:Uint8Array){if(this.root){const handle=await this.file(path,true),anyHandle=handle as unknown as {createSyncAccessHandle?:()=>Promise<{truncate:(n:number)=>void;write:(b:Uint8Array,o:{at:number})=>number;flush:()=>void;close:()=>void}>};
      if(anyHandle.createSyncAccessHandle){try{const sync=await anyHandle.createSyncAccessHandle();sync.truncate(0);const written=sync.write(bytes,{at:0});if(written!==bytes.byteLength){sync.close();throw new Error('short OPFS sync write');}sync.flush();sync.close();this.mode='opfs-sync';return;}catch(error){if(this.mode==='opfs-sync')throw error;}}
      const writable=await handle.createWritable();await writable.write(bytes as unknown as FileSystemWriteChunkType);await writable.close();this.mode='opfs-async';return;}
    await idbPut(this.db!,path,bytes);}
  async get(path:string):Promise<Uint8Array|null>{if(this.root){try{const file=await (await this.file(path,false)).getFile();return new Uint8Array(await file.arrayBuffer());}catch{return null;}}return idbGet(this.db!,path);}
  async exists(path:string){if(this.root){try{await this.file(path,false);return true;}catch{return false;}}return idbHas(this.db!,path);}
  async remove(path:string){if(this.root){const parts=split(path),name=parts.pop()!,dir=await this.dir(parts,false);try{await dir.removeEntry(name);}catch{}return;}await idbDelete(this.db!,path);}
  async entries(path:string):Promise<Entry[]>{if(this.root){try{const dir=await this.dir(split(path),false),result:Entry[]=[];for await(const value of (dir as unknown as {values:()=>AsyncIterableIterator<FileSystemHandle>}).values())result.push({name:value.name,kind:value.kind});return result;}catch{return [];}}
    return idbEntries(this.db!,path);}
  private async file(path:string,create:boolean){const parts=split(path),name=parts.pop();if(!name)throw new Error('invalid working path');return (await this.dir(parts,create)).getFileHandle(name,{create});}
  private async dir(parts:string[],create:boolean){let dir=this.root!;for(const name of parts)dir=await dir.getDirectoryHandle(name,{create});return dir;}
}
function getStore(){return storePromise??=WorkingStore.create();}
async function putVerified(store:WorkingStore,path:string,bytes:Uint8Array){await store.put(path,bytes);const read=await store.get(path);if(!read||!(await equalDigest(read,bytes)))throw new Error('durable write verification failed');}
async function frameJson(value:unknown){const payload=encoder.encode(JSON.stringify(value)),hash=await digest(payload),outBytes=new Uint8Array(FRAME_HEADER+payload.byteLength+FRAME_HASH),view=new DataView(outBytes.buffer);outBytes.set(FRAME_MAGIC,0);view.setUint32(8,payload.byteLength,true);outBytes.set(payload,FRAME_HEADER);outBytes.set(hash,FRAME_HEADER+payload.byteLength);return outBytes;}
async function unframeJson(bytes:Uint8Array){if(bytes.byteLength<FRAME_HEADER+FRAME_HASH)throw new Error('truncated recovery frame');for(let i=0;i<FRAME_MAGIC.length;i++)if(bytes[i]!==FRAME_MAGIC[i])throw new Error('invalid recovery frame');const length=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(8,true);if(length>64*1024*1024||FRAME_HEADER+length+FRAME_HASH!==bytes.byteLength)throw new Error('invalid recovery frame length');
  const payload=bytes.slice(FRAME_HEADER,FRAME_HEADER+length),hash=bytes.slice(FRAME_HEADER+length);if(!equal(await digest(payload),hash))throw new Error('recovery frame integrity failed');try{return JSON.parse(decoder.decode(payload));}catch{throw new Error('malformed recovery frame');}}
async function digest(bytes:Uint8Array){const copy=bytes.byteOffset===0&&bytes.byteLength===bytes.buffer.byteLength?bytes:bytes.slice();return new Uint8Array(await crypto.subtle.digest('SHA-256',copy as Uint8Array<ArrayBuffer>));}
async function equalDigest(a:Uint8Array,b:Uint8Array){if(a.byteLength!==b.byteLength)return false;return equal(await digest(a),await digest(b));}
function equal(a:Uint8Array,b:Uint8Array){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=(a[i]??0)^(b[i]??0);return diff===0;}
function blockInputs(value:unknown){if(!Array.isArray(value))throw new Error('invalid block payload list');return value.map(item=>{if(!item||typeof item!=='object')throw new Error('invalid block payload');const x=item as {id?:unknown;bytes?:unknown};return {id:uuid(x.id,'block id'),bytes:uint8(x.bytes,'block bytes')};});}
function preservedSections(value:unknown):{manifestExtras:Readonly<Record<string,unknown>>;sections:PortableSectionInput[]}{if(!value||typeof value!=='object')return {manifestExtras:{},sections:[]};const x=value as {manifestExtras?:unknown;optionalSections?:unknown},manifestExtras=x.manifestExtras&&typeof x.manifestExtras==='object'&&!Array.isArray(x.manifestExtras)?x.manifestExtras as Record<string,unknown>:{},sections:PortableSectionInput[]=[];
  if(Array.isArray(x.optionalSections))for(const item of x.optionalSections){if(!item||typeof item!=='object')continue;const s=item as {id?:unknown;type?:unknown;required?:unknown;codec?:unknown;bytes?:unknown;descriptorExtras?:unknown};const descriptorExtras=s.descriptorExtras&&typeof s.descriptorExtras==='object'?s.descriptorExtras as Record<string,unknown>:undefined;sections.push({id:String(s.id??''),type:String(s.type??''),required:false,codec:'none',bytes:uint8(s.bytes,'optional bytes'),...(descriptorExtras?{descriptorExtras}:{})});}return {manifestExtras,sections};}
async function storageInfo(){const storage=(navigator as unknown as {storage?:{persisted?:()=>Promise<boolean>;estimate?:()=>Promise<{usage?:number;quota?:number}>}}).storage;let persisted:boolean|null=null,usage:number|null=null,quota:number|null=null;try{persisted=storage?.persisted?await storage.persisted():null;}catch{}try{const estimate=storage?.estimate?await storage.estimate():null;usage=estimate?.usage??null;quota=estimate?.quota??null;}catch{}return {persisted,usage,quota};}
function split(path:string){const parts=path.split('/').filter(Boolean);if(parts.some(x=>x==='.'||x==='..'||!/^[A-Za-z0-9._:-]+$/.test(x)))throw new Error('invalid working path');return parts;}
function uint8(value:unknown,name:string){if(value instanceof Uint8Array)return value;throw new Error('invalid '+name);}
function stringArray(value:unknown,name:string){if(!Array.isArray(value)||value.some(x=>typeof x!=='string'))throw new Error('invalid '+name);return value as string[];}
function integer(value:unknown,name:string,min:number){if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min)throw new Error('invalid '+name);return value;}
function isUuid(value:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function uuid(value:unknown,name:string){if(typeof value!=='string'||!isUuid(value))throw new Error('invalid '+name);return value;}
function reply(id:number,ok:boolean,result?:unknown,error?:unknown,transfer:Transferable[]=[]){out.postMessage(ok?{id,ok:true,result}:{id,ok:false,error:error instanceof Error?error.message:String(error??'persistence failure')},transfer);}

function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open('illustro-m05-working',1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('files'))request.result.createObjectStore('files');};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
function idbPut(db:IDBDatabase,key:string,value:Uint8Array){return new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(value.slice(),key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
function idbGet(db:IDBDatabase,key:string){return new Promise<Uint8Array|null>((resolve,reject)=>{const tx=db.transaction('files','readonly'),request=tx.objectStore('files').get(key);request.onsuccess=()=>{const value=request.result;resolve(value instanceof Uint8Array?value:value instanceof ArrayBuffer?new Uint8Array(value):null);};request.onerror=()=>reject(request.error);});}
function idbHas(db:IDBDatabase,key:string){return new Promise<boolean>((resolve,reject)=>{const tx=db.transaction('files','readonly'),request=tx.objectStore('files').count(key);request.onsuccess=()=>resolve(request.result>0);request.onerror=()=>reject(request.error);});}
function idbDelete(db:IDBDatabase,key:string){return new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
function idbEntries(db:IDBDatabase,path:string){return new Promise<Entry[]>((resolve,reject)=>{const prefix=path.replace(/\/+$/,'')+'/',entries=new Map<string,'file'|'directory'>(),tx=db.transaction('files','readonly'),request=tx.objectStore('files').openKeyCursor();request.onsuccess=()=>{const cursor=request.result;if(!cursor){resolve([...entries].map(([name,kind])=>({name,kind})));return;}const key=String(cursor.key);if(key.startsWith(prefix)){const rest=key.slice(prefix.length),slash=rest.indexOf('/'),name=slash<0?rest:rest.slice(0,slash);if(name)entries.set(name,slash<0?'file':'directory');}cursor.continue();};request.onerror=()=>reject(request.error);});}
