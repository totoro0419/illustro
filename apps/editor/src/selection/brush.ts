import type {StrokeRecord} from '@illustro/brush-rt';
import type {DeformationBrushPass} from '@illustro/core';
import type {MaskData} from './mask';

export function applySelectedStroke(mask:MaskData,pixels:Uint8Array,records:readonly StrokeRecord[]){
  return runBrushWorker({width:mask.width,height:mask.height,alpha:mask.alpha,pixels,records});
}
function runBrushWorker(job:{pixels:Uint8Array;[key:string]:unknown}){
  return new Promise<Uint8Array|null>((resolve,reject)=>{
    const worker=new Worker(new URL('./stroke.worker.ts',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{
      worker.terminate();
      if(data.error)reject(new Error(data.error));else resolve(data.pixels);
    };
    worker.onerror=event=>{
      worker.terminate();
      reject(new Error(event.message||'選択範囲への描画に失敗しました。'));
    };
    worker.postMessage(job,[job.pixels.buffer as ArrayBuffer]);
  });
}

export async function replayBrushPasses(passes:readonly DeformationBrushPass[],width:number,height:number,pixels:Uint8Array){
  if(!passes.length)return pixels;
  const result=await runBrushWorker({passes,width,height,pixels});
  if(!result)throw Error('変形後に描いた筆を復元できませんでした。');
  return result;
}
