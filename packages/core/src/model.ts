import type {LayerDeformation} from './layerDeformation';
import type {EditableArtwork} from './editableArtwork';
import type {LayerBlend} from './layerBlend';
import type {LayerMask} from './layerMask';
import type {LayerComp} from './layerComps';
import {EMPTY_LAYER_GROUPS,groupsForLayer,validateLayerGroups,type LayerGroup} from './layerGroups';
import type {DocumentId,LayerId,RasterSurfaceId} from './ids';
import {PagedMap} from './pagedMap';
import {createRasterSurfaceDescriptor,RasterSurfaceManifest,type RasterSampleEncoding} from './raster/surface';

export const LAYER_COLOR_TAGS=['red','orange','yellow','green','blue','purple'] as const;
export type LayerColorTag=(typeof LAYER_COLOR_TAGS)[number];
export function parseLayerColorTag(value:unknown):LayerColorTag|null{
  if(value===undefined||value===null)return null;
  const tag=LAYER_COLOR_TAGS.find(candidate=>candidate===value);
  if(!tag)throw new Error('invalid layer color tag');
  return tag;
}

export type LayerNode=Readonly<{
  id:LayerId;kind:'raster';name:string;visible:boolean;opacity:number;locked:boolean;surface:RasterSurfaceManifest;
  /** Logical opaque-white base. Its raster tiles are intentionally absent until editing requires them. */
  baseColor?:'white';
  implicitRaster?:boolean;
  colorTag?:LayerColorTag|null;
  positionLocked?:boolean;
  contentLocked?:boolean;
  alphaLocked?:boolean;
  clipSourceId?:LayerId|null;
  vectorMask?:LayerMask|null;
  blend?:LayerBlend|null;
  editable?:EditableArtwork|null;
  deformation?:LayerDeformation|null;
}>;
export type DocumentInfo=Readonly<{name:string;author:string;description:string;dpi:number|null}>;
export type DocumentMetadata=Readonly<{createdAt:number;modifiedAt:number;layerGroups?:readonly LayerGroup[];layerComps?:readonly LayerComp[];author?:string;description?:string;dpi?:number}>;
export function validateDocumentInfo(info:DocumentInfo):DocumentInfo{
  const name=info.name.trim(),author=info.author.trim(),description=info.description.trim();
  if(!name||name.length>4096||author.length>160||description.length>2000||
     /[\u0000-\u001f]/.test(name+author)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(description))
    throw new Error('作品名・作者・説明を確認してください。');
  if(info.dpi!==null&&(!Number.isSafeInteger(info.dpi)||info.dpi<1||info.dpi>2400))
    throw new Error('解像度を1〜2400 DPIで指定してください。');
  return Object.freeze({name,author,description,dpi:info.dpi});
}
export class DocumentRoot{
  readonly metadata:DocumentMetadata;
  get layerComps(){return this.metadata.layerComps??[];}
  withLayerComps(layerComps:readonly LayerComp[]){
    return new DocumentRoot(this.documentId,this.width,this.height,this.name,this.colorProfileId,this.layers,this.rootLayerIds,{...this.metadata,layerComps});
  }
  get layerGroups(){return this.metadata.layerGroups??EMPTY_LAYER_GROUPS;}
  groupsForLayer(id:LayerId){return groupsForLayer(this.layerGroups,id);}
  isLayerVisible(id:LayerId){return this.getLayer(id).visible&&this.groupsForLayer(id).every(group=>group.visible);}
  clippingSource(id:LayerId){
    const source=this.getLayer(id).clipSourceId;
    if(!source||!this.hasLayer(source))return null;
    if(this.rootLayerIds.indexOf(source)>=this.rootLayerIds.indexOf(id))return null;
    if(this.groupsForLayer(id).at(-1)?.id!==this.groupsForLayer(source).at(-1)?.id)return null;
    return this.getLayer(source);
  }
  availableClippingSource(id:LayerId){
    const parent=this.groupsForLayer(id).at(-1)?.id;
    let index=this.rootLayerIds.indexOf(id)-1;
    for(;index>=0;index--){
      const candidate=this.getLayer(this.rootLayerIds[index]!);
      if(this.groupsForLayer(candidate.id).at(-1)?.id!==parent)return null;
      if(!this.clippingSource(candidate.id))return candidate;
    }
    return null;
  }
  isLayerContentLocked(id:LayerId){return this.isLayerLocked(id)||!!this.getLayer(id).contentLocked;}
  isLayerPositionLocked(id:LayerId){return this.isLayerLocked(id)||!!this.getLayer(id).positionLocked;}
  isLayerLocked(id:LayerId){return this.getLayer(id).locked||this.groupsForLayer(id).some(group=>group.locked);}
  withLayerGroups(groups:readonly LayerGroup[]){
    const layerGroups=validateLayerGroups(groups,this.rootLayerIds);
    return new DocumentRoot(this.documentId,this.width,this.height,this.name,this.colorProfileId,this.layers,this.rootLayerIds,{...this.metadata,layerGroups});
  }
  constructor(readonly documentId:DocumentId,readonly width:number,readonly height:number,readonly name:string,
    readonly colorProfileId:string,readonly layers:PagedMap<LayerId,LayerNode>,readonly rootLayerIds:readonly LayerId[],
    metadata:DocumentMetadata=Object.freeze({createdAt:0,modifiedAt:0})){
    this.rootLayerIds=Object.freeze([...rootLayerIds]);this.metadata=Object.freeze({...metadata});Object.freeze(this);
  }
  getLayer(id:LayerId){const value=this.layers.get(id);if(!value)throw new Error('missing layer');return value;}
  hasLayer(id:LayerId){return this.layers.get(id)!==undefined;}
  withLayers(changes:ReadonlyMap<LayerId,LayerNode>){if(!changes.size)return this;const e=this.layers.edit();for(const [k,v] of changes)e.set(k,v);
    return new DocumentRoot(this.documentId,this.width,this.height,this.name,this.colorProfileId,e.commit(),this.rootLayerIds,this.metadata);}
  withLayerState(changes:ReadonlyMap<LayerId,LayerNode>,rootLayerIds:readonly LayerId[],removed:ReadonlySet<LayerId>=new Set()){
    if(!changes.size&&!removed.size&&sameOrder(rootLayerIds,this.rootLayerIds))return this;
    const e=this.layers.edit();
    for(const [k,v] of changes)e.set(k,v);
    for(const id of removed)e.delete(id);
    const layers=e.commit(),seen=new Set<LayerId>();
    for(const id of rootLayerIds){if(seen.has(id))throw new Error('duplicate root layer');if(!layers.get(id))throw new Error('root layer is missing');seen.add(id);}
    return new DocumentRoot(this.documentId,this.width,this.height,this.name,this.colorProfileId,layers,rootLayerIds,this.metadata);
  }
  withDimensions(width:number,height:number){if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>8192||height>8192)throw new Error('invalid canvas dimensions');
    if(width===this.width&&height===this.height)return this;
    return new DocumentRoot(this.documentId,width,height,this.name,this.colorProfileId,this.layers,this.rootLayerIds,this.metadata);
  }
  get info():DocumentInfo{
    return {name:this.name,author:this.metadata.author??'',description:this.metadata.description??'',dpi:this.metadata.dpi??null};
  }
  withInfo(info:DocumentInfo){
    const {name,author,description,dpi}=validateDocumentInfo(info);
    return new DocumentRoot(this.documentId,this.width,this.height,name,this.colorProfileId,this.layers,this.rootLayerIds,
      {createdAt:this.metadata.createdAt,modifiedAt:this.metadata.modifiedAt,...(author?{author}:{}),
       ...(description?{description}:{}),...(dpi===null?{}:{dpi}),...(this.layerGroups.length?{layerGroups:this.layerGroups}:{})});
  }
  withModifiedAt(modifiedAt:number){if(!Number.isSafeInteger(modifiedAt)||modifiedAt<this.metadata.createdAt)throw new Error('invalid modifiedAt');
    if(modifiedAt===this.metadata.modifiedAt)return this;return new DocumentRoot(this.documentId,this.width,this.height,this.name,this.colorProfileId,this.layers,this.rootLayerIds,{...this.metadata,modifiedAt});}
}
export function rasterLayer(id:LayerId,surfaceId:RasterSurfaceId,workingColorSpaceRef:string,sampleEncoding:RasterSampleEncoding,name='Layer 1'):LayerNode{
  if(!name.trim())throw new Error('empty layer name');const descriptor=createRasterSurfaceDescriptor(surfaceId,sampleEncoding,workingColorSpaceRef);
  return Object.freeze({id,kind:'raster' as const,name:name.trim(),visible:true,opacity:1,locked:false,surface:new RasterSurfaceManifest(descriptor)});
}
function sameOrder(a:readonly LayerId[],b:readonly LayerId[]){return a.length===b.length&&a.every((id,index)=>id===b[index]);}
