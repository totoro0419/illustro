import {transformRaster,type Transform} from './geometry';
import type {MaskData} from '../selection/mask';

export type TransformJob={
  pixels:Uint8Array;width:number;height:number;settings:Transform;selection:MaskData|null;
  outputWidth:number;outputHeight:number;showProtection?:boolean;
};
// A long-lived preview worker may keep exactly one source image and selection.
// Each subsequent change sends only transform settings rather than copying the full image.
export type CachedTransformJob=Omit<TransformJob,'pixels'|'selection'>&{
  kind:'cached';pixels?:Uint8Array;selection?:MaskData|null;
};
let cachedPixels:Uint8Array|null=null,cachedSelection:MaskData|null=null;

self.onmessage=({data}:MessageEvent<TransformJob|CachedTransformJob>)=>{
  try{
    const cached='kind' in data&&data.kind==='cached';
    if(cached){
      if(data.pixels)cachedPixels=data.pixels;
      if('selection' in data)cachedSelection=data.selection??null;
    }
    const pixels=cached?cachedPixels:data.pixels;
    if(!pixels)throw Error('変形する元画像がありません。');
    const {width,height,settings,outputWidth,outputHeight}=data;
    const selection=cached?cachedSelection:data.selection;
    const result=transformRaster(pixels,width,height,settings,selection,outputWidth,outputHeight,data.showProtection);
    (self as unknown as Worker).postMessage({pixels:result},[result.buffer]);
  }catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
