import type {StrokeDocument} from '@illustro/brush-rt';
import type {CoreDocument} from '@illustro/core';
import {captureExport,type FrozenExport} from '../export/basicExport';

type MigrationReply={error?:string;source?:StrokeDocument;bytes?:Uint8Array;notices?:readonly string[]};
function runLegacyMigration(bytes:Uint8Array,name?:string){
  return new Promise<MigrationReply>((resolve,reject)=>{
    const worker=new Worker(new URL('./legacyMigration.worker.ts',import.meta.url),{type:'module'});
    worker.onmessage=({data}:MessageEvent<MigrationReply>)=>{
      worker.terminate();
      if(data.error)reject(Error(data.error));else resolve(data);
    };
    worker.onerror=event=>{worker.terminate();reject(Error(event.message||'旧形式を読み込めませんでした。'));};
    worker.postMessage({bytes,name},[bytes.buffer as ArrayBuffer]);
  });
}
export async function isLegacyStrokeFile(file:File){
  const prefix=await file.slice(0,4096).text();
  return prefix.trimStart().startsWith('{');
}
export async function convertLegacyStrokeFile(file:File){
  if(file.size>128*1024*1024)throw Error('旧形式の作品が128MBを超えています。');
  const input=new Uint8Array(await file.arrayBuffer());
  const result=await runLegacyMigration(input,(file.name.replace(/\.json$/i,'').trim()||'試作版の作品').slice(0,4000)+'（形式移行）');
  if(!result.bytes||!result.notices)throw Error('旧形式からの移行が完了しませんでした。');
  return {bytes:result.bytes,notices:result.notices};
}
export async function legacySourcePreview(file:File,converted:CoreDocument):Promise<FrozenExport>{
  const {source}=await runLegacyMigration(new Uint8Array(await file.arrayBuffer()));
  if(!source)throw Error('元の描線を読み込めませんでした。');
  const frozen=captureExport(converted),layer=frozen.layers[0]!;
  // Do not accidentally include the migrated copy's raster seed in the
  // source-side comparison. The source must replay only the original strokes.
  const {basePixels:discardMigratedPixels,...unseeded}=frozen;
  void discardMigratedPixels;
  return {...unseeded,width:source.width,height:source.height,layers:[layer],
    strokes:source.strokes.map(record=>({surfaceId:layer.surfaceId,record}))};
}
