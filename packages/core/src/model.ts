import type { DocumentId,LayerId } from './ids';
import { PagedMap } from './pagedMap';
import { RasterSurfaceManifest } from './raster/surface';

export type LayerNode=Readonly<{
  id:LayerId;kind:'raster';name:string;visible:boolean;opacity:number;locked:boolean;
  surface:RasterSurfaceManifest;
}>;

export class DocumentRoot{
  constructor(
    readonly documentId:DocumentId,
    readonly width:number,
    readonly height:number,
    readonly name:string,
    readonly colorProfileId:string,
    readonly layers:PagedMap<LayerId,LayerNode>,
    readonly rootLayerIds:readonly LayerId[],
  ){this.rootLayerIds=Object.freeze([...rootLayerIds]);Object.freeze(this);}
  getLayer(id:LayerId){const v=this.layers.get(id);if(!v)throw new Error('missing layer');return v;}
  withLayers(changes:ReadonlyMap<LayerId,LayerNode>){
    if(!changes.size)return this;
    const e=this.layers.edit();for(const [k,v] of changes)e.set(k,v);
    return new DocumentRoot(this.documentId,this.width,this.height,this.name,this.colorProfileId,e.commit(),this.rootLayerIds);
  }
}
export function rasterLayer(id:LayerId):LayerNode{
  return Object.freeze({id,kind:'raster' as const,name:'Layer 1',visible:true,opacity:1,locked:false,surface:new RasterSurfaceManifest()});
}
