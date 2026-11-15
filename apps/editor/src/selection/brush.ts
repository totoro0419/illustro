import type {StrokeRecord} from '@illustro/brush-rt';
import type {MaskData} from './mask';

export function applySelectedStroke(mask:MaskData,pixels:Uint8Array,records:readonly StrokeRecord[]){
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
    worker.postMessage({width:mask.width,height:mask.height,alpha:mask.alpha,pixels,records},[pixels.buffer as ArrayBuffer]);
  });
}
