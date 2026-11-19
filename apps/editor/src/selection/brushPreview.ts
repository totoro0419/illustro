/** Bounded live brush-preview dabs using the same geometry as brushSelection.
 * This is a visual overlay only: the final selection is still rasterized in
 * mask.ts, and no preview pixels are committed to the document. */
import {brushSelection,type MaskData,type SelectionBrushPoint,type SelectionBrushSettings} from './mask';

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

/** Exact alpha delta from the same brushSelection() used at commit time.
 * For short strokes this replaces stacked SVG gradients (whose overlapping
 * alpha was not equivalent to the committed selection). A strict work budget
 * leaves long/large strokes on the existing cheap geometric preview. */
export type SelectionBrushPreviewRaster=Readonly<{
  x:number;y:number;width:number;height:number;alpha:Uint8Array;scaleX?:number;scaleY?:number;
}>;
export function selectionBrushPreviewRaster(
 prior:MaskData|null,points:readonly SelectionBrushPoint[],settings:SelectionBrushSettings,
 width:number,height:number
):SelectionBrushPreviewRaster|null{
 if(!points.length||points.length>384||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||
    width<1||height<1||prior&&(prior.width!==width||prior.height!==height||
      !(prior.alpha instanceof Uint8Array)||prior.alpha.length!==width*height))return null;
 const size=settings.size;
 if((settings.mode!=='add'&&settings.mode!=='subtract')||
    !Number.isFinite(size)||size<1||size>800||
    !Number.isFinite(settings.opacity)||settings.opacity<0||settings.opacity>1||
    !Number.isFinite(settings.hardness)||settings.hardness<0||settings.hardness>1)return null;
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,steps=0;
 const step=Math.max(1,size*.23);
 for(let i=0;i<points.length;i++){
  const p=points[i]!,previous=points[Math.max(0,i-1)]!;
  if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.pressure)||
     !Number.isFinite(previous.x)||!Number.isFinite(previous.y)||!Number.isFinite(previous.pressure))return null;
  minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);
  maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);
  steps+=Math.min(10000,Math.max(1,Math.ceil(Math.hypot(p.x-previous.x,p.y-previous.y)/step)));
 }
 // The exact brush loops over the bounding box of each dab, so budget for
 // squares rather than circles. Never monopolize the pointer event thread.
 if(steps*(size+3)**2>350000)return null;
 const radius=size/2+2;
 const x0=Math.max(0,Math.floor(minX-radius)),y0=Math.max(0,Math.floor(minY-radius));
 const x1=Math.min(width,Math.ceil(maxX+radius)),y1=Math.min(height,Math.ceil(maxY+radius));
 const w=x1-x0,h=y1-y0;
 if(w<1||h<1||w*h>262144)return null;
 const original=new Uint8Array(w*h);
 if(prior){
  for(let y=0;y<h;y++)
   original.set(prior.alpha.subarray((y+y0)*width+x0,(y+y0)*width+x1),y*w);
 }
 const local=points.map(p=>({x:p.x-x0,y:p.y-y0,pressure:p.pressure}));
 const result=brushSelection({width:w,height:h,alpha:original},local,settings).alpha;
 const delta=new Uint8Array(w*h);
 for(let i=0;i<delta.length;i++)delta[i]=Math.abs(result[i]!-original[i]!);
 return {x:x0,y:y0,width:w,height:h,alpha:delta};
}

/** A bounded identity for the live preview request. The exact raster preview
 * can use up to 384 samples; limiting this to the last 64 misses corrections
 * to older samples of a still-exact stroke. Long strokes use a bounded SVG
 * tail, so retaining the latest 384 samples avoids unbounded serialization. */
export function selectionBrushPreviewRequestKey(points:readonly SelectionBrushPoint[],settingsKey:string):string{
 const tail=points.slice(-384).map(p=>[p.x,p.y,p.pressure]);
 return points.length+':'+settingsKey+':'+JSON.stringify(tail);
}
