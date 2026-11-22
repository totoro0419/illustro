import encode from '@jsquash/avif/encode.js';
self.onmessage=(event:MessageEvent<{width:number;height:number;pixels:Uint8ClampedArray<ArrayBuffer>;quality:number;lossless:boolean}>)=>{
  const {width,height,pixels,quality,lossless}=event.data;
  void encode(new ImageData(pixels,width,height),{quality:lossless?100:quality,lossless,speed:7}).then(buffer=>self.postMessage({buffer},{transfer:[buffer]}),
    error=>self.postMessage({error:error instanceof Error?error.message:String(error)}));
};
