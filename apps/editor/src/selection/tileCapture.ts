import {TILE} from '@illustro/brush-rt';
import {readGpuTiles,type TileReadRequest} from '../gpuReadback';
import {validateRasterWorkerTiles,type RasterWorkerTile} from './tileStroke';
import type {MaskData} from './mask';

type RendererTile={surfaceKey:string;key:string};
type TileBackend={
 tiles:Map<string,RendererTile>;
 readTiles:(requests:readonly TileReadRequest[])=>Promise<unknown>;
};
export type TileCaptureArea=Readonly<{x:number;y:number;width:number;height:number}>;
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
/** Check only the pixels actually requested by a small clipboard rectangle.
 * A tile containing paint elsewhere must not cause a 128x128 scan/copy. */
function tileHasPixelDataInArea(tile:RasterWorkerTile,area:TileCaptureArea):boolean{
 const [tx=0,ty=0]=tile.key.split(',').map(Number);
 const tileX=tx*TILE,tileY=ty*TILE;
 const left=Math.max(area.x,tileX),top=Math.max(area.y,tileY);
 const right=Math.min(area.x+area.width,tileX+TILE);
 const bottom=Math.min(area.y+area.height,tileY+TILE);
 for(let y=top;y<bottom;y++){
  const start=((y-tileY)*TILE+left-tileX)*4;
  const end=start+(right-left)*4;
  for(let offset=start;offset<end;offset++)
   if(tile.pixels[offset]!==0)return true;
 }
 return false;
}
/** An eraser cannot alter a layer whose allocated GPU tiles contain no
 * selected pixels. A positive result is deliberately conservative: an
 * allocated tile might itself be empty, in which case normal capture runs. */
function tileIntersectsSelection(mask:MaskData,tx:number,ty:number,probe?:TileCaptureArea):boolean{
 const tileX=tx*TILE,tileY=ty*TILE;
 const left=Math.max(tileX,probe?.x??0),top=Math.max(tileY,probe?.y??0);
 const right=Math.min(mask.width,tileX+TILE,probe?probe.x+probe.width:mask.width);
 const bottom=Math.min(mask.height,tileY+TILE,probe?probe.y+probe.height:mask.height);
 for(let y=top;y<bottom;y++){
  const start=y*mask.width+left,end=y*mask.width+right;
  for(let index=start;index<end;index++)if(mask.alpha[index]!==0)return true;
 }
 return false;
}
/** A selected eraser can be a no-op even when the mask intersects an
 * allocated tile: only nonzero pixels *inside* the selection can change.
 * Preserve transparent RGB conservatively, as with tileHasPixelData. */
function tileHasSelectedPixelData(tile:RasterWorkerTile,mask:MaskData,probe?:TileCaptureArea):boolean{
 const [tx=0,ty=0]=tile.key.split(',').map(Number);
 const tileX=tx*TILE,tileY=ty*TILE;
 const left=Math.max(tileX,probe?.x??0),top=Math.max(tileY,probe?.y??0);
 const right=Math.min(mask.width,tileX+TILE,probe?probe.x+probe.width:mask.width);
 const bottom=Math.min(mask.height,tileY+TILE,probe?probe.y+probe.height:mask.height);
 for(let y=top;y<bottom;y++){
  const maskRow=y*mask.width,rgbaRow=(y-tileY)*TILE*4;
  for(let x=left;x<right;x++){
   if(mask.alpha[maskRow+x]===0)continue;
   const i=rgbaRow+(x-tileX)*4,p=tile.pixels;
   if((p[i]!|p[i+1]!|p[i+2]!|p[i+3]!)!==0)return true;
  }
 }
 return false;
}
/** Capture all occupied tiles of one layer, in batches, to preserve its old
 * brush strokes when producing the new layer.snapshot. The selected stroke
 * worker then creates newly touched tiles without scanning blank canvas. */
