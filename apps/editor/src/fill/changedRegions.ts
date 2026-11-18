import {regionTopology,type RegionGraph} from './pixels';
import type {Point} from '../transform/geometry';

/** Flood only components touched by a manual wall change. Canonical IDs are
 * ordered by the first pixel, exactly as in a full rebuild. owned=true is
 * reserved for the worker's exclusive structured clone. */
export function updateChangedRegions(graph:RegionGraph,points:readonly Point[],remove:boolean,owned=false):RegionGraph|null{
 const {width,height,count,anchors,external}=graph,n=width*height;
 if(!points.length||!Number.isSafeInteger(n)||width<1||height<1||
    graph.walls.length!==n||graph.labels.length!==n||graph.bridges.length!==n||
    anchors.length!==count+1||external.length!==count+1)return null;
 const changes=new Set<number>(),affected=new Uint8Array(count+1);
 for(let i=0;i<points.length;i++){
   const a=points[Math.max(0,i-1)]!,b=points[i]!;
   const distance=Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
   if(!Number.isFinite(distance)||distance>8192)return null;
   const steps=Math.max(1,Math.ceil(distance*2));
   for(let j=0;j<=steps;j++){
     const x=Math.floor(a.x+(b.x-a.x)*j/steps),y=Math.floor(a.y+(b.y-a.y)*j/steps);
     if(x<0||x>=width||y<0||y>=height)continue;
     const at=y*width+x;
     if(graph.bridges[at])return null;
     if(Boolean(graph.walls[at])===!remove||changes.has(at))continue;
     if(changes.size>=8192)return null;
     changes.add(at);
     if(!remove){affected[graph.labels[at]!]=1;continue;}
     for(const other of [x?at-1:-1,x+1<width?at+1:-1,y?at-width:-1,y+1<height?at+width:-1])
       if(other>=0&&graph.labels[other])affected[graph.labels[other]!]=1;
   }
 }
 if(!changes.size)return null;
 const walls=owned?graph.walls:graph.walls.slice(),labels=owned?graph.labels:graph.labels.slice();
 for(const at of changes){walls[at]=remove?0:1;labels[at]=0;}
 const eligible=(at:number)=>!walls[at]&&labels[at]!<=count&&
   (labels[at]!==0?!!affected[labels[at]!]:(remove&&changes.has(at)));
 const seeds:number[]=[];
 for(let id=1;id<=count;id++)if(affected[id])seeds.push(anchors[id]!);
 for(const at of changes){
   const x=at%width,y=Math.floor(at/width);
   if(remove)seeds.push(at);
   if(x)seeds.push(at-1);if(x+1<width)seeds.push(at+1);
   if(y)seeds.push(at-width);if(y+1<height)seeds.push(at+width);
 }
 const components:Array<{label:number;anchor:number;outside:number}>=[];
 for(let id=1;id<=count;id++)if(!affected[id])
   components.push({label:id,anchor:anchors[id]!,outside:external[id]!});
 let temporary=count;
 for(const seed of seeds){
   if(!eligible(seed))continue;
   const label=++temporary,stack=[seed];let anchor=seed,outside=0;
   while(stack.length){
     const at=stack.pop()!;
     if(!eligible(at))continue;
     const row=Math.floor(at/width),rowStart=row*width;
     let left=at,right=at;
     while(left>rowStart&&eligible(left-1))left--;
     while(right+1<rowStart+width&&eligible(right+1))right++;
     anchor=Math.min(anchor,left);
     if(!row||row+1===height||left===rowStart||right+1===rowStart+width)outside=1;
     for(let x=left;x<=right;x++)labels[x]=label;
     for(const offset of [row?-width:0,row+1<height?width:0]){
       if(!offset)continue;
       let inRun=false;
       for(let x=left;x<=right;x++){
         const open=eligible(x+offset);
         if(open&&!inRun)stack.push(x+offset);
         inRun=open;
       }
     }
   }
   components.push({label,anchor,outside});
 }
 components.sort((a,b)=>a.anchor-b.anchor);
 const remap=new Uint32Array(temporary+1),nextAnchors=new Uint32Array(components.length+1);
 const nextExternal=new Uint8Array(components.length+1);
 components.forEach((part,i)=>{remap[part.label]=i+1;nextAnchors[i+1]=part.anchor;nextExternal[i+1]=part.outside;});
 let hasInk=false;
 for(let at=0;at<n;at++){
   if(walls[at])hasInk=true;
   if(labels[at])labels[at]=remap[labels[at]!]!;
 }
 return {...graph,walls,labels,count:components.length,anchors:nextAnchors,external:nextExternal,
   hasInk,...regionTopology(labels,width,height,nextExternal)};
}
