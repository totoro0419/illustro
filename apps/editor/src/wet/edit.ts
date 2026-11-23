import type {BrushSurface} from '../brushSurface';
import type {CoreDocument,LayerId} from '@illustro/core';
import {TILE} from '@illustro/brush-rt';
import {captureExport,captureExportLayers,compositeArtworkRegion,renderFrozenArtwork} from '../export/basicExport';
import {cropCanvas} from '../canvasGeometry';
import {boundsOfSelection,cropSelectionMask,type MaskData} from '../selection/mask';
import {needsSource,strokeArea,tileAlignedArea,type Area,type Patch} from './paint';
import {runWet} from './run';
import type {WetStroke} from './panel';

export async function createWetPatch(artwork:CoreDocument,drawing:BrushSurface,layerId:LayerId,mask:MaskData|null,stroke:WetStroke,preview=false){
  const {width,height}=artwork.root,mode=stroke.settings.mode,repair=needsSource(mode);
  const separate=stroke.separate||stroke.reference==='merged';
  let {points,offset}=stroke;
  let sourceShape:Area|null=null;
  if(stroke.selectedPatch){
    const target=points.at(-1);
    sourceShape=mask?boundsOfSelection(mask):null;
    if(!sourceShape||!target)throw Error('移す形を先に選択してください。');
    const left=Math.floor(target.x-sourceShape.width/2),top=Math.floor(target.y-sourceShape.height/2);
    points=[{x:left,y:top},{x:left+sourceShape.width,y:top+sourceShape.height}];
    offset={x:sourceShape.x-left,y:sourceShape.y-top};
  }
  const margin=mode==='patch'?2:Math.ceil(stroke.settings.size+2);
  const bounds=strokeArea(points,margin,width,height);
  if(!bounds)return null;
  const area=separate||preview?bounds:tileAlignedArea(bounds,width,height,TILE*2);
  if(preview&&area.width*area.height>320000)return null;
  if(area.width*area.height>4800000)throw Error('一度に処理する範囲が大きすぎます。線を分けてください。');
  const cache=new Map<LayerId,Uint8Array>();
  async function read(id:LayerId,frame:Area):Promise<Patch>{
    stroke.signal.throwIfAborted();
    const layer=artwork.root.getLayer(id);
    if(layer.baseColor==='white')return {area:frame,pixels:new Uint8ClampedArray(frame.width*frame.height*4).fill(255)};
    const region=await drawing.captureDocumentLayerRegion(id,frame,preview);
    if(region)return {area:frame,pixels:region};
    if(preview)throw Error('この描画方式では途中の表示を作れません。');
    let pixels=cache.get(id);
    if(!pixels){
      pixels=(await drawing.captureDocumentLayers(new Set([id]))).get(id);
      if(!pixels)throw Error('レイヤーの画素を読めません。');
      cache.set(id,pixels);
    }
    return {area:frame,pixels:new Uint8ClampedArray(cropCanvas(pixels,width,height,frame.x,frame.y,frame.width,frame.height))};
  }
  const destination:Patch=separate?{area,pixels:new Uint8ClampedArray(area.width*area.height*4)}:await read(layerId,area);
  const box=repair?strokeArea(points.map(p=>({x:p.x+offset.x,y:p.y+offset.y})),margin,width,height):area;
  if(repair&&!box)throw Error('採取範囲がキャンバスの外にあります。');
  let reference:Patch|null=null;
  if(stroke.reference==='merged'&&box){
    const root=artwork.root,layerIds=new Map<string,LayerId>(root.rootLayerIds.map(id=>[root.getLayer(id).surface.descriptor.surfaceId,id]));
    const local=await compositeArtworkRegion(captureExportLayers(root),box,async surfaceId=>{
      const id=layerIds.get(surfaceId);
      return id?drawing.captureDocumentLayerRegion(id,box,preview):null;
    },stroke.signal);
    if(local)reference={area:box,pixels:local};
    else if(preview)return null;
    else{
      const merged=await renderFrozenArtwork(captureExport(artwork));
      reference={area:box,pixels:new Uint8ClampedArray(cropCanvas(merged,width,height,box.x,box.y,box.width,box.height))};
    }
  }else if(repair&&box){
    const id=stroke.sourceLayerId as LayerId|null;
    if(!id||!artwork.root.hasLayer(id))throw Error('採取元のレイヤーがありません。元を選び直してください。');
    reference=await read(id,box);
  }else if(separate)reference=await read(layerId,area);
  const clip=sourceShape&&mask?movePatchCoverage(mask,area,offset):mask?cropSelectionMask(mask,area).alpha:null;
  const result=await runWet({destination,reference,selection:clip,
    points,offset,shapePatch:!!sourceShape,alphaLocked:!separate&&!!artwork.root.getLayer(layerId).alphaLocked,
    settings:stroke.settings},stroke.signal);
  if(!result.changed)return null;
  if(preview&&!separate){
    for(let i=0;i<result.pixels.length;i+=4){
      if(result.pixels[i]===destination.pixels[i]&&result.pixels[i+1]===destination.pixels[i+1]&&
        result.pixels[i+2]===destination.pixels[i+2]&&result.pixels[i+3]===destination.pixels[i+3])result.pixels[i+3]=0;
    }
  }
  return {area,pixels:result.pixels,separate};
}
// The selection belongs to the source; sample its coverage at each moved pixel.
export function movePatchCoverage(mask:MaskData,area:Area,offset:{x:number;y:number}){
  const alpha=new Uint8Array(area.width*area.height);
  for(let y=0;y<area.height;y++){
    const sy=area.y+y+offset.y;
    if(sy<0||sy>=mask.height)continue;
    const sx=area.x+offset.x,left=Math.max(0,-sx),right=Math.min(area.width,mask.width-sx);
    if(left<right)alpha.set(mask.alpha.subarray(sy*mask.width+sx+left,sy*mask.width+sx+right),y*area.width+left);
  }
  return alpha;
}
export function wetPatchTiles(area:Area,pixels:Uint8ClampedArray){
  const blocks:string[]=[],tiles:{key:string;pixels:Uint8Array}[]=[];
  for(let y=0;y<area.height;y+=TILE*2)for(let x=0;x<area.width;x+=TILE*2)
    blocks.push(((area.x+x)/(TILE*2))+','+((area.y+y)/(TILE*2)));
  for(let y=0;y<area.height;y+=TILE)for(let x=0;x<area.width;x+=TILE){
    const w=Math.min(TILE,area.width-x),h=Math.min(TILE,area.height-y),tile=new Uint8Array(TILE*TILE*4);
    for(let row=0;row<h;row++){
      const from=((y+row)*area.width+x)*4;
      tile.set(pixels.subarray(from,from+w*4),row*TILE*4);
    }
    tiles.push({key:((area.x+x)/TILE)+','+((area.y+y)/TILE),pixels:tile});
  }
  return {blocks,tiles};
}
