import type {FillJob} from './worker';
import type {RegionGraph} from './pixels';
import type {MaskData} from '../selection/mask';

type Response={graph?:RegionGraph;mask?:MaskData;pixels?:Uint8ClampedArray<ArrayBuffer>;error?:string};

export function runFill(job:FillJob){
  return new Promise<Response>((resolve,reject)=>{
    const worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});
    worker.onmessage=({data}:MessageEvent<Response>)=>{
      worker.terminate();
      if(data.error)reject(new Error(data.error));else resolve(data);
    };
    worker.onerror=event=>{
      worker.terminate();
      reject(new Error(event.message||'塗りつぶしの計算に失敗しました。'));
    };
    worker.postMessage(job);
  });
}
