import type {BlockId,DocumentId,IdFactory,LayerId,OperationKey,RasterSurfaceId,ResourceId,RevisionId,TransactionId,WriterEpochId} from './ids';
import type {Command,CommitStamp,Revision,RevisionHistoryState,SemanticOperation} from './history';
import type {PersistenceHandoff} from './recovery';
import {DocumentRoot,type LayerNode} from './model';
import {PagedMap} from './pagedMap';
import {RasterSurfaceManifest,parseTileKey,type DirtyTileHint,type RasterSampleEncoding,type RasterSurfaceDescriptor,type RasterTileValue,type RasterMutationRef,type TileKey} from './raster/surface';
import type {CanonicalTileStore,RasterBlockDescriptor} from './raster/store';

export const CORE_PERSISTENCE_SCHEMA_VERSION=1 as const;
const UUID_V4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KNOWN_OPERATION_KINDS=new Set(['brush.stroke','raster.strict-delta','layer.metadata','layer.add-raster']);
const SAMPLE_ENCODINGS=new Set<RasterSampleEncoding>(['rgba.unorm8.v1','rgba.unorm16.v1','rgba.float32.v1']);
const MAX_DIMENSION=1_000_000,MAX_LAYERS=100_000,MAX_REVISIONS=100_000,MAX_TILES_PER_ROOT=2_000_000,MAX_OPERATIONS_PER_REVISION=100_000;

export type PersistedRoot=Readonly<{
  documentId:string;width:number;height:number;name:string;colorProfileId:string;createdAt:number;modifiedAt:number;
  rootLayerIds:readonly string[];layers:readonly PersistedLayer[];
}>;
export type PersistedLayer=Readonly<{
  id:string;kind:'raster';name:string;visible:boolean;opacity:number;locked:boolean;
  surface:Readonly<{descriptor:RasterSurfaceDescriptor;tiles:readonly Readonly<{key:string;value:RasterTileValue}>[]}>;
}>;
export type PersistedRevision=Readonly<{
  id:string;parentIds:readonly string[];transactionId:string|null;root:PersistedRoot;command:Command|null;
  commitStamp:Readonly<{writerEpochId:string;commitSequence:string}>|null;committedAt:number;
}>;
export type PersistedBlockDescriptor=Readonly<{id:string;descriptor:RasterBlockDescriptor}>;
export type CorePersistenceSnapshotV1=Readonly<{
  schema:'illustro.core.snapshot';schemaVersion:1;snapshotRevisionId:string;revisions:readonly PersistedRevision[];blocks:readonly PersistedBlockDescriptor[];
}>;

export function captureCoreSnapshot(history:RevisionHistoryState<DocumentRoot>,store:CanonicalTileStore,targetRevisionId:RevisionId):CorePersistenceSnapshotV1{
  const byId=new Map(history.revisions.map(revision=>[revision.id,revision] as const));if(!byId.has(targetRevisionId))throw new Error('snapshot revision missing');
  const ordered:Revision<DocumentRoot>[]=[],visited=new Set<RevisionId>(),visiting=new Set<RevisionId>();
  const visit=(id:RevisionId)=>{if(visited.has(id))return;if(visiting.has(id))throw new Error('revision cycle');const revision=byId.get(id);if(!revision)throw new Error('snapshot parent missing');
    visiting.add(id);for(const parent of revision.parentIds)visit(parent);visiting.delete(id);visited.add(id);ordered.push(revision);};
  visit(targetRevisionId);if(ordered.length>MAX_REVISIONS)throw new Error('too many retained revisions');
  const blockIds=new Set<BlockId>();const revisions=ordered.map(revision=>serializeRevision(revision,blockIds));
  const blocks=Object.freeze([...blockIds].sort().map(id=>Object.freeze({id,descriptor:store.descriptor(id)})));
  return Object.freeze({schema:'illustro.core.snapshot' as const,schemaVersion:1 as const,snapshotRevisionId:targetRevisionId,revisions:Object.freeze(revisions),blocks});
}

export function blockPayloadsForSnapshot(snapshot:CorePersistenceSnapshotV1,store:CanonicalTileStore){
  const out=new Map<BlockId,Uint8Array>();for(const item of snapshot.blocks){const id=item.id as BlockId;out.set(id,store.readCopy(id));}return out;
}

