import {toolConfirmation} from '../ui/toolConfirmation';
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
  settings:WetSettings;source:Point|null;reference:'active'|'merged'|'layer';separate:boolean;
  offset:Point;points:readonly Point[];selectedPatch?:boolean;signal:AbortSignal;documentId:string;sourceLayerId:string|null;targetLayerId:string;targetRevision:string;selectionKey:unknown;
}>;

export function installWetTools(host:HTMLElement,api:{
  current:()=>{drawing:BrushSurface;documentId:string;layerId:string;layerName:string;revisionId:string;selectionKey:unknown}|null;
  sources:()=>readonly {id:string;name:string}[];
  activate:(start:()=>void)=>void;hasSelection:()=>boolean;color:()=>readonly number[];draw:(stroke:WetStroke)=>Promise<boolean>;preview:(stroke:WetStroke)=>Promise<boolean>;left:()=>void;onContext?:()=>void;
}){
  const panel=document.createElement('details');
  panel.className='c06-clipboard-panel';panel.dataset.toolPanel='smudge';
  const summary=document.createElement('summary');summary.textContent='混色・水彩・修復';
  const options=document.createElement('div');options.className='c06-clipboard-grid';
  const mode=selectField(options,'筆の作用',wetModes);
  const reference=selectField(options,'参照元',[['active','描画先のレイヤー'],['merged','見えている絵の全体'],['layer','指定したレイヤー']]);
  const sourceLayer=selectField(options,'採取するレイヤー',[]);
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
  const waterInput=numberField(fine,'筆圧による水量の変化（%）',0,-100,100);
  const pigmentInput=numberField(fine,'筆圧による顔料量の変化（%）',0,-100,100);
  const waterSpeed=numberField(fine,'速さによる水量の変化（%）',0,-100,100);
  const pigmentSpeed=numberField(fine,'速さによる顔料量の変化（%）',0,-100,100);
  const dynamicsHint=document.createElement('small');
  dynamicsHint.textContent='0で固定。正の値は強く・速く描くほど増え、負の値は減ります。';
  fine.append(dynamicsHint);
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
  let draft:{job:WetStroke;drawing:BrushSurface;token:number}|null=null;
  const fields=[size,strength,pigment,diffusion,edge,grain,paperScale,absorb,thickness,water,waterInput,pigmentInput,waterSpeed,pigmentSpeed];
  const key='illustro.round2.wet.v1';
  function restorePreferences(raw:string|null){
    const saved=JSON.parse(raw??'null');
    if(!saved||!wetModes.some(([id])=>id===saved.mode)||!Array.isArray(saved.values))return;
    mode.value=saved.mode;
    fields.forEach((field,i)=>{
      const value=saved.values[i];
      if(Number.isInteger(value)&&value>=Number(field.min)&&value<=Number(field.max))field.value=String(value);
    });
    reference.value=saved.reference==='merged'?'merged':saved.reference==='layer'?'layer':'active';
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
      paperScale:paperScale.valueAsNumber,absorb:absorb.valueAsNumber/100,thickness:thickness.valueAsNumber/100,water:water.valueAsNumber/100,waterInput:waterInput.valueAsNumber/100,waterSpeed:waterSpeed.valueAsNumber/100,
      pigmentInput:pigmentInput.valueAsNumber/100,pigmentSpeed:pigmentSpeed.valueAsNumber/100,color:api.color()};
  }
  function describe(){
    const context=api.current();
    if(anchor&&anchor.documentId!==context?.documentId){anchor=null;offset=null;}
    const sourceId=sourceLayer.value,sources=api.sources();
    if(anchor&&reference.value!=='merged'&&!sources.some(item=>item.id===anchor?.layerId)){anchor=null;offset=null;}
    sourceLayer.replaceChildren(new Option('選択してください',''),...sources.map(item=>new Option(item.name,item.id)));
    sourceLayer.value=sourceId&&[...sourceLayer.options].some(o=>o.value===sourceId)?sourceId:'';
    sourceLayer.parentElement!.hidden=reference.value!=='layer'||!needsSource(selected());
    const ref=reference.value==='merged'?'表示中の全レイヤー':reference.value==='layer'?sourceLayer.selectedOptions[0]?.textContent??'なし':anchor?.layerName??context?.layerName??'なし';
    const paintMode=selected(),repair=needsSource(paintMode);
    advanced.hidden=repair;
    if(repair&&edge.parentElement!.parentElement!==options)options.append(edge.parentElement!);
    else if(!repair&&edge.parentElement!.parentElement!==fine)fine.prepend(edge.parentElement!);
    edge.parentElement!.hidden=false;
    if(edge.parentElement!.firstChild?.nodeType===Node.TEXT_NODE)edge.parentElement!.firstChild.textContent=repair?'境界の硬さ（%）':'水彩のふち（%）';
    target.textContent='参照 '+ref+' ／ 描画先 '+(separate.checked||reference.value==='merged'?'新規レイヤー':context?.layerName??'なし')+
      (anchor&&needsSource(paintMode)?' ／ 採取点 '+Math.floor(anchor.point.x)+', '+Math.floor(anchor.point.y):'')+
      (paintMode==='smudge'||paintMode==='blur'?' ／ 既存の色だけ':paintMode==='mix'?' ／ 描画色を足す':'');
    aligned.parentElement!.hidden=!needsSource(selected());
    for(const control of [water,waterInput,waterSpeed])control.parentElement!.hidden=selected()!=='water';
    for(const control of [pigmentInput,pigmentSpeed])control.parentElement!.hidden=!['water','mix','oil','pastel'].includes(selected());
    pigment.parentElement!.hidden=!['water','mix','oil','pastel'].includes(selected());
    patchApply.hidden=patchCancel.hidden=selected()!=='patch';
    sourceButton.hidden=!needsSource(selected())||transfer();
    selectedPatch.parentElement!.hidden=selected()!=='patch';
    if(transfer())target.textContent+=' ／ 選択範囲の形を採取';
    api.onContext?.();
  }
  function leave(){
    revision++;pending?.abort();pending=null;draft=null;patchApply.disabled=patchCancel.disabled=true;
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
    if(repair&&reference.value==='layer'&&!sourceLayer.value){status.textContent='採取するレイヤーを選んでください。';return;}
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
      return {settings:settings(),source:anchor?.point??null,reference:reference.value==='merged'?'merged':reference.value==='layer'?'layer':'active',
        sourceLayerId:repair&&!transfer()?anchor?.layerId??null:reference.value==='layer'?sourceLayer.value||null:next.layerId,selectedPatch:transfer(),separate:separate.checked,
        offset:delta??{x:0,y:0},points,signal,documentId:next.documentId,targetLayerId:next.layerId,targetRevision:next.revisionId,selectionKey:next.selectionKey};
    };
    status.textContent=pick?'キャンバスで採取する位置を選んでください。':brush==='patch'?(transfer()?'貼り付ける場所までドラッグしてください。':'貼り付け先の対角線をドラッグしてください。'):'離すと一筆の結果を適用します。';
    cancelDrawing=context.drawing.setCanvasEditGesture({
      continuous:true,path:false,width:pick||brush==='patch'?2:Math.max(1,size.valueAsNumber),color:repair?'#2a8cc8':'#5c8c68',
      referencePoint:()=>repair&&!pick&&anchor?.documentId===context.documentId?anchor.point:null,
      cancel:clear,
      end:()=>{clear();if(current()){pending?.abort();pending=null;draft=null;patchApply.disabled=patchCancel.disabled=true;cancelDrawing=null;api.left();}},
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
          const picked=reference.value==='layer'?api.sources().find(item=>item.id===sourceLayer.value):{id:next.layerId,name:next.layerName};
          if(!picked){status.textContent='採取元のレイヤーを選び直してください。';return;}
          anchor={point:first,documentId:next.documentId,layerId:picked.id,layerName:picked.name};
          offset=null;arm();return;
        }
        const controller=new AbortController();
        let job:WetStroke|null;
        try{job=request(points,controller.signal);}catch(error){status.textContent=(error as Error).message;return;}
        if(!job)return;
        pending=controller;api.onContext?.();
        if(brush==='patch'){
          status.textContent='パッチのプレビューを作っています…';
          void api.preview(job).then(shown=>{
            if(!current()||controller.signal.aborted)return;
            if(!shown){pending=null;status.textContent='プレビューを作れませんでした。範囲を小さくして試してください。';api.onContext?.();return;}
            draft={job:job!,drawing:context.drawing,token};
            patchApply.disabled=patchCancel.disabled=false;
            status.textContent='貼り付ける位置を確認し、確定または取消を選んでください。';
          }).catch(error=>{
            if(current()&&!controller.signal.aborted){pending=null;status.textContent=error instanceof Error?error.message:String(error);api.onContext?.();}
          });
          return;
        }
        status.textContent='画素を処理しています…';
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
  const patchApply=toolConfirmation(button('パッチを確定',async()=>{
    const next=draft;if(!next)return;draft=null;patchApply.disabled=patchCancel.disabled=true;
    next.drawing.showFillGesturePreview(null);
    try{
      const changed=await api.draw(next.job);
      if(revision!==next.token)return;
      if(changed&&aligned.checked)offset=next.job.offset;
      status.textContent=changed?'パッチを反映しました。取り消しで戻せます。':'変わる画素がありません。';
    }catch(error){if(revision===next.token)status.textContent=error instanceof Error?error.message:String(error);}
    finally{if(revision===next.token){pending=null;api.onContext?.();}}
  },status),'apply',1);
  const patchCancel=toolConfirmation(button('パッチを取消',()=>{
    const next=draft;if(!next)return;
    draft=null;pending?.abort();pending=null;next.drawing.showFillGesturePreview(null);
    patchApply.disabled=patchCancel.disabled=true;status.textContent='パッチを取り消しました。';api.onContext?.();
  },status),'cancel',1);
  patchApply.disabled=patchCancel.disabled=true;
  const actions=document.createElement('div');actions.className='box-actions';actions.append(sourceButton,start,patchApply,patchCancel,toolConfirmation(stop,'cancel'));
  for(const field of [mode,reference,sourceLayer,...fields,separate,aligned,selectedPatch])field.onchange=()=>{
    if(draft)patchCancel.click();
    if(field===mode||field===reference||field===sourceLayer){offset=null;anchor=null;}
    try{localStorage.setItem(key,snapshot());}catch{/* the current tool still works */}
    describe();
    if(cancelDrawing&&!pending)arm();
  };
  panel.append(summary,options,target,advanced,actions,status);
  host.append(panel);describe();
  return {open:()=>{panel.open=true;arm();},openRepair:(kind:'clone'|'heal'|'patch')=>{
      leave();if(selected()!==kind)anchor=null;mode.value=kind;offset=null;panel.open=true;
      try{localStorage.setItem(key,snapshot());}catch{/* settings remain usable */}
      describe();arm();
    },stop:leave,settings,refresh:describe,
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
