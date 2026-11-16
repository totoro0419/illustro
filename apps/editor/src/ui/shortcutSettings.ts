/** C04 GST-002/005: user shortcuts invoke the same command handlers as the UI. */
import type {CommandService} from './commandPalette';

type Mode='press'|'toggle'|'hold';
type Binding=Readonly<{
  commandId:string;key:string;code:string;ctrl:boolean;shift:boolean;alt:boolean;meta:boolean;
  physical:boolean;mode:Mode;
}>;
type Settings=Readonly<{schema:'illustro.user.shortcuts';version:1;bindings:readonly Binding[]}>;
const KEY='illustro.c04.shortcut-settings.v1';
const MAX_BINDINGS=128;
const RESERVED=new Set([
  'ctrl+k','meta+k','ctrl+z','meta+z','ctrl+shift+z','meta+shift+z','ctrl+y',
  'ctrl+w','meta+w','ctrl+t','meta+t','ctrl+r','meta+r','ctrl+l','meta+l',
  'ctrl+n','meta+n','ctrl+p','meta+p','alt+f4','f5','f11',
  'e','i','space','escape','tab','enter','backspace','delete'
]);
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T|null;
function signature(binding:Pick<Binding,'ctrl'|'shift'|'alt'|'meta'|'key'>){
  return [...(binding.ctrl?['ctrl']:[]),...(binding.meta?['meta']:[]),...(binding.alt?['alt']:[]),...(binding.shift?['shift']:[]),binding.key].join('+');
}
function human(binding:Binding){
  const pieces=[binding.ctrl?'Ctrl':null,binding.meta?'Meta':null,binding.alt?'Alt':null,binding.shift?'Shift':null,
    binding.physical?binding.code:binding.key].filter(Boolean);
  return pieces.join(' + ');
}
function validateBinding(value:unknown):Binding{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('設定内のショートカットが正しくありません。');
  const raw=value as Record<string,unknown>;
  if(typeof raw.commandId!=='string'||!raw.commandId||raw.commandId.length>120||
    typeof raw.key!=='string'||!raw.key||raw.key.length>32||
    typeof raw.code!=='string'||raw.code.length>48||
    ['ctrl','shift','alt','meta','physical'].some(k=>typeof raw[k]!=='boolean')||
    !['press','toggle','hold'].includes(raw.mode as string))throw Error('設定内のキー指定に問題があります。');
  return {
    commandId:raw.commandId,key:raw.key.toLowerCase(),code:raw.code,
    ctrl:raw.ctrl as boolean,shift:raw.shift as boolean,alt:raw.alt as boolean,meta:raw.meta as boolean,
    physical:raw.physical as boolean,mode:raw.mode as Mode
  };
}
function parse(value:unknown):Binding[]{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('ショートカット設定の形式が正しくありません。');
  const data=value as Record<string,unknown>;
  if(data.schema!=='illustro.user.shortcuts'||data.version!==1||!Array.isArray(data.bindings)||data.bindings.length>MAX_BINDINGS)throw Error('対応していないショートカット設定です。');
  const entries=data.bindings.map(validateBinding);
  const signatures=new Set<string>();
  for(const entry of entries){
    const key=[entry.physical?'code:'+entry.code:'key:'+entry.key,entry.ctrl,entry.meta,entry.alt,entry.shift].join('|');
    if(signatures.has(key))throw Error('同じキーが二重登録されています。');
    signatures.add(key);
  }
  return entries;
}
/** Validate a portable shortcut file without applying it to the current session. */
export function validateShortcutSettings(value:unknown):void{parse(value);}
const read=()=>{try{return localStorage.getItem(KEY)}catch{return null;}};
const write=(bindings:readonly Binding[])=>{try{localStorage.setItem(KEY,JSON.stringify({schema:'illustro.user.shortcuts',version:1,bindings} satisfies Settings));return true;}catch{return false;}};
const normalizedKey=(event:KeyboardEvent)=>event.key===' '?'space':event.key.toLowerCase();
const isText=(target:EventTarget|null)=>target instanceof Element&&!!target.closest('input,textarea,select,[contenteditable], [role="textbox"]');
const isHoldable=(id:string)=>id==='eyedropper'||id==='panView'||id==='erase'||id==='quickControllerOpen';