export function parseCoreSnapshot(value:unknown,blockPayloads:ReadonlyMap<string,Uint8Array>,ids:IdFactory):Readonly<{
  history:RevisionHistoryState<DocumentRoot>;defaultRasterLayerId:LayerId;documentId:DocumentId;
}>{
  const raw=record(value,'snapshot');if(raw.schema!=='illustro.core.snapshot'||raw.schemaVersion!==1)throw new Error('unsupported core snapshot');
  const snapshotRevisionId=uuid(raw.snapshotRevisionId,'snapshot revision') as RevisionId;
  if(!Array.isArray(raw.blocks)||raw.blocks.length>MAX_TILES_PER_ROOT*2)throw new Error('invalid block descriptor list');
  const blockDescriptors=new Map<BlockId,RasterBlockDescriptor>();
  for(const item of raw.blocks){const b=record(item,'block descriptor'),id=uuid(b.id,'block id') as BlockId;if(blockDescriptors.has(id))throw new Error('duplicate block descriptor');
    blockDescriptors.set(id,parseBlockDescriptor(b.descriptor));}
  if(blockPayloads.size!==blockDescriptors.size)throw new Error('block dependency set mismatch');
  const storePayloads=new Map<BlockId,Uint8Array>();
  for(const [id,descriptor] of blockDescriptors){const bytes=blockPayloads.get(id);if(!bytes)throw new Error('missing required block payload');validateBlockBytes(descriptor,bytes);storePayloads.set(id,bytes);}
  for(const key of blockPayloads.keys())if(!blockDescriptors.has(key as BlockId))throw new Error('unexpected block payload');
  if(!Array.isArray(raw.revisions)||raw.revisions.length===0||raw.revisions.length>MAX_REVISIONS)throw new Error('invalid revisions');
  const revisions:Revision<DocumentRoot>[]=[],revisionIds=new Set<RevisionId>(),operationKeys=new Set<string>(),documentIds=new Set<DocumentId>();
  for(const item of raw.revisions){
    const parsed=parseRevision(item,blockDescriptors,operationKeys);if(revisionIds.has(parsed.id))throw new Error('duplicate revision id');revisionIds.add(parsed.id);documentIds.add(parsed.root.documentId);revisions.push(parsed);
  }
  if(!revisionIds.has(snapshotRevisionId))throw new Error('snapshot revision unavailable');if(documentIds.size!==1)throw new Error('mixed document identities');
  for(const revision of revisions){
    for(const parent of revision.parentIds)if(!revisionIds.has(parent))throw new Error('revision parent outside snapshot');
    for(const operation of revision.command?.operations??[])for(const source of operation.sourceRevisionIds)if(!revisionIds.has(source))throw new Error('operation source revision missing');
    validateMutationRefs(revision.root,operationKeys,blockDescriptors);
  }
  const target=revisions.find(revision=>revision.id===snapshotRevisionId)!;const first=target.root.rootLayerIds[0];if(!first)throw new Error('document has no layer');
  const history=Object.freeze({revisions:Object.freeze(revisions),head:snapshotRevisionId,redoIds:Object.freeze([])}) as RevisionHistoryState<DocumentRoot>;
  return Object.freeze({history,defaultRasterLayerId:first,documentId:target.root.documentId});
}

export function restoreBlocks(store:CanonicalTileStore,snapshotValue:unknown,blockPayloads:ReadonlyMap<string,Uint8Array>){
  const raw=record(snapshotValue,'snapshot');if(!Array.isArray(raw.blocks))throw new Error('invalid block descriptor list');
  for(const item of raw.blocks){const b=record(item,'block descriptor'),id=uuid(b.id,'block id') as BlockId,descriptor=parseBlockDescriptor(b.descriptor),bytes=blockPayloads.get(id);if(!bytes)throw new Error('missing required block payload');store.restore(id,descriptor,bytes);}
}

function serializeRevision(revision:Revision<DocumentRoot>,blockIds:Set<BlockId>):PersistedRevision{
  return Object.freeze({id:revision.id,parentIds:Object.freeze([...revision.parentIds]),transactionId:revision.transactionId,root:serializeRoot(revision.root,blockIds),
    command:revision.command,commitStamp:revision.commitStamp?Object.freeze({writerEpochId:revision.commitStamp.writerEpochId,commitSequence:revision.commitStamp.commitSequence.toString()}):null,committedAt:revision.committedAt});
}
function serializeRoot(root:DocumentRoot,blockIds:Set<BlockId>):PersistedRoot{
  const layers:PersistedLayer[]=[],seenSurfaces=new Set<string>(),entries=root.layers.entries();if(entries.length>MAX_LAYERS)throw new Error('too many layers');
  for(const [id,layer] of entries){if(seenSurfaces.has(layer.surface.descriptor.surfaceId))throw new Error('duplicate surface id');seenSurfaces.add(layer.surface.descriptor.surfaceId);
    const tiles=layer.surface.tiles.entries().map(([key,value])=>{if(value.baseBlockId)blockIds.add(value.baseBlockId);return Object.freeze({key,value});});
    if(tiles.length>MAX_TILES_PER_ROOT)throw new Error('too many raster tiles');layers.push(Object.freeze({id,kind:'raster' as const,name:layer.name,visible:layer.visible,opacity:layer.opacity,locked:layer.locked,
      surface:Object.freeze({descriptor:layer.surface.descriptor,tiles:Object.freeze(tiles)})}));}
  return Object.freeze({documentId:root.documentId,width:root.width,height:root.height,name:root.name,colorProfileId:root.colorProfileId,createdAt:root.metadata.createdAt,modifiedAt:root.metadata.modifiedAt,
    rootLayerIds:Object.freeze([...root.rootLayerIds]),layers:Object.freeze(layers)});
}

