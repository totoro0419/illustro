import {paintWet,type WetJob} from './paint';
self.onmessage=(event:MessageEvent<WetJob>)=>{
  try{
    const {pixels,changed}=paintWet(event.data);
    self.postMessage({pixels,changed},{transfer:[pixels.buffer]});
  }catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
