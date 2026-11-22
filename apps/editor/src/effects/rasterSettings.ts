export type Parameter=Readonly<{label:string;min:number;max:number;step:number;initial:number}>;
export type EffectDefinition=Readonly<{id:string;label:string;parameters:readonly Parameter[]}>;
const number=(label:string,min:number,max:number,initial:number,step=1):Parameter=>({label,min,max,initial,step});
const flag=(label:string,initial=0)=>number(label,0,1,initial);
const radius=number('半径（px）',0,64,4);
const alpha=flag('元の透明度を保つ',1);
export const neighborhoodEffects={
  gaussian:{id:'FX-116',label:'ガウスぼかし',parameters:[radius,alpha]},
  box:{id:'FX-117',label:'ボックスぼかし',parameters:[number('横半径（px）',0,128,4),number('縦半径（px）',0,128,4),flag('縦横を連動',1),alpha]},
  motion:{id:'FX-118',label:'移動ぼかし',parameters:[number('距離（px）',0,256,14),number('角度（°）',-180,180,0),flag('片方向'),alpha]},
  radial:{id:'FX-119',label:'放射ぼかし',parameters:[number('量',0,100,20),number('中心 X（%）',0,100,50),number('中心 Y（%）',0,100,50),flag('回転（オフでズーム）'),number('中心を保護（%）',0,100,8)]},
  sharpen:{id:'FX-121',label:'シャープ',parameters:[number('強さ（%）',0,300,50),number('細かさ（px）',1,8,1),number('強い輪郭を保護（%）',0,100,50)]},
  unsharp:{id:'FX-122',label:'アンシャープマスク',parameters:[number('強さ（%）',0,300,60),radius,number('しきい値',0,255,5),flag('明るさだけ',1)]},
  highPass:{id:'FX-123',label:'細部を抽出（High Pass）',parameters:[radius,number('中間の明るさ',0,255,128),flag('元の画像に重ねる')]},
  noise:{id:'FX-124',label:'ノイズ',parameters:[number('量',0,100,12),flag('色付き'),flag('中央に集中する分布'),number('粒の大きさ（px）',1,24,1),number('模様の番号',0,1000000,1)]},
  median:{id:'FX-125',label:'メディアン・ごみ取り',parameters:[number('ごみの半径（px）',1,5,1),number('色・不透明度の差のしきい値',0,255,18),flag('孤立した点だけを除く',1)]},
} as const satisfies Record<string,EffectDefinition>;
export const toneEffects={
  brightness:{id:'FX-101',label:'明るさ・コントラスト',parameters:[number('明るさ',-100,100,0),number('コントラスト',-100,100,0),flag('明るさだけを調整')]},
  levels:{id:'FX-102',label:'レベル',parameters:[number('入力 黒',0,254,0),number('入力 白',1,255,255),number('中間の明るさ',.1,5,1,.01),number('出力 黒',0,255,0),number('出力 白',0,255,255),number('成分（0: RGB、1: 赤、2: 緑、3: 青）',0,3,0)]},
  exposure:{id:'FX-104',label:'露出',parameters:[number('露出（EV）',-8,8,0,.1),number('黒の位置',-.5,.5,0,.01),number('ガンマ',.1,5,1,.05)]},
  hue:{id:'FX-105',label:'色相・彩度・明度',parameters:[number('色相（°）',-180,180,0),number('彩度',-100,100,0),number('明度',-100,100,0),flag('色を統一する')]},
  vibrance:{id:'FX-106',label:'自然な彩度',parameters:[number('自然な彩度',-100,100,0),number('全体の彩度',-100,100,0)]},
  balance:{id:'FX-107',label:'カラーバランス',parameters:[number('暗部（1）・中間（2）・明部（3）',1,3,2),number('シアン ↔ 赤',-100,100,0),number('マゼンタ ↔ 緑',-100,100,0),number('黄 ↔ 青',-100,100,0),flag('元の明るさを保つ',1)]},
  temperature:{id:'FX-108',label:'色温度・色かぶり',parameters:[number('冷たい ↔ 暖かい',-100,100,0),number('マゼンタ ↔ 緑',-100,100,0)]},
  invert:{id:'FX-112',label:'色を反転',parameters:[flag('明るさだけを反転'),flag('透明度も反転')]},
  posterize:{id:'FX-113',label:'階調を減らす',parameters:[number('段階数',2,32,4),flag('明るさだけを階調化'),flag('格子状のディザを加える')]},
  threshold:{id:'FX-114',label:'二値化',parameters:[number('しきい値',0,255,128),number('明度（0）または赤・緑・青（1〜3）',0,3,0),number('暗い側の値',0,255,0),number('明るい側の値',0,255,255)]},
  mosaic:{id:'FX-126',label:'モザイク',parameters:[number('ブロックの幅（px）',1,256,12),number('ブロックの高さ（px）',1,256,12),flag('縦横を連動',1),number('格子の開始 X（px）',-256,256,0),number('格子の開始 Y（px）',-256,256,0),flag('中心色を使う（オフで平均色）')]},
  offset:{id:'FX-127',label:'オフセット',parameters:[number('横に移動（px）',-8192,8192,0),number('縦に移動（px）',-8192,8192,0),number('端の処理（0: 循環、1: 透明、2: 端の色）',0,2,0)]},
} as const satisfies Record<string,EffectDefinition>;
export const rasterEffects={...neighborhoodEffects,...toneEffects};
export type RasterEffect=keyof typeof rasterEffects;
export type EffectStep=Readonly<{kind:RasterEffect;values:readonly number[];strength:number;enabled:boolean}>;
export function newEffect(kind:RasterEffect):EffectStep{
  return {kind,values:rasterEffects[kind].parameters.map(p=>p.initial),strength:100,enabled:true};
}
export function readEffectSteps(input:unknown):EffectStep[]|null{
  if(!Array.isArray(input)||!input.length||input.length>8)return null;
  const steps:EffectStep[]=[];
  for(const step of input){
    if(!step||typeof step!=='object'||!Object.hasOwn(rasterEffects,step.kind)||
      typeof step.enabled!=='boolean'||!Number.isFinite(step.strength)||step.strength<0||step.strength>100)return null;
    const kind=step.kind as RasterEffect,parameters=rasterEffects[kind].parameters;
    if(!Array.isArray(step.values)||step.values.length!==parameters.length||
      !parameters.every((p,i)=>Number.isFinite(step.values[i])&&step.values[i]>=p.min&&step.values[i]<=p.max&&
        Math.abs((step.values[i]-p.min)/p.step-Math.round((step.values[i]-p.min)/p.step))<1e-5))return null;
    steps.push({kind,values:[...step.values],strength:step.strength,enabled:step.enabled});
  }
  return steps;
}
