import {CANONICAL_TILE_SIZE,type SemanticOperation} from '@illustro/core';
import {TILE} from '@illustro/brush-rt';
/** A partially materialized stroke must use the same tile clip in the
 * drawing renderer and every export/thumbnail/reference renderer. */
export function rasterReplayKeys(operation:SemanticOperation,width:number,height:number):string[]{
 const keys=new Set<string>(),maxX=Math.ceil(width/TILE)-1,maxY=Math.ceil(height/TILE)-1;
 for(const f of operation.dirtyFootprint){
  const x0=f.tileX*CANONICAL_TILE_SIZE+f.bounds.x0,y0=f.tileY*CANONICAL_TILE_SIZE+f.bounds.y0;
  const x1=f.tileX*CANONICAL_TILE_SIZE+f.bounds.x1,y1=f.tileY*CANONICAL_TILE_SIZE+f.bounds.y1;
  for(let y=Math.max(0,Math.floor(y0/TILE));y<=Math.min(maxY,Math.ceil(y1/TILE)-1);y++)
   for(let x=Math.max(0,Math.floor(x0/TILE));x<=Math.min(maxX,Math.ceil(x1/TILE)-1);x++)keys.add(x+','+y);
 }
 return [...keys];
}
