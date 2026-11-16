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
export type LayerBlend=Readonly<{mode:LayerBlendMode;space:'encoded'|'linear';seed:number;tone?:LayerTone;effect?:LayerColorEffect}>;

export function validateLayerBlend(value:unknown):LayerBlend|null{
  if(value===null||value===undefined)return null;
  if(!value||typeof value!=='object')throw new Error('合成モードの設定が正しくありません。');
  const {mode,space,seed,tone,effect}=value as Partial<LayerBlend>;
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
  return Object.freeze({mode,space,seed,...(checkedTone?{tone:checkedTone}:{}),...(checkedEffect?{effect:checkedEffect}:{})});
}