function parseRevision(value:unknown,blocks:ReadonlyMap<BlockId,RasterBlockDescriptor>,operationKeys:Set<string>):Revision<DocumentRoot>{
  const r=record(value,'revision'),id=uuid(r.id,'revision id') as RevisionId,parentIds=uuidArray(r.parentIds,'revision parent') as RevisionId[];
  const transactionId=r.transactionId===null?null:uuid(r.transactionId,'transaction id') as TransactionId,root=parseRoot(r.root,blocks),committedAt=integer(r.committedAt,'committedAt',0);
  let command:Command|null=null;if(r.command!==null){const c=record(r.command,'command');if(c.version!==2||c.kind!=='core.transaction.v2'||typeof c.label!=='string'||!c.label.trim())throw new Error('invalid command');
    if(!transactionId)throw new Error('command without transaction');if(!Array.isArray(c.operations)||c.operations.length>MAX_OPERATIONS_PER_REVISION)throw new Error('invalid operation list');
    const operations=c.operations.map((item,index)=>parseOperation(item,transactionId,index,operationKeys));command=Object.freeze({version:2 as const,kind:'core.transaction.v2' as const,label:c.label,operations:Object.freeze(operations)});}
  else if(transactionId!==null)throw new Error('transaction without command');
  let commitStamp:CommitStamp|null=null;if(r.commitStamp!==null){const s=record(r.commitStamp,'commit stamp'),writerEpochId=uuid(s.writerEpochId,'writer epoch') as WriterEpochId;
    if(typeof s.commitSequence!=='string'||!/^[1-9][0-9]*$/.test(s.commitSequence))throw new Error('invalid commit sequence');const commitSequence=BigInt(s.commitSequence);if(commitSequence>0xffffffffffffffffn)throw new Error('commit sequence overflow');commitStamp=Object.freeze({writerEpochId,commitSequence});}
  if(command&&!commitStamp)throw new Error('committed revision missing commit stamp');
  return Object.freeze({id,parentIds:Object.freeze(parentIds),transactionId,root,command,commitStamp,committedAt});
}
function parseRoot(value:unknown,blocks:ReadonlyMap<BlockId,RasterBlockDescriptor>):DocumentRoot{
  const r=record(value,'document root'),documentId=uuid(r.documentId,'document id') as DocumentId,width=dimension(r.width),height=dimension(r.height),name=text(r.name,'document name',1,4096),colorProfileId=text(r.colorProfileId,'color profile',1,4096);
  const createdAt=integer(r.createdAt,'createdAt',0),modifiedAt=integer(r.modifiedAt,'modifiedAt',createdAt);if(modifiedAt<createdAt)throw new Error('modifiedAt precedes createdAt');
  if(!Array.isArray(r.layers)||r.layers.length===0||r.layers.length>MAX_LAYERS)throw new Error('invalid layers');const edit=PagedMap.empty<LayerId,LayerNode>().edit(),layerIds=new Set<LayerId>(),surfaceIds=new Set<RasterSurfaceId>();
  for(const item of r.layers){const layer=parseLayer(item,blocks);if(layerIds.has(layer.id))throw new Error('duplicate layer id');if(surfaceIds.has(layer.surface.descriptor.surfaceId))throw new Error('duplicate surface id');layerIds.add(layer.id);surfaceIds.add(layer.surface.descriptor.surfaceId);edit.set(layer.id,layer);}
  const rootLayerIds=uuidArray(r.rootLayerIds,'root layer') as LayerId[];if(rootLayerIds.length!==layerIds.size||new Set(rootLayerIds).size!==rootLayerIds.length)throw new Error('root layer order mismatch');for(const id of rootLayerIds)if(!layerIds.has(id))throw new Error('root layer missing');
  return new DocumentRoot(documentId,width,height,name,colorProfileId,edit.commit(),rootLayerIds,{createdAt,modifiedAt});
}
function parseLayer(value:unknown,blocks:ReadonlyMap<BlockId,RasterBlockDescriptor>):LayerNode{
  const r=record(value,'layer'),id=uuid(r.id,'layer id') as LayerId;if(r.kind!=='raster')throw new Error('unsupported layer kind');const name=text(r.name,'layer name',1,4096);
  if(typeof r.visible!=='boolean'||typeof r.locked!=='boolean'||typeof r.opacity!=='number'||!Number.isFinite(r.opacity)||r.opacity<0||r.opacity>1)throw new Error('invalid layer state');
  const s=record(r.surface,'surface'),descriptor=parseSurfaceDescriptor(s.descriptor);if(!Array.isArray(s.tiles)||s.tiles.length>MAX_TILES_PER_ROOT)throw new Error('invalid surface tiles');
  const edit=PagedMap.empty<TileKey,RasterTileValue>().edit(),keys=new Set<string>();
  for(const item of s.tiles){const t=record(item,'tile'),key=text(t.key,'tile key',1,64) as TileKey;parseTileKey(key);if(keys.has(key))throw new Error('duplicate tile key');keys.add(key);
    const value=parseTileValue(t.value,blocks);edit.set(key,value);}
  return Object.freeze({id,kind:'raster' as const,name,visible:r.visible,opacity:r.opacity,locked:r.locked,surface:new RasterSurfaceManifest(descriptor,edit.commit())});
}
function parseSurfaceDescriptor(value:unknown):RasterSurfaceDescriptor{
  const d=record(value,'surface descriptor'),surfaceId=uuid(d.surfaceId,'surface id') as RasterSurfaceId,sampleEncoding=d.sampleEncoding;
  if(d.rasterSchemaVersion!==2||d.tileGridVersion!=='tile256.v2'||d.channelModel!=='RGBA'||d.alphaMode!=='straight'||d.sparseDefault!=='transparent-black'||!SAMPLE_ENCODINGS.has(sampleEncoding as RasterSampleEncoding))throw new Error('unsupported raster descriptor');
  const workingColorSpaceRef=text(d.workingColorSpaceRef,'working color space',1,4096);return Object.freeze({surfaceId,rasterSchemaVersion:2 as const,tileGridVersion:'tile256.v2' as const,channelModel:'RGBA' as const,sampleEncoding:sampleEncoding as RasterSampleEncoding,alphaMode:'straight' as const,workingColorSpaceRef,sparseDefault:'transparent-black' as const});
}
function parseTileValue(value:unknown,blocks:ReadonlyMap<BlockId,RasterBlockDescriptor>):RasterTileValue{
  const r=record(value,'tile value');let baseBlockId:BlockId|null=null;if(r.baseBlockId!==null){baseBlockId=uuid(r.baseBlockId,'base block') as BlockId;if(!blocks.has(baseBlockId))throw new Error('tile block dependency missing');}
  if(!Array.isArray(r.mutations)||r.mutations.length>4096)throw new Error('invalid tile mutations');const mutations=r.mutations.map(item=>{const m=record(item,'mutation'),operationKey=parseOperationKey(m.operationKey),bounds=parseBounds(m.bounds),workUnits=integer(m.workUnits,'workUnits',1);
    if(!Array.isArray(m.commandIndices)||m.commandIndices.length>1_000_000)throw new Error('invalid command indices');const commandIndices=m.commandIndices.map(x=>integer(x,'command index',0));return Object.freeze({operationKey,bounds,workUnits,commandIndices:Object.freeze(commandIndices)});});
  return Object.freeze({baseBlockId,mutations:Object.freeze(mutations)});
}
function parseOperation(value:unknown,transactionId:TransactionId,index:number,operationKeys:Set<string>):SemanticOperation{
  const o=record(value,'operation'),key=parseOperationKey(o.key);if(key.transactionId!==transactionId||key.operationOrdinal!==index)throw new Error('operation key ordering mismatch');const encodedKey=operationKeyText(key);if(operationKeys.has(encodedKey))throw new Error('duplicate operation key');operationKeys.add(encodedKey);
  const kind=text(o.kind,'operation kind',1,256);if(!KNOWN_OPERATION_KINDS.has(kind))throw new Error('unsupported required operation kind');const schemaVersion=integer(o.schemaVersion,'operation schema',1);
  const targetEntityIds=uuidArray(o.targetEntityIds,'target entity') as LayerId[],resourceRefs=uuidArray(o.resourceRefs,'resource') as ResourceId[],sourceRevisionIds=uuidArray(o.sourceRevisionIds,'source revision') as RevisionId[];
  const algorithmVersionRefs=textArray(o.algorithmVersionRefs,'algorithm version',512,4096),selectionSnapshotRefs=textArray(o.selectionSnapshotRefs,'selection snapshot',512,4096),resultValueRefs=textArray(o.resultValueRefs,'result value',1_000_000,4096);
  const parameters=record(o.parameters,'operation parameters');if(!Array.isArray(o.dirtyFootprint)||o.dirtyFootprint.length>1_000_000)throw new Error('invalid dirty footprint');
  const dirtyFootprint=o.dirtyFootprint.map(item=>{const f=record(item,'dirty footprint'),layerId=uuid(f.layerId,'dirty layer') as LayerId,tileX=tileCoord(f.tileX),tileY=tileCoord(f.tileY),bounds=parseBounds(f.bounds);return Object.freeze({layerId,tileX,tileY,bounds});});
  return Object.freeze({key,kind,schemaVersion,targetEntityIds:Object.freeze(targetEntityIds),parameters:Object.freeze(parameters),algorithmVersionRefs:Object.freeze(algorithmVersionRefs),resourceRefs:Object.freeze(resourceRefs),sourceRevisionIds:Object.freeze(sourceRevisionIds),selectionSnapshotRefs:Object.freeze(selectionSnapshotRefs),resultValueRefs:Object.freeze(resultValueRefs),dirtyFootprint:Object.freeze(dirtyFootprint)});
}
function validateMutationRefs(root:DocumentRoot,operationKeys:ReadonlySet<string>,blocks:ReadonlyMap<BlockId,RasterBlockDescriptor>){
  for(const [,layer] of root.layers.entries())for(const [,value] of layer.surface.tiles.entries()){if(value.baseBlockId&&!blocks.has(value.baseBlockId))throw new Error('root block dependency missing');for(const mutation of value.mutations)if(!operationKeys.has(operationKeyText(mutation.operationKey)))throw new Error('raster mutation operation missing');}
}
function parseOperationKey(value:unknown):OperationKey{const k=record(value,'operation key'),transactionId=uuid(k.transactionId,'operation transaction') as TransactionId,operationOrdinal=integer(k.operationOrdinal,'operation ordinal',0);if(operationOrdinal>0xffffffff)throw new Error('operation ordinal overflow');return Object.freeze({transactionId,operationOrdinal});}
function operationKeyText(key:OperationKey){return key.transactionId+':'+key.operationOrdinal;}
function parseBlockDescriptor(value:unknown):RasterBlockDescriptor{const d=record(value,'block descriptor'),sampleEncoding=d.sampleEncoding;if(!SAMPLE_ENCODINGS.has(sampleEncoding as RasterSampleEncoding))throw new Error('unsupported block encoding');return Object.freeze({sampleEncoding:sampleEncoding as RasterSampleEncoding,bounds:parseBounds(d.bounds)});}
function validateBlockBytes(descriptor:RasterBlockDescriptor,bytes:Uint8Array){const channels=descriptor.sampleEncoding==='rgba.unorm8.v1'?4:descriptor.sampleEncoding==='rgba.unorm16.v1'?8:16,b=descriptor.bounds,expected=(b.x1-b.x0)*(b.y1-b.y0)*channels;if(bytes.byteLength!==expected)throw new Error('block byte length mismatch');}
function parseBounds(value:unknown){const b=record(value,'bounds'),x0=integer(b.x0,'x0',0),y0=integer(b.y0,'y0',0),x1=integer(b.x1,'x1',0),y1=integer(b.y1,'y1',0);if(x1>x0&&y1>y0&&x1<=256&&y1<=256)return Object.freeze({x0,y0,x1,y1});throw new Error('invalid bounds');}
function record(value:unknown,name:string):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('invalid '+name);return value as Record<string,unknown>;}
function uuid(value:unknown,name:string){const s=text(value,name,1,64);if(!UUID_V4.test(s))throw new Error('invalid '+name);return s;}
function uuidArray(value:unknown,name:string){if(!Array.isArray(value)||value.length>1_000_000)throw new Error('invalid '+name+' list');return value.map(x=>uuid(x,name));}
function text(value:unknown,name:string,min:number,max:number){if(typeof value!=='string'||value.length<min||value.length>max||/[\u0000-\u001f]/.test(value))throw new Error('invalid '+name);return value;}
function textArray(value:unknown,name:string,maxItems:number,maxText:number){if(!Array.isArray(value)||value.length>maxItems)throw new Error('invalid '+name+' list');return value.map(x=>text(x,name,1,maxText));}
function integer(value:unknown,name:string,min:number){if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min)throw new Error('invalid '+name);return value;}
function dimension(value:unknown){const n=integer(value,'dimension',1);if(n>MAX_DIMENSION)throw new Error('dimension too large');return n;}
function tileCoord(value:unknown){const n=integer(value,'tile coordinate',-2147483648);if(n>2147483647)throw new Error('invalid tile coordinate');return n;}


