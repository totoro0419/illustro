import {analyzeImage,type AssistRequest} from './analyze';

self.onmessage=(event:MessageEvent<AssistRequest>)=>{
  try{
    const result=analyzeImage(event.data);
    const transfer:Transferable[]=result.kind==='area'?[result.alpha.buffer]:result.kind==='color'?[result.pixels.buffer]:
      result.spots.map(spot=>spot.pixels.buffer as ArrayBuffer);
    self.postMessage({result},{transfer});
  }catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
