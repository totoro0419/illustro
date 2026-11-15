export const LAYER_BLEND_MODES=[
  'normal','darken','lighten','multiply','screen','color-burn','color-dodge','hard-light','overlay','soft-light',
  'difference','exclusion','linear-burn','linear-dodge','vivid-light','linear-light','pin-light','hard-mix','subtract','divide',
  'hue','saturation','color','luminosity','dissolve',
] as const;
export type LayerBlendMode=typeof LAYER_BLEND_MODES[number];
export type LayerBlend=Readonly<{mode:LayerBlendMode;space:'encoded'|'linear';seed:number}>;

export function validateLayerBlend(value:unknown):LayerBlend|null{
  if(value===null||value===undefined)return null;
  if(!value||typeof value!=='object')throw new Error('合成モードの設定が正しくありません。');
  const {mode,space,seed}=value as Partial<LayerBlend>;
  if(!mode||!LAYER_BLEND_MODES.includes(mode)||(space!=='encoded'&&space!=='linear')||
    typeof seed!=='number'||!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new Error('合成モードの設定が正しくありません。');
  return Object.freeze({mode,space,seed});
}
