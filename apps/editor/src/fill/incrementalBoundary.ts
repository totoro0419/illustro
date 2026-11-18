import type {Point} from '../transform/geometry';
import type {RegionGraph} from './pixels';

/** A deliberately conservative fast path for adding walls inside an existing
 * region. If the new wall could split/merge any component, touch the exterior,
 * change an automatically suggested bridge or invalidate a label anchor,
 * return null and let the authoritative full-image analyzer handle it.
 *
 * Testing that every open 4-neighbor stays connected inside the surrounding
 * 3×3 square is a sufficient (not necessary) condition for removing one
 * pixel without splitting the original connected component.
 */
export function tryIncrementalBoundaryAddition(
 graph:RegionGraph,points:readonly Point[]
):RegionGraph|null{
 if(!points.length||graph.candidates.length||!graph.count)return null;
 const {width,height,walls,bridges,labels,anchors}=graph;
 if(width<5||height<5||walls.length!==width*height||
    labels.length!==walls.length||bridges.length!==walls.length)return null;
 const changes:number[]=[];
 const scheduled=new Set<number>();
 const blocked=new Set<number>();
 let region=0;
 for(let i=0;i<points.length;i++){
   const a=points[Math.max(0,i-1)]!,b=points[i]!;
   const length=Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y));
   if(!Number.isFinite(length)||length>8192)return null;
   const steps=Math.max(1,Math.ceil(length*2));
   for(let j=0;j<=steps;j++){
     const x=Math.floor(a.x+(b.x-a.x)*j/steps),y=Math.floor(a.y+(b.y-a.y)*j/steps);
     if(x<=1||y<=1||x>=width-2||y>=height-2)return null;
     const at=y*width+x;
     if(walls[at]||scheduled.has(at))continue;
     if(bridges[at]||!labels[at])return null;
     const id=labels[at]!;
     if(region&&id!==region)return null;
     region=id;
     if(at===anchors[id])return null;
     if(changes.length>=8192)return null;
     scheduled.add(at);changes.push(at);
   }
 }
 if(!changes.length)return null;
 const accessible=(index:number)=>!walls[index]&&!blocked.has(index)&&labels[index]===region;
 for(const at of changes){
   const x=at%width,y=Math.floor(at/width),neighbors:number[]=[];
   for(const other of [at-1,at+1,at-width,at+width]){
     if(!walls[other]&&!blocked.has(other)){
       if(labels[other]!==region)return null;
       neighbors.push(other);
     }
   }
   // If two neighbors are connected through the 3×3 square without crossing
   // this pixel, the removed pixel cannot disconnect the region globally.
   if(neighbors.length>1){
     const touched=new Set<number>([neighbors[0]!]),queue=[neighbors[0]!];
     while(queue.length){
       const current=queue.pop()!;
       for(const next of [current-1,current+1,current-width,current+width]){
         const dx=Math.abs(next%width-x),dy=Math.abs(Math.floor(next/width)-y);
         if(dx>1||dy>1||next===at||!accessible(next)||touched.has(next))continue;
         touched.add(next);queue.push(next);
       }
     }
     if(neighbors.some(other=>!touched.has(other)))return null;
   }
   blocked.add(at);
 }
 // COW: old graph remains unchanged for before/after comparison. No full
 // RGBA color scan, flood fill, graph adjacency or depth rebuild is needed.
 const nextWalls=walls.slice(),nextLabels=labels.slice();
 for(const index of changes){nextWalls[index]=1;nextLabels[index]=0;}
 return {...graph,walls:nextWalls,labels:nextLabels,hasInk:true};
}
