import type {ArtworkJob} from './worker';
import {renderArtwork} from './render';

export function runArtwork(job:ArtworkJob){
  if(job.content.kind==='text'||typeof OffscreenCanvas==='undefined')
    return Promise.resolve(renderArtwork(job.content,job,document.createElement('canvas')));
  return new Promise<Uint8ClampedArray<ArrayBuffer>>((resolve,reject)=>{
    const worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{
      worker.terminate();
      if(data.error)reject(new Error(data.error));else resolve(data.pixels);
    };
    worker.onerror=event=>{
      worker.terminate();
      reject(new Error(event.message||'表示用の画像を作れませんでした。'));
    };
    worker.postMessage(job);
  });
}