export type PersistedPersistenceHandoff=Readonly<{
  schemaVersion:2;writerEpochId:string;commitSequence:string;transactionId:string;parentRevisionIds:readonly string[];resultRevisionId:string;
  documentId:string;semanticOperationRefs:readonly Readonly<{transactionId:string;operationOrdinal:number}>[];requiredBlockIds:readonly string[];
  requiredResourceIds:readonly string[];requiredAlgorithmVersionRefs:readonly string[];
}>;
export type RecoveryTileChange=Readonly<
  {mode:'append-mutation';layerId:string;key:string;mutation:RasterMutationRef}|
  {mode:'set-block';layerId:string;key:string;blockId:string}
>;
export type RecoveryLayerState=Readonly<{id:string;name:string;visible:boolean;opacity:number;locked:boolean;surfaceDescriptor:RasterSurfaceDescriptor}>;
export type CoreRecoveryPacketV1=Readonly<{
  schema:'illustro.core.recovery-packet';schemaVersion:1;handoff:PersistedPersistenceHandoff;
  revision:Readonly<{id:string;parentIds:readonly string[];transactionId:string;command:Command;commitStamp:Readonly<{writerEpochId:string;commitSequence:string}>;committedAt:number}>;
  modifiedAt:number;layerStates:readonly RecoveryLayerState[];rootLayerIds:readonly string[]|null;tileChanges:readonly RecoveryTileChange[];blocks:readonly PersistedBlockDescriptor[];
}>;

