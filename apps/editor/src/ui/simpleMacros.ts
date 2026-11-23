import {appConfirm} from './appDialogs';
import {decodeMacroArtwork,encodeMacroArtwork,isMacroArtwork,type MacroArtworkStep} from './macroArtwork';
/**
 * C04 UI-004 / UI-005 bridge to C16: simple repeatable UI command sequences.
 * C16 can replace the provider with timeline and action-aware macro execution.
 * Never synthesize strokes, bypass Undo, or silently start destructive dialogs.
 */
import type {CommandService,CommandDefinition} from './commandPalette';

type SimpleMacro=Readonly<{id:string;name:string;steps:readonly string[];disabled?:readonly number[]}>;
type Stored=Readonly<{schema:'illustro.macros.simple';version:1;items:readonly SimpleMacro[]}>;
const KEY='illustro.macros.simple.v1';
const MAX_MACROS=32,MAX_STEPS=24;
const SAFE=new Set([
  'undo','redo','paint','erase','eyedropper','fitView','view100','actualPixels','resetRotation',
  'flipH','flipV','zoomIn','zoomOut','panView','selection','selectionClear',
  'layer','colorPage','brushPage','workspaceToggle','c04FocusToggle','guideEnabled',
  'layerSoloToggle','layerAlphaLock','layerClipping','layerOpacityAtRun','layerNameAtRun'
]);
const permitted=(id:string)=>SAFE.has(id)||isMacroArtwork(id)||id.startsWith('brush:')||id.startsWith('color:')||id.startsWith('workspace:');
/** Validate user-imported macros before storing or exposing any commands. */
export function parseSimpleMacroFile(input:unknown):SimpleMacro[]{
  if(!input||typeof input!=='object'||Array.isArray(input))
    throw Error('操作セットの形式が正しくありません。');
  const file=input as Record<string,unknown>;
  if(file.schema!=='illustro.macros.simple'||file.version!==1||
    !Array.isArray(file.items)||file.items.length>MAX_MACROS)
    throw Error('対応していない操作セットです。');
  const ids=new Set<string>(),names=new Set<string>(),result:SimpleMacro[]=[];
  for(const row of file.items){
    if(!row||typeof row!=='object'||Array.isArray(row))
      throw Error('操作セットの情報が正しくありません。');
    const item=row as Record<string,unknown>;
    if(typeof item.id!=='string'||!item.id||item.id.length>100||
      typeof item.name!=='string'||!item.name.trim()||item.name.length>80||
      ids.has(item.id)||names.has(item.name)||
      !Array.isArray(item.steps)||item.steps.length<1||item.steps.length>MAX_STEPS||
      !item.steps.every(step=>typeof step==='string'&&permitted(step)&&(!isMacroArtwork(step)||decodeMacroArtwork(step)!==null)))
      throw Error('操作セットに使えない操作や重複した名前が含まれています。');
    ids.add(item.id);names.add(item.name);
    const disabled=item.disabled;
    if(disabled!==undefined&&(!Array.isArray(disabled)||new Set(disabled).size!==disabled.length||
      !disabled.every(i=>Number.isInteger(i)&&i>=0&&i<(item.steps as unknown[]).length)))throw Error('無効にする手順の指定が正しくありません。');
    result.push({id:item.id,name:item.name,steps:[...item.steps] as string[],...(disabled?.length?{disabled:[...disabled] as number[]}:{})});
  }
  return result;
}
const activeSequences=new WeakSet<CommandService['invokeAsync']>();
/** Await every declared command completion and report dispatch-only steps honestly. */
export async function invokeMacroSequence(
  steps:readonly string[],
  invoke:CommandService['invokeAsync'],
  options:Readonly<{contextKey?: (()=>unknown)|undefined;signal?:AbortSignal}>={}
):Promise<Readonly<{ok:boolean;reason:string|null;failedStep:number|null;unfinished:boolean}>>{
  if(activeSequences.has(invoke))return {ok:false,reason:'ほかの操作セットが実行中です。',failedStep:null,unfinished:false};
  activeSequences.add(invoke);
  const context=options.contextKey?.();
  const stopped=()=>options.signal?.aborted?'操作セットを取り消しました。':
    options.contextKey&&options.contextKey()!==context?'作品が切り替わったため操作を停止しました。':null;
  let unfinished=false;
  try{
  for(const [i,id] of steps.entries()){
    const reason=stopped();if(reason)return {ok:false,reason,failedStep:i+1,unfinished};
    if(!permitted(id)||isMacroArtwork(id))return {ok:false,reason:'対応していない操作が含まれています。',failedStep:i+1,unfinished};
    let result:Awaited<ReturnType<CommandService['invokeAsync']>>;
    try{result=await invoke(id);}catch(error){return {ok:false,reason:error instanceof Error?error.message:String(error),failedStep:i+1,unfinished};}
    const after=stopped();if(after)return {ok:false,reason:after,failedStep:i+1,unfinished:!result.settled};
    if(!result.ok)return {ok:false,reason:result.reason??'現在は使えません。',failedStep:i+1,unfinished};
    if(!result.settled){
      unfinished=true;
      // A dispatched DOM click is not a completed asynchronous history
      // operation. Never race the next macro step against unknown work.
      if(i<steps.length-1)return {
        ok:false,reason:'処理完了を確認できないため、残りの操作を実行せず停止しました。',
        failedStep:i+1,unfinished
      };
    }
  }
  return {ok:true,reason:null,failedStep:null,unfinished};
  }finally{activeSequences.delete(invoke);}
}
const read=():SimpleMacro[]=>{
  try{
    const input=JSON.parse(localStorage.getItem(KEY)||'null') as Stored|null;
    if(input?.schema!=='illustro.macros.simple'||input.version!==1||!Array.isArray(input.items)||input.items.length>MAX_MACROS)return [];
    const ids=new Set<string>();
    return input.items.flatMap(item=>{
      if(!item||typeof item.id!=='string'||item.id.length>100||!item.id||
        ids.has(item.id)||typeof item.name!=='string'||!item.name.trim()||item.name.length>80||
        !Array.isArray(item.steps)||item.steps.length<1||item.steps.length>MAX_STEPS||
        !item.steps.every((step:unknown)=>typeof step==='string'&&permitted(step)&&(!isMacroArtwork(step)||decodeMacroArtwork(step)!==null)))return [];
      ids.add(item.id);
      const disabled=Array.isArray(item.disabled)?item.disabled.filter((i:number)=>Number.isInteger(i)&&i>=0&&i<item.steps.length):[];
      return [{id:item.id,name:item.name,steps:[...item.steps],...(disabled.length?{disabled}:{})}];
    });
  }catch{return [];}
};
const persist=(items:readonly SimpleMacro[]):boolean=>{
  try{localStorage.setItem(KEY,JSON.stringify({schema:'illustro.macros.simple',version:1,items} satisfies Stored));return true;}
  catch{return false;}
};
const uid=()=>typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'
  ?crypto.randomUUID():'macro-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);

