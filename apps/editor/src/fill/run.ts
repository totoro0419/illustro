import type {Point} from '../transform/geometry';
import type {FillJob} from './worker';
import type {GapCandidate,RegionGraph} from './pixels';
import type {MaskData} from '../selection/mask';

type Response={graph?:RegionGraph;boundary?:readonly Point[];gaps?:readonly GapCandidate[];mask?:MaskData;diagnostics?:Readonly<{remaining:Uint8Array;bridges:Uint8Array}>;pixels?:Uint8ClampedArray<ArrayBuffer>|null;error?:string};
type Task={job:FillJob;resolve:(value:Response)=>void;reject:(error:Error)=>void;signal?:AbortSignal;abort?:()=>void;timeout?:ReturnType<typeof setTimeout>};

// A single reusable worker avoids repeated startup and prevents simultaneous
// 4000x4000 fill jobs from exhausting memory. Jobs are executed in input order.
const queue:Task[]=[];
let active:Task|null=null,worker:Worker|null=null,idleTimer:ReturnType<typeof setTimeout>|undefined;
const TIMEOUT_MS=120_000;

function shutdown(){
  worker?.terminate();worker=null;
}
function settle(task:Task,error?:Error,result?:Response){
  if(task.timeout)clearTimeout(task.timeout);
  if(task.abort&&task.signal)task.signal.removeEventListener('abort',task.abort);
  if(active===task)active=null;
  if(error)task.reject(error);else task.resolve(result!);
  pump();
}
function failActive(error:Error){
  const task=active;
  shutdown();
  if(task)settle(task,error);
}
function pump(){
  if(active||!queue.length){
    if(!active&&!queue.length){
      if(idleTimer)clearTimeout(idleTimer);
      idleTimer=setTimeout(()=>{if(!active&&!queue.length)shutdown();},30_000);
    }
    return;
  }
  if(idleTimer)clearTimeout(idleTimer);
  const task=queue.shift()!;
  active=task;
  try{
    if(!worker){
      const created=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});
      created.onmessage=({data}:MessageEvent<Response>)=>{
        if(worker!==created||!active)return;
        if(data.error)settle(active,new Error(data.error));else settle(active,undefined,data);
      };
      created.onerror=event=>{
        if(worker===created)failActive(new Error(event.message||'塗りつぶしの計算に失敗しました。'));
      };
      created.onmessageerror=()=>{
        if(worker===created)failActive(new Error('塗りつぶしの結果を受け取れませんでした。'));
      };
      worker=created;
    }
    task.timeout=setTimeout(()=>{
      if(active===task)failActive(new Error('塗りつぶしの計算が長時間終わりませんでした。再試行してください。'));
    },TIMEOUT_MS);
    worker.postMessage(task.job);
  }catch(error){
    failActive(error instanceof Error?error:new Error(String(error)));
  }
}

/** Abort terminates the active computation; queued work is preserved. */
export function runFill(job:FillJob,signal?:AbortSignal):Promise<Response>{
  return new Promise<Response>((resolve,reject)=>{
    if(signal?.aborted){reject(new DOMException('塗りつぶしを中断しました。','AbortError'));return;}
    const task:Task={job,resolve,reject,signal};
    task.abort=()=>{
      const error=new DOMException('塗りつぶしを中断しました。','AbortError');
      if(active===task)failActive(error);
      else{
        const index=queue.indexOf(task);
        if(index>=0){queue.splice(index,1);settle(task,error);}
      }
    };
    signal?.addEventListener('abort',task.abort,{once:true});
    queue.push(task);pump();
  });
}
