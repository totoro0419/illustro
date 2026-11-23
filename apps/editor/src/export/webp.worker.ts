import encode from '@jsquash/webp/encode.js';

type Request={width:number;height:number;pixels:Uint8ClampedArray<ArrayBuffer>};
self.onmessage=(event:MessageEvent<Request>)=>{
  const {width,height,pixels}=event.data;
  void encode(new ImageData(pixels,width,height),{lossless:1,near_lossless:100,exact:1,method:4})
    .then(buffer=>self.postMessage({buffer},{transfer:[buffer]}),
      error=>self.postMessage({error:error instanceof Error?error.message:String(error)}));
};
