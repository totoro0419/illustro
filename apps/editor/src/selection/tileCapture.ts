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
/** Capture all occupied tiles of one layer, in batches, to preserve its old
 * brush strokes when producing the new layer.snapshot. The selected stroke
 * worker then creates newly touched tiles without scanning blank canvas. */
export async function captureSelectedLayerTiles(
 renderer:InspectableDrawingRenderer,surfaceId:string,width:number,height:number,valid:()=>boolean
):Promise<RasterWorkerTile[]>{
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
  if(item.surfaceKey!==surfaceId)continue;
  const key=item.key;
  if(!/^\d+,\d+$/.test(key)||seen.has(key))throw new Error('描画区画の一覧が壊れています。');
  const [tx=NaN,ty=NaN]=key.split(',').map(Number);
  if(!Number.isSafeInteger(tx)||!Number.isSafeInteger(ty)||tx<0||ty<0||
   tx>=Math.ceil(width/TILE)||ty>=Math.ceil(height/TILE))
   throw new Error('描画区画が作品の外にあります。');
  seen.add(key);requests.push({surfaceId,key});
 }
 const result:RasterWorkerTile[]=[];
 for(let offset=0;offset<requests.length;offset+=16){
  const batch=await readGpuTiles(backend,requests.slice(offset,offset+16),valid);
  for(const tile of batch)if(tile.pixels.some(value=>value!==0))
   result.push({key:tile.key,pixels:tile.pixels});
  if(offset+16<requests.length)await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 if(!valid())throw new Error('選択描画中に作品が切り替わりました。');
 return result;
}
