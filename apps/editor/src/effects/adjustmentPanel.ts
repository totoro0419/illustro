import {ADJUSTMENT_KINDS,type LayerAdjustment,type LayerBlend} from '@illustro/core';
import {button,labelledField,numberField,paintPreview,selectField} from '../artwork/tools';
import {applyRasterEffects} from './rasterFilters';
import {newEffect,readEffectSteps,toneEffects,type EffectStep} from './rasterSettings';
import {installToneCurvePanel} from './toneCurvePanel';

type Session=Readonly<{
  initial:LayerAdjustment|null;strength:number;clipped:boolean;selected:boolean;
  preview:(blend:LayerBlend,strength:number,clipped:boolean,useSelection:boolean)=>Promise<readonly [ImageData,ImageData]>;
  apply:(blend:LayerBlend,strength:number,clipped:boolean,useSelection:boolean,label:string)=>Promise<void>;
}>;

export function buildAdjustment(step:EffectStep):LayerAdjustment{
  if(!ADJUSTMENT_KINDS.some(kind=>kind===step.kind))throw Error('調整の種類が対応していません。');
  const grid=new Uint8Array(16**3*4);
  for(let i=0;i<16**3;i++)grid.set([(i%16)*17,(Math.floor(i/16)%16)*17,Math.floor(i/256)*17,255],i*4);
  const colors=applyRasterEffects(grid,256,16,[step],null),packed=new Uint8Array(16**3*3);
  for(let i=0;i<16**3;i++)packed.set(colors.subarray(i*4,i*4+3),i*3);
  return {kind:step.kind as LayerAdjustment['kind'],values:step.values,cube:btoa(String.fromCharCode(...packed)),
    ...(step.curve?{curve:step.curve}:{})};
}

export function installAdjustmentPanel(host:HTMLElement,open:(edit:boolean)=>Promise<Session>){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const title=document.createElement('summary');title.textContent='色の調整レイヤー';
  const fields=document.createElement('div');fields.className='c06-clipboard-grid';fields.hidden=true;
  const kind=selectField(fields,'調整の種類',ADJUSTMENT_KINDS.map(id=>[id,toneEffects[id].label] as const));
  const target=selectField(fields,'作用先',[['below','この層より下の全体'],['clip','直下のクリッピング元の範囲']]);
  const mask=document.createElement('input');mask.type='checkbox';labelledField(fields,'現在の選択に範囲を限定する',mask);
  const strength=numberField(fields,'強さ（%）',100,0,100);
  const parameters=document.createElement('div');parameters.className='c06-clipboard-grid';fields.append(parameters);
  const before=document.createElement('canvas'),after=document.createElement('canvas'),comparison=document.createElement('div');
  comparison.className='assist-previews';comparison.hidden=true;fields.append(comparison);
  for(const [label,canvas] of [['変更前',before],['調整後',after]] as const){
    const figure=document.createElement('figure'),caption=document.createElement('figcaption');
    canvas.setAttribute('aria-label',label);caption.textContent=label;figure.append(canvas,caption);comparison.append(figure);
  }
  const status=document.createElement('output');status.setAttribute('role','status');
  let session:Session|null=null,step=newEffect('brightness'),version=0;
  function invalidate(){version++;comparison.hidden=true;}
  function render(){
    parameters.replaceChildren();
    if(step.kind==='curves'){
      installToneCurvePanel(parameters,step,edited=>{step=edited;invalidate();},status);
      return;
    }
    toneEffects[step.kind as LayerAdjustment['kind']].parameters.forEach((param,index)=>{
      const field=numberField(parameters,param.label,step.values[index]!,param.min,param.max,param.step);
      field.oninput=()=>{const values=[...step.values];values[index]=field.valueAsNumber;step={...step,values};invalidate();};
    });
  }
  async function start(edit:boolean,initialKind?:LayerAdjustment['kind']){
    const ticket=++version,opened=await open(edit);
    if(ticket!==version)return;
    session=opened;
    const saved=opened.initial??null;
    step=saved?{...newEffect(saved.kind),values:saved.values,...(saved.curve?{curve:saved.curve}:{})}:newEffect(initialKind??'brightness');
    kind.value=step.kind;target.value=opened.clipped?'clip':'below';
    mask.checked=false;mask.disabled=!opened.selected;strength.value=String(opened.strength);
    fields.hidden=false;invalidate();render();
    status.textContent=saved?'保存した調整を開きました。':'元の絵を保ったまま、現在のレイヤーの上に調整を追加します。';
  }
  kind.onchange=()=>{step=newEffect(kind.value as LayerAdjustment['kind']);invalidate();render();};
  for(const control of [target,mask,strength])control.onchange=invalidate;
  function options(){
    if(!session||!readEffectSteps([step])||!strength.validity.valid||!strength.value)throw Error('調整の設定を確認してください。');
    const blend:LayerBlend={mode:'normal',space:'encoded',seed:0,adjustment:buildAdjustment(step)};
    return [blend,strength.valueAsNumber/100,target.value==='clip',mask.checked] as const;
  }
  const actions=document.createElement('div');actions.className='box-actions';
  actions.append(button('前後を比較',async()=>{
    const ticket=++version,values=options();
    status.textContent='比較画像を作っています。';
    const [a,b]=await session!.preview(...values);
    if(ticket!==version)return;
    paintPreview(before,a.data,a.width,a.height);paintPreview(after,b.data,b.width,b.height);comparison.hidden=false;
    status.textContent='選んだ範囲と強さを反映した比較です。';
  },status),button('確定',async()=>{
    await session!.apply(...options(),toneEffects[step.kind as LayerAdjustment['kind']].label);
    session=null;fields.hidden=true;invalidate();status.textContent='調整を作品に保存しました。いつでも調整を開き直せます。';
  },status),button('取り消す',()=>{session=null;fields.hidden=true;invalidate();},status));
  fields.append(actions);
  panel.append(title,button('調整レイヤーを追加',()=>start(false),status),
    button('選んだ調整レイヤーを編集',()=>start(true),status),fields,status);host.append(panel);
  panel.ontoggle=()=>{if(!panel.open){session=null;fields.hidden=true;invalidate();}};
  return {show:(edit:boolean,initialKind?:LayerAdjustment['kind'])=>{panel.open=true;return start(edit,initialKind);}};
}
