import {openIccProcessor} from './icc';

export type IccRequest=Readonly<{
  profile:Uint8Array;layers:readonly Uint8ClampedArray[];proof:boolean;
  intent:number;blackPoint:boolean;gamut:boolean;
}>;
self.onmessage=async(event:MessageEvent<IccRequest>)=>{
  const {profile,layers,proof,intent,blackPoint,gamut}=event.data;
  try{
    const processor=await openIccProcessor(profile,{intent,blackPoint,gamut},proof);
    try{
      const converted=layers.map(layer=>processor.apply(layer));
      const transfer=converted.flatMap(layer=>[layer.pixels.buffer,...(layer.outOfGamut?[layer.outOfGamut.buffer]:[])]);
      self.postMessage({name:processor.name,converted},{transfer});
    }finally{processor.close();}
  }catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
