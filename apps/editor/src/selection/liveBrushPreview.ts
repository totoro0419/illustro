import {paintSelectionBrush,type MaskData,type SelectionBrushPoint,type SelectionBrushSettings} from './mask';
import type {SelectionBrushPreviewRaster} from './brushPreview';

/** Worker-owned original-resolution masks. A long stroke extends the same
 * mask without replaying old dabs or dropping its oldest visible segments. */
export class LiveSelectionBrushPreview{
 private result:MaskData;
 private processed=0;
 private settingsKey='';
 constructor(private readonly prior:MaskData){
  this.result={...prior,alpha:prior.alpha.slice()};
 }
 render(points:readonly SelectionBrushPoint[],settings:SelectionBrushSettings,maxDimension=512):SelectionBrushPreviewRaster{
  const key=JSON.stringify(settings),{width,height}=this.prior;
  if(this.settingsKey&&key!==this.settingsKey||points.length<this.processed){
   this.result={...this.prior,alpha:this.prior.alpha.slice()};this.processed=0;
  }
  this.settingsKey=key;
  paintSelectionBrush(this.result,points,settings,this.processed);
  this.processed=points.length;
  const radius=settings.size/2+2;
  let left=width,top=height,right=0,bottom=0;
  for(const point of points){
   left=Math.min(left,Math.floor(point.x-radius));top=Math.min(top,Math.floor(point.y-radius));
   right=Math.max(right,Math.ceil(point.x+radius));bottom=Math.max(bottom,Math.ceil(point.y+radius));
  }
  left=Math.max(0,left);top=Math.max(0,top);right=Math.min(width,right);bottom=Math.min(height,bottom);
  const w=Math.max(1,right-left),h=Math.max(1,bottom-top);
  const scale=Math.min(1,maxDimension/Math.max(w,h));
  const columns=Math.max(1,Math.round(w*scale)),rows=Math.max(1,Math.round(h*scale));
  const alpha=new Uint8Array(columns*rows);
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
   const x0=left+Math.floor(x*w/columns),x1=left+Math.floor((x+1)*w/columns);
   const y0=top+Math.floor(y*h/rows),y1=top+Math.floor((y+1)*h/rows);
   let total=0;
   for(let sy=y0;sy<y1;sy++)for(let sx=x0;sx<x1;sx++){
    const i=sy*width+sx;
    if(sx>=0&&sx<width&&sy>=0&&sy<height)
     total+=Math.abs(this.result.alpha[i]!-this.prior.alpha[i]!);
   }
   alpha[y*columns+x]=Math.round(total/((x1-x0)*(y1-y0)));
  }
  return {x:left,y:top,width:columns,height:rows,alpha,scaleX:w/columns,scaleY:h/rows};
 }
}
