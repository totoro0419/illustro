/** Split a small clipboard image into only the raster tiles it touches.
 * No width*height*4 destination allocation, even for a 4000x4000 artwork.
 */
import {CANONICAL_TILE_SIZE as TILE} from '@illustro/core';
export type PixelRect=Readonly<{width:number;height:number}>;
export function forEachPastedTile(
  source:Readonly<PixelRect>&Readonly<{pixels:Uint8Array|Uint8ClampedArray}>,
  canvas:PixelRect,
  offsetX:number,offsetY:number,
  apply:(tileX:number,tileY:number,bytes:Uint8Array)=>void
):number{
  const validSize=(x:number)=>Number.isSafeInteger(x)&&x>0&&x<=16384;
  if(![source.width,source.height,canvas.width,canvas.height].every(validSize)||
    !Number.isSafeInteger(offsetX)||!Number.isSafeInteger(offsetY)||
    source.pixels.byteLength!==source.width*source.height*4)
    throw Error('貼り付ける画像の寸法・画素数が正しくありません。');
  const left=Math.max(0,offsetX),top=Math.max(0,offsetY),
    right=Math.min(canvas.width,offsetX+source.width),
    bottom=Math.min(canvas.height,offsetY+source.height);
  if(left>=right||top>=bottom)return 0;
  let count=0;
  for(let ty=Math.floor(top/TILE);ty<=Math.floor((bottom-1)/TILE);ty++)
    for(let tx=Math.floor(left/TILE);tx<=Math.floor((right-1)/TILE);tx++){
      const x0=Math.max(left,tx*TILE),x1=Math.min(right,(tx+1)*TILE);
      const y0=Math.max(top,ty*TILE),y1=Math.min(bottom,(ty+1)*TILE);
      // Skip allocating a full tile for an entirely empty clipboard area.
      // All RGBA channels matter: even alpha-zero RGB is preserved bytewise.
      let nonzero=false;
      for(let y=y0;y<y1;y++){
        const from=((y-offsetY)*source.width+x0-offsetX)*4;
        if(source.pixels.subarray(from,from+(x1-x0)*4).some(byte=>byte!==0)){
          nonzero=true;break;
        }
      }
      if(!nonzero)continue;
      const tile=new Uint8Array(TILE*TILE*4);
      for(let y=y0;y<y1;y++){
        const from=((y-offsetY)*source.width+x0-offsetX)*4,
          dest=((y-ty*TILE)*TILE+x0-tx*TILE)*4;
        tile.set(source.pixels.subarray(from,from+(x1-x0)*4),dest);
      }
      apply(tx,ty,tile);count++;
    }
  return count;
}
