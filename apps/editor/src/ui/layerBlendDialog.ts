import {LAYER_BLEND_MODES,type LayerBlend,type LayerBlendMode} from '@illustro/core';

export const layerBlendNames:Record<LayerBlendMode,string>={
  normal:'通常',darken:'比較（暗）',lighten:'比較（明）',multiply:'乗算',screen:'スクリーン',
  'color-burn':'焼き込みカラー','color-dodge':'覆い焼きカラー','hard-light':'ハードライト',overlay:'オーバーレイ',
  'soft-light':'ソフトライト',difference:'差の絶対値',exclusion:'除外','linear-burn':'焼き込み（リニア）',
  'linear-dodge':'加算','vivid-light':'ビビッドライト','linear-light':'リニアライト','pin-light':'ピンライト',
  'hard-mix':'ハードミックス',subtract:'減算',divide:'除算',hue:'色相',saturation:'彩度',color:'カラー',
  luminosity:'輝度',dissolve:'ディザ合成',
};

export type LayerBlendChoice=Readonly<{blend:LayerBlend;opacity:number}>;
export function openLayerBlendDialog(options:{
  title:string;current:LayerBlendChoice;stages:readonly string[];
  preview:(choice:LayerBlendChoice|null)=>void;complete:(choice?:LayerBlendChoice)=>void;
}){
  const dialog=document.createElement('dialog'),form=document.createElement('form');
  dialog.className='layer-blend-dialog';
  dialog.setAttribute('aria-label','レイヤーの合成モード');
  form.method='dialog';
  const title=document.createElement('strong');title.textContent=options.title+' の合成モード';
  const mode=document.createElement('select');
  mode.replaceChildren(...LAYER_BLEND_MODES.map(value=>new Option(layerBlendNames[value],value)));
  mode.value=options.current.blend.mode;
  const space=document.createElement('select');
  space.replaceChildren(new Option('通常の色','encoded'),new Option('明るさに比例する色','linear'));
  space.value=options.current.blend.space;
  const amount=document.createElement('input');amount.type='range';
  amount.min='0';amount.max='100';amount.step='.1';amount.value=String(options.current.opacity*100);
  const percentage=document.createElement('output');
  let opacity=options.current.opacity;
  const comparison=document.createElement('button');comparison.type='button';
  const selected=():LayerBlendChoice=>({
    blend:{mode:mode.value as LayerBlendMode,space:space.value==='linear'?'linear':'encoded',seed:options.current.blend.seed},
    opacity,
  });
  let before=false;
  const update=()=>{
    comparison.setAttribute('aria-pressed',String(before));
    percentage.value=Math.round(opacity*1000)/10+'%';
    comparison.textContent=before?'変更後を見る':'変更前を見る';
    options.preview(before?null:selected());
  };
  mode.onchange=space.onchange=()=>{before=false;update();};
  amount.oninput=()=>{opacity=amount.valueAsNumber/100;before=false;update();};
  comparison.onclick=()=>{before=!before;update();};
  const field=(name:string,input:HTMLElement)=>{
    const label=document.createElement('label');
    label.append(name,input);
    return label;
  };
  const actions=document.createElement('menu');
  const cancel=document.createElement('button');cancel.type='submit';cancel.value='cancel';cancel.textContent='取り消す';
  const apply=document.createElement('button');apply.type='submit';apply.value='apply';apply.textContent='確定';
  actions.append(comparison,cancel,apply);
  const strength=field('レイヤーの不透明度',amount);strength.append(percentage);
  const stages=document.createElement('details'),stageTitle=document.createElement('summary');
  stageTitle.textContent='処理の順番と透明部分';
  const order=document.createElement('ol');
  for(const stage of options.stages){
    const row=document.createElement('li');row.textContent=stage;order.append(row);
  }
  const transparency=document.createElement('p');
  transparency.textContent='透明部分は透明度の分だけ合成が弱まります。透明度が0の部分は下の絵に影響しません。';
  stages.append(stageTitle,order,transparency);
  form.append(title,field('モード',mode),field('色の混ぜ方',space),strength,actions,stages);
  dialog.append(form);document.body.append(dialog);
  const key=(event:KeyboardEvent)=>{
    if(event.key==='Escape'&&dialog.open){event.preventDefault();dialog.close('cancel');}
  };
  window.addEventListener('keydown',key);
  dialog.addEventListener('close',()=>{
    window.removeEventListener('keydown',key);
    dialog.remove();
    options.complete(dialog.returnValue==='apply'?selected():undefined);
  },{once:true});
  dialog.show();
  mode.focus();
  update();
  return dialog;
}
