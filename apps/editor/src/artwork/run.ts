import type {ArtworkJob} from './worker';
import {renderArtwork} from './render';
import {ensureFont} from './fonts';
import {canRenderTextInArtworkWorker} from './textWorkerSafety';

// Keep a small number of drawing workers alive. Creating one for every preview
// causes repeated startup and can overload the browser during rapid edits.
type ArtworkPixels=Uint8ClampedArray<ArrayBuffer>;
type ArtworkTask={job:ArtworkJob;resolve:(pixels:ArtworkPixels)=>void;reject:(error:Error)=>void;signal?:AbortSignal;abortHandler?:()=>void};
type WorkerSlot={worker:Worker;active:ArtworkTask|null};
const MAX_WORKERS=2;
const pending:ArtworkTask[]=[];
const slots:WorkerSlot[]=[];
let mainCanvas:HTMLCanvasElement|null=null;

function asError(error:unknown):Error{
  return error instanceof Error?error:new Error(String(error));
}

function abortError(){return new DOMException('画像の更新が取り消されました。','AbortError');}

function finishTask(task:ArtworkTask,pixels?:ArtworkPixels,error?:Error){
  if(task.abortHandler)task.signal?.removeEventListener('abort',task.abortHandler);
  if(error)task.reject(error);
  else if(pixels)task.resolve(pixels);
  else task.reject(new Error('表示用の画像を取得できませんでした。'));
}

function cancelTask(task:ArtworkTask){
  const queued=pending.indexOf(task);
  if(queued!==-1)pending.splice(queued,1);
  const slot=slots.find(item=>item.active===task);
  if(slot){
    // Every slot has at most one active task, so canceling it cannot
    // interrupt an unrelated preview.
    slot.active=null;
    slot.worker.terminate();
    const index=slots.indexOf(slot);
    if(index!==-1)slots.splice(index,1);
  }
  finishTask(task,undefined,abortError());
  pumpArtwork();
}

function pumpArtwork(){
  while(pending.length){
    let slot=slots.find(item=>item.active===null);
    if(!slot){
      if(slots.length>=MAX_WORKERS)return;
      let worker:Worker;
      try{worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});}
      catch(error){finishTask(pending.shift()!,undefined,asError(error));continue;}
      slot={worker,active:null};
      const current=slot;
      worker.onmessage=({data}:MessageEvent<{pixels?:ArtworkPixels;error?:string}>)=>{
        const task=current.active;
        current.active=null;
        if(!task)return;
        if(data?.error)finishTask(task,undefined,new Error(data.error));
        else if(data?.pixels instanceof Uint8ClampedArray)finishTask(task,data.pixels);
        else finishTask(task,undefined,new Error('表示用の画像を取得できませんでした。'));
        pumpArtwork();
      };
      worker.onerror=event=>{
        const task=current.active;
        current.active=null;
        current.worker.terminate();
        const index=slots.indexOf(current);
        if(index!==-1)slots.splice(index,1);
        if(task)finishTask(task,undefined,new Error(event.message||'描画Workerが停止しました。'));
        pumpArtwork();
      };
      slots.push(current);
    }
    const task=pending.shift()!;
    slot.active=task;
    try{slot.worker.postMessage(task.job);}
    catch(error){slot.active=null;finishTask(task,undefined,asError(error));}
  }
}

export async function runArtwork(job:ArtworkJob,options:Readonly<{signal?:AbortSignal}>={}):Promise<ArtworkPixels>{
  const signal=options.signal;
  if(signal?.aborted)throw abortError();
  if(job.content.kind==='text'&&job.content.fontAsset)await ensureFont(job.content.fontAsset);
  if(signal?.aborted)throw abortError();
  // Imported and named fonts stay on the document thread; browser Workers
  // cannot be assumed to share the document's loaded FontFaceSet.
  const genericText=canRenderTextInArtworkWorker(job.content);
  if((job.content.kind==='text'&&!genericText)||typeof OffscreenCanvas==='undefined'){
    mainCanvas??=document.createElement('canvas');
    return renderArtwork(job.content,job,mainCanvas);
  }
  return new Promise<ArtworkPixels>((resolve,reject)=>{
    const task:ArtworkTask={job,resolve,reject,...(signal?{signal}:{})};
    if(signal){
      task.abortHandler=()=>cancelTask(task);
      signal.addEventListener('abort',task.abortHandler,{once:true});
      if(signal.aborted){cancelTask(task);return;}
    }
    pending.push(task);
    pumpArtwork();
  }).catch(error=>{
    if(!genericText||signal?.aborted)throw error;
    // Some browsers do not make generic font faces available in workers.
    // Fall back to the original compatible main-thread renderer.
    mainCanvas??=document.createElement('canvas');
    return renderArtwork(job.content,job,mainCanvas);
  });
}
