import {LAYER_BLEND_MODES,type LayerBlend,type LayerBlendMode,type LayerTone,type LayerColorEffect,type LayerMask} from '@illustro/core';

export const layerBlendNames:Record<LayerBlendMode,string>={
  normal:'通常',darken:'比較（暗）',lighten:'比較（明）',multiply:'乗算',screen:'スクリーン',
  'color-burn':'焼き込みカラー','color-dodge':'覆い焼きカラー','hard-light':'ハードライト',overlay:'オーバーレイ',
  'soft-light':'ソフトライト',difference:'差の絶対値',exclusion:'除外','linear-burn':'焼き込み（リニア）',
  'linear-dodge':'加算','vivid-light':'ビビッドライト','linear-light':'リニアライト','pin-light':'ピンライト',
  'hard-mix':'ハードミックス',subtract:'減算',divide:'除算',hue:'色相',saturation:'彩度',color:'カラー',
  luminosity:'輝度',dissolve:'ディザ合成',
};

export type LayerBlendChoice=Readonly<{blend:LayerBlend;opacity:number;tonePreview?:boolean}>;
export function openLayerBlendDialog(options:{
  title:string;current:LayerBlendChoice;stages:readonly string[];
  sampleTone:(source:LayerTone['source'])=>Promise<ImageData>;
  selectionMask:()=>LayerMask|null;
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
  const tonePanel=document.createElement('details'),toneTitle=document.createElement('summary');
  toneTitle.textContent='明るさで合成範囲を指定';
  tonePanel.open=!!options.current.blend.tone;
  const toneEnabled=document.createElement('input');toneEnabled.type='checkbox';toneEnabled.checked=!!options.current.blend.tone;
  const toneSource=document.createElement('select');toneSource.add(new Option('このレイヤー','self'));toneSource.add(new Option('下の絵','backdrop'));
  toneSource.value=options.current.blend.tone?.source??'self';
  const toneChannel=document.createElement('select');
  for(const [id,label] of [['luminosity','輝度'],['red','赤'],['green','緑'],['blue','青']] as const)toneChannel.add(new Option(label,id));
  toneChannel.value=options.current.blend.tone?.channel??'luminosity';
  const bounds=['darkStart','darkEnd','lightStart','lightEnd'] as const;
  const names=['暗部の境界','暗部のなじみ','明部のなじみ','明部の境界'];
  const controls=bounds.map((key,index)=>{
    const input=document.createElement('input');input.type='range';input.min='0';input.max='255';input.step='1';
    input.value=String(Math.round((options.current.blend.tone?.[key]??(index>=2?1:0))*255));
    return input;
  });
  const tone=():LayerTone=>({
    source:toneSource.value==='backdrop'?'backdrop':'self',channel:toneChannel.value as LayerTone['channel'],
    darkStart:controls[0]!.valueAsNumber/255,darkEnd:controls[1]!.valueAsNumber/255,
    lightStart:controls[2]!.valueAsNumber/255,lightEnd:controls[3]!.valueAsNumber/255
  });
  const highlight=document.createElement('input');highlight.type='checkbox';
  const histogram=document.createElement('canvas');histogram.width=256;histogram.height=52;
  histogram.setAttribute('aria-label','選んだ色成分の分布');
  const image=document.createElement('canvas');image.hidden=true;image.style.maxWidth='100%';
  image.setAttribute('aria-label','明るさを拾う画像');
  const pickBound=document.createElement('select');
  names.forEach((name,index)=>pickBound.add(new Option(name,String(index))));
  const message=document.createElement('output');message.setAttribute('role','status');
  let sampled:ImageData|null=null,epoch=0;
  const selected=(preview=false):LayerBlendChoice=>({
    blend:{mode:mode.value as LayerBlendMode,space:space.value==='linear'?'linear':'encoded',seed:options.current.blend.seed,
      ...(toneEnabled.checked?{tone:tone()}:{}) ,...(effect?{effect}:{} )},
    opacity,...(preview&&toneEnabled.checked&&highlight.checked?{tonePreview:true}:{})
  });
  let before=false;
  const update=()=>{
    comparison.setAttribute('aria-pressed',String(before));
    percentage.value=Math.round(opacity*1000)/10+'%';
    comparison.textContent=before?'変更後を見る':'変更前を見る';
    options.preview(before?null:selected(true));
  };
  mode.onchange=space.onchange=()=>{before=false;update();};
  amount.oninput=()=>{opacity=amount.valueAsNumber/100;before=false;update();};
  comparison.onclick=()=>{before=!before;update();};
  const field=(name:string,input:HTMLElement)=>{
    const label=document.createElement('label');
    label.append(name,input);
    return label;
  };
  const toneAt=(data:Uint8ClampedArray,index:number)=>{
    const channel=toneChannel.value,r=data[index]!,g=data[index+1]!,b=data[index+2]!;
    return channel==='red'?r:channel==='green'?g:channel==='blue'?b:Math.round(.2126*r+.7152*g+.0722*b);
  };
  function drawHistogram(){
    const context=histogram.getContext('2d');
    if(!context)return;
    context.clearRect(0,0,256,52);
    context.fillStyle='#232934';context.fillRect(0,0,256,52);
    if(sampled){
      const bins=new Uint32Array(256);
      for(let at=0;at<sampled.data.length;at+=4)if(sampled.data[at+3])bins[toneAt(sampled.data,at)]!++;
      const max=Math.max(1,...bins);
      context.fillStyle='#a4b9d5';
      bins.forEach((count,index)=>{const size=Math.sqrt(count/max)*46;context.fillRect(index,52-size,1,size);});
    }
    controls.forEach((slider,index)=>{
      context.fillStyle=index%2?'#ef91ba':'#ffce7d';
      context.fillRect(slider.valueAsNumber,0,1,52);
    });
  }
  async function loadToneImage(){
    const turn=++epoch;toneEnabled.checked&&tonePanel.open&&(message.textContent='色の分布を読み込み中…');
    if(!toneEnabled.checked||!tonePanel.open)return;
    try{
      const value=await options.sampleTone(tone().source);
      if(turn!==epoch)return;
      sampled=value;image.width=value.width;image.height=value.height;
      image.getContext('2d')?.putImageData(value,0,0);image.hidden=false;
      message.textContent='下の画像を押すと、選んだ境界にその場所の値が入ります。';
      drawHistogram();
    }catch(error){if(turn===epoch)message.textContent=error instanceof Error?error.message:String(error);}
  }
  function changeBound(index:number,value:number){
    const min=controls[index-1]?.valueAsNumber??0,max=controls[index+1]?.valueAsNumber??255;
    controls[index]!.value=String(Math.max(min,Math.min(max,value)));
    before=false;update();drawHistogram();
  }
  controls.forEach((slider,index)=>slider.oninput=()=>changeBound(index,slider.valueAsNumber));
  toneEnabled.onchange=()=>{before=false;update();void loadToneImage();};
  toneSource.onchange=()=>{before=false;update();void loadToneImage();};
  toneChannel.onchange=()=>{before=false;update();drawHistogram();};
  highlight.onchange=()=>{before=false;update();};
  tonePanel.ontoggle=()=>{if(tonePanel.open)void loadToneImage();};
  histogram.onclick=(event)=>{
    const rect=histogram.getBoundingClientRect();
    changeBound(Number(pickBound.value),Math.round(255*(event.clientX-rect.left)/rect.width));
  };
  image.onclick=(event)=>{
    if(!sampled)return;
    const rect=image.getBoundingClientRect(),x=Math.floor((event.clientX-rect.left)*image.width/rect.width);
    const y=Math.floor((event.clientY-rect.top)*image.height/rect.height);
    if(x>=0&&y>=0&&x<image.width&&y<image.height)changeBound(Number(pickBound.value),toneAt(sampled.data,(y*image.width+x)*4));
  };
  tonePanel.append(toneTitle,field('明るさで範囲を絞る',toneEnabled),field('調べる絵',toneSource),
    field('色の成分',toneChannel),...controls.map((control,index)=>field(names[index]!,control)),
    field('影響する場所をピンクで表示',highlight),field('画像で調整する境界',pickBound),histogram,image,message);
  const effectPanel=document.createElement('details'),effectTitle=document.createElement('summary');
  effectTitle.textContent='再編集できる色の効果';
  let effect:LayerColorEffect|undefined=options.current.blend.effect;
  effectPanel.open=!!effect;
  const defaultEffect:LayerColorEffect={enabled:true,brightness:0,contrast:1,saturation:1,invert:false,mask:null};
  const effectEnabled=document.createElement('input');effectEnabled.type='checkbox';
  const invert=document.createElement('input');invert.type='checkbox';
  const effectFields=(['brightness','contrast','saturation'] as const).map((key,index)=>{
    const input=document.createElement('input');input.type='range';
    input.min=index?'0':'-100';input.max=index?'400':'100';input.step='1';
    return {key,input};
  });
  const effectDescription=document.createElement('output');effectDescription.setAttribute('role','status');
  function reflectEffect(){
    effectEnabled.checked=effect?.enabled??false;invert.checked=effect?.invert??false;
    for(const {key,input} of effectFields)input.value=String(Math.round((effect??defaultEffect)[key]*100));
    effectDescription.textContent=effect?.mask?'選択から作った効果用マスクで範囲を制限しています。':'レイヤー全体が効果の対象です。';
  }
  function changeEffect(patch:Partial<LayerColorEffect>){
    effect={...(effect??defaultEffect),...patch};
    reflectEffect();before=false;update();
  }
  effectEnabled.onchange=()=>changeEffect({enabled:effectEnabled.checked});
  invert.onchange=()=>changeEffect({invert:invert.checked,enabled:effect?.enabled??true});
  effectFields.forEach(({key,input})=>input.oninput=()=>changeEffect({[key]:input.valueAsNumber/100,enabled:effect?.enabled??true}));
  const localButton=(label:string,click:()=>void)=>{
    const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=click;return button;
  };
  effectPanel.append(effectTitle,field('色の効果を有効にする',effectEnabled),
    ...effectFields.map(({input},index)=>field(['明るさ','コントラスト','彩度'][index]!,input)),
    field('色を反転',invert),
    localButton('選択範囲を効果のマスクにする',()=>{
      const mask=options.selectionMask();
      if(!mask){effectDescription.textContent='先にキャンバスで範囲を選んでください。';return;}
      changeEffect({mask});
    }),
    localButton('効果のマスクを外す',()=>{if(effect)changeEffect({mask:null});}),
    localButton('色の効果を削除',()=>{effect=undefined;reflectEffect();before=false;update();}),
    effectDescription);
  reflectEffect();
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
  form.append(title,field('モード',mode),field('色の混ぜ方',space),strength,tonePanel,effectPanel,actions,stages);
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
  update();if(tonePanel.open)void loadToneImage();
  return dialog;
}
