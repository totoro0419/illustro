import {paintSelectionBrush,type MaskData,type SelectionBrushPoint,type SelectionBrushSettings} from './mask';
import type {SelectionBrushPreviewRaster} from './brushPreview';

/** Worker-owned original-resolution masks. A long stroke extends the same
 * mask without replaying old dabs or dropping its oldest visible segments. */
export class LiveSelectionBrushPreview{
 private result:MaskData;
 private processed=0;
 private settingsKey='';
 private recentPoints:SelectionBrushPoint[]=[];
 private recentStart=0;
 private minX=Infinity;private minY=Infinity;
 private maxX=-Infinity;private maxY=-Infinity;
 constructor(private readonly prior:MaskData){
  this.result={...prior,alpha:prior.alpha.slice()};
 }
 render(points:readonly SelectionBrushPoint[],settings:SelectionBrushSettings,maxDimension=512):SelectionBrushPreviewRaster{
  const key=JSON.stringify(settings),{width,height}=this.prior;
  // Coalesced pointer samples can revise more than the last eight points.
  // Inspect the last 64 without scanning the entire stroke every frame;
  // replay from the immutable original if any of those samples changed.
  const changed=this.recentPoints.some((saved,index)=>{
   const point=points[this.recentStart+index];
   return !point||point.x!==saved.x||point.y!==saved.y||point.pressure!==saved.pressure;
  });
  if((this.settingsKey&&key!==this.settingsKey)||points.length<this.processed||changed){
   this.result={...this.prior,alpha:this.prior.alpha.slice()};this.processed=0;
   this.minX=this.minY=Infinity;this.maxX=this.maxY=-Infinity;
  }
  this.settingsKey=key;
  paintSelectionBrush(this.result,points,settings,this.processed);
  // Update bounds only for new points. Scanning the entire long stroke on
  // every pointer event otherwise makes a 4K preview quadratic in length.
  for(let i=this.processed;i<points.length;i++){
   const point=points[i]!;
   this.minX=Math.min(this.minX,point.x);this.minY=Math.min(this.minY,point.y);
   this.maxX=Math.max(this.maxX,point.x);this.maxY=Math.max(this.maxY,point.y);
  }
  this.processed=points.length;
  this.recentStart=Math.max(0,points.length-64);
  this.recentPoints=points.slice(this.recentStart).map(point=>({...point}));
  const radius=settings.size/2+2;
  const left=Math.max(0,Math.min(width,Math.floor(this.minX-radius)));
  const top=Math.max(0,Math.min(height,Math.floor(this.minY-radius)));
  const right=Math.max(0,Math.min(width,Math.ceil(this.maxX+radius)));
  const bottom=Math.max(0,Math.min(height,Math.ceil(this.maxY+radius)));
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
