import type {GradientStop} from './editableArtwork';
import {validateLayerMask,type LayerMask} from './layerMask';
export const LAYER_BLEND_MODES=[
  'normal','darken','lighten','multiply','screen','color-burn','color-dodge','hard-light','overlay','soft-light',
  'difference','exclusion','linear-burn','linear-dodge','vivid-light','linear-light','pin-light','hard-mix','subtract','divide',
  'hue','saturation','color','luminosity','dissolve',
] as const;
export type LayerBlendMode=typeof LAYER_BLEND_MODES[number];
export type LayerTone=Readonly<{
  source:'self'|'backdrop';channel:'luminosity'|'red'|'green'|'blue';
  darkStart:number;darkEnd:number;lightStart:number;lightEnd:number;
}>;
export type LayerColorEffect=Readonly<{
  enabled:boolean;brightness:number;contrast:number;saturation:number;invert:boolean;mask:LayerMask|null;
}>;
export type GradientMap=Readonly<{stops:readonly GradientStop[];levels:number;dither:boolean}>;
export type LayerBlend=Readonly<{mode:LayerBlendMode;space:'encoded'|'linear';seed:number;tone?:LayerTone;effect?:LayerColorEffect;gradientMap?:GradientMap}>;

export function validateGradientMap(value:GradientMap):GradientMap{
  if(!value||!Array.isArray(value.stops)||value.stops.length<2||value.stops.length>64||
    !Number.isInteger(value.levels)||value.levels<2||value.levels>256||typeof value.dither!=='boolean')
    throw Error('グラデーションマップの階調数と色を確認してください。');
  const stops=value.stops.map(stop=>{
    if(!stop||typeof stop.color!=='string'||!/^#[0-9a-f]{6}$/i.test(stop.color)||
      !Number.isFinite(stop.at)||stop.at<0||stop.at>1||!Number.isFinite(stop.midpoint)||stop.midpoint<.01||stop.midpoint>.99||
      !Number.isFinite(stop.opacity)||stop.opacity<0||stop.opacity>1)
      throw Error('色を置く位置と不透明度を確認してください。');
    return Object.freeze({at:stop.at,color:stop.color,midpoint:stop.midpoint,opacity:stop.opacity});
  }).sort((a,b)=>a.at-b.at);
  return Object.freeze({stops:Object.freeze(stops),levels:value.levels,dither:value.dither});
}

export function validateLayerBlend(value:unknown):LayerBlend|null{
  if(value===null||value===undefined)return null;
  if(!value||typeof value!=='object')throw new Error('合成モードの設定が正しくありません。');
  const {mode,space,seed,tone,effect,gradientMap}=value as Partial<LayerBlend>;
  if(!mode||!LAYER_BLEND_MODES.includes(mode)||(space!=='encoded'&&space!=='linear')||
    typeof seed!=='number'||!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new Error('合成モードの設定が正しくありません。');
  let checkedTone:LayerTone|undefined;
  if(tone){
    const {source,channel,darkStart,darkEnd,lightStart,lightEnd}=tone;
    const values=[darkStart,darkEnd,lightStart,lightEnd];
    if((source!=='self'&&source!=='backdrop')||!['luminosity','red','green','blue'].includes(channel)||
      values.some((item,index)=>typeof item!=='number'||!Number.isFinite(item)||item<0||item>1||index>0&&item<values[index-1]!))
      throw Error('合成する明るさの範囲を確認してください。');
    checkedTone=Object.freeze({source,channel,darkStart,darkEnd,lightStart,lightEnd});
  }
  let checkedEffect:LayerColorEffect|undefined;
  if(effect){
    const {enabled,brightness,contrast,saturation,invert,mask}=effect;
    if(typeof enabled!=='boolean'||typeof invert!=='boolean'||![brightness,contrast,saturation].every(Number.isFinite)||
      brightness< -1||brightness>1||contrast<0||contrast>4||saturation<0||saturation>4)
      throw Error('色の効果の設定が正しくありません。');
    checkedEffect=Object.freeze({enabled,brightness,contrast,saturation,invert,mask:validateLayerMask(mask)});
  }
  return Object.freeze({mode,space,seed,...(gradientMap===undefined?{}:{gradientMap:validateGradientMap(gradientMap)}),...(checkedTone?{tone:checkedTone}:{}),...(checkedEffect?{effect:checkedEffect}:{})});
}
