import {transformRaster,type Transform} from './geometry';
import {renderPostPaintPreview} from './postPaintPreview';
import type {DeformationBrushPass} from '@illustro/core';
import type {MaskData} from '../selection/mask';

export type TransformJob={
  pixels:Uint8Array;width:number;height:number;settings:Transform;selection:MaskData|null;
  outputWidth:number;outputHeight:number;showProtection?:boolean;
  postPaint?:readonly DeformationBrushPass[];
};
// A long-lived preview worker may keep exactly one source image and selection.
// Each subsequent change sends only transform settings rather than copying the full image.
export type CachedTransformJob=Omit<TransformJob,'pixels'|'selection'>&{
  kind:'cached';pixels?:Uint8Array;selection?:MaskData|null;postPaint?:readonly DeformationBrushPass[];
};
let cachedPixels:Uint8Array|null=null,cachedSelection:MaskData|null=null;
let cachedPostPaint:readonly DeformationBrushPass[]=[];

self.onmessage=({data}:MessageEvent<TransformJob|CachedTransformJob>)=>{
  try{
    const cached='kind' in data&&data.kind==='cached';
    if(cached){
      if(data.pixels)cachedPixels=data.pixels;
      if('selection' in data)cachedSelection=data.selection??null;
      if('postPaint' in data)cachedPostPaint=data.postPaint??[];
    }
    const pixels=cached?cachedPixels:data.pixels;
    if(!pixels)throw Error('変形する元画像がありません。');
    const {width,height,settings,outputWidth,outputHeight}=data;
    const selection=cached?cachedSelection:(data.selection??null);
    const result=transformRaster(pixels,width,height,settings,selection,outputWidth,outputHeight,data.showProtection);
    // Post-transform strokes belong in the destination coordinates. They are
    // not transformed again, matching the final commit path in main.ts.
    const passes=cached?cachedPostPaint:data.postPaint??[];
    const composed=passes.length?renderPostPaintPreview(result,width,height,outputWidth,outputHeight,passes):result;
    (self as unknown as Worker).postMessage({pixels:composed},[composed.buffer]);
  }catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
