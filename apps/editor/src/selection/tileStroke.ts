import {cpuReference,TILE,type StrokeRecord} from '@illustro/brush-rt';
import {selectedStrokeProbeBounds} from './maskStrokeBounds';

export type RasterWorkerTile={key:string;pixels:Uint8Array};

/** Only transfer existing pixels that the brush can read or change. The
 * complete untouched snapshot stays owned by the UI and is joined afterwards.
 * Unknown footprints use the original full-snapshot path. */
export function partitionSelectedStrokeTiles(width:number,height:number,tiles:readonly RasterWorkerTile[],records:readonly StrokeRecord[]){
 validateRasterWorkerTiles(width,height,tiles);
 const bounds=selectedStrokeProbeBounds(records,width,height);
 if(!bounds)return {affected:[...tiles],untouched:[] as RasterWorkerTile[]};
 const affected:RasterWorkerTile[]=[],untouched:RasterWorkerTile[]=[];
 for(const tile of tiles){
  const [x=0,y=0]=tile.key.split(',').map(Number);
  const overlaps=x*TILE<bounds.x+bounds.width&&y*TILE<bounds.y+bounds.height&&
    (x+1)*TILE>bounds.x&&(y+1)*TILE>bounds.y;
  (overlaps?affected:untouched).push(tile);
 }
 const retainedBuffers=new Set(untouched.map(tile=>tile.pixels.buffer));
 return {affected:affected.map(tile=>retainedBuffers.has(tile.pixels.buffer)
   ?{key:tile.key,pixels:tile.pixels.slice()}:tile),untouched};
}

/** Validate Worker tile replies before they can replace a saved layer snapshot. */
export function validateRasterWorkerTiles(
 width:number,height:number,input:readonly RasterWorkerTile[]
):void{
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)
  throw new Error('画像の区画の大きさが正しくありません。');
 const columns=Math.ceil(width/TILE),rows=Math.ceil(height/TILE),seen=new Set<string>();
 for(const tile of input){
  if(!tile||typeof tile.key!=='string'||!/^(0|[1-9]\d*),(0|[1-9]\d*)$/.test(tile.key)||
    seen.has(tile.key)||!(tile.pixels instanceof Uint8Array)||
    tile.pixels.byteLength!==TILE*TILE*4)
   throw new Error('読み込んだ画素の区画が正しくありません。');
  const [tx=NaN,ty=NaN]=tile.key.split(',').map(Number);
  if(!Number.isSafeInteger(tx)||!Number.isSafeInteger(ty)||tx>=columns||ty>=rows)
   throw new Error('画像の区画が作品の外です。');
  seen.add(tile.key);
 }
}

/** Shared backing buffers are transferred once; SharedArrayBuffers are not transferable. */
export function uniqueTransferableTileBuffers(tiles:readonly RasterWorkerTile[]):ArrayBuffer[]{
 const buffers=new Set<ArrayBuffer>();
 for(const tile of tiles)if(tile.pixels.buffer instanceof ArrayBuffer)
  buffers.add(tile.pixels.buffer);
 return [...buffers];
}

/** Apply the exact current CPU brush algorithm directly to 128px tiles.
 * All pre-existing occupied tiles must be supplied; the caller publishes
 * a complete layer.snapshot, not a partial direct edit (which would
 * lose older semantic brush strokes during history reconstruction).
 * Input tiles are owned by this Worker and may be updated in place. */
export function renderSelectedStrokeTiles(
 width:number,height:number,alpha:Uint8Array,
 input:readonly RasterWorkerTile[],records:readonly StrokeRecord[]
):RasterWorkerTile[]|null{
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
   alpha.length!==width*height)throw new Error('選択マスクの大きさが作品に一致しません。');
 const columns=Math.ceil(width/TILE),rows=Math.ceil(height/TILE),tiles=new Map<string,Uint8Array>();
 validateRasterWorkerTiles(width,height,input);
 for(const tile of input)tiles.set(tile.key,tile.pixels);
 let changed=false;
 // A sparse selection may touch thousands of brush-command tiles while
 // containing only a few selected pixels. Cache both empty and nonempty
 // tile masks across records; no persistent mask or snapshot format changes.
 const maskCache=new Map<string,Uint8Array|null>();
 for(const record of records){
  const commandsByTile=new Map<string,Array<StrokeRecord['commands'][number]>>();
  for(const command of record.commands){
   const [x=0,y=0,size=0]=command,connected=(command[19]??0)>0;
   const ax=connected?(command[16]??x):x,ay=connected?(command[17]??y):y;
   const radius=Math.max(size/2,command[18]??0)*(connected?1:Math.SQRT2)+2;
   const left=Math.max(0,Math.floor((Math.min(x,ax)-radius)/TILE));
   const top=Math.max(0,Math.floor((Math.min(y,ay)-radius)/TILE));
   const right=Math.min(columns,Math.ceil((Math.max(x,ax)+radius)/TILE));
   const bottom=Math.min(rows,Math.ceil((Math.max(y,ay)+radius)/TILE));
   for(let row=top;row<bottom;row++)for(let col=left;col<right;col++){
    const key=col+','+row,list=commandsByTile.get(key);
    if(list)list.push(command);else commandsByTile.set(key,[command]);
   }
  }
  for(const [key,commands] of commandsByTile){
   const [tx=0,ty=0]=key.split(',').map(Number),x=tx*TILE,y=ty*TILE;
   const w=Math.min(TILE,width-x),h=Math.min(TILE,height-y);
   if(!maskCache.has(key)){
    let selected=false;
    for(let row=0;row<h;row++)
     if(alpha.subarray((y+row)*width+x,(y+row)*width+x+w).some(Boolean)){
      selected=true;break;
     }
    if(!selected)maskCache.set(key,null);
    else{
     const mask=new Uint8Array(w*h);
     for(let row=0;row<h;row++)
      mask.set(alpha.subarray((y+row)*width+x,(y+row)*width+x+w),row*w);
     maskCache.set(key,mask);
    }
   }
   const mask=maskCache.get(key);
   if(!mask)continue;
   const current=tiles.get(key),base=new Uint8ClampedArray(w*h*4);
   if(current)for(let row=0;row<h;row++)
    base.set(current.subarray(row*TILE*4,row*TILE*4+w*4),row*w*4);
   const rendered=cpuReference({...record,commands},w,h,base,mask,x,y);
   if(!rendered.some((value,index)=>value!==base[index]))continue;
   changed=true;
   const destination=current??new Uint8Array(TILE*TILE*4);
   for(let row=0;row<h;row++)
    destination.set(rendered.subarray(row*w*4,(row+1)*w*4),row*TILE*4);
   tiles.set(key,destination);
  }
 }
 return changed?[...tiles].map(([key,pixels])=>({key,pixels})):null;
}
