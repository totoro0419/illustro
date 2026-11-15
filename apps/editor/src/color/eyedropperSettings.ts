/**
 * C04 COL-003: eyedropper options are workspace preferences. Artwork data and
 * renderer readback paths remain owned by BrushSurface.
 */
import type {LayerId} from '@illustro/core';
import type {BrushSurface} from '../brushSurface';
import type {ForegroundColor} from './model';
import {installReferenceColorPicker} from './referenceSampler';

export type SampleSource='composite'|'layer'|'specific';
export type EyedropperOptions=Readonly<{
  source:SampleSource;
  layerId:LayerId|null;
  diameter:1|3|5;
  transparency:'skip'|'keep'|'white';
}>;
const KEY='illustro.c04.eyedropper-options.v1';
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const read=():Partial<EyedropperOptions>=>{
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null') as Record<string,unknown>|null;
    if(!raw||raw.version!==1)return {};
    return {
      ...(raw.source==='composite'||raw.source==='layer'||raw.source==='specific'?{source:raw.source}:{}),
      ...(raw.diameter===1||raw.diameter===3||raw.diameter===5?{diameter:raw.diameter}:{}),
      ...(raw.transparency==='skip'||raw.transparency==='keep'||raw.transparency==='white'?{transparency:raw.transparency}:{}),
      ...(typeof raw.layerId==='string'?{layerId:raw.layerId}:{}),
    };
  }catch{return {};}
};
export function installEyedropperSettings(args:{
  foreground:ForegroundColor;
  getSurface:()=>BrushSurface|null;
  getLayers:()=>readonly {id:LayerId;name:string}[];
}){
  const source=el<HTMLSelectElement>('colorSampleSource');
  const layer=el<HTMLSelectElement>('colorSampleLayerId');
  const label=el<HTMLElement>('colorSampleLayerLabel');
  const diameter=el<HTMLSelectElement>('colorSampleDiameter');
  const transparency=el<HTMLSelectElement>('colorSampleTransparency');
  const stored=read();
  source.value=stored.source??'composite';
  diameter.value=String(stored.diameter??1);
  transparency.value=stored.transparency??'skip';
  function refreshLayers(){
    const last=layer.value||stored.layerId||'';
    const known=args.getLayers();
    layer.replaceChildren(...known.map(x=>new Option(x.name,x.id)));
    const match=known.find(x=>x.id===last);
    if(match)layer.value=match.id;
    const explicit=source.value==='specific';
    label.hidden=!explicit;
    if(explicit&&!known.length)layer.add(new Option('作品を開いてください',''));
  }
  function options():EyedropperOptions{
    const selected:SampleSource=source.value==='specific'?'specific':source.value==='layer'?'layer':'composite';
    return {
      source:selected,
      layerId:layer.value?layer.value as LayerId:null,
      diameter:diameter.value==='5'?5:diameter.value==='3'?3:1,
      transparency:transparency.value==='white'?'white':transparency.value==='keep'?'keep':'skip'
    };
  }
  function apply(){
    refreshLayers();
    const value=options();
    args.getSurface()?.configureSample(value);
    try{localStorage.setItem(KEY,JSON.stringify({version:1,...value}));}catch{/* allow session-only settings */}
  }
  for(const control of [source,layer,diameter,transparency])control.addEventListener('change',apply);
  source.addEventListener('focus',refreshLayers);
  layer.addEventListener('focus',refreshLayers);
  const reference=installReferenceColorPicker(args.foreground,el<HTMLButtonElement>('referenceSampleOpen'),
    ()=>options().diameter,()=>options().transparency);
  refreshLayers();apply();
  return {options,refreshLayers,apply,reference};
}
