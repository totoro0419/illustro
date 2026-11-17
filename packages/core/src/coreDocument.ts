import {cryptoIdFactory,type IdFactory,type LayerId,type RevisionId,type WriterEpochId} from './ids';
import {RevisionHistory,type Command} from './history';
import {DocumentRoot,rasterLayer,validateDocumentInfo} from './model';
import {PagedMap} from './pagedMap';
import {blockPayloadsForSnapshot,captureCoreRecoveryPacket,captureCoreSnapshot,parseCoreSnapshot,restoreBlocks,type CorePersistenceSnapshotV1,type CoreRecoveryPacketV1} from './persistence';
import {CanonicalTileStore,type OwnershipTransfer} from './raster/store';
import {bytesPerPixel,CANONICAL_TILE_SIZE,pixelToTile,parseTileKey,type RasterSampleEncoding} from './raster/surface';
import {DocumentTransaction} from './transaction';
import type {PersistenceHandoff} from './recovery';
import {CORE_INTERNAL,type CoreInternalToken} from './internal';

export type CoreOptions=Readonly<{width:number;height:number;name?:string;colorProfileId?:string;sampleEncoding?:RasterSampleEncoding;blankBackground?:'white';emptyDrawingLayer?:boolean;dpi?:number;author?:string;description?:string;ids?:IdFactory;clock?:()=>number;transfer?:OwnershipTransfer}>;
export type CoreRestoreOptions=Readonly<{snapshot:unknown;blockPayloads:ReadonlyMap<string,Uint8Array>;ids?:IdFactory;clock?:()=>number;transfer?:OwnershipTransfer}>;
export class CoreDocument{
  readonly tileSize=CANONICAL_TILE_SIZE;readonly tileBytes:number;private readonly idsValue:IdFactory;private readonly clockValue:()=>number;
  private readonly storeValue:CanonicalTileStore;private readonly historyValue:RevisionHistory<DocumentRoot>;private commitSequenceValue=0n;
  readonly writerEpochId:WriterEpochId;readonly defaultRasterLayerId:LayerId;
  constructor(o:CoreOptions|CoreRestoreOptions){
    this.idsValue=o.ids??cryptoIdFactory;this.clockValue=o.clock??(()=>Date.now());this.writerEpochId=this.idsValue.writerEpoch();this.storeValue=new CanonicalTileStore(this.idsValue,o.transfer);
    if('snapshot' in o){
      const parsed=parseCoreSnapshot(o.snapshot,o.blockPayloads,this.idsValue);restoreBlocks(this.storeValue,o.snapshot,o.blockPayloads);this.historyValue=RevisionHistory.hydrate(parsed.history,this.idsValue);this.defaultRasterLayerId=parsed.defaultRasterLayerId;
      const first=this.root.getLayer(this.defaultRasterLayerId),sampleEncoding=first.surface.descriptor.sampleEncoding;this.tileBytes=CANONICAL_TILE_SIZE*CANONICAL_TILE_SIZE*bytesPerPixel(sampleEncoding);return;
    }
    validSize(o.width);validSize(o.height);const sampleEncoding=o.sampleEncoding??'rgba.unorm8.v1';this.tileBytes=CANONICAL_TILE_SIZE*CANONICAL_TILE_SIZE*bytesPerPixel(sampleEncoding);
    const id=this.idsValue.layer(),plain=rasterLayer(id,this.idsValue.surface(),o.colorProfileId??'srgb',sampleEncoding,'Layer 1'),layer=o.blankBackground==='white'?Object.freeze({...plain,name:'背景',baseColor:'white' as const}):o.emptyDrawingLayer?Object.freeze({...plain,implicitRaster:true}):plain,e=PagedMap.empty<LayerId,typeof layer>().edit();e.set(id,layer);
    const now=this.clockValue(),name=o.name??'Untitled';
    const info=o.dpi!==undefined||o.author!==undefined||o.description!==undefined
      ?validateDocumentInfo({name,author:o.author??'',description:o.description??'',dpi:o.dpi??null}):null;
    const root=new DocumentRoot(this.idsValue.document(),o.width,o.height,info?.name??name,o.colorProfileId??'srgb',e.commit(),[id],
      {createdAt:now,modifiedAt:now,...(info?.author?{author:info.author}:{}),
       ...(info?.description?{description:info.description}:{}),...(info?.dpi?{dpi:info.dpi}:{})});
    this.defaultRasterLayerId=id;this.historyValue=new RevisionHistory(root,this.idsValue,now);
  }
  static restore(options:CoreRestoreOptions){return new CoreDocument(options);}
  get root(){return this.historyValue.current.root;}get head(){return this.historyValue.head;}get revisionCount(){return this.historyValue.count;}get currentRevision(){return this.historyValue.current;}
  get canUndo(){return this.historyValue.canUndo;}
  get historyUndoLimit(){return this.historyValue.undoLimit;}
  setHistoryUndoLimit(limit:number|null){this.historyValue.setUndoLimit(limit);}get canRedo(){return this.historyValue.canRedo;}
  get commitSequence(){return this.commitSequenceValue;}get canonicalBlockCount(){return this.storeValue.blockCount;}get canonicalRasterBytes(){return this.storeValue.allocatedBytes;}
  begin(label:string){return new DocumentTransaction(this,label);}
  beginAdjustment(replaced:RevisionId,label:string){
    if(this.head!==replaced||!this.currentRevision.parentIds[0])
      throw Error('直近の編集が変わったため調整できません。');
    return new DocumentTransaction(this,label,replaced);
  }
  addRasterLayerAbove(referenceId:LayerId){const tx=this.begin('Add raster layer'),layerId=tx.addRasterLayerAbove(referenceId),receipt=tx.commit();return Object.freeze({layerId,receipt});}
  historyCleanupCandidates(){
    const state=this.historyValue.snapshot(),keep=this.retainedHistoryIds(state);
    return this.historyEntries().filter(entry=>!keep.has(entry.id));
  }
  private retainedHistoryIds(state:ReturnType<RevisionHistory<DocumentRoot>['snapshot']>){
    const all=new Map(state.revisions.map(revision=>[revision.id,revision] as const)),keep=new Set<RevisionId>();
    const pending=[state.head,...state.redoIds];
    for(const revision of state.revisions){
      if(revision.command?.operations.some(operation=>operation.kind==='document.pin-revision'||operation.kind==='document.history-restore')){
        pending.push(revision.id);
      }
    }
    while(pending.length){
      const id=pending.pop()!;
      if(keep.has(id))continue;
      const revision=all.get(id);
      if(!revision)throw new Error('履歴の参照先が見つかりません。');
      keep.add(id);
      pending.push(...revision.parentIds);
      for(const operation of revision.command?.operations??[])pending.push(...operation.sourceRevisionIds);
      for(const layerId of revision.root.rootLayerIds){
        const regions=revision.root.getLayer(layerId).lineRegions;
        if(regions)pending.push(regions.sourceRevision);
      }
    }
    return keep;
  }
  forkCopy(name:string,removeDetachedHistory=false){
    const state=this.historyValue.snapshot(),keep=removeDetachedHistory?this.retainedHistoryIds(state):null;
    const history=keep?{...state,revisions:state.revisions.filter(revision=>keep.has(revision.id))}:state;
    const snapshot=captureCoreSnapshot(history,this.storeValue,state.head),documentId=this.idsValue.document();
    const title=validateDocumentInfo({...this.root.info,name}).name;
    const revisions=snapshot.revisions.map(revision=>Object.freeze({...revision,root:Object.freeze({...revision.root,documentId,...(revision.id===this.head?{name:title}:{})})}));
    return CoreDocument.restore({snapshot:{...snapshot,revisions},blockPayloads:this.persistenceBlockPayloads(snapshot)});
  }
  undo(){return this.historyValue.undo();}redo(){return this.historyValue.redo();}hasRevision(id:RevisionId){return this.historyValue.has(id);}revision(id:RevisionId){return this.historyValue.get(id);}
  historyEntries(){
    return this.historyValue.snapshot().revisions.map(({id,parentIds,command,committedAt})=>{
      const pin=command?.operations.find(operation=>operation.kind==='document.pin-revision');
      const snapshot=pin&&typeof pin.parameters.name==='string'&&typeof pin.parameters.note==='string'
        ?{name:pin.parameters.name,note:pin.parameters.note}:undefined;
      return {id,parentIds,label:command?.label??'作品を作成',committedAt,snapshot};
    });
  }
  capturePersistenceSnapshot(revisionId:RevisionId=this.head):CorePersistenceSnapshotV1{return captureCoreSnapshot(this.historyValue.snapshot(),this.storeValue,revisionId);}
  captureSaveSnapshot(revisionId:RevisionId,requestedThrough:bigint):CorePersistenceSnapshotV1{
    const state=this.historyValue.snapshot(),stamp=this.revision(revisionId).commitStamp;
    const through=stamp?.writerEpochId===this.writerEpochId&&stamp.commitSequence>requestedThrough
      ?stamp.commitSequence:requestedThrough;
    const revisions=state.revisions.filter(revision=>{
      const committed=revision.commitStamp;
      return committed?.writerEpochId!==this.writerEpochId||committed.commitSequence<=through;
    });
    const allowed=new Set(revisions.map(revision=>revision.id));
    const redoIds=state.redoIds.filter(id=>allowed.has(id));
    return captureCoreSnapshot({...state,revisions,redoIds},this.storeValue,revisionId);
  }
  persistenceBlockPayloads(snapshot:CorePersistenceSnapshotV1){return blockPayloadsForSnapshot(snapshot,this.storeValue);}
  captureRecoveryPacket(handoff:PersistenceHandoff):CoreRecoveryPacketV1{return captureCoreRecoveryPacket(this.historyValue.snapshot(),this.storeValue,handoff);}
  recoveryBlockPayloads(packet:CoreRecoveryPacketV1){const out=new Map<string,Uint8Array>();for(const block of packet.blocks)out.set(block.id,this.storeValue.readCopy(block.id as never));return out;}
  operationsTo(revisionId:RevisionId=this.head){
    const commands:Command[]=[],visiting=new Set<RevisionId>();
    let current=this.historyValue.get(revisionId);
    while(current.parentIds[0]){
      if(visiting.has(current.id))throw new Error('revision cycle');
      visiting.add(current.id);
      const command=current.command;
      const restore=command?.operations.find(operation=>operation.kind==='document.history-restore');
      if(command)commands.push(command);
      current=this.historyValue.get(restore?.sourceRevisionIds[0]??current.parentIds[0]);
    }
    commands.reverse();return Object.freeze(commands.flatMap(command=>command.operations));
  }
  rasterReplayPlan(revisionId:RevisionId=this.head){
    const operations=this.operationsTo(revisionId);
    const geometryIndex=operations.findLastIndex(op=>op.kind==='document.crop'||op.kind==='document.canvas-resize'||op.kind==='document.image-resize');
    const visible=operations.slice(geometryIndex+1),baselines=new Map<LayerId,number>();
    visible.forEach((operation,index)=>{
      const layer=operation.targetEntityIds[0];
      if(operation.kind==='layer.snapshot'&&layer)baselines.set(layer,index);
    });
    return {
      followsGeometry:geometryIndex>=0,
      seededLayers:new Set(baselines.keys()),
      operations:visible.filter((op,index)=>{
        const layer=op.targetEntityIds[0];
        return op.kind!=='brush.stroke'||!layer||index>(baselines.get(layer)??-1);
      }),
    };
  }
  /** Geometry checkpoints contain exact base raster blocks, independent of brush history replay. */
  readBaseRasterPixels(layerId:LayerId,revisionId:RevisionId=this.head){
    const root=this.revision(revisionId).root,layer=root.getLayer(layerId);if(layer.surface.descriptor.sampleEncoding!=='rgba.unorm8.v1')throw new Error('unsupported encoding');
    const out=new Uint8Array(root.width*root.height*4),T=CANONICAL_TILE_SIZE;if(layer.baseColor==='white')out.fill(255);
    for(const [key,value] of layer.surface.tiles.entries()){if(!value.baseBlockId)continue;const [tx,ty]=parseTileKey(key);
      if(tx<0||ty<0||tx*T>=root.width||ty*T>=root.height)continue;
      const b=this.storeValue.readCopy(value.baseBlockId),copyW=Math.min(T,root.width-tx*T),copyH=Math.min(T,root.height-ty*T);
      for(let row=0;row<copyH;row++)out.set(b.subarray(row*T*4,(row*T+copyW)*4),((ty*T+row)*root.width+tx*T)*4);
    }return out;
  }
  /** Lossless sparse renderer tiles for a materialized baseline.
   * Splits 256px Core blocks into 128px display-worker tiles without ever
   * allocating the full canvas-sized RGBA image. */
  readBaseRasterTiles(layerId:LayerId,revisionId:RevisionId=this.head){
    const root=this.revision(revisionId).root,layer=root.getLayer(layerId);
    if(layer.baseColor==='white')throw new Error('White background needs the ordinary geometry seed');
    if(layer.surface.descriptor.sampleEncoding!=='rgba.unorm8.v1')throw new Error('unsupported encoding');
    const size=128,canonical=CANONICAL_TILE_SIZE,out:Array<{key:string;pixels:Uint8Array}>=[];
    if(canonical%size!==0)throw new Error('unsupported sparse seed tile size');
    for(const [key,value] of layer.surface.tiles.entries()){
      if(!value.baseBlockId)continue;
      if(value.mutations.length)throw new Error('strict raster materialization pending');
      const [tileX,tileY]=parseTileKey(key),left=tileX*canonical,top=tileY*canonical;
      if(left<0||top<0||left>=root.width||top>=root.height)continue;
      const block=this.storeValue.readCopy(value.baseBlockId);
      for(let dy=0;dy<canonical&&top+dy<root.height;dy+=size)
        for(let dx=0;dx<canonical&&left+dx<root.width;dx+=size){
          const pixels=new Uint8Array(size*size*4),width=Math.min(size,root.width-left-dx),height=Math.min(size,root.height-top-dy);
          for(let row=0;row<height;row++)pixels.set(
            block.subarray(((dy+row)*canonical+dx)*4,((dy+row)*canonical+dx+width)*4),
            row*size*4
          );
          if(pixels.some(value=>value!==0))out.push({key:((left+dx)/size)+','+((top+dy)/size),pixels});
        }
    }
    return out;
  }
  getTileValue(layerId:LayerId,tileX:number,tileY:number){return this.root.getLayer(layerId).surface.getValue(tileX,tileY);}
  readPixel(layerId:LayerId,x:number,y:number){if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y))throw new Error('invalid pixel coordinate');const l=this.root.getLayer(layerId);
    if(l.surface.descriptor.sampleEncoding!=='rgba.unorm8.v1')throw new Error('readPixel helper only supports rgba.unorm8.v1');const tx=pixelToTile(x),ty=pixelToTile(y),value=l.surface.getValue(tx.tile,ty.tile);
    if(!value)return l.baseColor==='white'?[255,255,255,255] as const:[0,0,0,0] as const;if(value.mutations.length)throw new Error('strict raster materialization pending');if(value.baseBlockId===null)return [0,0,0,0] as const;
    const b=this.storeValue.readCopy(value.baseBlockId),p=(ty.local*CANONICAL_TILE_SIZE+tx.local)*4;return [b[p]??0,b[p+1]??0,b[p+2]??0,b[p+3]??0] as const;}
  _internal(token:CoreInternalToken){if(token!==CORE_INTERNAL)throw new Error('invalid internal capability');return {ids:this.idsValue,clock:this.clockValue,store:this.storeValue,history:this.historyValue,
    nextCommitStamp:()=>Object.freeze({writerEpochId:this.writerEpochId,commitSequence:this.commitSequenceValue+1n}),acceptCommitSequence:(n:bigint)=>{if(n!==this.commitSequenceValue+1n)throw new Error('invalid commit sequence');this.commitSequenceValue=n;}};}
}
function validSize(n:number){if(!Number.isSafeInteger(n)||n<=0)throw new Error('invalid canvas size');}
