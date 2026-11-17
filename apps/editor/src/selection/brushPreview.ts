/** Bounded live brush-preview dabs using the same geometry as brushSelection.
 * This is a visual overlay only: the final selection is still rasterized in
 * mask.ts, and no preview pixels are committed to the document. */
import type {SelectionBrushPoint} from './mask';

export type BrushPreviewDab=Readonly<{x:number;y:number;radius:number}>;
export function selectionBrushPreviewDabs(
  points:readonly SelectionBrushPoint[],size:number,maxDabs=256
):BrushPreviewDab[]{
  if(!Number.isFinite(size)||size<1||size>800||
    !Number.isInteger(maxDabs)||maxDabs<1||maxDabs>2048)return [];
  const dots:BrushPreviewDab[]=[];
  const step=Math.max(1,size*.23);
  // Old segments cannot affect the most recent brush footprint, and must not
  // cause a long stylus gesture to block the input thread.
  for(let i=Math.max(0,points.length-maxDabs);i<points.length;i++){
    const current=points[i]!,previous=points[Math.max(0,i-1)]!;
    if(!Number.isFinite(current.x)||!Number.isFinite(current.y)||!Number.isFinite(current.pressure)||
      !Number.isFinite(previous.x)||!Number.isFinite(previous.y)||!Number.isFinite(previous.pressure))continue;
    const distance=Math.hypot(current.x-previous.x,current.y-previous.y);
    const count=Math.min(10000,Math.max(1,Math.ceil(distance/step)));
    const start=Math.max(1,count-maxDabs+1);
    for(let k=start;k<=count;k++){
      const t=k/count;
      const pressure=Math.max(0,Math.min(1,previous.pressure+(current.pressure-previous.pressure)*t));
      dots.push({
        x:previous.x+(current.x-previous.x)*t,
        y:previous.y+(current.y-previous.y)*t,
        radius:Math.max(.5,size*(.25+.75*pressure)*.5)
      });
    }
    if(dots.length>maxDabs)dots.splice(0,dots.length-maxDabs);
  }
  return dots;
}
