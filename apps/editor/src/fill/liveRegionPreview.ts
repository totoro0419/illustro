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
  // Match fillMask's two samples per dominant-axis pixel. The old
  // Euclidean one-sample trace skipped thin regions on diagonal gestures.
  const length=Math.max(Math.abs(to.x-from.x),Math.abs(to.y-from.y));
  const steps=Math.max(1,Math.ceil(length*2));
  if(!Number.isFinite(length)||steps>8192)return;
  for(let step=1;step<=steps;step++){
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
 graph:RegionGraph,selected:ReadonlySet<number>,maxDimension=512,
 reuse?:Uint8ClampedArray<ArrayBuffer>
):LiveRegionPreview{
 if(!Number.isSafeInteger(graph.width)||!Number.isSafeInteger(graph.height)||
    graph.width<1||graph.height<1||!Number.isSafeInteger(maxDimension)||maxDimension<1||maxDimension>1024)
   throw Error('塗りの仮表示を作れません。');
 const scale=Math.min(1,maxDimension/Math.max(graph.width,graph.height));
 const width=Math.max(1,Math.round(graph.width*scale)),height=Math.max(1,Math.round(graph.height*scale));
 const pixels=reuse?.length===width*height*4?reuse:new Uint8ClampedArray(width*height*4);
 // An existing canvas buffer is reused across animation frames to avoid GC.
 pixels.fill(0);
 if(!selected.size)return {width,height,pixels};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const x0=Math.floor(x*graph.width/width),x1=Math.floor((x+1)*graph.width/width);
   const y0=Math.floor(y*graph.height/height),y1=Math.floor((y+1)*graph.height/height);
   // At most four label lookups per thumbnail pixel, even on a 4K canvas.
   const nx=Math.min(2,x1-x0),ny=Math.min(2,y1-y0);
   let covered=0;
   for(let sy=0;sy<ny;sy++)for(let sx=0;sx<nx;sx++){
     const sourceX=Math.min(x1-1,Math.floor(x0+(sx+.5)*(x1-x0)/nx));
     const sourceY=Math.min(y1-1,Math.floor(y0+(sy+.5)*(y1-y0)/ny));
     if(selected.has(graph.labels[sourceY*graph.width+sourceX]??0))covered++;
   }
   if(!covered)continue;
   const offset=(y*width+x)*4;
   pixels[offset]=54;pixels[offset+1]=166;pixels[offset+2]=238;
   pixels[offset+3]=Math.round(115*covered/(nx*ny));
 }
 // A very thin region can still fall between thumbnail samples. Its canonical
 // first pixel guarantees at least one visible cue without a full 4K scan.
 for(const id of selected){
   if(!Number.isInteger(id)||id<1||id>graph.count)continue;
   const anchor=graph.anchors[id];
   if(anchor===undefined||anchor>=graph.labels.length||graph.labels[anchor]!==id)continue;
   const x=Math.min(width-1,Math.floor((anchor%graph.width)*width/graph.width));
   const y=Math.min(height-1,Math.floor(Math.floor(anchor/graph.width)*height/graph.height));
   const offset=(y*width+x)*4;
   if(pixels[offset+3])continue;
   pixels[offset]=54;pixels[offset+1]=166;pixels[offset+2]=238;pixels[offset+3]=32;
 }
 return {width,height,pixels};
}
