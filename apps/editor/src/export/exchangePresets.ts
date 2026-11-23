import type {ExchangeFormat} from './exchangeTypes';

export type ExchangePreset=Readonly<{
  name:string;format:ExchangeFormat;style:'flat'|'layered';quality:number;lossless:boolean;
  dpi:number;author:string;rights:string;position:boolean;color:'default'|'srgb'|'custom';profileKey?:string;
}>;
const key='illustro.exchange-export-presets.v1';
export function readExchangePresets(storage:Pick<Storage,'getItem'>):ExchangePreset[]{
  try{
    const parsed:unknown=JSON.parse(storage.getItem(key)??'[]');
    if(!Array.isArray(parsed))return [];
    return parsed.filter((entry):entry is ExchangePreset=>entry&&typeof entry.name==='string'&&entry.name.length>0&&entry.name.length<=80&&
      ['psd','psb','ora','tiff','svg','avif','exr'].includes(entry.format)&&['flat','layered'].includes(entry.style)&&
      Number.isInteger(entry.quality)&&entry.quality>=1&&entry.quality<=100&&typeof entry.lossless==='boolean'&&
      Number.isInteger(entry.dpi)&&entry.dpi>=1&&entry.dpi<=2400&&typeof entry.author==='string'&&entry.author.length<=500&&
      typeof entry.rights==='string'&&entry.rights.length<=500&&typeof entry.position==='boolean'&&
      ['default','srgb','custom'].includes(entry.color)&&
      (entry.color!=='custom'||typeof entry.profileKey==='string'&&/^[0-9a-f-]{36}$/.test(entry.profileKey))).slice(0,24);
  }catch{return [];}
}
export function updateExchangePresets(storage:Pick<Storage,'getItem'|'setItem'>,name:string,preset?:ExchangePreset){
  const old=readExchangePresets(storage),others=old.filter(item=>item.name!==name);
  const next=(preset?[preset,...others]:others).slice(0,24);
  storage.setItem(key,JSON.stringify(next));
  return old.filter(item=>!next.some(remaining=>remaining.profileKey===item.profileKey&&remaining.name===item.name));
}