export function installShortcutSettings(commands:CommandService,canSwitchTools:()=>boolean=()=>true){
  const parent=el('workspaceBoxBody');if(!parent)return;
  let bindings:Binding[]=[];
  try{const saved=read();if(saved)bindings=parse(JSON.parse(saved));}catch{/* invalid old settings remain in storage; user may import a valid file */}
  const details=document.createElement('details');details.className='c04-shortcut-settings';
  const summary=document.createElement('summary');summary.textContent='キーボードのショートカットを設定';
  const help=document.createElement('p');help.textContent='実際にキーを押して登録します。システムや既定のキーとの衝突は防ぎます。';
  const commandSelect=document.createElement('select');commandSelect.setAttribute('aria-label','登録する機能');
  const mode=document.createElement('select');mode.setAttribute('aria-label','キーを押したときの動作');
  for(const [value,label] of [['press','一度だけ実行'],['toggle','押すたび切替'],['hold','押している間だけ']] as const)mode.add(new Option(label,value));
  const physical=document.createElement('input');physical.type='checkbox';
  const physicalLabel=document.createElement('label');physicalLabel.append(physical,document.createTextNode(' キーボード上の位置を優先'));
  const capture=document.createElement('button');capture.type='button';capture.textContent='キーを押して登録';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='設定を初期状態に戻す';
  const exportButton=document.createElement('button');exportButton.type='button';exportButton.textContent='キー設定を書き出す';
  const importButton=document.createElement('button');importButton.type='button';importButton.textContent='キー設定を読み込む';
  const file=document.createElement('input');file.type='file';file.accept='.json,application/json';file.hidden=true;
  const status=document.createElement('output');status.setAttribute('role','status');
  const list=document.createElement('div');list.className='c04-shortcut-list';
  const buttons=document.createElement('div');buttons.className='c04-workspace-actions';
  buttons.append(capture,cancel,exportButton,importButton);
  details.append(summary,help,commandSelect,mode,physicalLabel,buttons,file,status,list);
  parent.append(details);
  const updateCommands=()=>{
    const current=commandSelect.value;
    const all=commands.list().filter(x=>!x.id.startsWith('layer:')&&!x.id.startsWith('brush:'));
    commandSelect.replaceChildren(...all.map(c=>new Option(c.label+' · '+c.category,c.id)));
    if(all.some(c=>c.id===current))commandSelect.value=current;
  };
  updateCommands();
  commandSelect.onchange=()=>{if(!isHoldable(commandSelect.value)&&mode.value==='hold')mode.value='press';};
  mode.onchange=()=>{if(mode.value==='hold'&&!isHoldable(commandSelect.value)){mode.value='press';status.textContent='押している間だけ使えるのは、スポイト・消しゴム・表示移動です。';}};
  const active=new Map<string,{restore:()=>void;epoch:number}>();
  let holdEpoch=0;
  function render(){
    list.replaceChildren();
    const names=new Map(commands.list().map(c=>[c.id,c.label]));
    for(const [i,entry] of bindings.entries()){
      const row=document.createElement('div');row.className='c04-shortcut-row';
      const label=document.createElement('span');
      const unsupported=!names.has(entry.commandId);
      label.textContent=(names.get(entry.commandId)??entry.commandId)+(unsupported?'（今は未対応）':'')+' — '+human(entry);
      label.title=(entry.mode==='hold'?'押している間だけ':entry.mode==='toggle'?'切替':'単発')+(entry.physical?'（物理キー）':'（文字キー）');
      const remove=document.createElement('button');remove.type='button';remove.textContent='解除';
      remove.setAttribute('aria-label',human(entry)+' の割当を削除');
      remove.onclick=()=>{if(persist(bindings.filter((_,index)=>index!==i)))render();};
      row.append(label,remove);list.append(row);
    }
    if(!bindings.length){const empty=document.createElement('p');empty.textContent='追加した割当はまだありません。既定のキーは引き続き利用できます。';list.append(empty);}
  }
  function persist(next:Binding[]):boolean{
    if(!write(next)){
      status.textContent='設定を端末に保存できませんでした。書き出しで控えてください。';
      return false;
    }
    bindings=next;
    return true;
  }
  const same=(e:KeyboardEvent,b:Binding)=>
    b.ctrl===e.ctrlKey&&b.alt===e.altKey&&b.shift===e.shiftKey&&b.meta===e.metaKey&&
    (b.physical?b.code===e.code:b.key===normalizedKey(e));
  let capturing=false;
  const stopCapture=()=>{
    if(!capturing)return;
    capturing=false;capture.textContent='キーを押して登録';
    document.removeEventListener('keydown',captureKey,true);
  };
  const captureKey=(event:KeyboardEvent)=>{
    if(!capturing)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(event.key==='Escape'){stopCapture();status.textContent='登録をキャンセルしました。';return;}
    if(['Control','Meta','Alt','Shift'].includes(event.key)||event.isComposing)return;
    const proposed:Binding={
      commandId:commandSelect.value,key:normalizedKey(event),code:event.code,
      ctrl:event.ctrlKey,shift:event.shiftKey,alt:event.altKey,meta:event.metaKey,
      physical:physical.checked,mode:mode.value as Mode
    };
    stopCapture();
    if(!proposed.commandId)return;
    const key=signature(proposed);
    if(RESERVED.has(key)){status.textContent=human(proposed)+' はアプリまたは端末の既定の操作と重なるため登録できません。';return;}
    if(proposed.mode==='hold'&&!isHoldable(proposed.commandId)){status.textContent='この操作は押している間だけの割当に対応していません。';return;}
    const duplicates=bindings.filter(b=>signature(b)===key||(b.code===proposed.code&&b.physical&&proposed.physical&&b.ctrl===proposed.ctrl&&b.shift===proposed.shift&&b.alt===proposed.alt&&b.meta===proposed.meta));
    if(duplicates.length&&!window.confirm(human(proposed)+' は登録済みです。元の割当を置き換えますか？'))return;
    const next=bindings.filter(b=>!duplicates.includes(b));
    if(next.length>=MAX_BINDINGS){status.textContent='割当をこれ以上追加できません。';return;}
    next.push(proposed);
    if(!persist(next))return;
    render();status.textContent=human(proposed)+' を登録しました。';
  };
  capture.onclick=()=>{
    if(capturing){stopCapture();status.textContent='登録をキャンセルしました。';return;}
    if(!commandSelect.value){status.textContent='機能を選んでください。';return;}
    capturing=true;capture.textContent='キーを押してください（Escで取消）';
    status.textContent='この画面で実際に登録したいキーを押してください。';
    document.addEventListener('keydown',captureKey,true);
  };
  cancel.onclick=()=>{
    if(!bindings.length)return;
    if(!window.confirm('追加したキー割当をすべて解除しますか？ 既定のキーは変わりません。'))return;
    if(!persist([]))return;
    render();status.textContent='追加した割当を解除しました。';
  };
  exportButton.onclick=()=>{
    const blob=new Blob([JSON.stringify({schema:'illustro.user.shortcuts',version:1,bindings},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='illustro-shortcuts.json';a.click();window.setTimeout(()=>URL.revokeObjectURL(url),0);
  };
  importButton.onclick=()=>file.click();
  file.onchange=async()=>{
    const item=file.files?.[0];file.value='';if(!item)return;
    try{
      if(item.size>1048576)throw Error('ファイルが大きすぎます。');
      const imported=parse(JSON.parse(await item.text()));
      const known=new Map(commands.list().map(c=>[c.id,c.label]));
      const identity=(binding:Binding)=>[binding.commandId,binding.physical?'physical':'logical',human(binding),binding.mode].join('|');
      const beforeIds=new Set(bindings.map(identity)),afterIds=new Set(imported.map(identity));
      const added=imported.filter(b=>!beforeIds.has(identity(b)));
      const removed=bindings.filter(b=>!afterIds.has(identity(b)));
      const reserved=imported.filter(b=>RESERVED.has(signature(b)));
      const unsupported=imported.filter(b=>!known.has(b.commandId));
      const details=[
        '取り込む設定 '+imported.length+'件',
        '追加・変更 '+added.length+'件 / 解除 '+removed.length+'件',
        '別の端末で未対応の機能 '+unsupported.length+'件',
        '既定・OSキーとの衝突 '+reserved.length+'件（記録は保持・操作は無効）',
        '', '追加される操作:',
        ...added.slice(0,8).map(b=>' ＋ '+(known.get(b.commandId)??b.commandId)+' : '+human(b)),
        ...(added.length>8?[' ほか'+(added.length-8)+'件']:[]),
        '', '解除される操作:',
        ...removed.slice(0,8).map(b=>' − '+(known.get(b.commandId)??b.commandId)+' : '+human(b)),
        ...(removed.length>8?[' ほか'+(removed.length-8)+'件']:[]),
        '', '現在の設定と入れ替えますか？'
      ];
      if(!window.confirm(details.join('\n')))return;
      if(!persist(imported))return;
      render();
      status.textContent='キー設定を読み込みました。追加・変更'+added.length+'件、解除'+removed.length+
        '件、未対応'+unsupported.length+'件。元の未対応情報も保持しています。';
    }catch(error){status.textContent=error instanceof Error?error.message:'読み込みに失敗しました。';}
  };
  function startHold(binding:Binding){
    if(binding.commandId!=='quickControllerOpen'&&!canSwitchTools()){status.textContent='線を描いている間は道具を切り替えられません。';return;}
    if(active.size&&!active.has(binding.commandId)&&binding.commandId!=='quickControllerOpen'){
      status.textContent='押している間の操作を終了してから切り替えてください。';return;
    }
    const id=binding.commandId;
    const on=(el<HTMLButtonElement>(id)?.getAttribute(id==='quickControllerOpen'?'aria-expanded':'aria-pressed')==='true');
    const epoch=++holdEpoch;
    if(on){active.set(id,{restore:()=>{},epoch});return;}
    const previous=['paint','erase','eyedropper','panView'].find(
      key=>el<HTMLButtonElement>(key)?.getAttribute('aria-pressed')==='true')??'paint';
    const result=commands.invoke(id);
    if(result.ok)active.set(id,{epoch,restore:()=>{
      // Respect later manual tool changes during the hold.
      const attribute=id==='quickControllerOpen'?'aria-expanded':'aria-pressed';
      if(el<HTMLButtonElement>(id)?.getAttribute(attribute)==='true'){
        el<HTMLButtonElement>(id==='quickControllerOpen'?id:previous)?.click();
      }
    }});
    else status.textContent=result.reason??'ショートカットを使えませんでした。';
  }
  document.addEventListener('keydown',event=>{
    if(capturing||event.defaultPrevented||event.repeat||event.isComposing||isText(event.target)||document.querySelector('dialog[open]'))return;
    const binding=bindings.find(b=>!RESERVED.has(signature(b))&&same(event,b));
    if(!binding)return;
    event.preventDefault();event.stopPropagation();
    if(binding.mode==='hold')startHold(binding);
    else {
      if(['paint','erase','eyedropper','panView'].includes(binding.commandId)&&!canSwitchTools()){
        status.textContent='線を描いている間は道具を切り替えられません。';
        return;
      }
      const result=commands.invoke(binding.commandId);
      if(!result.ok)status.textContent=result.reason??'現在は使えません。';
    }
  },{capture:true});
  const restoreAfterStroke=(id:string,restore:()=>void,epoch:number)=>{
    const check=()=>{
      if(active.has(id)||epoch!==holdEpoch)return; // another hold superseded release
      if(!canSwitchTools()){window.setTimeout(check,32);return;}
      restore();
    };
    check();
  };
  const release=(event:KeyboardEvent)=>{
    for(const b of bindings)if(b.mode==='hold'&&
      (b.physical?b.code===event.code:b.key===normalizedKey(event))){
      const state=active.get(b.commandId);if(!state)continue;
      active.delete(b.commandId);restoreAfterStroke(b.commandId,state.restore,state.epoch);
    }
  };
  document.addEventListener('keyup',release,{capture:true});
  const releaseAll=()=>{
    const pending=[...active.entries()];active.clear();
    for(const [id,{restore,epoch}] of pending)restoreAfterStroke(id,restore,epoch);
    stopCapture();
  };
  window.addEventListener('blur',releaseAll);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();});
  render();
}
