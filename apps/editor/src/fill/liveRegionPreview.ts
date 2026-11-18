import type {Point} from '../transform/geometry';
import type {RegionGraph} from './pixels';

export type LiveRegionPreview=Readonly<{width:number;height:number;pixels:Uint8ClampedArray<ArrayBuffer>}>;

/** Collect only the regions touched by the new portion of a brush gesture.
 * This is deliberately a preview: final fill conditions, masks and
 * antialiasing are still determined by the fill worker at pen-up. */
export function addTraceRegions(
  graph:RegionGraph,from:Point,to:Point,width:number,closedOnly:boolean,selected:Set<number>
):void{
  const radius=Math.max(0,Math.min(12,Math.round(width/2-.5)));
  const length=Math.hypot(to.x-from.x,to.y-from.y);
  const steps=Math.max(1,Math.ceil(length));
  // Avoid pathological 4K diagonals or malformed input monopolizing a frame.
  if(!Number.isFinite(length)||steps>8192)return;
  for(let step=0;step<=steps;step++){
    const x=Math.floor(from.x+(to.x-from.x)*step/steps);
    const y=Math.floor(from.y+(to.y-from.y)*step/steps);
    for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
      if(dx*dx+dy*dy>radius*radius)continue;
      const sx=x+dx,sy=y+dy;
      if(sx<0||sy<0||sx>=graph.width||sy>=graph.height)continue;
      const id=graph.labels[sy*graph.width+sx]??0;
      if(id&&(!closedOnly||!graph.external[id]))selected.add(id);
    }
  }
}

/** Downsample just the region labels, never allocate a full-resolution overlay. */
export function renderLiveRegionPreview(
 graph:RegionGraph,selected:ReadonlySet<number>,maxDimension=512
):LiveRegionPreview{
 if(!Number.isSafeInteger(graph.width)||!Number.isSafeInteger(graph.height)||
    graph.width<1||graph.height<1||!Number.isSafeInteger(maxDimension)||maxDimension<1||maxDimension>1024)
   throw Error('塗りの仮表示を作れません。');
 const scale=Math.min(1,maxDimension/Math.max(graph.width,graph.height));
 const width=Math.max(1,Math.round(graph.width*scale)),height=Math.max(1,Math.round(graph.height*scale));
 const pixels=new Uint8ClampedArray(width*height*4);
 if(!selected.size)return {width,height,pixels};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const sourceIndex=Math.floor(y*graph.height/height)*graph.width+Math.floor(x*graph.width/width);
   if(!selected.has(graph.labels[sourceIndex]??0))continue;
   const offset=(y*width+x)*4;
   pixels[offset]=54;pixels[offset+1]=166;pixels[offset+2]=238;pixels[offset+3]=115;
 }
 return {width,height,pixels};
}
