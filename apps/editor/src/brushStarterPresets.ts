import {compilePreset,validateFoundation,type FoundationPreset} from '@illustro/brush-rt';

/** New choices built from fixed Foundation presets. The seven original presets
 * and all accepted stroke replay / renderer code remain unchanged. */
export function additionalBrushes(foundations:readonly FoundationPreset[]):FoundationPreset[]{
 const clone=(baseId:string,id:string,name:string,category:string,purpose:string,change:(p:FoundationPreset)=>void)=>{
  const base=foundations.find(p=>p.id===baseId);
  if(!base)throw Error('基準ブラシが見つかりません: '+baseId);
  const p=structuredClone(base);p.id=id;p.name=name;p.category=category;p.purpose=purpose;
  change(p);
  validateFoundation(p);
  compilePreset(p,{forceFadeGeometry:'adaptive-v1'});
  return p;
 };
 return [
  clone('foundation-round-pen','illustro-fine-liner-v1','細線ペン','ペン・線画','細い線画や細部を描くための丸ペンの設定。',
   p=>{p.size=1.5;p.pressure.smoothing=.17;p.stabilization.constant=.2;}),
  clone('foundation-pencil','illustro-soft-pencil-v1','柔らかい鉛筆','鉛筆・下描き','少し太く、薄い紙の質感で下描きをする鉛筆の設定。',
   p=>{p.size=12;p.flow=.7;p.tip.hardness=.65;p.texture.paper.strength=.7;}),
  clone('foundation-marker','illustro-opaque-marker-v1','濃い塗りマーカー','塗り','不透明に近い色を広く塗るマーカーの設定。',p=>{p.size=72;p.opacity=.9;}),
  clone('foundation-technical','illustro-airbrush-v1','エアブラシ','塗り','柔らかいぼかしや、色を少しずつ重ねるためのブラシ。',
   p=>{
    p.size=96;p.renderer='stamp';p.paint='build-up';
    p.tip.hardness=0;p.flow=.05;p.spacing.value=.08;
   })
 ];
}
