import type {StrokeRecord} from '@illustro/brush-rt';
import type {DeformationBrushPass} from '@illustro/core';
import type {MaskData} from './mask';
import {validateRasterWorkerTiles,uniqueTransferableTileBuffers,partitionSelectedStrokeTiles,type RasterWorkerTile} from './tileStroke';

type Job={pixels?:Uint8Array;tiles?:RasterWorkerTile[];[key:string]:unknown};
type Result=Uint8Array|RasterWorkerTile[]|null;
type Task={
  job:Job;resolve:(pixels:Result)=>void;reject:(reason:Error)=>void;
};

/** Share a single warm selection-stroke Worker. One Worker per pen stroke
 * caused repeated startup and full module initialization. Commands are
 * serialized without blocking the drawing/input thread. */
let worker:Worker|null=null,active:Task|null=null;
// The same immutable selection mask may be used for hundreds of strokes.
// Keep its Worker-side copy until the selection changes or the Worker closes.
let residentMask:Uint8Array|null=null;
const waiting:Task[]=[];
let timeout:ReturnType<typeof setTimeout>|null=null,
  idle:ReturnType<typeof setTimeout>|null=null;
function closeWorker(){
  worker?.terminate();worker=null;residentMask=null;
}
function pump(){
  if(active)return;
  if(idle!==null){clearTimeout(idle);idle=null;}
  const next=waiting.shift();
  if(!next){
    // Release the otherwise unused thread after an idle spell.
    if(worker)idle=setTimeout(()=>{idle=null;if(!active&&!waiting.length)closeWorker();},30000);
    return;
  }
  active=next;
  try{
    if(!worker)worker=new Worker(new URL('./stroke.worker.ts',import.meta.url),{type:'module'});
    const currentWorker=worker;
    const finish=(pixels:Result,error?:Error)=>{
      if(active!==next)return;
      if(timeout!==null){clearTimeout(timeout);timeout=null;}
      active=null;
      if(error)next.reject(error);else next.resolve(pixels);
      pump();
    };
    currentWorker.onmessage=(event:MessageEvent<{pixels?:Uint8Array|null;tiles?:RasterWorkerTile[]|null;error?:string}>)=>{
      const response=event.data;
      if(response?.error){closeWorker();finish(null,Error(response.error));return;}
      if(next.job.tiles){
        try{
          if(response?.tiles!==null&&!Array.isArray(response?.tiles))
            throw Error('区画ごとの筆の結果を確認できませんでした。');
          if(response.tiles)validateRasterWorkerTiles(
            next.job.width as number,next.job.height as number,response.tiles);
        }catch(error){
          closeWorker();finish(null,error instanceof Error?error:Error(String(error)));return;
        }
        finish(response.tiles??null);return;
      }
      if(response?.pixels!==null&&(!(response?.pixels instanceof Uint8Array)||
        response.pixels.byteLength!==(next.job.width as number)*(next.job.height as number)*4)){
        closeWorker();finish(null,Error('選択範囲の筆の結果を確認できませんでした。'));return;
      }
      finish(response.pixels??null);
    };
    currentWorker.onerror=event=>{
      closeWorker();
      finish(null,Error(event.message||'選択範囲への描画に失敗しました。'));
    };
    timeout=setTimeout(()=>{
      closeWorker();
      finish(null,Error('選択範囲への描画が長時間終わりませんでした。'));
    },60000);
    const mask=next.job.alpha;
    const selected=mask instanceof Uint8Array&&Array.isArray(next.job.records);
    // The main thread still owns its mask. Only the first selected stroke
    // transfers a clone; subsequent strokes reference the resident Worker
    // copy. A changed mask or restarted Worker sends the new bytes.
    const message=selected&&residentMask===mask
      ?(()=>{const {alpha:unused,...rest}=next.job;return rest;})()
      :next.job;
    const transferred=next.job.tiles
      ?uniqueTransferableTileBuffers(next.job.tiles)
      :next.job.pixels?.buffer instanceof ArrayBuffer?[next.job.pixels.buffer]:[];
    currentWorker.postMessage(message,transferred);
    if(selected)residentMask=mask;
  }catch(error){
    closeWorker();
    if(timeout!==null){clearTimeout(timeout);timeout=null;}
    active=null;
    next.reject(error instanceof Error?error:Error(String(error)));
    pump();
  }
}
function runBrushWorker(job:Job):Promise<Result>{
  if(waiting.length>=16)return Promise.reject(Error('選択描画の処理が溜まっています。'));
  return new Promise((resolve,reject)=>{
    waiting.push({job,resolve,reject});
    pump();
  });
}
/** A typed view of the already transferred GPU readback: no second 64 MiB
 * allocation for a 4000x4000 raster. Keep the original byte offset intact. */
export function writableRasterView(pixels:Uint8Array|Uint8ClampedArray):Uint8Array{
  return new Uint8Array(pixels.buffer,pixels.byteOffset,pixels.byteLength);
}
export async function applySelectedStroke(mask:MaskData,pixels:Uint8Array,records:readonly StrokeRecord[]){
  const result=await runBrushWorker({width:mask.width,height:mask.height,alpha:mask.alpha,pixels,records});
  if(result!==null&&!(result instanceof Uint8Array))throw Error('選択範囲の描画形式が正しくありません。');
  return result;
}
/** Worker owns incoming tiles after transfer; returning null means no pixel changed. */
export async function applySelectedStrokeTiles(mask:MaskData,tiles:RasterWorkerTile[],records:readonly StrokeRecord[]){
  const {affected,untouched}=partitionSelectedStrokeTiles(mask.width,mask.height,tiles,records);
  const result=await runBrushWorker({width:mask.width,height:mask.height,alpha:mask.alpha,tiles:affected,records});
  if(result!==null&&!Array.isArray(result))throw Error('選択範囲の描画結果に問題があります。');
  if(result===null)return null;
  const complete=[...untouched,...result];
  validateRasterWorkerTiles(mask.width,mask.height,complete);
  return complete;
}
export async function replayBrushPasses(
  passes:readonly DeformationBrushPass[],width:number,height:number,pixels:Uint8Array
){
  if(!passes.length)return pixels;
  const result=await runBrushWorker({passes,width,height,pixels});
  if(!(result instanceof Uint8Array))throw Error('変形後に描いた筆を復元できませんでした。');
  return result;
}
