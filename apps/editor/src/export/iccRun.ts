import type {IccRequest} from './icc.worker';

type IccResponse=Readonly<{name:string;converted:readonly {pixels:Uint8ClampedArray<ArrayBuffer>;outOfGamut:Uint8Array<ArrayBuffer>|null}[]}>;
export function runIcc(request:IccRequest,moveInputs=false):Promise<IccResponse>{
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./icc.worker.ts',import.meta.url),{type:'module'});
    worker.onmessage=(event:MessageEvent<IccResponse|{error:string}>)=>{
      worker.terminate();
      if('error' in event.data)reject(Error(event.data.error));else resolve(event.data);
    };
    worker.onerror=()=>{worker.terminate();reject(Error('この端末でICC変換を開始できません。'));};
    try{
      const transfer=moveInputs?[...new Set(request.layers.flatMap(layer=>layer.buffer instanceof ArrayBuffer?[layer.buffer]:[]))]:[];
      worker.postMessage(request,transfer);
    }
    catch(error){worker.terminate();reject(error);}
  });
}
