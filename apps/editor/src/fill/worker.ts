import {buildRegions,colorMask,fillBoundaries,fillGuaranteedUnchanged,fillMask,hasFillPixelChanges,paintColorHints,sharedBoundary,suggestLocalGaps,unpaintedFillEdges,type FillSettings,type RegionGraph,type Walls} from './pixels';
import type {ColorHint} from '@illustro/core';
import type {MaskData} from '../selection/mask';
import type {Point} from '../transform/geometry';
import {updateChangedRegions} from './changedRegions';
import {ExactColorFillPreview,type LiveFillContext} from './liveExactPreview';

export type FillImage={source:Uint8Array;width:number;height:number;settings:FillSettings};
export type FillJob={type:'live-fill';id:string;context?:LiveFillContext;settings:FillSettings;points:readonly Point[]}|
{type:'graph-edit';graph:RegionGraph;points:readonly Point[];remove:boolean}|{type:'local-gaps';graph:RegionGraph;point:Point;reach:number;manual:Walls}|{type:'boundary';graph:RegionGraph;first:number;second:number;near?:Point}|(FillImage&(
  |{type:'graph';manual:Walls}
  |{type:'hints';target:Uint8Array|null;selection:MaskData|null;graph:RegionGraph;hints:readonly ColorHint[];alphaLocked:boolean}
  |{type:'fill';target:Uint8Array|null;selection:MaskData|null;graph:RegionGraph|null;
    points:readonly Point[];output:'selection'|'pixels';alphaLocked:boolean;diagnostics?:boolean}
));

let live:{id:string;fill:ExactColorFillPreview}|null=null;
self.onmessage=({data}:MessageEvent<FillJob|{type:'live-end';id:string}>)=>{
  try{
    if(data.type==='live-end'){
      if(live?.id===data.id)live=null;
      return; // Release is deliberately silent: it must not settle a queued job.
    }
    if(data.type==='live-fill'){
      if(data.context)live={id:data.id,fill:new ExactColorFillPreview(data.context)};
      if(live?.id!==data.id){self.postMessage({previewMissing:true});return;}
      const {preview}=live.fill.render(data.settings,data.points);
      (self as unknown as Worker).postMessage({preview},[preview.pixels.buffer]);
      return;
    }
    if(data.type==='graph-edit'){
      const graph=updateChangedRegions(data.graph,data.points,data.remove,true);
      if(!graph){self.postMessage({patchUnavailable:true});return;}
      (self as unknown as Worker).postMessage({graph},[graph.labels.buffer as ArrayBuffer,graph.walls.buffer as ArrayBuffer,
        graph.bridges.buffer as ArrayBuffer,graph.external.buffer as ArrayBuffer,graph.neighborOffsets.buffer as ArrayBuffer,
        graph.neighbors.buffer as ArrayBuffer,graph.depth.buffer as ArrayBuffer,graph.anchors.buffer as ArrayBuffer]);
      return;
    }
    if(data.type==='local-gaps'){
      self.postMessage({gaps:suggestLocalGaps(data.graph,data.point,data.reach,data.manual)});
      return;
    }
    if(data.type==='boundary'){
      self.postMessage({boundary:sharedBoundary(data.graph,data.first,data.second,data.near)});
      return;
    }
    const {source,width,height,settings}=data;
    const post=self as unknown as Worker;
    if(data.type==='graph'){
      const graph=buildRegions(source,width,height,settings.tolerance,settings.gap,data.manual);
      post.postMessage({graph},[graph.labels.buffer as ArrayBuffer,graph.walls.buffer as ArrayBuffer,graph.bridges.buffer as ArrayBuffer,graph.external.buffer as ArrayBuffer,
        graph.neighborOffsets.buffer as ArrayBuffer,graph.neighbors.buffer as ArrayBuffer,graph.depth.buffer as ArrayBuffer,graph.anchors.buffer as ArrayBuffer]);
      return;
    }
    if(data.type==='hints'){
      const result=paintColorHints(data.graph,data.hints,data.target,data.selection,data.settings,data.alphaLocked);
      post.postMessage(result,[result.pixels.buffer,result.mask.alpha.buffer]);
      return;
    }
    const repairs=data.graph??(settings.method==='color'&&settings.contiguous&&settings.gap
      ?fillBoundaries(source,width,height,settings.tolerance,settings.gap):null);
    const mask=fillMask(source,width,height,settings,data.points,data.graph,data.selection,repairs?.bridges,data.target);
    if(data.output==='selection'){
      post.postMessage({mask},[mask.alpha.buffer as ArrayBuffer]);return;
    }
    const skipOutput=!data.diagnostics&&fillGuaranteedUnchanged(mask,settings,data.alphaLocked,data.target);
    const pixels=skipOutput?null:colorMask(data.target,mask,settings,data.alphaLocked);
    const changed=pixels!==null&&hasFillPixelChanges(pixels,data.target,mask);
    const transfer=[mask.alpha.buffer as ArrayBuffer];
    if(changed&&pixels)transfer.push(pixels.buffer);
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
