import type {EditableArtwork,LayerId,LayerMask} from '@illustro/core';
import type {BrushSurface} from '../brushSurface';
import type {MaskStrokePoint} from '../layerMaskEditing';

export type ArtworkContext=Readonly<{
  width:number;height:number;color:string;drawing:BrushSurface;
  selected:Readonly<{id:LayerId;name:string;content:EditableArtwork|null;mask:LayerMask|null}>;
  selectionMask:()=>LayerMask|null;
  paths:readonly Readonly<{id:LayerId;name:string;content:EditableArtwork}>[];
  missingFontCandidates:readonly Readonly<{name:string;assetId:string}>[];
}>;
export type ArtworkActions=Readonly<{
  context:()=>ArtworkContext|null;
  save:(content:EditableArtwork,name:string,id?:LayerId,initialMask?:LayerMask|null,hideSourcePaths?:readonly LayerId[])=>Promise<void>;
  rasterize:(id:LayerId)=>Promise<void>;
}>;
export function button(text:string,run:()=>void|Promise<void>,output:HTMLOutputElement){
  const control=document.createElement('button');control.type='button';control.textContent=text;
  control.onclick=async()=>{
    control.disabled=true;
    try{await run();}catch(error){output.textContent=error instanceof Error?error.message:String(error);}
    finally{control.disabled=false;}
  };
  return control;
}
export function numberField(parent:HTMLElement,label:string,value:number,min:number,max:number,step=1){
  const input=document.createElement('input');input.type='number';input.value=String(value);
  input.min=String(min);input.max=String(max);input.step=String(step);
  labelledField(parent,label,input);
  return input;
}
export function labelledField(parent:HTMLElement,label:string,element:HTMLElement){
  const wrapper=document.createElement('label');wrapper.append(label,element);parent.append(wrapper);
}
export function selectField<T extends string>(parent:HTMLElement,label:string,entries:readonly (readonly [T,string])[]){
  const control=document.createElement('select');
  for(const [id,name] of entries)control.add(new Option(name,id));
  labelledField(parent,label,control);
  return control;
}
export function locate(drawing:BrushSurface,complete:(points:readonly MaskStrokePoint[])=>void){
  drawing.setCanvasEditGesture({path:false,width:2,color:'#ffb742',complete:points=>{
    drawing.setCanvasEditGesture(null);
    if(points.length)complete(points);
  }});
}
export function paintPreview(canvas:HTMLCanvasElement,pixels:Uint8ClampedArray<ArrayBuffer>,width:number,height:number){
  canvas.width=width;canvas.height=height;
  canvas.getContext('2d')?.putImageData(new ImageData(pixels,width,height),0,0);
  canvas.hidden=false;
}