export async function captureSelectedLayerTiles(
 renderer:InspectableDrawingRenderer,surfaceId:string,width:number,height:number,valid:()=>boolean,
 area?:TileCaptureArea,eraseMask?:MaskData,eraseProbeArea?:TileCaptureArea,
 reusableTiles:readonly RasterWorkerTile[]=[]
):Promise<RasterWorkerTile[]>{
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)
  throw new Error('選択描画の作品サイズが正しくありません。');
 for(const rect of [area,eraseProbeArea])if(rect&&
   (![rect.x,rect.y,rect.width,rect.height].every(Number.isSafeInteger)||
   rect.x<0||rect.y<0||rect.width<1||rect.height<1||
   rect.x+rect.width>width||rect.y+rect.height>height))
  throw new Error('読み取る画像の範囲が正しくありません。');
 if(eraseMask&&(area||eraseMask.width!==width||eraseMask.height!==height||
   !(eraseMask.alpha instanceof Uint8Array)||eraseMask.alpha.length!==width*height))
  throw new Error('消しゴムの選択マスクが作品に一致しません。');
 // These are fresh, owned copies of the document baseline. The caller must
 // exclude every tile touched by a replayed brush stroke. Never infer cache
 // freshness from the UI inventory or from a previous renderer instance.
 validateRasterWorkerTiles(width,height,reusableTiles);
 const reusable=new Map(reusableTiles.map(tile=>[tile.key,tile]));
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
 const selectedRequests:TileReadRequest[]=[];
 const seen=new Set<string>();
 let eraseCanChange=!eraseMask;
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
  seen.add(key);
  // A clipboard selection only needs overlapping tiles, while a selected
  // brush still requests the complete existing snapshot (area omitted).
  if(area&&(tx*TILE>=area.x+area.width||ty*TILE>=area.y+area.height||
    (tx+1)*TILE<=area.x||(ty+1)*TILE<=area.y))continue;
  requests.push({surfaceId,key});
  if(eraseMask&&tileIntersectsSelection(eraseMask,tx,ty,eraseProbeArea)){
   eraseCanChange=true;
   selectedRequests.push({surfaceId,key});
  }
 }
 // Keep every existing tile for snapshot reconstruction when any selected
 // tile is allocated. Only the proven no-op eraser avoids all GPU readback.
 if(!eraseCanChange)return [];
 const captured=new Map<string,RasterWorkerTile>();
 let selectedHasPaint=false;
 const read=async (items:readonly TileReadRequest[],checkSelection=false)=>{
  for(let offset=0;offset<items.length;offset+=16){
   const group=items.slice(offset,offset+16);
   const missing=group.filter(item=>!reusable.has(item.key));
   const fresh=missing.length?await readGpuTiles(backend,missing,valid):[];
   const byKey=new Map(fresh.map(tile=>[tile.key,tile]));
   const batch=group.map(item=>reusable.get(item.key)??byKey.get(item.key)!);
   for(const tile of batch){
    if(area?tileHasPixelDataInArea(tile,area):tileHasPixelData(tile.pixels))
     captured.set(tile.key,{key:tile.key,pixels:tile.pixels});
    if(checkSelection&&eraseMask&&tileHasSelectedPixelData(tile,eraseMask,eraseProbeArea))
     selectedHasPaint=true;
   }
   // Keep the UI responsive without yielding after every 1 MiB GPU batch.
   if((offset/16)%4===3&&offset+16<items.length)
    await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
 };
 if(eraseMask){
  // Probe only selected tiles first. If they contain no selected paint,
  // the eraser is a proven no-op: all other GPU tiles stay untouched.
  await read(selectedRequests,true);
  if(!selectedHasPaint)return [];
  // Reuse the probe pixels rather than reading the selected tiles twice.
  const selectedKeys=new Set(selectedRequests.map(item=>item.key));
  await read(requests.filter(item=>!selectedKeys.has(item.key)));
 }else await read(requests);
 if(!valid())throw new Error('選択描画中に作品が切り替わりました。');
 // Keep inventory order for deterministic snapshot reconstruction.
 return requests.flatMap(item=>{
  const tile=captured.get(item.key);
  return tile?[tile]:[];
 });
}

/** Read a small clipboard rectangle directly from occupied GPU tiles.
 * This never allocates a full 4000×4000 RGBA source for a 12px selection.
 * Transparent gaps and edge tiles retain their original RGBA values. */
export async function captureLayerRegion(
 renderer:InspectableDrawingRenderer,surfaceId:string,width:number,height:number,
 area:TileCaptureArea,valid:()=>boolean
):Promise<Uint8ClampedArray>{
 const tiles=await captureSelectedLayerTiles(renderer,surfaceId,width,height,valid,area);
 const output=new Uint8ClampedArray(area.width*area.height*4);
 for(const tile of tiles){
  const [tx,ty]=tile.key.split(',').map(Number);
  const tileX=tx!*TILE,tileY=ty!*TILE;
  const left=Math.max(area.x,tileX),top=Math.max(area.y,tileY);
  const right=Math.min(area.x+area.width,tileX+TILE);
  const bottom=Math.min(area.y+area.height,tileY+TILE);
  for(let y=top;y<bottom;y++){
   const start=((y-tileY)*TILE+left-tileX)*4;
   output.set(tile.pixels.subarray(start,start+(right-left)*4),
    ((y-area.y)*area.width+left-area.x)*4);
  }
 }
 if(!valid())throw new Error('コピー中に作品が変更されました。');
 return output;
}