export type SimpleMacroService=Readonly<{importText:(json:string)=>Promise<number>;recordArtwork:(make:()=>MacroArtworkStep|null)=>void}>;
const layerMacroValues={layerOpacityAtRun:'不透明度を設定',layerNameAtRun:'レイヤー名を設定'} as const;
const parameterStep=(step:string)=>Object.hasOwn(layerMacroValues,step);
export const layerMacroStep=(step:string)=>step==='layerAlphaLock'||step==='layerClipping'||parameterStep(step)||isMacroArtwork(step);
export type MacroLayer=Readonly<{id:string;name:string;active:boolean;opacity:number}>;
export type MacroLayerStep=Readonly<{id:string;value:string|number|null;artwork?:MacroArtworkStep;offset?:readonly [number,number]}>;
export function installSimpleMacros(commands:CommandService,api?:Readonly<{
  layers:()=>readonly MacroLayer[];
  applyLayer:(id:string,steps:readonly MacroLayerStep[],name:string,signal:AbortSignal)=>Promise<boolean>;
  applyHistory?:(steps:readonly ('undo'|'redo')[],name:string,signal:AbortSignal)=>Promise<boolean>;
  share:(json:string,name:string,asset:boolean)=>Promise<void>;
}>):SimpleMacroService|null{
  const workspace=document.getElementById('automationBoxBody');
  if(!workspace)return null;
  let macros=read(),playing=false,steps:string[]=[],muted:boolean[]=[],selectedId:string|null=null;
  let playback:AbortController|null=null,unlisten:(()=>void)|null=null,recordContext:unknown;
  const root=document.createElement('details');root.className='c04-simple-macros';
  const summary=document.createElement('summary');summary.textContent='よく使う操作をまとめる';
  const help=document.createElement('p');
  help.textContent='道具・色・表示操作を順番に登録できます。1回の操作で実行し、Undoなどは通常の機能を呼び出します。';
  const select=document.createElement('select');select.setAttribute('aria-label','保存した操作セット');
  const name=document.createElement('input');name.type='text';name.maxLength=80;name.placeholder='操作セットの名前';
  name.setAttribute('aria-label','操作セットの名前');
  const commandSelect=document.createElement('select');commandSelect.setAttribute('aria-label','追加する操作');
  const add=document.createElement('button');add.type='button';add.textContent='操作を追加';
  const stepsList=document.createElement('div');stepsList.className='c04-macro-steps';
  const save=document.createElement('button'),run=document.createElement('button'),reset=document.createElement('button'),remove=document.createElement('button');
  save.type=run.type=reset.type=remove.type='button';
  save.textContent='保存';run.textContent='実行';reset.textContent='新しく作る';remove.textContent='削除';
  const status=document.createElement('output');status.setAttribute('role','status');
  const actions=document.createElement('div');actions.className='c04-workspace-actions';
  const record=document.createElement('button');record.type='button';record.textContent='操作の記録を開始';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='実行を中止';cancel.disabled=true;
  cancel.onclick=()=>playback?.abort();
  window.addEventListener('keydown',event=>{if(event.key==='Escape')playback?.abort();});
  const share=document.createElement('button'),asset=document.createElement('button');
  share.type=asset.type='button';share.textContent='操作セットを書き出す';asset.textContent='素材に登録';
  share.hidden=asset.hidden=!api;
  actions.append(record,add,save,run,cancel,reset,remove,share,asset);
  root.append(summary,help,select,name,commandSelect,stepsList,actions,status);
  workspace.append(root);

  const options=()=>[
    ...commands.list().filter(command=>permitted(command.id)&&!command.id.startsWith('macro:')),
    ...Object.entries(layerMacroValues).map(([id,label])=>({id,label,category:'実行時に入力'})),
  ];
  const refreshOptions=()=>{
    const old=commandSelect.value;
    commandSelect.replaceChildren(...options().map(c=>new Option(c.label+' · '+c.category,c.id)));
    if(options().some(c=>c.id===old))commandSelect.value=old;
  };
  commandSelect.onfocus=refreshOptions;
  function refreshSelect(){
    const current=selectedId;
    select.replaceChildren(new Option('新しい操作セット',''));
    for(const macro of macros)select.add(new Option(macro.name,macro.id));
    select.value=current&&macros.some(m=>m.id===current)?current:'';
    remove.disabled=!select.value;
  }
  const recordedLabel=(step:string)=>step.startsWith('artwork:{"kind":"stroke"')?'記録したブラシの線':'記録した移動・回転・拡縮';
  function refreshSteps(){
    const lookup=new Map(options().map(c=>[c.id,c.label]));
    stepsList.replaceChildren();
    for(let i=0;i<steps.length;i++){
      const id=steps[i]!;
      const row=document.createElement('div');row.className='c04-macro-step';
      const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=!muted[i];
      const label=document.createElement('label');label.append(enabled,(i+1)+'. '+(lookup.get(id)??(isMacroArtwork(id)?recordedLabel(id):id)));
      enabled.onchange=()=>{muted[i]=!enabled.checked;};
      const up=document.createElement('button');up.type='button';up.textContent='↑';up.title='前へ移動';up.disabled=i===0;
      const down=document.createElement('button');down.type='button';down.textContent='↓';down.title='後へ移動';down.disabled=i===steps.length-1;
      const del=document.createElement('button');del.type='button';del.textContent='×';del.title='この操作を削除';
      up.onclick=()=>{[steps[i-1],steps[i]]=[steps[i]!,steps[i-1]!];[muted[i-1],muted[i]]=[muted[i]!,muted[i-1]!];refreshSteps();};
      down.onclick=()=>{[steps[i+1],steps[i]]=[steps[i]!,steps[i+1]!];[muted[i+1],muted[i]]=[muted[i]!,muted[i+1]!];refreshSteps();};
      del.onclick=()=>{steps.splice(i,1);muted.splice(i,1);refreshSteps();};
      row.append(label,up,down,del);stepsList.append(row);
    }
    if(!steps.length){const empty=document.createElement('p');empty.textContent='下の候補から操作を登録してください。';stepsList.append(empty);}
    run.disabled=steps.length===0||playing||!!unlisten;
  }
  function stopRecording(message?:string){
    if(!unlisten)return;
    unlisten();unlisten=null;record.textContent='操作の記録を開始';refreshSteps();
    status.textContent=message??'記録を停止しました。操作順を確認し、名前を付けて保存できます。';
  }
  record.onclick=()=>{
    if(unlisten){stopRecording();return;}
    if(playing||steps.length>=MAX_STEPS||!commands.onCompleted)return;
    const context=commands.contextKey?.();recordContext=context;
    unlisten=commands.onCompleted(id=>{
      if(commands.contextKey?.()!==context){stopRecording('作品が切り替わったため記録を停止しました。');return;}
      if(!permitted(id))return;
      steps.push(id);muted.push(false);refreshSteps();
      status.textContent='記録中 · '+steps.length+'件';
      if(steps.length===MAX_STEPS)stopRecording('24件に達したため記録を停止しました。');
    });
    record.textContent='操作の記録を停止';refreshSteps();
    status.textContent='記録中。通常のブラシとレイヤー全体の移動・回転・拡縮を記録できます。選択範囲つきの線・変形と特殊な筆は対象外です。';
  };
  function newMacro(){
    stopRecording();selectedId=null;name.value='';steps=[];muted=[];refreshSelect();refreshSteps();
    status.textContent='新しい操作セットを作れます。';
  }
  function load(id:string){
    stopRecording();const macro=macros.find(m=>m.id===id);
    if(!macro){newMacro();return;}
    selectedId=macro.id;name.value=macro.name;steps=[...macro.steps];muted=steps.map((_,i)=>!!macro.disabled?.includes(i));
    refreshSelect();refreshSteps();
  }
  select.onchange=()=>load(select.value);
  reset.onclick=newMacro;
  add.onclick=()=>{
    const id=commandSelect.value;
    if(!id||!permitted(id))return;
    if(steps.length>=MAX_STEPS){status.textContent='登録できる操作は24件までです。';return;}
    steps.push(id);muted.push(false);refreshSteps();status.textContent='操作を追加しました。';
  };
  save.onclick=()=>{
    stopRecording();const title=name.value.trim();
    if(!title){status.textContent='名前を入力してください。';return;}
    if(!steps.length){status.textContent='操作を1つ以上追加してください。';return;}
    if(steps.some(id=>!permitted(id))){status.textContent='実行できない種類の操作が含まれています。';return;}
    if(!selectedId&&macros.length>=MAX_MACROS){status.textContent='保存できる操作セットは32件までです。';return;}
    const duplicate=macros.find(x=>x.name===title&&x.id!==selectedId);
    if(duplicate){status.textContent='別の操作セットと同じ名前は使えません。';return;}
    const id=selectedId??uid(),item=currentDraft(id,title);
    const next=macros.filter(m=>m.id!==id).concat(item);
    if(!persist(next)){status.textContent='端末に保存できませんでした。';return;}
    macros=next;selectedId=id;
    refreshSelect();refreshSteps();commands.refresh();
    status.textContent='操作セットを保存しました。機能検索やQuickにも表示されます。';
  };
  remove.onclick=async()=>{
    if(!selectedId)return;
    if(!await appConfirm('「'+name.value+'」を削除しますか？'))return;
    const next=macros.filter(m=>m.id!==selectedId);
    if(!persist(next)){status.textContent='端末に保存できませんでした。';return;}
    macros=next;newMacro();commands.refresh();status.textContent='操作セットを削除しました。';
  };
  function currentDraft(id:string,title:string):SimpleMacro{
    const disabled=steps.flatMap((_,index)=>muted[index]?[index]:[]);
    return {id,name:title,steps:[...steps],...(disabled.length?{disabled}:{})};
  }
  for(const [control,asAsset] of [[share,false],[asset,true]] as const)control.onclick=async()=>{
    if(!api)return;
    const title=name.value.trim();
    if(!title||!steps.length){status.textContent='名前と1つ以上の手順を入力してください。';return;}
    const item=currentDraft(selectedId??uid(),title);
    const json=JSON.stringify({schema:'illustro.macros.simple',version:1,items:[item]} satisfies Stored);
    try{await api.share(json,title,asAsset);status.textContent=asAsset?'素材に登録しました。':'操作セットを書き出しました。';}
    catch(error){status.textContent=error instanceof Error?error.message:String(error);}
  };
  function confirmSteps(macro:SimpleMacro,enabled:readonly string[],layers:readonly MacroLayer[]){
    return new Promise<Readonly<{id:string;steps:MacroLayerStep[]}>|null>(resolve=>{
      const dialog=document.createElement('dialog');dialog.className='export-dialog';dialog.setAttribute('aria-label','操作セットを確認');
      const section=document.createElement('form'),title=document.createElement('h2');
      title.textContent=macro.name;section.className='c06-clipboard-grid';
      const list=document.createElement('ol'),target=document.createElement('select');
      const lookup=new Map(options().map(command=>[command.id,command.label]));
      const fields:Array<HTMLInputElement|null>=[];
      const artworkFields:Array<{step:MacroArtworkStep;dx:HTMLInputElement;dy:HTMLInputElement}|null>=[];
      for(const id of enabled){
        const row=document.createElement('li'),artwork=decodeMacroArtwork(id),label=lookup.get(id)??(artwork?recordedLabel(id):id);
        let field:HTMLInputElement|null=null;
        let coordinates:{step:MacroArtworkStep;dx:HTMLInputElement;dy:HTMLInputElement}|null=null;
        if(artwork){
          row.textContent=label;
          const xy=(name:string,value:number)=>{
            const input=document.createElement('input'),wrapper=document.createElement('label');
            input.type='number';input.min='-8192';input.max='8192';input.step='any';input.required=true;
            input.value=String(value);wrapper.append(name,input);row.append(wrapper);return input;
          };
          coordinates={step:artwork,dx:xy('横のずれ（px）',artwork.kind==='affine'?artwork.affine.dx:0),
            dy:xy('縦のずれ（px）',artwork.kind==='affine'?artwork.affine.dy:0)};
        }else if(parameterStep(id)){
          const wrapper=document.createElement('label');
          field=document.createElement('input');field.required=true;
          if(id==='layerOpacityAtRun'){field.type='number';field.min='0';field.max='100';field.step='.1';}
          else{field.type='text';field.maxLength=4096;}
          wrapper.append(label+(id==='layerOpacityAtRun'?'（%）':''),field);row.append(wrapper);
        }else row.textContent=label;
        fields.push(field);artworkFields.push(coordinates);list.append(row);
      }
      section.append(title);
      if(layers.length){
        for(const layer of layers)target.add(new Option(layer.name+(layer.active?'（選択中）':''),layer.id));
        target.value=layers.find(layer=>layer.active)?.id??layers[0]!.id;
        const label=document.createElement('label');label.append('対象レイヤー',target);section.append(label);
        const resetFields=()=>{
          const layer=layers.find(layer=>layer.id===target.value);
          if(!layer)return;
          for(const field of fields)if(field){
            field.setCustomValidity('');
            field.value=field.type==='number'?String(Math.round(layer.opacity*1000)/10):layer.name;
          }
        };
        target.onchange=resetFields;resetFields();
      }else{
        const note=document.createElement('p');
        note.textContent='表示や履歴を含む手順は順番に実行します。途中で停止すると、実行済みの操作は残ります。';
        section.append(note);
      }
      section.append(list);
      const accept=document.createElement('button'),decline=document.createElement('button');
      accept.type='submit';decline.type='button';accept.textContent='この内容で実行';decline.textContent='取り消す';
      let confirmed:Readonly<{id:string;steps:MacroLayerStep[]}>|null=null;
      section.onsubmit=event=>{
        event.preventDefault();
        for(const field of fields)if(field?.type==='text'&&!field.value.trim()){
          field.setCustomValidity('レイヤー名を入力してください。');field.reportValidity();
          field.oninput=()=>field.setCustomValidity('');return;
        }
        confirmed={id:target.value,steps:enabled.map((id,index)=>{
          const field=fields[index],artwork=artworkFields[index];
          return {id,value:field?(field.type==='number'?field.valueAsNumber:field.value.trim()):null,
            ...(artwork?{artwork:artwork.step,offset:[artwork.dx.valueAsNumber,artwork.dy.valueAsNumber] as const}:{})};
        })};
        dialog.close();
      };
      decline.onclick=()=>dialog.close();
      section.append(accept,decline);dialog.append(section);
      dialog.addEventListener('keydown',event=>event.stopPropagation());
      dialog.onclose=()=>{dialog.remove();resolve(confirmed);};
      document.body.append(dialog);dialog.showModal();decline.focus();
    });
  }
  async function play(macro:SimpleMacro):Promise<void>{
    if(unlisten){status.textContent='記録を停止してから実行してください。';return;}
    if(playing){status.textContent='ほかの操作セットが実行中です。';return;}
    playing=true;run.disabled=true;cancel.disabled=false;playback=new AbortController();
    try{
      const enabled=macro.steps.filter((_,index)=>!macro.disabled?.includes(index));
      if(!enabled.length)throw Error('少なくとも1つの手順を有効にしてください。');
      const dependencies=new Set(commands.list().map(command=>command.id));
      const missing=enabled.filter(id=>!layerMacroStep(id)&&!dependencies.has(id));
      if(missing.length)throw Error('この端末で使えない手順があります。'+missing.join('、'));
      const context=commands.contextKey?.();
      if(api?.applyHistory&&enabled.every(step=>step==='undo'||step==='redo')){
        const changed=await api.applyHistory(enabled as ('undo'|'redo')[],macro.name,playback.signal);
        status.textContent=changed?'履歴の候補をまとめて適用しました。一度の取り消しで戻せます。':'作品は変わりませんでした。';
        return;
      }
      const atomic=!!api&&enabled.every(layerMacroStep);
      if(!atomic&&enabled.some(step=>parameterStep(step)||isMacroArtwork(step)))throw Error('実行時の指定・描画・変形を使うときは、表示・履歴の手順をこのセットから外してください。');
      const layers=atomic?api.layers():[];
      if(atomic&&!layers.length)throw Error('操作できるレイヤーがありません。');
      const target=await confirmSteps(macro,enabled,layers);
      if(target===null||playback.signal.aborted){status.textContent='実行を取り消しました。';return;}
      if(context!==commands.contextKey?.())throw Error('対象の作品が切り替わりました。');
      if(atomic){
        const changed=await api.applyLayer(target.id,target.steps,macro.name,playback.signal);
        status.textContent=changed?'指定したレイヤーに適用しました。一度の取り消しで戻せます。':'指定した操作で変わる設定はありません。';
        return;
      }
      const result=await invokeMacroSequence(enabled,commands.invokeAsync,{contextKey:commands.contextKey,signal:playback.signal});
      if(!result.ok){
        status.textContent=result.failedStep+'番目の操作で停止しました。'+result.reason;
        throw Error(status.textContent);
      }
      status.textContent=result.unfinished
        ?'「'+macro.name+'」の操作を送りました。履歴や描画の完了はまだ確認できていません。'
        :'「'+macro.name+'」の操作を実行しました。';
    }catch(error){
      status.textContent=error instanceof Error?error.message:'操作セットの実行に失敗しました。';
      throw error;
    }finally{playing=false;playback=null;cancel.disabled=true;refreshSteps();}
  }
  run.onclick=()=>{
    if(steps.length)void play(currentDraft(selectedId??'preview',name.value.trim()||'仮の操作セット')).catch(()=>{});
  };
  const provider=():readonly CommandDefinition[]=>macros.map(macro=>({
    id:'macro:'+macro.id,label:macro.name,category:'マクロ',
    aliases:'登録した操作 複数の操作 まとめて実行',
    availability:()=>playing?'別の操作セットを実行中です。':null,
    execute:()=>play(macro)
  }));
  commands.registerProvider(provider);
  async function importText(json:string):Promise<number>{
    if(json.length>1048576)throw Error('操作セットが大きすぎます。');
    const imported=parseSimpleMacroFile(JSON.parse(json));
    const nameSet=new Set(imported.map(item=>item.name));
    if(imported.some(item=>macros.some(existing=>existing.name===item.name))&&
      !await appConfirm('同名の操作セットを置き換えますか？'))
      return 0;
    const remaining=macros.filter(existing=>!nameSet.has(existing.name));
    if(remaining.length+imported.length>MAX_MACROS)
      throw Error('保存できる操作セットは32件までです。');
    const occupied=new Set(remaining.map(item=>item.id));
    const safe=imported.map(item=>{
      let id=item.id;
      while(occupied.has(id))id=uid();
      occupied.add(id);
      return {...item,id};
    });
    const next=[...remaining,...safe];
    if(!persist(next))throw Error('操作セットを端末へ保存できませんでした。');
    macros=next;
    load(safe[0]?.id??'');
    refreshSelect();refreshSteps();commands.refresh();
    status.textContent=safe.length+'件の操作セットを読み込みました。';
    return safe.length;
  }
  refreshSelect();refreshOptions();refreshSteps();
  return {importText,recordArtwork:make=>{
    if(!unlisten||playing)return;
    if(recordContext!==commands.contextKey?.()){stopRecording('作品が切り替わったため記録を停止しました。');return;}
    const step=make(),encoded=step?encodeMacroArtwork(step):null;
    if(!encoded){status.textContent='この描画・変形は記録の対象外か、手順の容量上限を超えています。';return;}
    steps.push(encoded);muted.push(false);refreshSteps();status.textContent='記録中 · '+steps.length+'件';
    if(steps.length>=MAX_STEPS)stopRecording('24件に達したため記録を停止しました。');
  }};
}
