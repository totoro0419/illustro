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
/** Keep the status text consistent with the actual sampling mode. */
export function sampleSourceLabel(
  selected:Pick<EyedropperOptions,'source'|'layerId'>,
  layers:readonly {id:LayerId;name:string}[]
):string{
  if(selected.source==='composite')return '見えている作品全体';
  if(selected.source==='layer')return '選んでいるレイヤー';
  const found=layers.find(layer=>layer.id===selected.layerId);
  return found?'指定したレイヤー: '+found.name:'指定したレイヤーが見つかりません';
}
const KEY='illustro.c04.eyedropper-options.v1';
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const read=():Partial<Omit<EyedropperOptions,'layerId'>>&{layerId?:string}=>{
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
  onChange?:()=>void;
}){
  const source=el<HTMLSelectElement>('colorSampleSource');
  const layer=el<HTMLSelectElement>('colorSampleLayerId');
  const label=el<HTMLElement>('colorSampleLayerLabel');
  const diameter=el<HTMLSelectElement>('colorSampleDiameter');
  const transparency=el<HTMLSelectElement>('colorSampleTransparency');
  const stored=read();
  // Never silently use the first layer when a saved, explicitly specified
  // layer no longer exists (e.g. after switching to another artwork).
  let requestedLayerId:LayerId|null=stored.layerId as LayerId??null;
  const status=el<HTMLOutputElement>('colorSampleActiveSummary');
  source.value=stored.source??'composite';
  diameter.value=String(stored.diameter??1);
  transparency.value=stored.transparency??'skip';
  function refreshLayers(){
    const known=args.getLayers();
    layer.replaceChildren(new Option('レイヤーを選んでください',''),...known.map(x=>new Option(x.name,x.id)));
    layer.value=requestedLayerId&&known.some(item=>item.id===requestedLayerId)?requestedLayerId:'';
    const explicit=source.value==='specific';
    label.hidden=!explicit;
    if(status)status.textContent='現在の採色元: '+sampleSourceLabel(options(),known);
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
    if(layer.value)requestedLayerId=layer.value as LayerId;
    refreshLayers();
    const value=options();
    args.getSurface()?.configureSample(value);
    args.onChange?.();
    try{localStorage.setItem(KEY,JSON.stringify({version:1,...value}));}catch{/* allow session-only settings */}
  }
  for(const control of [source,diameter,transparency])control.addEventListener('change',apply);
  layer.addEventListener('change',()=>{
    requestedLayerId=layer.value?layer.value as LayerId:null;
    apply();
  });
  source.addEventListener('focus',refreshLayers);
  layer.addEventListener('focus',refreshLayers);
  const reference=installReferenceColorPicker(args.foreground,el<HTMLButtonElement>('referenceSampleOpen'),
    ()=>options().diameter,()=>options().transparency);
  refreshLayers();apply();
  return {options,refreshLayers,apply,reference};
}
