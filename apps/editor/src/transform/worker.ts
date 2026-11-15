import {transformRaster,type Transform} from './geometry';
import type {MaskData} from '../selection/mask';

export type TransformJob={
  pixels:Uint8Array;width:number;height:number;settings:Transform;selection:MaskData|null;
  outputWidth:number;outputHeight:number;
};

self.onmessage=({data}:MessageEvent<TransformJob>)=>{
  try{
    const {pixels,width,height,settings,selection,outputWidth,outputHeight}=data;
    const result=transformRaster(pixels,width,height,settings,selection,outputWidth,outputHeight);
    (self as unknown as Worker).postMessage({pixels:result},[result.buffer]);
  }catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
