import {CanonicalTileStore} from './store';
import {CANONICAL_TILE_SIZE,RasterSurfaceManifest,tileByteLength,tileKey,type TileKey} from './surface';

export class RasterWorkingSet{
  readonly changed=new Map<TileKey,Uint8Array>();
  constructor(readonly base:RasterSurfaceManifest,readonly store:CanonicalTileStore){}
  get changedTileCount(){return this.changed.size;}
  editTile(x:number,y:number,edit:(bytes:Uint8Array)=>void){
    const key=tileKey(x,y);let bytes=this.changed.get(key);
    if(!bytes){const value=this.base.getValue(x,y);if(value?.mutations.length)throw new Error('strict materialization required before direct byte edit');
      bytes=value?.baseBlockId?this.store.readCopy(value.baseBlockId):new Uint8Array(tileByteLength(this.base.descriptor.sampleEncoding));this.changed.set(key,bytes);}
    edit(bytes);
  }
  mutations(){return [...this.changed].map(([key,bytes])=>({key,bytes,bounds:Object.freeze({x0:0,y0:0,x1:CANONICAL_TILE_SIZE,y1:CANONICAL_TILE_SIZE})}));}
}
