import type {ImageFormat} from './basicExport';

export type RasterPreset=Readonly<{
  name:string;format:ImageFormat;quality:number;scale:number;lossless:boolean;dpi:boolean;
  icc:'none'|'srgb'|'custom';author:boolean;copyright:string;
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
      typeof preset.author==='boolean'&&typeof preset.copyright==='string'&&preset.copyright.length<=500).slice(0,24);
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
