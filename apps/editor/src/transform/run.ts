import type {TransformJob} from './worker';

export function runTransform(job:TransformJob,signal?:AbortSignal){
  return new Promise<Uint8ClampedArray<ArrayBuffer>>((resolve,reject)=>{
    if(signal?.aborted){reject(signal.reason);return;}
    const worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});
    const close=()=>{signal?.removeEventListener('abort',abort);worker.terminate();};
    const abort=()=>{close();reject(signal?.reason);};
    signal?.addEventListener('abort',abort,{once:true});
    worker.onmessage=({data})=>{
      close();
      if(data.error)reject(new Error(data.error));else resolve(data.pixels);
    };
    worker.onerror=event=>{
      close();
      reject(new Error(event.message||'変形の計算に失敗しました。'));
    };
    worker.postMessage(job);
  });
}
