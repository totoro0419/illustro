import {cpuReference,samplePixelMask,validateRecord,type StrokeRecord} from '@illustro/brush-rt';
import type {DeformationBrushPass} from '@illustro/core';

/** Render strokes added AFTER a deformation. At 1:1 the result uses exactly
 * the same CPU brush compositor as the final commit; scaled previews use
 * the same strokes with coordinates and radii scaled to the small viewport.
 * The input image is the preview of the newly transformed original.
 * All work executes in transform.worker, never on the pointer event thread. */
export function renderPostPaintPreview(
 transformed:Uint8ClampedArray,
 originalWidth:number,originalHeight:number,
 width:number,height:number,passes:readonly DeformationBrushPass[]
):Uint8ClampedArray{
 if(transformed.length!==width*height*4||width<1||height<1||
   originalWidth<1||originalHeight<1)throw Error('仮表示の画像の大きさが正しくありません。');
 const sx=width/originalWidth,sy=height/originalHeight;
 // The preview preserves the canvas aspect ratio. Uniform size scaling
 // prevents brushes from becoming unexpectedly elliptical at rounded sizes.
 const radiusScale=Math.sqrt(sx*sy);
 let pixels=transformed;
 for(const pass of passes){
  let mask:Uint8Array|null=null;
  if(pass.selection){
   mask=new Uint8Array(width*height);
   for(let y=0;y<height;y++)for(let x=0;x<width;x++)
    mask[y*width+x]=samplePixelMask(pass.selection,(x+.5)/sx,(y+.5)/sy);
  }
  for(const raw of pass.records){
   const record=validateRecord(raw);
   const commands=record.commands.map(command=>{
    const next=[...command];
    next[0]=command[0]!*sx;next[1]=command[1]!*sy;
    next[2]=command[2]!*radiusScale;
    next[16]=command[16]!*sx;next[17]=command[17]!*sy;
    next[18]=command[18]!*radiusScale;next[23]=command[23]!*radiusScale;
    return next;
   });
   pixels=cpuReference({...record,commands} as StrokeRecord,width,height,pixels,mask??undefined);
  }
 }
 return pixels;
}
