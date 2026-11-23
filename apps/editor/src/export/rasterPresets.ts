import type {ImageFormat} from './basicExport';

export type RasterPreset=Readonly<{
  name:string;format:ImageFormat;quality:number;scale:number;lossless:boolean;dpi:boolean;
  icc:'none'|'srgb'|'custom';profileKey?:string;position?:boolean;author:boolean;copyright:string;
}>;
const key='illustro.raster-export-presets.v1';
type Store=Pick<Storage,'getItem'|'setItem'>;
export function readRasterPresets(storage:Pick<Storage,'getItem'>):RasterPreset[]{
  try{
    const value:unknown=JSON.parse(storage.getItem(key)??'[]');
    if(!Array.isArray(value))return [];
    return value.filter((preset):preset is RasterPreset=>preset&&typeof preset.name==='string'&&preset.name.length>0&&preset.name.length<=80&&
      ['png','jpeg','webp'].includes(preset.format)&&Number.isInteger(preset.quality)&&preset.quality>=1&&preset.quality<=100&&
      Number.isInteger(preset.scale)&&preset.scale>=1&&preset.scale<=8&&typeof preset.lossless==='boolean'&&
      typeof preset.dpi==='boolean'&&['none','srgb','custom'].includes(preset.icc)&&
      (preset.profileKey===undefined||typeof preset.profileKey==='string'&&/^[a-f0-9-]{36}$/.test(preset.profileKey))&&
      (preset.position===undefined||typeof preset.position==='boolean')&&typeof preset.author==='boolean'&&typeof preset.copyright==='string'&&preset.copyright.length<=500).slice(0,24);
  }catch{return [];}
}
export function writeRasterPreset(storage:Store,settings:RasterPreset){
  const name=settings.name.trim();
  if(!name||name.length>80)throw Error('設定名を1〜80文字で指定してください。');
  const entries=[{...settings,name},...readRasterPresets(storage).filter(item=>item.name!==name)].slice(0,24);
  storage.setItem(key,JSON.stringify(entries));
}
export function removeRasterPreset(storage:Store,name:string){
  storage.setItem(key,JSON.stringify(readRasterPresets(storage).filter(item=>item.name!==name)));
}

function profileRequest<T>(mode:IDBTransactionMode,run:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
  return new Promise((resolve,reject)=>{
    const open=indexedDB.open('illustro-export-profiles-v1',1);
    open.onupgradeneeded=()=>open.result.createObjectStore('profiles');
    open.onerror=()=>reject(open.error);
    open.onsuccess=()=>{
      const db=open.result;
      try{
        const tx=db.transaction('profiles',mode),request=run(tx.objectStore('profiles'));
        tx.oncomplete=()=>{db.close();resolve(request.result);};
        tx.onabort=()=>{db.close();reject(tx.error??Error('ICCの保存処理を完了できませんでした。'));};
      }catch(error){db.close();reject(error);}
    };
  });
}
export const readSavedExportProfile=(id:string)=>profileRequest<Uint8Array|undefined>('readonly',store=>store.get(id));
export const saveExportProfile=(id:string,profile:Uint8Array)=>profileRequest('readwrite',store=>store.put(profile,id));
export const deleteExportProfile=(id:string)=>profileRequest('readwrite',store=>store.delete(id));