export function captureCoreRecoveryPacket(history:RevisionHistoryState<DocumentRoot>,store:CanonicalTileStore,handoff:PersistenceHandoff):CoreRecoveryPacketV1{
  const revision=history.revisions.find(item=>item.id===handoff.resultRevisionId);if(!revision||!revision.command||!revision.commitStamp)throw new Error('recovery revision missing');
  if(revision.commitStamp.writerEpochId!==handoff.commitStamp.writerEpochId||revision.commitStamp.commitSequence!==handoff.commitStamp.commitSequence)throw new Error('recovery handoff stamp mismatch');
  if(revision.parentIds.length!==handoff.parentRevisionIds.length||revision.parentIds.some((id,i)=>id!==handoff.parentRevisionIds[i]))throw new Error('recovery parent mismatch');
  const layerStates:RecoveryLayerState[]=[],layerStateIds=new Set<string>(),tileChanges:RecoveryTileChange[]=[];let structural=false;
  for(const operation of revision.command.operations){
    const layerId=operation.targetEntityIds[0];if(!layerId)throw new Error('recovery operation target missing');const layer=revision.root.getLayer(layerId);
    if(operation.kind==='layer.metadata'||operation.kind==='layer.add-raster'){
      if(!layerStateIds.has(layerId)){layerStateIds.add(layerId);layerStates.push(Object.freeze({id:layer.id,name:layer.name,visible:layer.visible,opacity:layer.opacity,locked:layer.locked,surfaceDescriptor:layer.surface.descriptor}));}
      if(operation.kind==='layer.add-raster')structural=true;
    }else if(operation.kind==='brush.stroke'){
      for(const footprint of operation.dirtyFootprint){const key=`${footprint.tileX},${footprint.tileY}`,value=layer.surface.tiles.get(key);if(!value)throw new Error('recovery brush tile missing');
        const mutation=[...value.mutations].reverse().find(item=>operationKeyText(item.operationKey)===operationKeyText(operation.key));if(!mutation)throw new Error('recovery brush mutation missing');
        tileChanges.push(Object.freeze({mode:'append-mutation' as const,layerId,key,mutation}));}
    }else if(operation.kind==='raster.strict-delta'){
      for(const footprint of operation.dirtyFootprint){const key=`${footprint.tileX},${footprint.tileY}`,value=layer.surface.tiles.get(key);if(!value?.baseBlockId||value.mutations.length)throw new Error('recovery strict block missing');
        tileChanges.push(Object.freeze({mode:'set-block' as const,layerId,key,blockId:value.baseBlockId}));}
    }else throw new Error('unsupported recovery operation');
  }
  const blocks=Object.freeze(handoff.requiredBlockIds.map(id=>Object.freeze({id,descriptor:store.descriptor(id)})));
  const persistedHandoff:PersistedPersistenceHandoff=Object.freeze({schemaVersion:2 as const,writerEpochId:handoff.commitStamp.writerEpochId,commitSequence:handoff.commitStamp.commitSequence.toString(),
    transactionId:handoff.transactionId,parentRevisionIds:Object.freeze([...handoff.parentRevisionIds]),resultRevisionId:handoff.resultRevisionId,documentId:handoff.documentRootRef.documentId,
    semanticOperationRefs:Object.freeze(handoff.semanticOperationRefs.map(key=>Object.freeze({transactionId:key.transactionId,operationOrdinal:key.operationOrdinal}))),requiredBlockIds:Object.freeze([...handoff.requiredBlockIds]),
    requiredResourceIds:Object.freeze([...handoff.requiredResourceIds]),requiredAlgorithmVersionRefs:Object.freeze([...handoff.requiredAlgorithmVersionRefs])});
  return Object.freeze({schema:'illustro.core.recovery-packet' as const,schemaVersion:1 as const,handoff:persistedHandoff,
    revision:Object.freeze({id:revision.id,parentIds:Object.freeze([...revision.parentIds]),transactionId:revision.transactionId!,command:revision.command,
      commitStamp:Object.freeze({writerEpochId:revision.commitStamp.writerEpochId,commitSequence:revision.commitStamp.commitSequence.toString()}),committedAt:revision.committedAt}),
    modifiedAt:revision.root.metadata.modifiedAt,layerStates:Object.freeze(layerStates),rootLayerIds:structural?Object.freeze([...revision.root.rootLayerIds]):null,tileChanges:Object.freeze(tileChanges),blocks});
}

