import type {TransformJob} from './worker';

export function runTransform(job:TransformJob){
  return new Promise<Uint8ClampedArray<ArrayBuffer>>((resolve,reject)=>{
    const worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{
      worker.terminate();
      if(data.error)reject(new Error(data.error));else resolve(data.pixels);
    };
    worker.onerror=event=>{
      worker.terminate();
      reject(new Error(event.message||'変形の計算に失敗しました。'));
    };
    worker.postMessage(job);
  });
}
