import type {WetJob} from './paint';
type Result={pixels:Uint8ClampedArray;changed:boolean};

export function runWet(job:WetJob,signal:AbortSignal):Promise<Result>{
  signal.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});
    const cleanup=()=>{worker.terminate();signal.removeEventListener('abort',abort);};
    const abort=()=>{cleanup();reject(signal.reason);};
    signal.addEventListener('abort',abort,{once:true});
    worker.onmessage=(event:MessageEvent<Result|{error:string}>)=>{
      cleanup();
      if('error' in event.data)reject(Error(event.data.error));else resolve(event.data);
    };
    worker.onerror=()=>{cleanup();reject(Error('筆の画素処理に失敗しました。'));};
    try{worker.postMessage(job);}catch(error){cleanup();reject(error);}
  });
}
