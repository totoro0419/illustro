import {operationKey,type LayerId,type OperationKey,type RasterSurfaceId,type TransactionId,type RevisionId} from './ids';
import {rasterLayer,type LayerNode} from './model';
import {RasterWorkingSet} from './raster/working';
import type {CoreDocument} from './coreDocument';
import {commitTransaction,type CommitReceipt} from './commit';
import {CORE_INTERNAL,type CoreInternalToken} from './internal';
import type {SemanticOperationDraft} from './history';
import {CANONICAL_TILE_SIZE,pixelToTile,tileKey,RasterSurfaceManifest,type DirtyTileHint} from './raster/surface';

export type DocumentGeometryKind='document.crop'|'document.canvas-resize'|'document.image-resize';
type OperationSlot=Readonly<{type:'dimensions';kind:DocumentGeometryKind;width:number;height:number;parameters:Readonly<Record<string,unknown>>}>|Readonly<{type:'working';layerId:LayerId}>|Readonly<{type:'metadata';layerId:LayerId}>|Readonly<{type:'structure';layerId:LayerId;surfaceId:RasterSurfaceId;insertIndex:number;name:string}>|Readonly<{type:'semantic';draft:SemanticOperationDraft;layerId:LayerId;key:OperationKey;dirtyTiles:readonly DirtyTileHint[]}>;
export type RasterSemanticMutation=Readonly<{kind:string;schemaVersion:number;parameters:Readonly<Record<string,unknown>>;algorithmVersionRefs?:readonly string[];resourceRefs?:SemanticOperationDraft['resourceRefs'];sourceRevisionIds?:readonly RevisionId[];selectionSnapshotRefs?:readonly string[];resultValueRefs?:readonly string[]}>;

