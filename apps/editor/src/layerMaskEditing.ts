import {decodeMaskTile,samplePixelMask,traceMaskPath} from '@illustro/brush-rt';
import {MASK_TILE_SIZE,type LayerMask,type MaskPoint,type PixelLayerMask} from '@illustro/core';
import type {MaskData} from './selection/mask';
import type {SelectionRect} from './strokeSelection';

export type MaskStrokePoint=MaskPoint&{pressure:number;t?:number};
type MaskPaintOptions={
  reveal:boolean;size:number;opacity:number;width:number;height:number;selection:SelectionRect|null;selectionMask?:MaskData|null;
};

function encodeMaskTile(bytes:Uint8Array){
  const value=bytes[0]!;
  if(bytes.every(alpha=>alpha===value))return value.toString(16).padStart(2,'0');
  return btoa(String.fromCharCode(...bytes));
}

export function paintPixelMask(mask:PixelLayerMask,points:readonly MaskStrokePoint[],options:MaskPaintOptions):PixelLayerMask{
  if(!points.length||!options.opacity)return mask;
  const size=MASK_TILE_SIZE;
  const changed=new Map<string,{old:Uint8Array|null;alpha:Uint8Array;coverage:Uint8Array}>();
  const {selection,selectionMask}=options;
  if(selectionMask&&(selectionMask.width!==options.width||selectionMask.height!==options.height))
    throw Error('選択範囲の大きさが作品と異なります。');
  const left=Math.max(0,selection?.x??0),top=Math.max(0,selection?.y??0);
  const right=Math.min(options.width,selection?selection.x+selection.width:options.width);
  const bottom=Math.min(options.height,selection?selection.y+selection.height:options.height);
  const target=options.reveal!==mask.inverted?255:0;
  const radius=(point:MaskStrokePoint)=>Math.max(.5,options.size*(.3+.7*point.pressure)/2);
  for(let i=0;i<points.length;i++){
    const a=points[Math.max(i-1,0)]!,b=points[i]!;
    const r0=radius(a),r1=radius(b),r=Math.max(r0,r1)+.5;
    const x0=Math.floor((Math.max(left,Math.min(a.x,b.x)-r)-mask.x)/mask.scaleX);
    const x1=Math.ceil((Math.min(right,Math.max(a.x,b.x)+r)-mask.x)/mask.scaleX);
    const y0=Math.floor((Math.max(top,Math.min(a.y,b.y)-r)-mask.y)/mask.scaleY);
    const y1=Math.ceil((Math.min(bottom,Math.max(a.y,b.y)+r)-mask.y)/mask.scaleY);
    const vx=b.x-a.x,vy=b.y-a.y,length=vx*vx+vy*vy;
    for(let y=y0;y<y1;y++){
      const cy=mask.y+(y+.5)*mask.scaleY;
      if(cy<top||cy>=bottom)continue;
      const ty=Math.floor(y/size),row=(y-ty*size)*size;
      for(let x=x0;x<x1;x++){
        const cx=mask.x+(x+.5)*mask.scaleX;
        if(cx<left||cx>=right)continue;
        const dx=cx-a.x,dy=cy-a.y;
        const t=length?Math.max(0,Math.min(1,(dx*vx+dy*vy)/length)):1;
        const edge=r0+(r1-r0)*t;
        const distance=Math.hypot(dx-vx*t,dy-vy*t);
        const selectionAlpha=selectionMask?.alpha[Math.floor(cy)*options.width+Math.floor(cx)]??255;
        const coverage=Math.round(selectionAlpha*options.opacity*Math.max(0,Math.min(1,(edge+.5-distance)/Math.max(1,edge*.25))));
        if(!coverage)continue;
        const tx=Math.floor(x/size),key=tx+','+ty,offset=row+x-tx*size;
        let tile=changed.get(key);
        if(!tile){
          const old=decodeMaskTile(mask.tiles,key);
          tile={old,alpha:old?.slice()??new Uint8Array(size*size).fill(255),coverage:new Uint8Array(size*size)};
          changed.set(key,tile);
        }
        if(tile.coverage[offset]!>=coverage)continue;
        tile.coverage[offset]=coverage;
        const before=tile.old?.[offset]??255;
        tile.alpha[offset]=Math.round(before+(target-before)*coverage/255);
      }
    }
  }
  const tiles={...mask.tiles};
  let different=false;
  for(const [key,{alpha}] of changed){
    const value=encodeMaskTile(alpha);
    if((mask.tiles[key]??'ff')===value)continue;
    different=true;
    if(value==='ff')delete tiles[key];else tiles[key]=value;
  }
  return different?{...mask,tiles}:mask;
}

export function drawMaskPreview(canvas:HTMLCanvasElement,mask:LayerMask,width:number,height:number,mode:'grayscale'|'red'){
  const context=canvas.getContext('2d');
  if(!context)return;
  const w=canvas.width,h=canvas.height;
  const boxScale=Math.min(w/width,h/height),dw=Math.max(1,Math.round(width*boxScale)),dh=Math.max(1,Math.round(height*boxScale));
  let image:ImageData;
  if(mask.shape==='pixels'){
    image=context.createImageData(dw,dh);
    for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){
      image.data[(y*dw+x)*4+3]=samplePixelMask(mask,(x+.5)*width/dw,(y+.5)*height/dh);
    }
  }else{
    context.clearRect(0,0,w,h);
    context.save();
    context.scale(dw/width,dh/height);
    traceMaskPath(context,mask);
    context.fill('evenodd');
    context.restore();
    image=context.getImageData(0,0,dw,dh);
    for(let i=3;i<image.data.length;i+=4){
      const value=image.data[i]!;
      image.data[i]=Math.round(255-(mask.inverted?value:255-value)*mask.density);
    }
  }
  for(let i=0;i<image.data.length;i+=4){
    const value=image.data[i+3]!;
    if(mode==='red'){
      image.data[i]=239;
      image.data[i+1]=45;
      image.data[i+2]=71;
      image.data[i+3]=Math.round((255-value)*.52);
    }else{
      image.data.fill(value,i,i+3);
      image.data[i+3]=255;
    }
  }
  context.clearRect(0,0,w,h);
  context.putImageData(image,Math.floor((w-dw)/2),Math.floor((h-dh)/2));
}
