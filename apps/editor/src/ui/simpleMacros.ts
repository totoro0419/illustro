import {appConfirm,appPrompt} from './appDialogs';
/**
 * C04 UI-004 / UI-005 bridge to C16: simple repeatable UI command sequences.
 * C16 can replace the provider with timeline and action-aware macro execution.
 * Never synthesize strokes, bypass Undo, or silently start destructive dialogs.
 */
import type {CommandService,CommandDefinition} from './commandPalette';

type SimpleMacro=Readonly<{id:string;name:string;steps:readonly string[]}>;
type Stored=Readonly<{schema:'illustro.macros.simple';version:1;items:readonly SimpleMacro[]}>;
const KEY='illustro.macros.simple.v1';
const MAX_MACROS=32,MAX_STEPS=24;
const SAFE=new Set([
  'undo','redo','paint','erase','eyedropper','fitView','view100','actualPixels','resetRotation',
  'flipH','flipV','zoomIn','zoomOut','panView','selection','selectionClear',
  'layer','colorPage','brushPage','workspaceToggle','c04FocusToggle','guideEnabled',
  'layerSoloToggle','layerAlphaLock','layerClipping'
]);
const permitted=(id:string)=>SAFE.has(id)||id.startsWith('brush:')||id.startsWith('color:')||id.startsWith('workspace:');
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
      !item.steps.every(step=>typeof step==='string'&&permitted(step)))
      throw Error('操作セットに使えない操作や重複した名前が含まれています。');
    ids.add(item.id);names.add(item.name);
    result.push({id:item.id,name:item.name,steps:[...item.steps] as string[]});
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
    if(!permitted(id))return {ok:false,reason:'対応していない操作が含まれています。',failedStep:i+1,unfinished};
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
        !item.steps.every((step:unknown)=>typeof step==='string'&&permitted(step)))return [];
      ids.add(item.id);
      return [{id:item.id,name:item.name,steps:[...item.steps]}];
    });
  }catch{return [];}
};
const persist=(items:readonly SimpleMacro[]):boolean=>{
  try{localStorage.setItem(KEY,JSON.stringify({schema:'illustro.macros.simple',version:1,items} satisfies Stored));return true;}
  catch{return false;}
};
const uid=()=>typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'
  ?crypto.randomUUID():'macro-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);

export type SimpleMacroService=Readonly<{importText:(json:string)=>Promise<number>}>;
export function installSimpleMacros(commands:CommandService):SimpleMacroService|null{
  const workspace=document.getElementById('workspaceBoxBody');
  if(!workspace)return null;
  let macros=read(),playing=false,steps:string[]=[],selectedId:string|null=null;
  let playback:AbortController|null=null,unlisten:(()=>void)|null=null;
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
  actions.append(record,add,save,run,cancel,reset,remove);
  root.append(summary,help,select,name,commandSelect,stepsList,actions,status);
  workspace.append(root);

  const options=()=>commands.list().filter(command=>permitted(command.id)&&!command.id.startsWith('macro:'));
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
  function refreshSteps(){
    const lookup=new Map(commands.list().map(c=>[c.id,c.label]));
    stepsList.replaceChildren();
    for(let i=0;i<steps.length;i++){
      const id=steps[i]!;
      const row=document.createElement('div');row.className='c04-macro-step';
      const label=document.createElement('span');label.textContent=(i+1)+'. '+(lookup.get(id)??id);
      const up=document.createElement('button');up.type='button';up.textContent='↑';up.title='前へ移動';up.disabled=i===0;
      const down=document.createElement('button');down.type='button';down.textContent='↓';down.title='後へ移動';down.disabled=i===steps.length-1;
      const del=document.createElement('button');del.type='button';del.textContent='×';del.title='この操作を削除';
      up.onclick=()=>{[steps[i-1],steps[i]]=[steps[i]!,steps[i-1]!];refreshSteps();};
      down.onclick=()=>{[steps[i+1],steps[i]]=[steps[i]!,steps[i+1]!];refreshSteps();};
      del.onclick=()=>{steps.splice(i,1);refreshSteps();};
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
    const context=commands.contextKey?.();
    unlisten=commands.onCompleted(id=>{
      if(commands.contextKey?.()!==context){stopRecording('作品が切り替わったため記録を停止しました。');return;}
      if(!permitted(id))return;
      steps.push(id);refreshSteps();
      status.textContent='記録中 · '+steps.length+'件';
      if(steps.length===MAX_STEPS)stopRecording('24件に達したため記録を停止しました。');
    });
    record.textContent='操作の記録を停止';refreshSteps();
    status.textContent='記録中。「機能を探す」やよく使う操作から、記録に対応した操作を実行してください。';
  };
  function newMacro(){
    stopRecording();selectedId=null;name.value='';steps=[];refreshSelect();refreshSteps();
    status.textContent='新しい操作セットを作れます。';
  }
  function load(id:string){
    stopRecording();const macro=macros.find(m=>m.id===id);
    if(!macro){newMacro();return;}
    selectedId=macro.id;name.value=macro.name;steps=[...macro.steps];
    refreshSelect();refreshSteps();
  }
  select.onchange=()=>load(select.value);
  reset.onclick=newMacro;
  add.onclick=()=>{
    const id=commandSelect.value;
    if(!id||!permitted(id))return;
    if(steps.length>=MAX_STEPS){status.textContent='登録できる操作は24件までです。';return;}
    steps.push(id);refreshSteps();status.textContent='操作を追加しました。';
  };
  save.onclick=()=>{
    stopRecording();const title=name.value.trim();
    if(!title){status.textContent='名前を入力してください。';return;}
    if(!steps.length){status.textContent='操作を1つ以上追加してください。';return;}
    if(steps.some(id=>!permitted(id))){status.textContent='実行できない種類の操作が含まれています。';return;}
    if(!selectedId&&macros.length>=MAX_MACROS){status.textContent='保存できる操作セットは32件までです。';return;}
    const duplicate=macros.find(x=>x.name===title&&x.id!==selectedId);
    if(duplicate){status.textContent='別の操作セットと同じ名前は使えません。';return;}
    const id=selectedId??uid(),item:SimpleMacro={id,name:title,steps:[...steps]};
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
  async function play(macro:SimpleMacro):Promise<void>{
    if(unlisten){status.textContent='記録を停止してから実行してください。';return;}
    if(playing){status.textContent='ほかの操作セットが実行中です。';return;}
    playing=true;run.disabled=true;cancel.disabled=false;playback=new AbortController();
    try{
      const result=await invokeMacroSequence([...macro.steps],commands.invokeAsync,{contextKey:commands.contextKey,signal:playback.signal});
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
    if(steps.length)void play({id:selectedId??'preview',name:name.value.trim()||'仮の操作セット',steps}).catch(()=>{});
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
  return {importText};
}
