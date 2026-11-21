import type {Point} from '../transform/geometry';
import type {RegionGraph} from './pixels';

/** A safe no-op guard. It never guesses how a changed connected component
 * should be relabeled; any actual wall change still receives full analysis.
 * Its cost depends only on the drawn manual path, not the 4000px canvas. */
export function isManualBoundaryNoop(
 graph:RegionGraph,points:readonly Point[],remove:boolean,preserveInk=false
):boolean{
 if(!points.length||preserveInk)return false;
 let visited=false;
 const {width,height,walls,bridges}=graph;
 for(let i=0;i<points.length;i++){
  const a=points[Math.max(0,i-1)]!,b=points[i]!;
  const span=Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
  if(!Number.isFinite(span)||span>8192)return false;
  const steps=Math.max(1,Math.ceil(span*2));
  for(let j=0;j<=steps;j++){
    const x=Math.floor(a.x+(b.x-a.x)*j/steps),y=Math.floor(a.y+(b.y-a.y)*j/steps);
    if(x<0||x>=width||y<0||y>=height)continue;
    visited=true;
    const at=y*width+x;
    if((remove?0:1)!==walls[at]||bridges[at])return false;
  }
 }
 return visited;
}
