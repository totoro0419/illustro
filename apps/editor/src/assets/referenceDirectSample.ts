import type {BoardItem} from './referenceBoardStore';
import {averageSampledPixels,type SampleTransparency} from '../color/sampleAverage';
import {rgb,type RGB} from '../color/model';

export type ImageArea=Readonly<{left:number;top:number;width:number;height:number}>;
export type OriginalPoint=Readonly<{x:number;y:number}>;

/** Invert the exact CSS transform used by a floating reference image:
 * translate(panX,panY) rotate(rotation) scale(zoom*flipX,zoom*flipY).
 * The untransformed image is centered in its flexbox container.
 */
export function referencePixelAtScreen(
  x:number,y:number,area:ImageArea,
  display:Readonly<Pick<BoardItem,'panX'|'panY'|'zoom'|'rotation'|'flipX'|'flipY'>>,
  displayedWidth:number,displayedHeight:number,
  sourceWidth:number,sourceHeight:number
):OriginalPoint|null{
  if(![x,y,area.left,area.top,area.width,area.height,
    display.panX,display.panY,display.zoom,display.rotation,
    displayedWidth,displayedHeight,sourceWidth,sourceHeight].every(Number.isFinite)||
    Math.min(displayedWidth,displayedHeight,sourceWidth,sourceHeight,display.zoom)<=0||
    area.width<=0||area.height<=0)return null;
  const angle=display.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const dx=x-area.left-area.width/2-display.panX;
  const dy=y-area.top-area.height/2-display.panY;
  const localX=(dx*c+dy*s)/(display.zoom*(display.flipX?-1:1));
  const localY=(-dx*s+dy*c)/(display.zoom*(display.flipY?-1:1));
  const u=localX/displayedWidth+.5,v=localY/displayedHeight+.5;
  if(u<0||u>=1||v<0||v>=1)return null;
  return {
    x:Math.min(sourceWidth-1,Math.max(0,Math.floor(u*sourceWidth))),
    y:Math.min(sourceHeight-1,Math.max(0,Math.floor(v*sourceHeight)))
  };
}
/** A tiny original-resolution canvas reads 1, 3x3 or 5x5 pixels; no
 * preview scaling is involved. An empty transparent sample is rejected.
 */
export function sampleReferenceBitmap(
  bitmap:ImageBitmap,point:OriginalPoint,diameter:1|3|5,
  transparency:SampleTransparency
):RGB|null{
  if(![1,3,5].includes(diameter))throw Error('採色する範囲を確認できません。');
  const half=Math.floor(diameter/2);
  const left=Math.max(0,point.x-half),top=Math.max(0,point.y-half);
  const width=Math.min(bitmap.width-1,point.x+half)-left+1;
  const height=Math.min(bitmap.height-1,point.y+half)-top+1;
  if(width<=0||height<=0)return null;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context)throw Error('参考画像の色を読み取れません。');
  context.drawImage(bitmap,left,top,width,height,0,0,width,height);
  const bytes=new Uint8Array(context.getImageData(0,0,width,height).data);
  const rgba=averageSampledPixels(bytes,transparency);
  return rgba?rgb(rgba[0]!/255,rgba[1]!/255,rgba[2]!/255):null;
}
