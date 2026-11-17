import type {TransformJob,CachedTransformJob} from './worker';

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

/**
 * Preview-only runner. It serializes requests through one worker, reuses the
 * last source image/selection and skips superseded queued requests.
 * Final rendering still uses runTransform to keep preview state isolated.
 */
export function createTransformPreviewRunner(){
  const worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});
  let disposed=false,source:Uint8Array|null=null,selection:TransformJob['selection']=null;
  let postPaint:TransformJob['postPaint']=undefined;
  let queue:Promise<void>=Promise.resolve();
  let cancelCurrent:((reason:unknown)=>void)|null=null;
  function run(job:TransformJob,signal?:AbortSignal){
    const task=queue.then(()=>new Promise<Uint8ClampedArray<ArrayBuffer>>((resolve,reject)=>{
      if(disposed||signal?.aborted){reject(signal?.reason??Error('変形プレビューを終了しました。'));return;}
      const complete=()=>{worker.onmessage=null;worker.onerror=null;cancelCurrent=null;};
      cancelCurrent=reason=>{complete();reject(reason);};
      worker.onmessage=({data})=>{
        complete();
        if(disposed||signal?.aborted)reject(signal?.reason??Error('古いプレビューを取り消しました。'));
        else if(data.error)reject(new Error(data.error));
        else resolve(data.pixels as Uint8ClampedArray<ArrayBuffer>);
      };
      worker.onerror=event=>{
        complete();disposed=true;worker.terminate();
        reject(new Error(event.message||'変形プレビューを計算できませんでした。'));
      };
      const {pixels,selection:mask,postPaint:brushPasses,...rest}=job;
      const message:CachedTransformJob={...rest,kind:'cached',
        ...(source===pixels?{}:{pixels}),
        ...(selection===mask?{}:{selection:mask}),
        ...(postPaint===brushPasses?{}:{postPaint:brushPasses})};
      try{
        worker.postMessage(message);
        source=pixels;selection=mask;postPaint=brushPasses;
      }catch(error){complete();reject(error);}
    }));
    queue=task.then(()=>undefined,()=>undefined);
    return task;
  }
  function dispose(){
    if(disposed)return;
    disposed=true;
    cancelCurrent?.(Error('変形プレビューを終了しました。'));
    worker.terminate();source=null;selection=null;postPaint=undefined;
  }
  return {run,dispose};
}
