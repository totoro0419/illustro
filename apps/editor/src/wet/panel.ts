import {button,labelledField,numberField,selectField} from '../artwork/tools';
import type {BrushSurface} from '../brushSurface';
import {defaultWet,needsSource,type Point,type WetMode,type WetSettings} from './paint';

export const wetModes=[
  ['smudge','色を引きずる'],['blur','筆でぼかす'],['mix','色を足して混ぜる'],
  ['water','水彩風'],['oil','厚塗り風'],['pastel','パステル風'],
  ['clone','クローン'],['heal','修復ブラシ'],['patch','範囲パッチ'],
] as const satisfies readonly (readonly [WetMode,string])[];
export type WetStroke=Readonly<{
  settings:WetSettings;source:Point|null;reference:'active'|'merged';separate:boolean;
  offset:Point;points:readonly Point[];signal:AbortSignal;documentId:string;sourceLayerId:string|null;
}>;

export function installWetTools(host:HTMLElement,api:{
  current:()=>{drawing:BrushSurface;documentId:string;layerId:string;layerName:string}|null;
  activate:(start:()=>void)=>void;color:()=>readonly number[];draw:(stroke:WetStroke)=>Promise<boolean>;left:()=>void;
}){
  const panel=document.createElement('details');
  panel.className='c06-clipboard-panel';panel.dataset.toolPanel='smudge';
  const summary=document.createElement('summary');summary.textContent='混色・水彩・修復';
  const options=document.createElement('div');options.className='c06-clipboard-grid';
  const mode=selectField(options,'筆の作用',wetModes);
  const reference=selectField(options,'参照元',[['active','描画先のレイヤー'],['merged','見えている絵の全体']]);
  const size=numberField(options,'直径（px）',defaultWet.size,1,256);
  const strength=numberField(options,'強さ（%）',65,1,100);
  const advanced=document.createElement('details'),advancedTitle=document.createElement('summary');
  advancedTitle.textContent='顔料・にじみ・紙';
  const fine=document.createElement('div');fine.className='c06-clipboard-grid';
  const pigment=numberField(fine,'色を足す量（%）',45,0,100);
  const diffusion=numberField(fine,'にじみ（%）',40,0,100);
  const edge=numberField(fine,'水彩のふち・パッチの硬さ（%）',35,0,100);
  const grain=numberField(fine,'粒状感（%）',25,0,100);
  const paperScale=numberField(fine,'紙目の大きさ（px）',3,1,32);
  const absorb=numberField(fine,'紙の吸収・かすれ（%）',45,0,100);
  const thickness=numberField(fine,'厚塗りの明るい盛り上がり（%）',50,0,100);
  advanced.append(advancedTitle,fine);
  const separate=document.createElement('input');separate.type='checkbox';
  labelledField(options,'新しいレイヤーに結果を置く',separate);
  const aligned=document.createElement('input');aligned.type='checkbox';aligned.checked=true;
  labelledField(options,'次の一筆にも採取元との位置関係を保つ',aligned);
  const status=document.createElement('output');status.setAttribute('role','status');
  const target=document.createElement('p');target.setAttribute('role','status');
  let anchor:{point:Point;documentId:string;layerId:string;layerName:string}|null=null,offset:Point|null=null;
  let cancelDrawing:(()=>void)|null=null,pending:AbortController|null=null,revision=0;
  const fields=[size,strength,pigment,diffusion,edge,grain,paperScale,absorb,thickness];
  const key='illustro.round2.wet.v1';
  try{
    const saved=JSON.parse(localStorage.getItem(key)??'null');
    if(saved&&wetModes.some(([id])=>id===saved.mode)&&Array.isArray(saved.values)){
      mode.value=saved.mode;
      fields.forEach((field,i)=>{
        const value=saved.values[i];
        if(Number.isInteger(value)&&value>=Number(field.min)&&value<=Number(field.max))field.value=String(value);
      });
      reference.value=saved.reference==='merged'?'merged':'active';
      separate.checked=saved.separate===true;aligned.checked=saved.aligned!==false;
    }
  }catch{/* defaults are usable when preferences cannot be read */}
  const selected=()=>mode.value as WetMode;
  function settings():WetSettings{
    if(fields.some(field=>!field.validity.valid||!field.value))throw Error('筆の設定を範囲内で指定してください。');
    return {mode:selected(),size:size.valueAsNumber,strength:strength.valueAsNumber/100,pigment:pigment.valueAsNumber/100,
      diffusion:diffusion.valueAsNumber/100,edge:edge.valueAsNumber/100,grain:grain.valueAsNumber/100,
      paperScale:paperScale.valueAsNumber,absorb:absorb.valueAsNumber/100,thickness:thickness.valueAsNumber/100,color:api.color()};
  }
  function describe(){
    const context=api.current();
    if(anchor&&anchor.documentId!==context?.documentId){anchor=null;offset=null;}
    const ref=reference.value==='merged'?'表示中の全レイヤー':anchor&&needsSource(selected())?anchor.layerName:context?.layerName??'なし';
    target.textContent='参照 '+ref+' ／ 描画先 '+(separate.checked||reference.value==='merged'?'新規レイヤー':context?.layerName??'なし')+
      (anchor&&needsSource(selected())?' ／ 採取点 '+Math.floor(anchor.point.x)+', '+Math.floor(anchor.point.y):'');
    aligned.parentElement!.hidden=!needsSource(selected());
    sourceButton.hidden=!needsSource(selected());
  }
  function leave(){
    revision++;pending?.abort();pending=null;
    const cancel=cancelDrawing;cancelDrawing=null;cancel?.();
  }
  function arm(pick=false){
    const context=api.current();if(!context){status.textContent='作品を開いてください。';return;}
    const token=++revision;
    const old=cancelDrawing;cancelDrawing=null;old?.();
    const brush=selected(),repair=needsSource(brush);
    describe();
    if(repair&&!anchor&&!pick){
      status.textContent='「元を指定」を押して、キャンバス上で採取元を選んでください。';
      return;
    }
    const current=()=>revision===token&&api.current()?.drawing===context.drawing;
    status.textContent=pick?'キャンバスで採取する位置を選んでください。':brush==='patch'?'貼り付け先の対角線をドラッグしてください。':'離すと一筆の結果を適用します。';
    cancelDrawing=context.drawing.setCanvasEditGesture({
      continuous:true,path:false,width:pick||brush==='patch'?2:Math.max(1,size.valueAsNumber),color:repair?'#2a8cc8':'#5c8c68',
      referencePoint:()=>repair&&!pick&&anchor?.documentId===context.documentId?anchor.point:null,
      end:()=>{if(current()){pending?.abort();pending=null;cancelDrawing=null;api.left();}},
      complete:points=>{
        const first=points[0];
        const next=api.current();
        if(!first||!next||next.documentId!==context.documentId||pending)return;
        if(pick){
          anchor={point:first,documentId:next.documentId,layerId:next.layerId,layerName:next.layerName};
          offset=null;arm();return;
        }
        let chosen:WetSettings;
        try{chosen=settings();}catch(error){status.textContent=(error as Error).message;return;}
        const controller=new AbortController();pending=controller;
        const origin=brush==='patch'&&points.at(-1)?{x:Math.min(first.x,points.at(-1)!.x),y:Math.min(first.y,points.at(-1)!.y)}:first;
        const delta=anchor&&(offset&&aligned.checked?offset:{x:anchor.point.x-origin.x,y:anchor.point.y-origin.y});
        status.textContent='画素を処理しています…';
        void api.draw({settings:chosen,source:anchor?.point??null,reference:reference.value==='merged'?'merged':'active',
          sourceLayerId:anchor?.layerId??null,separate:separate.checked,offset:delta??{x:0,y:0},points,signal:controller.signal,documentId:next.documentId})
          .then(changed=>{
            if(!current())return;
            if(changed&&repair&&aligned.checked)offset=delta;
            status.textContent=changed?'一筆を反映しました。取り消しで戻せます。':'この範囲で変わる画素がありません。';
          }).catch(error=>{
            if(current()&&!controller.signal.aborted)status.textContent=error instanceof Error?error.message:String(error);
          }).finally(()=>{if(pending===controller)pending=null;});
      },
    });
  }
  const sourceButton=button('元を指定',()=>api.activate(()=>arm(true)),status);
  const start=button('キャンバスで使う',()=>api.activate(()=>arm()),status);
  const stop=button('筆を終了',()=>{leave();api.left();},status);
  const actions=document.createElement('div');actions.className='box-actions';actions.append(sourceButton,start,stop);
  for(const field of [mode,reference,...fields,separate,aligned])field.onchange=()=>{
    if(field===mode||field===reference)offset=null;
    try{localStorage.setItem(key,JSON.stringify({mode:mode.value,reference:reference.value,values:fields.map(f=>f.valueAsNumber),
      aligned:aligned.checked,separate:separate.checked}));}catch{/* the current tool still works */}
    describe();
    if(cancelDrawing&&!pending)arm();
  };
  panel.append(summary,options,target,advanced,actions,status);
  host.append(panel);describe();
  return {open:()=>{panel.open=true;arm();},stop:leave,settings,refresh:describe};
}
