import type {DocumentId,LayerId,RasterSurfaceId} from './ids';
import {PagedMap} from './pagedMap';
import {createRasterSurfaceDescriptor,RasterSurfaceManifest,type RasterSampleEncoding} from './raster/surface';

export type LayerNode=Readonly<{
  id:LayerId;kind:'raster';name:string;visible:boolean;opacity:number;locked:boolean;surface:RasterSurfaceManifest;
}>;
export type DocumentMetadata=Readonly<{createdAt:number;modifiedAt:number}>;
export class DocumentRoot{
  readonly metadata:DocumentMetadata;
  constructor(readonly documentId:DocumentId,readonly width:number,readonly height:number,readonly name:string,
    readonly colorProfileId:string,readonly layers:PagedMap<LayerId,LayerNode>,readonly rootLayerIds:readonly LayerId[],
    metadata:DocumentMetadata=Object.freeze({createdAt:0,modifiedAt:0})){
    this.rootLayerIds=Object.freeze([...rootLayerIds]);this.metadata=Object.freeze({...metadata});Object.freeze(this);
  }
  getLayer(id:LayerId){const value=this.layers.get(id);if(!value)throw new Error('missing layer');return value;}
  hasLayer(id:LayerId){return this.layers.get(id)!==undefined;}
  withLayers(changes:ReadonlyMap<LayerId,LayerNode>){if(!changes.size)return this;const e=this.layers.edit();for(const [k,v] of changes)e.set(k,v);
    return new DocumentRoot(this.documentId,this.width,this.height,this.name,this.colorProfileId,e.commit(),this.rootLayerIds,this.metadata);}
  withLayerState(changes:ReadonlyMap<LayerId,LayerNode>,rootLayerIds:readonly LayerId[]){
    if(!changes.size&&sameOrder(rootLayerIds,this.rootLayerIds))return this;const e=this.layers.edit();for(const [k,v] of changes)e.set(k,v);const layers=e.commit(),seen=new Set<LayerId>();
    for(const id of rootLayerIds){if(seen.has(id))throw new Error('duplicate root layer');if(!layers.get(id))throw new Error('root layer is missing');seen.add(id);}
    return new DocumentRoot(this.documentId,this.width,this.height,this.name,this.colorProfileId,layers,rootLayerIds,this.metadata);
  }
  withModifiedAt(modifiedAt:number){if(!Number.isSafeInteger(modifiedAt)||modifiedAt<this.metadata.createdAt)throw new Error('invalid modifiedAt');
    if(modifiedAt===this.metadata.modifiedAt)return this;return new DocumentRoot(this.documentId,this.width,this.height,this.name,this.colorProfileId,this.layers,this.rootLayerIds,{createdAt:this.metadata.createdAt,modifiedAt});}
}
export function rasterLayer(id:LayerId,surfaceId:RasterSurfaceId,workingColorSpaceRef:string,sampleEncoding:RasterSampleEncoding,name='Layer 1'):LayerNode{
  if(!name.trim())throw new Error('empty layer name');const descriptor=createRasterSurfaceDescriptor(surfaceId,sampleEncoding,workingColorSpaceRef);
  return Object.freeze({id,kind:'raster' as const,name:name.trim(),visible:true,opacity:1,locked:false,surface:new RasterSurfaceManifest(descriptor)});
}
function sameOrder(a:readonly LayerId[],b:readonly LayerId[]){return a.length===b.length&&a.every((id,index)=>id===b[index]);}
