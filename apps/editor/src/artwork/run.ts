import type {ArtworkJob} from './worker';
import {renderArtwork} from './render';
import {ensureFont} from './fonts';

// Keep a small number of drawing workers alive. Creating one for every preview
// causes repeated startup and can overload the browser during rapid edits.
type ArtworkPixels=Uint8ClampedArray<ArrayBuffer>;
type ArtworkTask={job:ArtworkJob;resolve:(pixels:ArtworkPixels)=>void;reject:(error:Error)=>void};
type WorkerSlot={worker:Worker;active:ArtworkTask|null};
const MAX_WORKERS=2;
const pending:ArtworkTask[]=[];
const slots:WorkerSlot[]=[];
let mainCanvas:HTMLCanvasElement|null=null;

function asError(error:unknown):Error{
  return error instanceof Error?error:new Error(String(error));
}

function pumpArtwork(){
  while(pending.length){
    let slot=slots.find(item=>item.active===null);
    if(!slot){
      if(slots.length>=MAX_WORKERS)return;
      let worker:Worker;
      try{worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});}
      catch(error){pending.shift()!.reject(asError(error));continue;}
      slot={worker,active:null};
      const current=slot;
      worker.onmessage=({data}:MessageEvent<{pixels?:ArtworkPixels;error?:string}>)=>{
        const task=current.active;
        current.active=null;
        if(!task)return;
        if(data?.error)task.reject(new Error(data.error));
        else if(data?.pixels instanceof Uint8ClampedArray)task.resolve(data.pixels);
        else task.reject(new Error('表示用の画像を取得できませんでした。'));
        pumpArtwork();
      };
      worker.onerror=event=>{
        const task=current.active;
        current.active=null;
        current.worker.terminate();
        const index=slots.indexOf(current);
        if(index!==-1)slots.splice(index,1);
        task?.reject(new Error(event.message||'描画Workerが停止しました。'));
        pumpArtwork();
      };
      slots.push(current);
    }
    const task=pending.shift()!;
    slot.active=task;
    try{slot.worker.postMessage(task.job);}
    catch(error){slot.active=null;task.reject(asError(error));}
  }
}

export async function runArtwork(job:ArtworkJob):Promise<ArtworkPixels>{
  if(job.content.kind==='text'&&job.content.fontAsset)await ensureFont(job.content.fontAsset);
  // A font loaded on the document is not guaranteed to exist in a worker.
  // Preserve text rendering compatibility; reuse the main-thread canvas.
  if(job.content.kind==='text'||typeof OffscreenCanvas==='undefined'){
    mainCanvas??=document.createElement('canvas');
    return renderArtwork(job.content,job,mainCanvas);
  }
  return new Promise<ArtworkPixels>((resolve,reject)=>{
    pending.push({job,resolve,reject});
    pumpArtwork();
  });
}
