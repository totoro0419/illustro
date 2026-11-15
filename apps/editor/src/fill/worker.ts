import {buildRegions,colorMask,fillBoundaries,fillMask,paintColorHints,sharedBoundary,unpaintedFillEdges,type FillSettings,type RegionGraph,type Walls} from './pixels';
import type {ColorHint} from '@illustro/core';
import type {MaskData} from '../selection/mask';
import type {Point} from '../transform/geometry';

export type FillImage={source:Uint8Array;width:number;height:number;settings:FillSettings};
export type FillJob={type:'boundary';graph:RegionGraph;first:number;second:number;near?:Point}|(FillImage&(
  |{type:'graph';manual:Walls}
  |{type:'hints';target:Uint8Array|null;selection:MaskData|null;graph:RegionGraph;hints:readonly ColorHint[];alphaLocked:boolean}
  |{type:'fill';target:Uint8Array|null;selection:MaskData|null;graph:RegionGraph|null;
    points:readonly Point[];output:'selection'|'pixels';alphaLocked:boolean;diagnostics?:boolean}
));

self.onmessage=({data}:MessageEvent<FillJob>)=>{
  try{
    if(data.type==='boundary'){
      self.postMessage({boundary:sharedBoundary(data.graph,data.first,data.second,data.near)});
      return;
    }
    const {source,width,height,settings}=data;
    const post=self as unknown as Worker;
    if(data.type==='graph'){
      const graph=buildRegions(source,width,height,settings.tolerance,settings.gap,data.manual);
      post.postMessage({graph},[graph.labels.buffer as ArrayBuffer,graph.walls.buffer as ArrayBuffer,graph.bridges.buffer as ArrayBuffer,graph.external.buffer as ArrayBuffer,
        graph.neighborOffsets.buffer as ArrayBuffer,graph.neighbors.buffer as ArrayBuffer,graph.depth.buffer as ArrayBuffer]);
      return;
    }
    if(data.type==='hints'){
      const result=paintColorHints(data.graph,data.hints,data.target,data.selection,data.settings,data.alphaLocked);
      post.postMessage(result,[result.pixels.buffer,result.mask.alpha.buffer]);
      return;
    }
    const repairs=data.graph??(settings.method==='color'&&settings.contiguous&&settings.gap
      ?fillBoundaries(source,width,height,settings.tolerance,settings.gap):null);
    const mask=fillMask(source,width,height,settings,data.points,data.graph,data.selection,repairs?.bridges);
    if(data.output==='selection'){
      post.postMessage({mask},[mask.alpha.buffer as ArrayBuffer]);return;
    }
    const pixels=colorMask(data.target,mask,settings,data.alphaLocked);
    const changed=pixels.some((value,index)=>value!==(data.target?.[index]??0));
    const transfer=[mask.alpha.buffer as ArrayBuffer];
    if(changed)transfer.push(pixels.buffer);
    let diagnostics;
    if(data.diagnostics){
      const bounds=repairs??fillBoundaries(source,width,height,settings.tolerance,0);
      const remaining=unpaintedFillEdges(mask,pixels,data.selection,bounds.walls);
      const bridges=bounds.bridges.slice();
      diagnostics={remaining,bridges};
      transfer.push(remaining.buffer as ArrayBuffer,bridges.buffer);
    }
    post.postMessage({pixels:changed?pixels:null,mask,diagnostics},transfer);
  }catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
