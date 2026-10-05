import type {BlockId,OperationKey,RasterSurfaceId} from '../ids';
import {PagedMap} from '../pagedMap';

export const CANONICAL_TILE_SIZE=256 as const;
export const TILE_GRID_VERSION='tile256.v2' as const;
export type RasterSampleEncoding='rgba.unorm8.v1'|'rgba.unorm16.v1'|'rgba.float32.v1';
export type TileKey=string;
export type LocalDirtyRect=Readonly<{x0:number;y0:number;x1:number;y1:number}>;
export type DirtyTileHint=Readonly<{tileX:number;tileY:number;bounds:LocalDirtyRect;workUnits:number;commandIndices?:readonly number[]}>;
export type RasterMutationRef=Readonly<{operationKey:OperationKey;bounds:LocalDirtyRect;workUnits:number;commandIndices:readonly number[]}>;
export type RasterTileValue=Readonly<{baseBlockId:BlockId|null;mutations:readonly RasterMutationRef[]}>;
export type RasterSurfaceDescriptor=Readonly<{
  surfaceId:RasterSurfaceId;rasterSchemaVersion:2;tileGridVersion:typeof TILE_GRID_VERSION;channelModel:'RGBA';
  sampleEncoding:RasterSampleEncoding;alphaMode:'straight';workingColorSpaceRef:string;sparseDefault:'transparent-black';
}>;

const I32_MIN=-2147483648,I32_MAX=2147483647;
const MAX_MUTATION_REFS_PER_TILE=4096;
const MAX_MUTATION_WORK_UNITS_PER_TILE=8_000_000;

export function tileKey(x:number,y:number):TileKey{
  tileCoordinate(x);tileCoordinate(y);return `${x},${y}`;
}
export function parseTileKey(key:TileKey):readonly [number,number]{
  const [xs,ys,...rest]=key.split(',');if(rest.length||xs===undefined||ys===undefined)throw new Error('invalid tile key');
  const x=Number(xs),y=Number(ys);tileCoordinate(x);tileCoordinate(y);return [x,y] as const;
}
export function pixelToTile(value:number):Readonly<{tile:number;local:number}>{
  if(!Number.isSafeInteger(value))throw new Error('invalid pixel coordinate');
  const tile=Math.floor(value/CANONICAL_TILE_SIZE);tileCoordinate(tile);
  return Object.freeze({tile,local:value-tile*CANONICAL_TILE_SIZE});
}
export function createRasterSurfaceDescriptor(surfaceId:RasterSurfaceId,sampleEncoding:RasterSampleEncoding,workingColorSpaceRef:string):RasterSurfaceDescriptor{
  if(!workingColorSpaceRef.trim())throw new Error('empty working color space');
  return Object.freeze({surfaceId,rasterSchemaVersion:2 as const,tileGridVersion:TILE_GRID_VERSION,channelModel:'RGBA' as const,
    sampleEncoding,alphaMode:'straight' as const,workingColorSpaceRef,sparseDefault:'transparent-black' as const});
}
export function bytesPerPixel(encoding:RasterSampleEncoding){return encoding==='rgba.unorm8.v1'?4:encoding==='rgba.unorm16.v1'?8:16;}
export function tileByteLength(encoding:RasterSampleEncoding){return CANONICAL_TILE_SIZE*CANONICAL_TILE_SIZE*bytesPerPixel(encoding);}

export class RasterSurfaceManifest{
  constructor(readonly descriptor:RasterSurfaceDescriptor,readonly tiles:PagedMap<TileKey,RasterTileValue>=PagedMap.empty()){
    Object.freeze(this);
  }
  getValue(x:number,y:number){return this.tiles.get(tileKey(x,y));}
  getBlockId(x:number,y:number){return this.getValue(x,y)?.baseBlockId??undefined;}
  withBlocks(changes:ReadonlyMap<TileKey,BlockId>){
    if(!changes.size)return this;const e=this.tiles.edit();
    for(const [key,id] of changes){parseTileKey(key);e.set(key,Object.freeze({baseBlockId:id,mutations:Object.freeze([])}));}
    return new RasterSurfaceManifest(this.descriptor,e.commit());
  }
  withMutations(operationKeyValue:OperationKey,hints:readonly DirtyTileHint[]){
    if(!hints.length)throw new Error('semantic raster mutation requires dirty tiles');
    const e=this.tiles.edit();
    for(const hint of hints){const key=tileKey(hint.tileX,hint.tileY);validateBounds(hint.bounds);validWork(hint.workUnits);
      const previous=this.tiles.get(key)??Object.freeze({baseBlockId:null,mutations:Object.freeze([])});
      const commandIndices=Object.freeze([...(hint.commandIndices??[])]);for(const i of commandIndices)if(!Number.isSafeInteger(i)||i<0)throw new Error('invalid command index');
      const mutation=Object.freeze({operationKey:operationKeyValue,bounds:Object.freeze({...hint.bounds}),workUnits:hint.workUnits,commandIndices});
      const mutations=Object.freeze([...previous.mutations,mutation]);
      if(mutations.length>MAX_MUTATION_REFS_PER_TILE)throw new Error('raster semantic chain admission limit');
      let work=0;for(const item of mutations)work+=item.workUnits;
      if(work>MAX_MUTATION_WORK_UNITS_PER_TILE)throw new Error('raster semantic work admission limit');
      e.set(key,Object.freeze({baseBlockId:previous.baseBlockId,mutations}));
    }
    return new RasterSurfaceManifest(this.descriptor,e.commit());
  }
}

function tileCoordinate(n:number){if(!Number.isSafeInteger(n)||n<I32_MIN||n>I32_MAX)throw new Error('invalid tile coordinate');}
function validateBounds(b:LocalDirtyRect){
  for(const n of [b.x0,b.y0,b.x1,b.y1])if(!Number.isInteger(n)||n<0||n>CANONICAL_TILE_SIZE)throw new Error('invalid dirty bounds');
  if(b.x1<=b.x0||b.y1<=b.y0)throw new Error('empty dirty bounds');
}
function validWork(n:number){if(!Number.isSafeInteger(n)||n<=0)throw new Error('invalid raster work estimate');}
