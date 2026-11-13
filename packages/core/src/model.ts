import type {DocumentId,LayerId,RasterSurfaceId} from './ids';
import {PagedMap} from './pagedMap';
import {createRasterSurfaceDescriptor,RasterSurfaceManifest,type RasterSampleEncoding} from './raster/surface';

export type LayerNode=Readonly<{
  id:LayerId;kind:'raster';name:string;visible:boolean;opacity:number;locked:boolean;surface:RasterSurfaceManifest;
  /** Logical opaque-white base. Its raster tiles are intentionally absent until editing requires them. */
  baseColor?:'white';
}>;
export type DocumentInfo=Readonly<{name:string;author:string;description:string;dpi:number|null}>;
export type DocumentMetadata=Readonly<{createdAt:number;modifiedAt:number;author?:string;description?:string;dpi?:number}>;
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
       ...(description?{description}:{}),...(dpi===null?{}:{dpi})});
  }
  withModifiedAt(modifiedAt:number){if(!Number.isSafeInteger(modifiedAt)||modifiedAt<this.metadata.createdAt)throw new Error('invalid modifiedAt');
    if(modifiedAt===this.metadata.modifiedAt)return this;return new DocumentRoot(this.documentId,this.width,this.height,this.name,this.colorProfileId,this.layers,this.rootLayerIds,{...this.metadata,modifiedAt});}
}
export function rasterLayer(id:LayerId,surfaceId:RasterSurfaceId,workingColorSpaceRef:string,sampleEncoding:RasterSampleEncoding,name='Layer 1'):LayerNode{
  if(!name.trim())throw new Error('empty layer name');const descriptor=createRasterSurfaceDescriptor(surfaceId,sampleEncoding,workingColorSpaceRef);
  return Object.freeze({id,kind:'raster' as const,name:name.trim(),visible:true,opacity:1,locked:false,surface:new RasterSurfaceManifest(descriptor)});
}
function sameOrder(a:readonly LayerId[],b:readonly LayerId[]){return a.length===b.length&&a.every((id,index)=>id===b[index]);}
