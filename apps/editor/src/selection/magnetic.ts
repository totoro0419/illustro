/** C06 magnetic freehand selection: local edge attraction with continuity.
 * Uses a captured pixel snapshot, never modifies the artwork raster.
 * This bounded search costs O(radius²) per pointer sample, not O(canvas pixels).
 */
export type MagneticPoint=Readonly<{x:number;y:number}>;
export function snapMagneticPoint(
  pixels:Uint8ClampedArray|Uint8Array,width:number,height:number,
  pointer:MagneticPoint,previous:MagneticPoint|null,radius=8
):MagneticPoint{
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<3||height<3||
    pixels.length!==width*height*4||!Number.isFinite(pointer.x)||!Number.isFinite(pointer.y))
    return pointer;
  const x=Math.round(pointer.x),y=Math.round(pointer.y);
  const size=Math.max(1,Math.min(12,Math.round(radius)));
  const left=Math.max(1,x-size),right=Math.min(width-2,x+size);
  const top=Math.max(1,y-size),bottom=Math.min(height-2,y+size);
  if(left>right||top>bottom)return pointer;
  // Treat transparency as paper, so an opaque black line on a transparent
  // layer still creates a detectable edge.
  const brightness=(px:number,py:number)=>{
    const i=(py*width+px)*4,a=pixels[i+3]!/255;
    return ((.2126*pixels[i]!+.7152*pixels[i+1]!+.0722*pixels[i+2]!)*a)+255*(1-a);
  };
  let best=0,bestPoint=pointer;
  for(let py=top;py<=bottom;py++)for(let px=left;px<=right;px++){
    const distance=Math.hypot(px+.5-pointer.x,py+.5-pointer.y);
    if(distance>size)continue;
    const gradX=Math.abs(brightness(px+1,py)-brightness(px-1,py));
    const gradY=Math.abs(brightness(px,py+1)-brightness(px,py-1));
    const edge=gradX+gradY;
    if(edge<32)continue;
    // Prefer a clear, nearby edge; damp jumps away from the last point.
    const continuity=previous?Math.max(0,Math.hypot(px+.5-previous.x,py+.5-previous.y)-size)*2:0;
    const score=edge-distance*13-continuity;
    if(score>best){best=score;bestPoint={x:px+.5,y:py+.5};}
  }
  return bestPoint;
}
