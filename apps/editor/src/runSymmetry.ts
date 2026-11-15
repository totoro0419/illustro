import type {StrokeRecord} from '@illustro/brush-rt';
import {symmetryCopies,type SymmetrySettings} from './strokeSymmetry';

export async function buildSymmetricStrokes(record:StrokeRecord,settings:SymmetrySettings):Promise<readonly StrokeRecord[]>{
  if(!symmetryCopies(settings).length)return [];
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./symmetry.worker.ts',import.meta.url),{type:'module'});
    worker.onmessage=({data}:MessageEvent<{copies?:StrokeRecord[];error?:string}>)=>{
      worker.terminate();if(data.copies)resolve(data.copies);else reject(Error(data.error??'対称描画を反映できませんでした。'));
    };
    worker.onerror=event=>{worker.terminate();reject(Error(event.message||'対称描画を反映できませんでした。'));};
    worker.postMessage({record,settings});
  });
}
