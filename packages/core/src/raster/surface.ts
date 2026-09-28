import type { BlockId } from '../ids';
import { PagedMap } from '../pagedMap';

export type TileKey=string;

export function tileKey(x:number,y:number):TileKey{
  if(!Number.isSafeInteger(x)||x<0||!Number.isSafeInteger(y)||y<0)throw new Error('invalid tile coordinate');
  return String(x)+','+String(y);
}

export class RasterSurfaceManifest{
  constructor(readonly tiles:PagedMap<TileKey,BlockId>=PagedMap.empty()){Object.freeze(this);}
  getBlockId(x:number,y:number){return this.tiles.get(tileKey(x,y));}
  withBlocks(changes:ReadonlyMap<TileKey,BlockId>){
    if(!changes.size)return this;
    const e=this.tiles.edit();
    for(const [k,v] of changes)e.set(k,v);
    return new RasterSurfaceManifest(e.commit());
  }
}
