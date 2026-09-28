import { CanonicalTileStore } from './store';
import { RasterSurfaceManifest, tileKey, type TileKey } from './surface';

export class RasterWorkingSet{
  readonly changed=new Map<TileKey,Uint8Array>();
  constructor(readonly base:RasterSurfaceManifest,readonly store:CanonicalTileStore,readonly tileBytes:number){}
  get changedTileCount(){return this.changed.size;}
  editTile(x:number,y:number,edit:(bytes:Uint8Array)=>void){
    const key=tileKey(x,y);
    let bytes=this.changed.get(key);
    if(!bytes){
      const id=this.base.getBlockId(x,y);
      bytes=id===undefined?new Uint8Array(this.tileBytes):this.store.readCopy(id);
      this.changed.set(key,bytes);
    }
    edit(bytes);
  }
  mutations(){return [...this.changed].map(([key,bytes])=>({key,bytes}));}
}