export function mergeCoreRecovery(baseValue:unknown,packetValues:readonly unknown[],headRevisionId?:string):CorePersistenceSnapshotV1{
  const base=record(baseValue,'recovery base') as unknown as CorePersistenceSnapshotV1;if(base.schema!=='illustro.core.snapshot'||base.schemaVersion!==1||!Array.isArray(base.revisions)||!Array.isArray(base.blocks))throw new Error('invalid recovery base');
  const revisions:PersistedRevision[]=[...base.revisions],revisionMap=new Map<string,PersistedRevision>(revisions.map(item=>[item.id,item])),blocks:PersistedBlockDescriptor[]=[...base.blocks],blockIds=new Set(blocks.map(item=>item.id));
  let latest=base.snapshotRevisionId,lastSequence=0n,epoch:string|null=null;
  for(const packetValue of packetValues){
    const packet=parseRecoveryPacket(packetValue);const seq=BigInt(packet.handoff.commitSequence);if(epoch===null)epoch=packet.handoff.writerEpochId;else if(epoch!==packet.handoff.writerEpochId)throw new Error('mixed recovery writer epochs');
    if(seq!==lastSequence+1n)throw new Error('recovery packet sequence gap');lastSequence=seq;if(revisionMap.has(packet.revision.id))throw new Error('duplicate recovery revision');
    const parentId=packet.revision.parentIds[0];if(!parentId)throw new Error('recovery revision parent missing');const parent=revisionMap.get(parentId);if(!parent)throw new Error('recovery parent unavailable');
    const root=applyRootDelta(parent.root,packet);const revision:Object=Object.freeze({...packet.revision,root});
    revisions.push(revision as PersistedRevision);revisionMap.set(packet.revision.id,revision as PersistedRevision);
    for(const block of packet.blocks){if(blockIds.has(block.id))continue;blockIds.add(block.id);blocks.push(block);}
    latest=packet.revision.id;
  }
  const selectedHead=headRevisionId&&revisionMap.has(headRevisionId)?headRevisionId:latest;
  return Object.freeze({schema:'illustro.core.snapshot' as const,schemaVersion:1 as const,snapshotRevisionId:selectedHead,revisions:Object.freeze(revisions),blocks:Object.freeze(blocks)});
}