export class DocumentTransaction{
  private readonly baseValue:RevisionId;private readonly rootValue;private readonly idValue:TransactionId;private readonly workingValue=new Map<LayerId,RasterWorkingSet>();
  private readonly updatesValue=new Map<LayerId,LayerNode>();private readonly slotsValue:OperationSlot[]=[];private rootOrderValue:LayerId[]|null=null;private closed=false;private failed=false;private dimensionUpdate:{width:number;height:number}|null=null;
  constructor(private readonly doc:CoreDocument,readonly label:string){if(!label.trim())throw new Error('empty transaction label');this.baseValue=doc.head;this.rootValue=doc.root;this.idValue=doc._internal(CORE_INTERNAL).ids.transaction();}
  get transactionId(){return this.idValue;}get baseRevision(){return this.baseValue;}
  addRasterLayerAbove(referenceId:LayerId):LayerId{
    this.open();const reference=this.updatesValue.get(referenceId)??this.rootValue.layers.get(referenceId);if(!reference)throw new Error('missing reference layer');if(reference.kind!=='raster')throw new Error('reference layer is not raster');
    const order=this.rootOrderValue??[...this.rootValue.rootLayerIds],index=order.indexOf(referenceId);if(index<0)throw new Error('reference layer is not in root order');
    const ids=this.doc._internal(CORE_INTERNAL).ids,layerId=ids.layer(),surfaceId=ids.surface();
    if(this.rootValue.layers.get(layerId)||this.updatesValue.has(layerId))throw new Error('duplicate layer id');
    for(const id of order){const layer=this.updatesValue.get(id)??this.rootValue.getLayer(id);if(layer.surface.descriptor.surfaceId===surfaceId)throw new Error('duplicate raster surface id');}
    const name=`Layer ${order.length+1}`,layer=rasterLayer(layerId,surfaceId,reference.surface.descriptor.workingColorSpaceRef,reference.surface.descriptor.sampleEncoding,name),insertIndex=index+1;
    const next=[...order];next.splice(insertIndex,0,layerId);this.rootOrderValue=next;this.updatesValue.set(layerId,layer);this.slotsValue.push(Object.freeze({type:'structure' as const,layerId,surfaceId,insertIndex,name}));return layerId;
  }
  editTile(layerId:LayerId,x:number,y:number,edit:(b:Uint8Array)=>void){this.open();tileKey(x,y);let w=this.workingValue.get(layerId);
    if(!w){const l=this.editableRaster(layerId);if(l.surface.descriptor.sampleEncoding!=='rgba.unorm8.v1')throw new Error('direct byte edit requires rgba.unorm8.v1');w=new RasterWorkingSet(l.surface,this.doc._internal(CORE_INTERNAL).store);this.workingValue.set(layerId,w);this.slotsValue.push(Object.freeze({type:'working' as const,layerId}));}
    try{w.editTile(x,y,edit);}catch(e){this.failed=true;throw e;}}
  setPixel(layerId:LayerId,x:number,y:number,rgba:readonly [number,number,number,number]){this.open();if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y))throw new Error('invalid pixel coordinate');for(const v of rgba)if(!Number.isInteger(v)||v<0||v>255)throw new Error('invalid channel');
    const tx=pixelToTile(x),ty=pixelToTile(y),p=(ty.local*CANONICAL_TILE_SIZE+tx.local)*4;this.editTile(layerId,tx.tile,ty.tile,b=>{b[p]=rgba[0];b[p+1]=rgba[1];b[p+2]=rgba[2];b[p+3]=rgba[3];});}
  recordRasterOperation(layerId:LayerId,mutation:RasterSemanticMutation,dirtyTiles:readonly DirtyTileHint[]):OperationKey{this.open();const layer=this.editableRaster(layerId);if(!dirtyTiles.length)throw new Error('semantic raster operation has no dirty tiles');for(const hint of dirtyTiles){tileKey(hint.tileX,hint.tileY);if(!Number.isSafeInteger(hint.workUnits)||hint.workUnits<=0)throw new Error('invalid raster work estimate');}
    const ordinal=this.slotsValue.length,key=operationKey(this.idValue,ordinal),footprint=Object.freeze(dirtyTiles.map(x=>Object.freeze({layerId,tileX:x.tileX,tileY:x.tileY,bounds:Object.freeze({...x.bounds})})));
    const draft:SemanticOperationDraft=Object.freeze({kind:mutation.kind,schemaVersion:mutation.schemaVersion,targetEntityIds:Object.freeze([layer.id]),parameters:Object.freeze({...mutation.parameters}),
      algorithmVersionRefs:Object.freeze([...(mutation.algorithmVersionRefs??[])]),resourceRefs:Object.freeze([...(mutation.resourceRefs??[])]),sourceRevisionIds:Object.freeze([...(mutation.sourceRevisionIds??[this.baseValue])]),
      selectionSnapshotRefs:Object.freeze([...(mutation.selectionSnapshotRefs??[])]),resultValueRefs:Object.freeze([...(mutation.resultValueRefs??[])]),dirtyFootprint:footprint});
    this.slotsValue.push(Object.freeze({type:'semantic' as const,draft,layerId,key,dirtyTiles:Object.freeze(dirtyTiles.map(x=>Object.freeze({...x,bounds:Object.freeze({...x.bounds}),...(x.commandIndices?{commandIndices:Object.freeze([...x.commandIndices])}:{})})))}));return key;}
  /** One atomic artwork revision. All layers are rebased onto their exact new pixel tiles. */
  resizeDocument(width:number,height:number,kind:DocumentGeometryKind,layerPixels:ReadonlyMap<LayerId,Uint8Array|Uint8ClampedArray>,parameters:Readonly<Record<string,unknown>>={}){
    this.open();if(this.slotsValue.length)throw new Error('geometry must be the only action in this transaction');
    if(!['document.crop','document.canvas-resize','document.image-resize'].includes(kind))throw new Error('unknown geometry action');
    if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>8192||height>8192)throw new Error('invalid canvas dimensions');
    if(layerPixels.size!==this.rootValue.rootLayerIds.length)throw new Error('each raster layer must be rebased');
    const byteLength=width*height*4,T=CANONICAL_TILE_SIZE;
    for(const id of this.rootValue.rootLayerIds){
      const layer=this.rootValue.getLayer(id),rgba=layerPixels.get(id);
      if(layer.surface.descriptor.sampleEncoding!=='rgba.unorm8.v1')throw new Error('unsupported direct raster sample encoding');
      if(!rgba||rgba.length!==byteLength)throw new Error('rebased raster dimensions mismatch');
      const empty=new RasterSurfaceManifest(layer.surface.descriptor);
      this.updatesValue.set(id,Object.freeze({...layer,surface:empty}));
      const working=new RasterWorkingSet(empty,this.doc._internal(CORE_INTERNAL).store);
      for(let ty=0;ty<Math.ceil(height/T);ty++)for(let tx=0;tx<Math.ceil(width/T);tx++){
        const tile=new Uint8Array(T*T*4),copyW=Math.min(T,width-tx*T),copyH=Math.min(T,height-ty*T);let filled=false;
        for(let row=0;row<copyH;row++){const segment=rgba.subarray(((ty*T+row)*width+tx*T)*4,((ty*T+row)*width+tx*T+copyW)*4);tile.set(segment,row*T*4);
          if(!filled){for(let i=0;i<segment.length;i++){if(segment[i]!==0){filled=true;break;}}}
        }
        if(filled)working.editTile(tx,ty,b=>b.set(tile));
      }
      if(working.changedTileCount){this.workingValue.set(id,working);this.slotsValue.push(Object.freeze({type:'working' as const,layerId:id}));}
    }
    this.dimensionUpdate={width,height};
    this.slotsValue.push(Object.freeze({type:'dimensions' as const,kind,width,height,parameters:Object.freeze({...parameters,fromWidth:this.rootValue.width,fromHeight:this.rootValue.height,toWidth:width,toHeight:height})}));
  }
  renameLayer(id:LayerId,name:string){this.meta(id,{name:name.trim()});}setLayerVisibility(id:LayerId,visible:boolean){this.meta(id,{visible});}setLayerLocked(id:LayerId,locked:boolean){this.meta(id,{locked});}
  commit():CommitReceipt{this.open();try{return commitTransaction(this);}catch(e){this.failed=true;throw e;}}
  cancel(){if(this.closed)throw new Error('transaction closed');this.workingValue.clear();this.updatesValue.clear();this.slotsValue.length=0;this.rootOrderValue=null;this.dimensionUpdate=null;this.closed=true;}
  _internal(token:CoreInternalToken){if(token!==CORE_INTERNAL)throw new Error('invalid internal capability');return {doc:this.doc,base:this.baseValue,root:this.rootValue,id:this.idValue,working:this.workingValue,updates:this.updatesValue,slots:this.slotsValue,rootLayerIds:this.rootOrderValue,dimensions:this.dimensionUpdate,hasChanges:()=>this.hasChanges(),close:()=>{this.closed=true;}};}
  private open(){if(this.closed)throw new Error('transaction closed');if(this.failed)throw new Error('transaction failed');}
  private editableRaster(id:LayerId){const layer=this.updatesValue.get(id)??this.rootValue.getLayer(id);if(layer.kind!=='raster')throw new Error('drawing target is not raster');if(layer.locked)throw new Error('drawing target is locked');return layer;}
  private hasChanges(){return this.slotsValue.length>0&&((this.updatesValue.size>0)||[...this.workingValue.values()].some(w=>w.changedTileCount>0)||this.slotsValue.some(x=>x.type==='semantic'||x.type==='structure'||x.type==='dimensions'));}
  private meta(id:LayerId,p:Partial<Pick<LayerNode,'name'|'visible'|'locked'>>){this.open();const b=this.updatesValue.get(id)??this.rootValue.getLayer(id);if(p.name!==undefined&&!p.name)throw new Error('empty layer name');
    if((p.name===undefined||p.name===b.name)&&(p.visible===undefined||p.visible===b.visible)&&(p.locked===undefined||p.locked===b.locked))return;
    if(!this.updatesValue.has(id))this.slotsValue.push(Object.freeze({type:'metadata' as const,layerId:id}));this.updatesValue.set(id,Object.freeze({...b,...p}));}
}
