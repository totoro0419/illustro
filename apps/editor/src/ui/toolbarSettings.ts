import {DEFAULT_TOOL_ORDER} from './shell';

/** UI-006: customizable tool rail; critical drawing actions remain reachable. */
export type ToolLayout=Readonly<{order:readonly string[];hidden:readonly string[]}>;
export type ToolbarSettingsService=Readonly<{snapshot:()=>ToolLayout;restore:(layout:ToolLayout)=>void;reset:()=>void}>;
const KEY='illustro.c04.toolbar-layout.v1';
const DEFAULT_HIDDEN:string[]=[];
const LEGACY_ORDER=DEFAULT_TOOL_ORDER.filter(id=>id!=='shapes'&&id!=='rulers');
const LEGACY_HIDDEN=['smudge','transform','move'];
const MUST_SHOW=new Set(['paint','erase']);
const rail=()=>document.querySelector<HTMLElement>('.rail');
const buttons=()=>[...document.querySelectorAll<HTMLButtonElement>('.rail>.tool-button[id]')];
const defaultLayout=():ToolLayout=>({order:DEFAULT_TOOL_ORDER,hidden:DEFAULT_HIDDEN});
const normalize=(data:unknown):ToolLayout=>{
  if(!data||typeof data!=='object'||Array.isArray(data))return defaultLayout();
  const obj=data as Record<string,unknown>;
  const order=Array.isArray(obj.order)?obj.order.filter((id):id is string=>typeof id==='string'&&id.length<90):[];
  const hidden=Array.isArray(obj.hidden)?obj.hidden.filter((id):id is string=>typeof id==='string'&&id.length<90&&!MUST_SHOW.has(id)):[];
  return {order:[...new Set([...order,...DEFAULT_TOOL_ORDER])],hidden:[...new Set(hidden)]};
};
const read=()=>{
  try{
    const saved=JSON.parse(localStorage.getItem(KEY)||'null');
    // The old shell automatically persisted its factory layout on first run.
    if(Array.isArray(saved?.order)&&saved.order.join(',')===LEGACY_ORDER.join(',')&&Array.isArray(saved.hidden)&&
      (saved.version===1&&saved.hidden.length===0||saved.hidden.join(',')===LEGACY_HIDDEN.join(',')))return defaultLayout();
    return normalize(saved);
  }catch{return defaultLayout();}
};
const save=(data:ToolLayout)=>{try{localStorage.setItem(KEY,JSON.stringify({version:2,...data}));}catch{/* no storage */}};
export function installToolbarSettings():ToolbarSettingsService{
  const root=rail(),workspace=document.getElementById('workspaceBoxBody');
  if(!root||!workspace)return {snapshot:defaultLayout,restore:()=>{},reset:()=>{}};
  const editor=document.createElement('details');editor.className='c04-toolbar-settings';
  const heading=document.createElement('summary');heading.textContent='左のツール欄を編集';
  const help=document.createElement('p');help.textContent='表示する道具と順番を変更できます。ブラシと消しゴムは必ず残ります。';
  const entries=document.createElement('div');entries.className='c04-toolbar-list';
  const reset=document.createElement('button');reset.type='button';reset.textContent='初期の並びに戻す';
  const status=document.createElement('output');status.setAttribute('role','status');
  editor.append(heading,help,entries,reset,status);workspace.append(editor);
  let state=read();
  const available=()=>new Map(buttons().map(button=>[button.id,button]));
  const visible=(id:string)=>MUST_SHOW.has(id)||!state.hidden.includes(id);
  const apply=()=>{
    const actual=available();
    for(const id of state.order){
      const button=actual.get(id);
      if(!button)continue;
      root.insertBefore(button,document.getElementById('allFeatures'));
      button.hidden=!visible(id);
      button.style.display=visible(id)?'':'none';
      button.setAttribute('aria-hidden',String(!visible(id)));
    }
    save(state);
  };
  const move=(id:string,offset:number)=>{
    const order=[...state.order],index=order.indexOf(id),next=index+offset;
    if(index<0||next<0||next>=order.length)return;
    [order[index],order[next]]=[order[next]!,order[index]!];
    state={...state,order};apply();render();
  };
  function render(){
    const actual=available();entries.replaceChildren();
    for(const id of state.order){
      const button=actual.get(id);if(!button)continue;
      const line=document.createElement('div');line.className='c04-toolbar-row';
      const check=document.createElement('input');check.type='checkbox';
      check.checked=visible(id);check.disabled=MUST_SHOW.has(id);
      check.title=MUST_SHOW.has(id)?'描画の基本操作のため表示を固定しています。':'表示を切り替える';
      const name=document.createElement('span');name.textContent=button.getAttribute('aria-label')??button.title??id;
      const up=document.createElement('button');up.type='button';up.textContent='↑';up.title='上へ';
      const down=document.createElement('button');down.type='button';down.textContent='↓';down.title='下へ';
      const index=state.order.indexOf(id);
      up.disabled=index===0;down.disabled=index===state.order.length-1;
      up.onclick=()=>move(id,-1);down.onclick=()=>move(id,1);
      check.onchange=()=>{
        state={...state,hidden:check.checked?state.hidden.filter(s=>s!==id):[...state.hidden,id]};
        apply();status.textContent='ツール欄の表示を更新しました。';
      };
      const label=document.createElement('label');label.append(check,name);
      line.append(label,up,down);entries.append(line);
    }
  }
  function restore(layout:ToolLayout){
    state=normalize(layout);apply();render();
  }
  const resetLayout=()=>{restore(defaultLayout());status.textContent='標準の並びと表示に戻しました。';};
  reset.onclick=resetLayout;
  apply();render();
  return {snapshot:()=>({order:[...state.order],hidden:[...state.hidden]}),restore,reset:resetLayout};
}
