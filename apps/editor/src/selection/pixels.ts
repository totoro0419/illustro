import type {MaskData} from './mask';
/** Run a bounded pixel job outside the main UI thread. */
export function runMaskedPixelJob(
  source:Uint8Array|Uint8ClampedArray,mask:MaskData,
  action:'copy'|'cut'|'move',dx=0,dy=0
):Promise<Uint8ClampedArray>{
  if(mask.width*mask.height*4!==source.length||mask.alpha.length!==mask.width*mask.height)
    return Promise.reject(Error('選択範囲と画像の大きさが異なります。'));
  let worker:Worker;
  try{worker=new Worker(new URL('./clipboard.worker.ts',import.meta.url),{type:'module'});}
  catch{return Promise.reject(Error('画像処理を別の処理で開始できませんでした。'));}
  // The pixel readback is an independent owned snapshot. Transfer its ArrayBuffer
  // without copying the 4k canvas; the mask gets a copy because it remains active.
  const pixels=source.byteOffset===0&&source.byteLength===source.buffer.byteLength
    ?new Uint8ClampedArray(source.buffer as ArrayBuffer)
    :new Uint8ClampedArray(source);
  const selection=mask.alpha.slice();
  return new Promise((resolve,reject)=>{
    const timeout=window.setTimeout(()=>{
      worker.terminate();reject(Error('選択画像の処理を完了できませんでした。もう一度お試しください。'));
    },60000);
    const finish=()=>{clearTimeout(timeout);worker.terminate();};
    worker.onmessage=(event:MessageEvent<{ok:boolean;pixels?:Uint8ClampedArray;error?:string}>)=>{
      finish();
      if(event.data.ok&&event.data.pixels instanceof Uint8ClampedArray&&event.data.pixels.length===mask.width*mask.height*4)
        resolve(event.data.pixels);
      else reject(Error(event.data.error??'選択画像を処理できませんでした。'));
    };
    worker.onerror=event=>{
      finish();reject(Error(event.message||'選択画像の処理に失敗しました。'));
    };
    worker.postMessage({id:1,type:action,width:mask.width,height:mask.height,image:pixels,
      mask:selection,dx,dy},[pixels.buffer,selection.buffer]);
  });
}
