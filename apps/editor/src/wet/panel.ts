import {button,labelledField,numberField,selectField} from '../artwork/tools';
import type {BrushSurface} from '../brushSurface';
import type {PortableSectionInput} from '../persistence/format';
import {defaultWet,needsSource,type Point,type WetMode,type WetSettings} from './paint';

const sectionId='round2.wet-brush',sectionType='illustro.wet-brush.v1';

export const wetModes=[
  ['smudge','色を引きずる'],['blur','筆でぼかす'],['mix','色を足して混ぜる'],
  ['water','水彩風'],['oil','厚塗り風'],['pastel','パステル風'],
  ['clone','クローン'],['heal','修復ブラシ'],['patch','範囲パッチ'],
] as const satisfies readonly (readonly [WetMode,string])[];
export type WetStroke=Readonly<{
  settings:WetSettings;source:Point|null;reference:'active'|'merged';separate:boolean;
  offset:Point;points:readonly Point[];selectedPatch?:boolean;signal:AbortSignal;documentId:string;sourceLayerId:string|null;
}>;

export function installWetTools(host:HTMLElement,api:{
  current:()=>{drawing:BrushSurface;documentId:string;layerId:string;layerName:string}|null;
  activate:(start:()=>void)=>void;hasSelection:()=>boolean;color:()=>readonly number[];draw:(stroke:WetStroke)=>Promise<boolean>;preview:(stroke:WetStroke)=>Promise<boolean>;left:()=>void;onContext?:()=>void;
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
  const pigment=numberField(options,'顔料量・足す色の量（%）',45,0,100);
  const water=numberField(options,'水量（%）',50,0,100);
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
  const selectedPatch=document.createElement('input');selectedPatch.type='checkbox';
  labelledField(options,'選択中の形を採取し、ドラッグの終点へコピー',selectedPatch);
  const transfer=()=>selected()==='patch'&&selectedPatch.checked;
  const status=document.createElement('output');status.setAttribute('role','status');
  const target=document.createElement('p');target.setAttribute('role','status');
  let anchor:{point:Point;documentId:string;layerId:string;layerName:string}|null=null,offset:Point|null=null;
  let cancelDrawing:(()=>void)|null=null,pending:AbortController|null=null,revision=0;
  const fields=[size,strength,pigment,diffusion,edge,grain,paperScale,absorb,thickness,water];
  const key='illustro.round2.wet.v1';
  function restorePreferences(raw:string|null){
    const saved=JSON.parse(raw??'null');
    if(!saved||!wetModes.some(([id])=>id===saved.mode)||!Array.isArray(saved.values))return;
    mode.value=saved.mode;
    fields.forEach((field,i)=>{
      const value=saved.values[i];
      if(Number.isInteger(value)&&value>=Number(field.min)&&value<=Number(field.max))field.value=String(value);
    });
    reference.value=saved.reference==='merged'?'merged':'active';
    separate.checked=saved.separate===true;aligned.checked=saved.aligned!==false;selectedPatch.checked=saved.selectedPatch===true;
  }
  const snapshot=()=>JSON.stringify({mode:mode.value,reference:reference.value,values:fields.map(f=>f.valueAsNumber),
    aligned:aligned.checked,separate:separate.checked,selectedPatch:selectedPatch.checked});
  try{restorePreferences(localStorage.getItem(key));}catch{/* defaults remain usable */}
  const selected=()=>mode.value as WetMode;
  function settings():WetSettings{
    if(fields.some(field=>!field.validity.valid||!field.value))throw Error('筆の設定を範囲内で指定してください。');
    return {mode:selected(),size:size.valueAsNumber,strength:strength.valueAsNumber/100,pigment:pigment.valueAsNumber/100,
      diffusion:diffusion.valueAsNumber/100,edge:edge.valueAsNumber/100,grain:grain.valueAsNumber/100,
      paperScale:paperScale.valueAsNumber,absorb:absorb.valueAsNumber/100,thickness:thickness.valueAsNumber/100,water:water.valueAsNumber/100,color:api.color()};
  }
  function describe(){
    const context=api.current();
    if(anchor&&anchor.documentId!==context?.documentId){anchor=null;offset=null;}
    const ref=reference.value==='merged'?'表示中の全レイヤー':anchor&&needsSource(selected())?anchor.layerName:context?.layerName??'なし';
    const paintMode=selected();
    target.textContent='参照 '+ref+' ／ 描画先 '+(separate.checked||reference.value==='merged'?'新規レイヤー':context?.layerName??'なし')+
      (anchor&&needsSource(paintMode)?' ／ 採取点 '+Math.floor(anchor.point.x)+', '+Math.floor(anchor.point.y):'')+
      (paintMode==='smudge'||paintMode==='blur'?' ／ 既存の色だけ':paintMode==='mix'?' ／ 描画色を足す':'');
    aligned.parentElement!.hidden=!needsSource(selected());
    water.parentElement!.hidden=selected()!=='water';
    pigment.parentElement!.hidden=!['water','mix','oil','pastel'].includes(selected());
    sourceButton.hidden=!needsSource(selected())||transfer();
    selectedPatch.parentElement!.hidden=selected()!=='patch';
    if(transfer())target.textContent+=' ／ 選択範囲の形を採取';
    api.onContext?.();
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
    if(transfer()&&!api.hasSelection()){
      status.textContent='先に移したい形を選択してください。';
      return;
    }
    if(repair&&!anchor&&!pick&&!transfer()){
      status.textContent='「元を指定」を押して、キャンバス上で採取元を選んでください。';
      return;
    }
    const current=()=>revision===token&&api.current()?.drawing===context.drawing;
    let preview:AbortController|null=null,previewAfter=0,strokeActive=false;
    const clear=()=>{
      strokeActive=false;preview?.abort();preview=null;previewAfter=0;
      context.drawing.showFillGesturePreview(null);
    };
    const request=(points:readonly Point[],signal:AbortSignal):WetStroke|null=>{
      const first=points[0],next=api.current();
      if(!first||!next||next.documentId!==context.documentId)return null;
      const tail=points.at(-1)!;
      const origin=brush==='patch'?{x:Math.min(first.x,tail.x),y:Math.min(first.y,tail.y)}:first;
      const delta=anchor&&(offset&&aligned.checked?offset:{x:anchor.point.x-origin.x,y:anchor.point.y-origin.y});
      return {settings:settings(),source:anchor?.point??null,reference:reference.value==='merged'?'merged':'active',
        sourceLayerId:transfer()?next.layerId:anchor?.layerId??null,selectedPatch:transfer(),separate:separate.checked,
        offset:delta??{x:0,y:0},points,signal,documentId:next.documentId};
    };
    status.textContent=pick?'キャンバスで採取する位置を選んでください。':brush==='patch'?(transfer()?'貼り付ける場所までドラッグしてください。':'貼り付け先の対角線をドラッグしてください。'):'離すと一筆の結果を適用します。';
    cancelDrawing=context.drawing.setCanvasEditGesture({
      continuous:true,path:false,width:pick||brush==='patch'?2:Math.max(1,size.valueAsNumber),color:repair?'#2a8cc8':'#5c8c68',
      referencePoint:()=>repair&&!pick&&anchor?.documentId===context.documentId?anchor.point:null,
      cancel:clear,
      end:()=>{clear();if(current()){pending?.abort();pending=null;cancelDrawing=null;api.left();}},
      update:points=>{
        if(!points.length||pick||repair||pending||preview||performance.now()<previewAfter)return;
        const controller=new AbortController();
        // Only a short local segment is read from the renderer during contact.
        const tail=points.at(-1)!;
        let start=points.length-1;
        while(start>Math.max(0,points.length-64)&&Math.hypot(points[start-1]!.x-tail.x,points[start-1]!.y-tail.y)<360)start--;
        let job:WetStroke|null;
        try{job=request(points.slice(start),controller.signal);}catch{return;}
        if(!job)return;
        strokeActive=true;preview=controller;
        void api.preview(job).then(shown=>{
          if(shown&&strokeActive&&!controller.signal.aborted&&current())context.drawing.showCanvasEditTrace(false);
        }).catch(()=>{/* The position guide is available when a preview cannot be rendered. */}).finally(()=>{
          if(preview===controller){preview=null;previewAfter=performance.now()+45;}
        });
      },
      complete:points=>{
        clear();
        const first=points[0];
        const next=api.current();
        if(!first||!next||next.documentId!==context.documentId||pending)return;
        if(pick){
          anchor={point:first,documentId:next.documentId,layerId:next.layerId,layerName:next.layerName};
          offset=null;arm();return;
        }
        const controller=new AbortController();
        let job:WetStroke|null;
        try{job=request(points,controller.signal);}catch(error){status.textContent=(error as Error).message;return;}
        if(!job)return;
        pending=controller;status.textContent='画素を処理しています…';api.onContext?.();
        void api.draw(job)
          .then(changed=>{
            if(!current())return;
            if(changed&&repair&&aligned.checked)offset=job.offset;
            status.textContent=changed?'一筆を反映しました。取り消しで戻せます。':'この範囲で変わる画素がありません。';
          }).catch(error=>{
            if(current()&&!controller.signal.aborted)status.textContent=error instanceof Error?error.message:String(error);
          }).finally(()=>{if(pending===controller){pending=null;api.onContext?.();}});
      },
    });
  }
  const sourceButton=button('元を指定',()=>api.activate(()=>arm(true)),status);
  const start=button('キャンバスで使う',()=>api.activate(()=>arm()),status);
  const stop=button('筆を終了',()=>{leave();api.left();},status);
  const actions=document.createElement('div');actions.className='box-actions';actions.append(sourceButton,start,stop);
  for(const field of [mode,reference,...fields,separate,aligned,selectedPatch])field.onchange=()=>{
    if(field===mode||field===reference)offset=null;
    try{localStorage.setItem(key,snapshot());}catch{/* the current tool still works */}
    describe();
    if(cancelDrawing&&!pending)arm();
  };
  panel.append(summary,options,target,advanced,actions,status);
  host.append(panel);describe();
  return {open:()=>{panel.open=true;arm();},stop:leave,settings,refresh:describe,
    focusReference:()=>{panel.open=true;reference.focus();},
    context:()=>({tool:wetModes.find(([name])=>name===selected())?.[1]??'混色・修復',
      reference:reference.value==='merged'?'全レイヤー':anchor&&needsSource(selected())?anchor.layerName:'描画先のレイヤー',
      separate:separate.checked||reference.value==='merged',pending:!!pending}),
    exportNative():PortableSectionInput{
      return {id:sectionId,type:sectionType,required:false,bytes:new TextEncoder().encode(snapshot())};
    },
    restoreNative(sections:readonly PortableSectionInput[]){
      const section=sections.find(part=>part.id===sectionId&&part.type===sectionType);
      if(!section||section.bytes.byteLength>2048)return;
      try{restorePreferences(new TextDecoder().decode(section.bytes));offset=null;describe();}
      catch{/* a damaged optional section leaves the saved pixels and usable settings */}
    }
  };
}