function parseRecoveryPacket(value:unknown):CoreRecoveryPacketV1{
  const p=record(value,'recovery packet');if(p.schema!=='illustro.core.recovery-packet'||p.schemaVersion!==1)throw new Error('unsupported recovery packet');const h=record(p.handoff,'recovery handoff');
  if(h.schemaVersion!==2)throw new Error('unsupported recovery handoff');const writerEpochId=uuid(h.writerEpochId,'writer epoch'),commitSequence=text(h.commitSequence,'commit sequence',1,32);if(!/^[1-9][0-9]*$/.test(commitSequence))throw new Error('invalid recovery commit sequence');
  const transactionId=uuid(h.transactionId,'transaction id'),resultRevisionId=uuid(h.resultRevisionId,'result revision'),documentId=uuid(h.documentId,'document id'),parentRevisionIds=uuidArray(h.parentRevisionIds,'parent revision');
  if(!Array.isArray(h.requiredBlockIds)||!Array.isArray(h.requiredResourceIds)||!Array.isArray(h.requiredAlgorithmVersionRefs)||!Array.isArray(h.semanticOperationRefs))throw new Error('invalid recovery dependency list');
  const requiredBlockIds=h.requiredBlockIds.map(x=>uuid(x,'required block')),requiredResourceIds=h.requiredResourceIds.map(x=>uuid(x,'required resource')),requiredAlgorithmVersionRefs=h.requiredAlgorithmVersionRefs.map(x=>text(x,'required algorithm',1,4096));
  const semanticOperationRefs=h.semanticOperationRefs.map(x=>{const k=parseOperationKey(x);return Object.freeze({transactionId:k.transactionId,operationOrdinal:k.operationOrdinal});});
  const revision=record(p.revision,'recovery revision');if(uuid(revision.id,'revision id')!==resultRevisionId||revision.transactionId!==transactionId)throw new Error('recovery revision identity mismatch');
  const revisionParentIds=uuidArray(revision.parentIds,'revision parent');if(revisionParentIds.length!==parentRevisionIds.length||revisionParentIds.some((id,i)=>id!==parentRevisionIds[i]))throw new Error('recovery parent mismatch');
  const stamp=record(revision.commitStamp,'recovery commit stamp');if(stamp.writerEpochId!==writerEpochId||stamp.commitSequence!==commitSequence)throw new Error('recovery stamp mismatch');
  const committedAt=integer(revision.committedAt,'committedAt',0),command=revision.command as Command;if(!command||command.version!==2||command.kind!=='core.transaction.v2')throw new Error('invalid recovery command');
  const modifiedAt=integer(p.modifiedAt,'modifiedAt',0);if(!Array.isArray(p.layerStates)||!Array.isArray(p.tileChanges)||!Array.isArray(p.blocks))throw new Error('invalid recovery delta');
  const layerStates=p.layerStates.map(x=>{const s=record(x,'recovery layer state'),id=uuid(s.id,'layer id'),name=text(s.name,'layer name',1,4096);if(typeof s.visible!=='boolean'||typeof s.locked!=='boolean'||typeof s.opacity!=='number'||s.opacity<0||s.opacity>1)throw new Error('invalid recovery layer state');return Object.freeze({id,name,visible:s.visible,opacity:s.opacity,locked:s.locked,surfaceDescriptor:parseSurfaceDescriptor(s.surfaceDescriptor)});});
  const rootLayerIds=p.rootLayerIds===null?null:Object.freeze(uuidArray(p.rootLayerIds,'root layer'));
  const tileChanges=p.tileChanges.map(x=>{const t=record(x,'recovery tile change'),layerId=uuid(t.layerId,'layer id'),key=text(t.key,'tile key',1,64);parseTileKey(key as TileKey);
    if(t.mode==='set-block')return Object.freeze({mode:'set-block' as const,layerId,key,blockId:uuid(t.blockId,'block id')});if(t.mode==='append-mutation'){const m=record(t.mutation,'mutation'),mutation:Object=Object.freeze({operationKey:parseOperationKey(m.operationKey),bounds:parseBounds(m.bounds),workUnits:integer(m.workUnits,'workUnits',1),commandIndices:Object.freeze(Array.isArray(m.commandIndices)?m.commandIndices.map(i=>integer(i,'command index',0)):(()=>{throw new Error('invalid command indices')})())});return Object.freeze({mode:'append-mutation' as const,layerId,key,mutation:mutation as RasterMutationRef});}throw new Error('invalid recovery tile change');});
  const packetBlocks=p.blocks.map(x=>{const b=record(x,'recovery block'),id=uuid(b.id,'block id'),descriptor=parseBlockDescriptor(b.descriptor);return Object.freeze({id,descriptor});});
  const handoff=Object.freeze({schemaVersion:2 as const,writerEpochId,commitSequence,transactionId,parentRevisionIds:Object.freeze(parentRevisionIds),resultRevisionId,documentId,semanticOperationRefs:Object.freeze(semanticOperationRefs),requiredBlockIds:Object.freeze(requiredBlockIds),requiredResourceIds:Object.freeze(requiredResourceIds),requiredAlgorithmVersionRefs:Object.freeze(requiredAlgorithmVersionRefs)});
  return Object.freeze({schema:'illustro.core.recovery-packet' as const,schemaVersion:1 as const,handoff,revision:Object.freeze({id:resultRevisionId,parentIds:Object.freeze(revisionParentIds),transactionId,command,commitStamp:Object.freeze({writerEpochId,commitSequence}),committedAt}),modifiedAt,layerStates:Object.freeze(layerStates),rootLayerIds,tileChanges:Object.freeze(tileChanges),blocks:Object.freeze(packetBlocks)});
}

