import type {RevisionId,SemanticOperation} from '@illustro/core';
import {shiftedForAnchor,type ImageResample} from './canvasGeometry';

type Size={width:number;height:number};
export type CropRestorePlan=Readonly<{
  source:RevisionId;outside:Readonly<Size&{x:number;y:number}>;
  original:Size;placement:Readonly<Size&{x:number;y:number}>;
  output:Size;retained:Readonly<Size&{x:number;y:number}>;currentX:number;currentY:number;filter:ImageResample;
}>;

export function cropRestorePlan(operations:readonly SemanticOperation[],current:Size):CropRestorePlan|null{
  const restored=new Set<unknown>();
  for(let i=operations.length-1;i>=0;i--){
    const operation=operations[i]!,parameters=operation.parameters;
    if(operation.kind==='document.canvas-resize'&&parameters.restoredCrop)restored.add(parameters.restoredCrop);
    if(operation.kind!=='document.crop')continue;
    if(parameters.keepOutside!==true)return null;
    const source=operation.sourceRevisionIds[0];
    if(!source||restored.has(source))continue;
    const crop={x:Number(parameters.x),y:Number(parameters.y),width:Number(parameters.toWidth),height:Number(parameters.toHeight)};
    const original={width:Number(parameters.fromWidth),height:Number(parameters.fromHeight)};
    if(!Object.values({...crop,originalWidth:original.width,originalHeight:original.height}).every(Number.isSafeInteger)||
      crop.x<0||crop.y<0||crop.width<1||crop.height<1||crop.x+crop.width>original.width||crop.y+crop.height>original.height)
      return null;
    let x=-crop.x,y=-crop.y,sx=1,sy=1,filter:ImageResample='auto';
    for(const later of operations.slice(i+1)){
      const p=later.parameters;
      if(later.kind==='document.crop'){x-=Number(p.x);y-=Number(p.y);}
      if(later.kind==='document.canvas-resize'){
        const anchor=p.anchor==='top-left'||p.anchor==='top-right'||p.anchor==='bottom-left'||p.anchor==='bottom-right'?p.anchor:'center';
        const shift=shiftedForAnchor(Number(p.fromWidth),Number(p.fromHeight),Number(p.toWidth),Number(p.toHeight),anchor);
        x+=typeof p.offsetX==='number'?p.offsetX:shift.x;
        y+=typeof p.offsetY==='number'?p.offsetY:shift.y;
      }
      if(later.kind==='document.image-resize'){
        const px=Number(p.toWidth)/Number(p.fromWidth),py=Number(p.toHeight)/Number(p.fromHeight);
        x*=px;y*=py;sx*=px;sy*=py;
        if(p.filter==='nearest'||p.filter==='bilinear'||p.filter==='bicubic'||p.filter==='area')filter=p.filter;
      }
    }
    const width=Math.max(1,Math.round(original.width*sx)),height=Math.max(1,Math.round(original.height*sy));
    x=Math.round(x);y=Math.round(y);
    const left=Math.min(0,x),top=Math.min(0,y);
    const output={width:Math.max(current.width,x+width)-left,height:Math.max(current.height,y+height)-top};
    if(![width,height,output.width,output.height].every(value=>Number.isSafeInteger(value)&&value>=1&&value<=8192))
      throw Error('外側を戻すと8192pxを超えます。画像の大きさを小さくしてください。');
    const retained={x:x-left+Math.round(crop.x*sx),y:y-top+Math.round(crop.y*sy),
      width:Math.max(1,Math.round((crop.x+crop.width)*sx)-Math.round(crop.x*sx)),
      height:Math.max(1,Math.round((crop.y+crop.height)*sy)-Math.round(crop.y*sy))};
    return {source,outside:crop,original,placement:{x:x-left,y:y-top,width,height},output,retained,currentX:0-left,currentY:0-top,filter};
  }
  return null;
}


/** Keep the edited inside exactly, and add new paint above any recovered outside pixels. */
export function mergeRetainedCrop(target:Uint8Array,current:Uint8Array,currentSize:Size,plan:CropRestorePlan){
  const {currentX,currentY,output,retained}=plan;
  const left=Math.max(0,Math.min(currentSize.width,retained.x-currentX));
  const right=Math.max(left,Math.min(currentSize.width,retained.x+retained.width-currentX));
  for(let y=0;y<currentSize.height;y++){
    const row=y*currentSize.width*4,destination=((currentY+y)*output.width+currentX)*4;
    const inside=currentY+y>=retained.y&&currentY+y<retained.y+retained.height;
    if(inside&&right>left)target.set(current.subarray(row+left*4,row+right*4),destination+left*4);
    const blend=(start:number,end:number)=>{
      for(let x=start;x<end;x++){
        const i=row+x*4,j=destination+x*4,over=current[i+3]!/255;
        if(!over)continue;
        const under=(target[j+3]!/255)*(1-over),alpha=over+under;
        for(let c=0;c<3;c++)target[j+c]=Math.round((current[i+c]!*over+target[j+c]!*under)/alpha);
        target[j+3]=Math.round(255*alpha);
      }
    };
    if(inside){blend(0,left);blend(right,currentSize.width);}
    else blend(0,currentSize.width);
  }
}
