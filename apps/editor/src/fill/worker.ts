import {buildRegions,colorMask,fillMask,type FillSettings,type RegionGraph,type Walls} from './pixels';
import type {MaskData} from '../selection/mask';
import type {Point} from '../transform/geometry';

export type FillImage={source:Uint8Array;width:number;height:number;settings:FillSettings};
export type FillJob=FillImage&(
  |{type:'graph';manual:Walls}
  |{type:'fill';target:Uint8Array|null;selection:MaskData|null;graph:RegionGraph|null;
    points:readonly Point[];output:'selection'|'pixels';alphaLocked:boolean}
);

self.onmessage=({data}:MessageEvent<FillJob>)=>{
  try{
    const {source,width,height,settings}=data;
    const post=self as unknown as Worker;
    if(data.type==='graph'){
      const graph=buildRegions(source,width,height,settings.tolerance,settings.gap,data.manual);
      post.postMessage({graph},[graph.labels.buffer as ArrayBuffer,graph.walls.buffer as ArrayBuffer,graph.bridges.buffer as ArrayBuffer,graph.external.buffer as ArrayBuffer,
        graph.neighborOffsets.buffer as ArrayBuffer,graph.neighbors.buffer as ArrayBuffer,graph.depth.buffer as ArrayBuffer]);
      return;
    }
    const mask=fillMask(source,width,height,settings,data.points,data.graph,data.selection);
    if(data.output==='selection'){
      post.postMessage({mask},[mask.alpha.buffer as ArrayBuffer]);return;
    }
    const pixels=colorMask(data.target,mask,settings,data.alphaLocked);
    const changed=pixels.some((value,index)=>value!==(data.target?.[index]??0));
    post.postMessage({pixels:changed?pixels:null,mask},changed?[pixels.buffer,mask.alpha.buffer as ArrayBuffer]:[mask.alpha.buffer as ArrayBuffer]);
  }catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