function applyRootDelta(parent:PersistedRoot,packet:CoreRecoveryPacketV1):PersistedRoot{
  const layers=parent.layers.map(layer=>({...layer,surface:{descriptor:layer.surface.descriptor,tiles:[...layer.surface.tiles]}})) as Array<{id:string;kind:'raster';name:string;visible:boolean;opacity:number;locked:boolean;surface:{descriptor:RasterSurfaceDescriptor;tiles:Array<{key:string;value:RasterTileValue}>}}>;
  for(const state of packet.layerStates){let layer=layers.find(x=>x.id===state.id);if(!layer){layer={id:state.id,kind:'raster',name:state.name,visible:state.visible,opacity:state.opacity,locked:state.locked,surface:{descriptor:state.surfaceDescriptor,tiles:[]}};layers.push(layer);}
    else{layer.name=state.name;layer.visible=state.visible;layer.opacity=state.opacity;layer.locked=state.locked;if(layer.surface.descriptor.surfaceId!==state.surfaceDescriptor.surfaceId)throw new Error('recovery surface identity changed');}}
  for(const change of packet.tileChanges){const layer=layers.find(x=>x.id===change.layerId);if(!layer)throw new Error('recovery tile layer missing');const index=layer.surface.tiles.findIndex(x=>x.key===change.key),previous=index>=0?layer.surface.tiles[index]!.value:Object.freeze({baseBlockId:null,mutations:Object.freeze([])});
    let value:RasterTileValue;if(change.mode==='set-block')value=Object.freeze({baseBlockId:change.blockId as BlockId,mutations:Object.freeze([])});else value=Object.freeze({baseBlockId:previous.baseBlockId,mutations:Object.freeze([...previous.mutations,change.mutation])});
    const entry={key:change.key,value};if(index>=0)layer.surface.tiles[index]=entry;else layer.surface.tiles.push(entry);}
  const rootLayerIds=packet.rootLayerIds??parent.rootLayerIds;return Object.freeze({...parent,modifiedAt:packet.modifiedAt,rootLayerIds:Object.freeze([...rootLayerIds]),layers:Object.freeze(layers.map(layer=>Object.freeze({...layer,surface:Object.freeze({descriptor:layer.surface.descriptor,tiles:Object.freeze(layer.surface.tiles.map(item=>Object.freeze(item)))})})))});
}
