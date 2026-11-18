import {TILE} from '@illustro/brush-rt';
import {readGpuTiles,type TileReadRequest} from '../gpuReadback';
import type {RasterWorkerTile} from './tileStroke';

type RendererTile={surfaceKey:string;key:string};
type TileBackend={
 tiles:Map<string,RendererTile>;
 readTiles:(requests:readonly TileReadRequest[])=>Promise<unknown>;
};
export type InspectableDrawingRenderer={
 drain:(finalFrame?:boolean)=>Promise<unknown>;
 inspect:()=>Promise<unknown>;
 backend:TileBackend;
};
/** Detect occupied RGBA tiles without allocating a copy. Check all four
 * channels, including RGB under zero alpha, to preserve existing artwork. */
export function tileHasPixelData(pixels:Uint8Array):boolean{
 if(pixels.byteOffset%4===0&&pixels.byteLength%4===0){
   const words=new Uint32Array(pixels.buffer,pixels.byteOffset,pixels.byteLength/4);
   for(let i=0;i<words.length;i++)if(words[i]!==0)return true;
   return false;
 }
 for(let i=0;i<pixels.length;i++)if(pixels[i]!==0)return true;
 return false;
}
/** Capture all occupied tiles of one layer, in batches, to preserve its old
 * brush strokes when producing the new layer.snapshot. The selected stroke
 * worker then creates newly touched tiles without scanning blank canvas. */
export async function captureSelectedLayerTiles(
 renderer:InspectableDrawingRenderer,surfaceId:string,width:number,height:number,valid:()=>boolean
):Promise<RasterWorkerTile[]>{
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)
  throw new Error('選択描画の作品サイズが正しくありません。');
 if(!valid())throw new Error('選択描画中に作品が切り替わりました。');
 await renderer.drain();
 if(!valid())throw new Error('選択描画中に作品が切り替わりました。');
 // Only an explicit worker inventory is fresh. The UI's cached tile map can
 // be stale while a formal stroke finishes.
 await renderer.inspect();
 if(!valid())throw new Error('選択描画中に作品が切り替わりました。');
 const backend=renderer.backend;
 if(!backend?.tiles||typeof backend.readTiles!=='function')
  throw new Error('選択範囲の区画読み取りを利用できません。');
 const requests:TileReadRequest[]=[];
 const seen=new Set<string>();
 for(const item of backend.tiles.values()){
  if(!item||typeof item.surfaceKey!=='string'||typeof item.key!=='string')
   throw new Error('描画区画の一覧が壊れています。');
  if(item.surfaceKey!==surfaceId)continue;
  const key=item.key;
  if(!/^(0|[1-9]\d*),(0|[1-9]\d*)$/.test(key)||seen.has(key))
   throw new Error('描画区画の一覧が壊れています。');
  const [tx=NaN,ty=NaN]=key.split(',').map(Number);
  if(!Number.isSafeInteger(tx)||!Number.isSafeInteger(ty)||tx<0||ty<0||
   tx>=Math.ceil(width/TILE)||ty>=Math.ceil(height/TILE))
   throw new Error('描画区画が作品の外にあります。');
  seen.add(key);requests.push({surfaceId,key});
 }
 const result:RasterWorkerTile[]=[];
 for(let offset=0;offset<requests.length;offset+=16){
  const batch=await readGpuTiles(backend,requests.slice(offset,offset+16),valid);
  for(const tile of batch)if(tileHasPixelData(tile.pixels))
   result.push({key:tile.key,pixels:tile.pixels});
  // GPU batches are already asynchronous. Yield a full browser task every
  // four batches instead of every batch, keeping 4K capture responsive
  // without adding dozens of timer delays to a single stroke.
  if((offset/16)%4===3&&offset+16<requests.length)
   await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 if(!valid())throw new Error('選択描画中に作品が切り替わりました。');
 return result;
}
