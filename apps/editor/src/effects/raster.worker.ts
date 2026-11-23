import {applyRasterEffects} from './rasterFilters';
import type {EffectStep} from './rasterSettings';

export type RasterEffectRequest=Readonly<{source:Uint8Array;width:number;height:number;steps:readonly EffectStep[];mask:Uint8Array|null;alphaLocked:boolean}>;
self.onmessage=(event:MessageEvent<RasterEffectRequest>)=>{
  try{
    const {source,width,height,steps,mask,alphaLocked}=event.data;
    const pixels=applyRasterEffects(source,width,height,steps,mask,alphaLocked);
    self.postMessage({pixels},{transfer:[pixels.buffer]});
  }catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
