import {appConfirm,appPrompt} from './appDialogs';
/**
 * C04 UI-004 / UI-005: commands share the application's existing controls.
 * The palette never implements a second undo, brush engine or document writer.
 */
import type {ShellControl} from './shellBehavior';
import {fromHex,hex,type ForegroundColor} from '../color/model';
import {icon,type IconName} from './icons';

export type CommandDefinition=Readonly<{
  id:string;label:string;category:string;aliases:string;
  availability:()=>string|null;execute:()=>void|Promise<void>;
  completion?:boolean;
}>;
/** Execute the actual handler and observe its declared completion, never a DOM dispatch. */
export async function invokeCommandAsync(command:CommandDefinition,contextKey?:()=>unknown){
  const reason=command.availability();
  if(reason)return {ok:false,reason,settled:false};
  try{
    const context=contextKey?.();
    await command.execute();
    if(contextKey&&contextKey()!==context)throw Error('作品が切り替わったため操作を停止しました。');
    return {ok:true,reason:null,settled:command.completion!==false};
  }catch(error){return {ok:false,reason:error instanceof Error?error.message:String(error),settled:false};}
}
export type CommandService=Readonly<{
  list:()=>readonly Readonly<{id:string;label:string;category:string}>[];
  invoke:(id:string)=>Readonly<{ok:boolean;reason:string|null}>;
  invokeAsync:(id:string)=>Promise<Readonly<{ok:boolean;reason:string|null;settled:boolean}>>;
  registerProvider:(provider:()=>readonly CommandDefinition[])=>()=>void;
  refresh:()=>void;
  contextKey?: (()=>unknown)|undefined;
}>;
export type LayerCommandSource=Readonly<{
  layers:()=>readonly Readonly<{id:string;name:string;visible:boolean}>[];
  selectLayer:(id:string)=>void|Promise<void>;
}>;
/** Generate commands from the artwork, not whichever rows the UI happens to show. */
export function layerCommandsFromArtwork(source:LayerCommandSource):CommandDefinition[]{
  return source.layers().map(layer=>({
    id:'layer:'+layer.id,
    label:layer.name+(layer.visible?'':'（非表示）'),
    category:'レイヤー',aliases:'描画先 選ぶ '+layer.id,
    availability:()=>source.layers().some(item=>item.id===layer.id)?null:'このレイヤーはもうありません。',
    execute:()=>source.selectLayer(layer.id),
  }));
}
type PinState=Readonly<{version:1;slots:readonly string[];names?:readonly string[];groups?:readonly string[]}>;
const PIN_KEY='illustro.c04.quick-controller.v1';
const RECENTS_KEY='illustro.c04.command-history.v1';
const SLOT_COUNT=6;
const DEFAULT_SLOTS=['undo','redo','paint','erase','layer','save'];
/** Returns null when all Quick slots are occupied and the user must choose one. */
export function quickPinTarget(slots:readonly string[],id:string,editingSlot:number|null):number|null{
  if(editingSlot!==null)return editingSlot>=0&&editingSlot<SLOT_COUNT?editingSlot:null;
  const existing=slots.indexOf(id);
  if(existing>=0)return existing;
  const empty=slots.findIndex(slot=>!slot);
  return empty>=0?empty:null;
}
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T|null;
const disabledReason=(id:string)=>{
  const element=el<HTMLButtonElement>(id);
  if(!element)return 'この機能は現在の画面で利用できません。';
  if(element.disabled)return '作品や操作状態により現在は使えません。';
  // A command can target a collapsed presentation surface or an unpinned rail tool.
  // Disabled controls and contextual visibility still guard mode-specific actions.
  if(element.closest('[hidden],[inert]')&&
    !element.matches('.rail > .tool-button, #addLayer, #workspaceToggle, #quickControllerOpen'))return '現在の画面では操作できません。';
  return null;
};
const read=(key:string)=>{try{return localStorage.getItem(key)}catch{return null;}};
const write=(key:string,value:string)=>{try{localStorage.setItem(key,value)}catch{/* blocked storage */}};
const parsePins=():string[]=>{
  try{
    const raw=JSON.parse(read(PIN_KEY)||'null') as PinState|null;
    if(raw?.version===1&&Array.isArray(raw.slots)&&raw.slots.length===SLOT_COUNT&&raw.slots.every(x=>typeof x==='string'))return [...raw.slots];
  }catch{/* invalid settings reset */}
  return [...DEFAULT_SLOTS];
};
const parseRecents=():string[]=>{
  try{const raw=JSON.parse(read(RECENTS_KEY)||'[]') as unknown;return Array.isArray(raw)?raw.filter((s):s is string=>typeof s==='string').slice(0,24):[];}catch{return [];}
};

export function installCommandPalette(shell:Pick<ShellControl,'openBox'|'setLayerPage'>,colorState:ForegroundColor,layerSource:LayerCommandSource,execution?:Readonly<{
  resolve:(id:string)=>(()=>void|Promise<void>)|null;contextKey:()=>unknown;
}>):CommandService{
  const actions:Array<readonly [string,string,string,string]>= [
    ['undo','元に戻す','履歴','Undo 取り消し'],
    ['redo','やり直す','履歴','Redo'],
    ['paint','ブラシで描く','描画','絵を描く ペン'],
    ['erase','消しゴム','描画','消す'],
    ['smudge','ぼかし・混色','描画','なじませる'],
    ['smartFill','スマート塗り','描画','塗りつぶし バケツ'],
    ['transform','変形','編集','拡大 縮小 回転 レイヤー'],
    ['move','レイヤーを移動','編集','位置を動かす'],
    ['eyedropper','スポイト','色','色を取得 採色'],
    ['addLayer','レイヤーを追加','レイヤー','層 追加'],
    ['layer','レイヤー画面','レイヤー','層 一覧'],
    ['save','作品ファイルを保存','保存','ネイティブ保存'],
    ['saveCopy','別名で作品を保存','保存','Save As コピー'],
    ['open','作品ファイルを開く','保存','読み込み'],
    ['new','新しいキャンバス','保存','新規作成'],
    ['recover','自動保存から復元','保存','回復'],
    ['exportImage','PNG・JPEG・WebPで書き出す','保存','画像 書出'],
    ['selection','範囲を選択する','編集','選択'],
    ['selectionClear','選択を解除する','編集','解除'],
    ['c06CopySelection','選択範囲をコピー','編集','Clipboard Copy 範囲'],
    ['c06CopyLayer','レイヤーをコピー','編集','Clipboard Copy レイヤー'],
    ['c06CopyMerged','見えている絵をコピー','編集','合成コピー Copy Merged'],
    ['c06CopyMergedSelection','選択範囲の合成をコピー','編集','合成コピー 範囲'],
    ['c06CutSelection','選択範囲を切り取る','編集','Cut 切り取り'],
    ['c06Paste','コピーした絵を中央へ貼り付け','編集','Paste'],
    ['c06PasteInPlace','元の位置に貼り付け','編集','Paste In Place'],
    ['c06SystemCopy','画像を端末のクリップボードへ','編集','OS コピー'],
    ['c06SystemPaste','端末から画像を取り込む','編集','OS 貼り付け'],
    ['c06ImportImage','画像ファイルを配置する','編集','読み込み 画像'],

    ['fitView','作品全体を表示','表示','Fit 全体'],
    ['view100','100%表示','表示','拡大'],
    ['actualPixels','実画素の倍率','表示','実寸'],
    ['resetRotation','表示の回転を戻す','表示','角度 0'],
    ['flipH','左右反転して確認','表示','鏡'],
    ['flipV','上下反転して確認','表示','逆さ'],
    ['zoomIn','画面を拡大','表示','ズーム'],
    ['zoomOut','画面を縮小','表示','ズーム'],
    ['panView','キャンバス移動','表示','手のひら'],
    ['layerBlendMode','レイヤーの合成モード','レイヤー','乗算 スクリーン'],
    ['layerSoloToggle','選んだレイヤーだけ表示','レイヤー','Solo'],
    ['layerClipping','レイヤーをクリッピング','レイヤー','切り抜き'],
    ['layerAlphaLock','透明部分を保護','レイヤー','不透明度ロック'],
    ['layerBatchToggle','レイヤーを複数選択','レイヤー','一括'],
    ['documentInfoOpen','作品の情報','作品','DPI 名前'],
    ['geometryOpen','作品の大きさを変更','編集','変形 キャンバス'],
    ['guideEnabled','直線定規の設定','描画','ガイド'],
    ['colorPage','色の画面','色','カラーパレット'],
    ['brushPage','ブラシの設定','描画','筆 設定'],
    ['workspaceToggle','作業欄を開閉','設定','ワークスペース'],
    ['quickControllerOpen','Quick Controllerを開く','設定','ショートカット 固定ボタン よく使う操作'],
    ['c04FocusToggle','集中表示を切り替える','表示','Focus キャンバスだけ'],
    ['c04FullscreenToggle','画面いっぱいに表示','表示','全画面 Fullscreen'],
    ['home','ホーム画面','作品','作品一覧'],
  ];
  const known:CommandDefinition[]=actions.map(([id,label,category,aliases])=>({
    id,label,category,aliases,
    availability:()=>disabledReason(id),
    completion:!!execution?.resolve(id),
    execute:()=>{const run=execution?.resolve(id);if(run)return run();el<HTMLButtonElement>(id)?.click();},
  }));
  for(const [id,label,section] of [
    ['workspace:brush','ブラシの一覧','brushBox'],
    ['workspace:color','色の選択','colorBox'],
    ['workspace:history','履歴','historyBox'],
    ['workspace:workspace','作業欄の設定','workspaceBox'],
    ['workspace:navigator','表示の設定','navigatorBox'],
    ['workspace:reference','参考資料ボード','referenceBox'],
    ['workspace:assets','素材庫','assetsBox'],
  ] as const)known.push({
    id,label,category:'設定',aliases:'パネル 作業欄 開く',
    availability:()=>null,execute:()=>shell.openBox(section)
  });
  const providers:Array<()=>readonly CommandDefinition[]>=[];
  function dynamicCommands(){
    const commands=[...known];
    for(const provider of providers)commands.push(...provider());
    // Color command IDs store the exact color rather than an unstable palette index.
    const paletteColors=new Set<string>([hex(colorState.current),hex(colorState.background)]);
    for(const chip of document.querySelectorAll<HTMLElement>('.color-swatch[data-hex]')){
      if(chip.dataset.hex)paletteColors.add(chip.dataset.hex.toUpperCase());
    }
    for(const slot of slots)if(slot.startsWith('color:'))paletteColors.add(slot.slice(6));
    for(const value of paletteColors){
      const parsed=fromHex(value);if(!parsed)continue;
      commands.push({
        id:'color:'+value,label:'描画色 '+value,category:'色',aliases:'カラーパレット 色 保存した色',
        availability:()=>null,execute:()=>colorState.choose(parsed),
      });
    }
    const brush=el<HTMLSelectElement>('brush');
    if(brush)for(const option of brush.options){
      if(!option.value||option.disabled)continue;
      const id='brush:'+option.value;
      commands.push({
        id,label:option.textContent||option.value,category:'ブラシ',aliases:'筆 ペン プリセット',
        availability:()=>brush.disabled?'ブラシを選べる作品を開いてください。':null,
        completion:!!execution?.resolve(id),
        execute:()=>{shell.openBox('brushBox');const run=execution?.resolve(id);if(run)return run();brush.value=option.value;brush.dispatchEvent(new Event('change',{bubbles:true}));},
      });
    }
    // Includes hidden, filtered, collapsed and unmounted layers. No DOM lookup
    // can silently drop an artwork layer from the search index.
    commands.push(...layerCommandsFromArtwork(layerSource));
    return commands;
  }
  let slots=parsePins(),recents=parseRecents(),lastFocus:HTMLElement|null=null,editingSlot:number|null=null;
  const pinMeta=(()=>{
    try{
      const meta=JSON.parse(read(PIN_KEY)||'null') as PinState|null;
      return {
        names:Array.from({length:SLOT_COUNT},(_,i)=>{const value=meta?.names?.[i];return typeof value==='string'?value.slice(0,28):'';}),
        groups:Array.from({length:SLOT_COUNT},(_,i)=>{const value=meta?.groups?.[i];return typeof value==='string'?value.slice(0,22):'';}),
      };
    }catch{return {names:Array(SLOT_COUNT).fill('') as string[],groups:Array(SLOT_COUNT).fill('') as string[]};}
  })();
  const savePins=()=>write(PIN_KEY,JSON.stringify({version:1,slots,names:pinMeta.names,groups:pinMeta.groups}));
  const find=(id:string)=>{
    const found=dynamicCommands().find(command=>command.id===id);
    if(found)return found;
    // A saved brush remains usable while the visible catalog is filtered.
    const brushRun=id.startsWith('brush:')?execution?.resolve(id):null;
    if(brushRun)return {id,label:id.slice(6),category:'ブラシ',aliases:'',availability:()=>null,completion:true,execute:brushRun};
    // Stored macros keep exact colors even after they leave the recent palette.
    const color=id.startsWith('color:')?fromHex(id.slice(6)):null;
    return color?{id,label:'描画色 '+id.slice(6),category:'色',aliases:'',availability:()=>null,
      execute:()=>colorState.choose(color)}:undefined;
  };
  const remember=(id:string)=>{
    recents=[id,...recents.filter(key=>key!==id)].slice(0,24);
    write(RECENTS_KEY,JSON.stringify(recents));
  };
  const searchButton=document.createElement('button');
  searchButton.id='commandSearchOpen';searchButton.type='button';searchButton.className='c04-command-open';
  searchButton.textContent='⌕ 機能を探す';
  searchButton.title='機能を探す（Ctrl+K）';
  el('featureShortcuts')?.prepend(searchButton);
  const quickButton=document.createElement('button');
  quickButton.id='quickControllerOpen';quickButton.type='button';quickButton.className='c04-quick-open';
  quickButton.textContent='よく使う操作';quickButton.title='よく使う操作';
  el('featureShortcuts')?.append(quickButton);
  const dialog=document.createElement('dialog');
  dialog.id='commandSearchDialog';dialog.className='c04-command-dialog';
  const section=document.createElement('section');
  const heading=document.createElement('h2');heading.textContent='機能を探す';
  const hint=document.createElement('p');hint.textContent='操作やブラシの名前を検索して実行できます。★でQuickに固定できます。';
  const field=document.createElement('input');field.type='search';field.placeholder='機能・ブラシ・設定を検索';field.autocomplete='off';field.setAttribute('aria-label','機能検索');
  const results=document.createElement('div');results.className='c04-command-results';results.setAttribute('role','listbox');
  const footer=document.createElement('div');footer.className='c04-command-footer';
  const status=document.createElement('output');status.setAttribute('role','status');
  const close=document.createElement('button');close.type='button';close.textContent='閉じる';close.onclick=()=>dialog.close();
  footer.append(status,close);section.append(heading,hint,field,results,footer);dialog.append(section);
  document.body.append(dialog);
  const quick=document.createElement('section');
  quick.id='quickControllerPanel';quick.className='c04-quick-controller';quick.hidden=true;
  quick.setAttribute('role','region');quick.setAttribute('aria-label','よく使う操作');
  const quickTitle=document.createElement('div');quickTitle.className='c04-quick-heading';
  const quickLabel=document.createElement('strong');quickLabel.textContent='よく使う操作';
  const configure=document.createElement('button');configure.type='button';configure.textContent='編集';
  const closeQuick=document.createElement('button');closeQuick.type='button';closeQuick.textContent='閉じる';
  closeQuick.setAttribute('aria-label','よく使う操作を閉じる');
  closeQuick.onclick=()=>{pendingPinId=null;followArmed=false;quick.hidden=true;quickButton.setAttribute('aria-expanded','false');};
  quickTitle.append(quickLabel,configure,closeQuick);
  const quickSlots=document.createElement('div');quickSlots.className='c04-quick-slots';
  const note=document.createElement('p');note.className='c04-quick-note';note.hidden=true;
  const penSetting=document.createElement('label');penSetting.className='c04-quick-pen';
  const penButton=document.createElement('input');penButton.type='checkbox';
  penButton.checked=read('illustro.c04.quick.pen-barrel')==='true';
  penSetting.append(penButton,document.createTextNode(' ペンのサイドボタンで開く（対応機種のみ）'));
  const followSetting=document.createElement('label');followSetting.className='c04-quick-pen';
  const followPen=document.createElement('input');followPen.type='checkbox';
  followPen.checked=read('illustro.c04.quick.follow-pen')!=='false';
  followPen.onchange=()=>{
    followArmed=followPen.checked;
    write('illustro.c04.quick.follow-pen',String(followPen.checked));
  };
  followSetting.append(followPen,' ペンを離した位置に表示する');
  quick.append(quickTitle,quickSlots,note,penSetting,followSetting);document.body.append(quick);
  quick.classList.add('quick-ring');
  const ringTopbar=document.createElement('button');ringTopbar.type='button';ringTopbar.id='quickRingToggle';
  ringTopbar.innerHTML=icon('all');ringTopbar.title='よく使う操作';ringTopbar.setAttribute('aria-label','よく使う操作');
  el('dockCompactToggle')?.before(ringTopbar);
  ringTopbar.onclick=()=>quickButton.click();
  function positionRing(x:number,y:number){
    const halfWidth=quick.offsetWidth/2||114,halfHeight=quick.offsetHeight/2||100;
    const top=Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top'))||54;
    quick.style.setProperty('--quick-x',Math.max(halfWidth+3,Math.min(innerWidth-halfWidth-3,x))+'px');
    quick.style.setProperty('--quick-y',Math.max(halfHeight+top,Math.min(innerHeight-halfHeight-8,y))+'px');
  }
  let drag:{pointer:number;x:number;y:number;left:number;top:number}|null=null;
  quickSlots.onpointerdown=event=>{
    if(isConfiguring||event.button!==0||drag||event.target!==quickSlots)return;
    const rect=quickSlots.getBoundingClientRect();
    drag={pointer:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left+rect.width/2,top:rect.top+rect.height/2};
    quickSlots.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  quickSlots.onpointermove=event=>{
    if(drag?.pointer===event.pointerId)positionRing(drag.left+event.clientX-drag.x,drag.top+event.clientY-drag.y);
  };
  quickSlots.onlostpointercapture=()=>{drag=null;};
  penButton.onchange=async()=>{
    if(penButton.checked){
      const eraser=document.getElementById('penBarrelErase') as HTMLInputElement|null;
      if(eraser?.checked){
        if(!await appConfirm('このペンボタンには現在「消しゴム」が設定されています。Quickへ変更しますか？')){
          penButton.checked=false;return;
        }
        eraser.checked=false;eraser.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }
    write('illustro.c04.quick.pen-barrel',String(penButton.checked));
  };
  let isConfiguring=false,followArmed=followPen.checked;
  let penDrawing:number|null=null;
  let lastPen:{x:number;y:number}|null=null;
  let pendingPinId:string|null=null;

  function execute(command:CommandDefinition){
    const reason=command.availability();
    if(reason){status.textContent=reason;return;}
    dialog.close();quick.hidden=true;quickButton.setAttribute('aria-expanded','false');
    try{
      const outcome=command.execute();
      if(outcome instanceof Promise)void outcome.catch(error=>{
        status.textContent=error instanceof Error?error.message:'操作を実行できませんでした。';
      });
      remember(command.id);renderQuick();
    }catch(error){status.textContent=error instanceof Error?error.message:'操作を実行できませんでした。';}
  }
  function renderQuick(){
    quick.classList.toggle('quick-ring',!isConfiguring);
    quickSlots.replaceChildren();
    const commands=new Map(dynamicCommands().map(command=>[command.id,command]));
    for(let i=0;i<SLOT_COUNT;i++){
      const id=slots[i];
      const command=id?(commands.get(id)??find(id)):undefined;
      const wrapper=document.createElement('div');wrapper.className='c04-quick-slot-wrap';
      const button=document.createElement('button');button.type='button';
      button.className='c04-quick-slot';
      const iconName:IconName=command?.id==='undo'?'undo':command?.id==='redo'?'redo':
        command?.id==='erase'?'eraser':command?.id==='save'?'save':
        command?.id==='layer'||command?.category==='レイヤー'?'layers':
        command?.category==='色'?'color':command?.category==='描画'?'brush':'all';
      const visual=document.createElement('span');visual.className='c04-quick-icon';visual.innerHTML=icon(iconName);
      const label=document.createElement('strong');
      label.textContent=(pinMeta.names[i]||command?.label||'登録')+(isConfiguring?' · 変更':'');
      const group=document.createElement('small');
      group.textContent=pinMeta.groups[i]||command?.category||'未登録';
      button.append(visual,label,group);
      button.setAttribute('aria-label',label.textContent);
      wrapper.style.setProperty('--slot-x',['-81px','81px','-42px','42px','-42px','42px'][i]!);
      wrapper.style.setProperty('--slot-y',['0px','0px','-70px','-70px','70px','70px'][i]!);
      button.title='スロット'+(i+1)+'：'+(command?.label??'未登録');
      if(!isConfiguring){
        const reason=command?.availability()??null;
        button.disabled=!!reason||!command;
        if(reason)button.title=reason;
      }
      button.onclick=()=>{
        if(isConfiguring){
          if(pendingPinId){
             const pending=pendingPinId;pendingPinId=null;editingSlot=i;
             pinIntoSlot(pending);isConfiguring=false;renderQuick();
           }else{editingSlot=i;quick.hidden=true;openSearch('',true);}
        }else if(command){
          execute(command);
        }
      };
      wrapper.append(button);
      if(isConfiguring){
        const edit=document.createElement('div');edit.className='c04-quick-edit-labels';
        for(const [name,field,max] of [['名前','names',28],['グループ','groups',22]] as const){
          const change=document.createElement('button');change.type='button';change.textContent=name;
          change.onclick=async()=>{
            const previous=pinMeta[field][i]||'';
            const value=await appPrompt('スロット'+(i+1)+'の'+name+'を入力（空欄で自動表示）',previous);
            if(value===null)return;
            pinMeta[field][i]=value.trim().slice(0,max);savePins();renderQuick();
          };
          edit.append(change);
        }
        for(const [text,step] of [['←',-1],['→',1]] as const){
          const move=document.createElement('button');move.type='button';move.textContent=text;
          move.setAttribute('aria-label','枠'+(i+1)+(step<0?'を手前に移動':'を後ろに移動'));
          move.disabled=i+step<0||i+step>=SLOT_COUNT;
          move.onclick=()=>{
            const next=i+step;
            for(const values of [slots,pinMeta.names,pinMeta.groups])
              [values[i],values[next]]=[values[next]!,values[i]!];
            savePins();renderQuick();
            quickSlots.children[next]?.querySelector('button')?.focus();
          };
          edit.append(move);
        }
        wrapper.append(edit);
      }
      quickSlots.append(wrapper);
    }
    note.hidden=!isConfiguring;
    note.textContent=pendingPinId
      ?'6枠とも登録済みです。入れ替える場所を選んでください。キャンセルする場合は「完了」か「閉じる」を押してください。'
      :'変更する場所を押して機能を選びます。もう一度「完了」で確定します。';
    configure.textContent=isConfiguring?'完了':'編集';
  }
  configure.onclick=()=>{pendingPinId=null;isConfiguring=!isConfiguring;renderQuick();};
  function toggleQuick(){
    quick.hidden=!quick.hidden;followArmed=!quick.hidden;quickButton.setAttribute('aria-expanded',String(!quick.hidden));
    if(!quick.hidden){
      dialog.close();renderQuick();
      if(lastPen&&!isConfiguring)positionRing(lastPen.x,lastPen.y);
      const features=el<HTMLElement>('allFeaturesPanel');
      if(features&&!features.hidden)el<HTMLButtonElement>('featuresClose')?.click();
    }
  }
  let quickGesture:{pointerId:number;x:number;y:number;moved:boolean}|null=null;
  let suppressOpenClick=false;
  quickButton.onclick=()=>{
    if(suppressOpenClick){suppressOpenClick=false;return;}
    toggleQuick();
  };
  // Touch or pen: open on press, then slide directly to a Quick slot.
  // Ordinary taps and keyboard clicks keep the original behavior.
  quickButton.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch'&&event.pointerType!=='pen')return;
    if(!quick.hidden)return;
    suppressOpenClick=true;
    quickGesture={pointerId:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
    toggleQuick();
  });
  document.addEventListener('pointermove',event=>{
    if(event.pointerType==='pen'&&event.target instanceof Element&&event.target.closest('.surface'))
      lastPen={x:event.clientX,y:event.clientY};
    if(!quickGesture||event.pointerId!==quickGesture.pointerId)return;
    if(Math.hypot(event.clientX-quickGesture.x,event.clientY-quickGesture.y)>12)quickGesture.moved=true;
  },{passive:true});
  document.addEventListener('pointerup',event=>{
    if(penDrawing===event.pointerId){
      penDrawing=null;lastPen={x:event.clientX,y:event.clientY};
      const position=lastPen;
      requestAnimationFrame(()=>{
        if(penDrawing!==null||lastPen!==position||!followArmed||!followPen.checked||isConfiguring||document.querySelector('dialog:modal'))return;
        quick.hidden=false;renderQuick();positionRing(position.x,position.y);
        quickButton.setAttribute('aria-expanded','true');
      });
    }
    const gesture=quickGesture;
    if(!gesture||gesture.pointerId!==event.pointerId)return;
    quickGesture=null;
    if(gesture.moved&&!quick.hidden&&!isConfiguring){
      const target=document.elementFromPoint(event.clientX,event.clientY);
      const item=target instanceof Element?target.closest<HTMLButtonElement>('.c04-quick-slot'):null;
      if(item&&!item.disabled&&quick.contains(item))item.click();
    }
    window.setTimeout(()=>{suppressOpenClick=false;},0);
  },{capture:true});
  document.addEventListener('pointercancel',event=>{
    if(penDrawing===event.pointerId)penDrawing=null;
    if(quickGesture?.pointerId===event.pointerId){
      quickGesture=null;window.setTimeout(()=>{suppressOpenClick=false;},0);
    }
  },{capture:true});
  document.addEventListener('pointerdown',event=>{
    if(!penButton.checked||event.pointerType!=='pen'||event.button!==2)return;
    if(!(event.target instanceof Element&&event.target.closest('.surface')))return;
    // Explicit opt-in replaces the pen barrel's eraser action on this input.
    event.preventDefault();event.stopPropagation();
    toggleQuick();
  },{capture:true});
  const pinIntoSlot=(id:string)=>{
    if(editingSlot===null&&slots.includes(id))return;
    const target=quickPinTarget(slots,id,editingSlot);
    if(target===null){
      pendingPinId=id;isConfiguring=true;
      quick.hidden=false;quickButton.setAttribute('aria-expanded','true');
      renderQuick();return;
    }
    const index=target;
    const duplicate=slots.indexOf(id);
    if(duplicate>=0&&duplicate!==index)slots[duplicate]='';
    if(slots[index]!==id){pinMeta.names[index]='';pinMeta.groups[index]='';}
    slots[index]=id;editingSlot=null;
    savePins();
    renderQuick();
  };
  function renderSearch(){
    const commands=dynamicCommands();
    const q=field.value.trim().toLocaleLowerCase('ja-JP');
    const tokens=q.split(/\s+/).filter(Boolean);
    const sorted=commands.filter(command=>{
      const haystack=[command.label,command.category,command.aliases,command.id].join(' ').toLocaleLowerCase('ja-JP');
      return tokens.every(token=>haystack.includes(token));
    }).sort((a,b)=>{
      const score=(c:CommandDefinition)=>(slots.includes(c.id)?2:0)+(recents.includes(c.id)?1:0)+((q&&c.label.toLocaleLowerCase('ja-JP').startsWith(q))?5:0);
      return score(b)-score(a);
    });
    results.replaceChildren();
    const shortcuts=(()=>{
      try{
        const data=JSON.parse(read('illustro.c04.shortcut-settings.v1')||'null') as {bindings?:unknown[]}|null;
        return Array.isArray(data?.bindings)?data.bindings as Array<Record<string,unknown>>:[];
      }catch{return [] as Array<Record<string,unknown>>;}
    })();
    for(const command of sorted.slice(0,70)){
      const row=document.createElement('div');row.className='c04-command-result';row.setAttribute('role','option');
      const run=document.createElement('button');run.type='button';run.className='c04-command-run';
      const name=document.createElement('strong');name.textContent=command.label;
      const reason=command.availability();
      const desc=document.createElement('small');
      const key=shortcuts.find(binding=>binding.commandId===command.id);
      const displayKey=key?[key.ctrl?'Ctrl':null,key.meta?'Meta':null,key.alt?'Alt':null,key.shift?'Shift':null,
        key.physical?key.code:key.key].filter(Boolean).join('+'):'';
      desc.textContent=(reason??command.category)+(displayKey?' · '+displayKey:'');
      run.append(name,desc);run.disabled=!!reason;
      run.onclick=()=>execute(command);
      const pin=document.createElement('button');pin.type='button';pin.className='c04-command-pin';
      pin.textContent=editingSlot===null?(slots.includes(command.id)?'★':'☆'):'登録';
      pin.title='Quickに固定';pin.setAttribute('aria-label',command.label+'をQuickに固定');
      pin.onclick=()=>{
        pinIntoSlot(command.id);
        if(dialog.open)dialog.close();
        if(isConfiguring){quick.hidden=false;quickButton.setAttribute('aria-expanded','true');}
      };
      row.append(run,pin);results.append(row);
    }
    status.textContent=sorted.length?sorted.length+'件見つかりました。':'一致する機能はありません。';
  }
  field.addEventListener('input',renderSearch);
  field.addEventListener('keydown',e=>{
    if(e.key==='Enter'){
      const first=results.querySelector<HTMLButtonElement>('.c04-command-run:not(:disabled)');
      if(first){e.preventDefault();first.click();}
    }else if(e.key==='ArrowDown'){e.preventDefault();results.querySelector<HTMLButtonElement>('.c04-command-run:not(:disabled)')?.focus();}
  });
  results.addEventListener('keydown',e=>{
    if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;
    const candidates=[...results.querySelectorAll<HTMLButtonElement>('.c04-command-run:not(:disabled)')];
    const current=candidates.indexOf(document.activeElement as HTMLButtonElement);
    if(!candidates.length)return;
    e.preventDefault();candidates[Math.max(0,Math.min(candidates.length-1,current+(e.key==='ArrowDown'?1:-1)))]?.focus();
  });
  function openSearch(query='',pickSlot=false){
    lastFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    if(!pickSlot)editingSlot=null;
    quick.hidden=true;quickButton.setAttribute('aria-expanded','false');
    field.value=query;renderSearch();
    if(!dialog.open)dialog.showModal();
    field.focus();
  }
  dialog.addEventListener('close',()=>{
    if(editingSlot!==null){editingSlot=null;quick.hidden=false;quickButton.setAttribute('aria-expanded','true');renderQuick();}
    else if(lastFocus?.isConnected&&lastFocus.checkVisibility())lastFocus.focus({preventScroll:true});
    else el('allFeatures')?.focus({preventScroll:true});
  });
  searchButton.onclick=()=>openSearch();
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.isComposing)return;
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
      event.preventDefault();openSearch();return;
    }
    if(event.key==='Escape'&&!quick.hidden){followArmed=false;quick.hidden=true;quickButton.setAttribute('aria-expanded','false');}
  });
  document.addEventListener('pointerdown',event=>{
    if(event.pointerType==='pen'&&event.button===0&&event.target instanceof Element&&event.target.closest('.surface'))
      penDrawing=event.pointerId;
    if(quick.hidden||dialog.open)return;
    if(!(event.target instanceof Node)||quick.contains(event.target)||quickButton.contains(event.target)||ringTopbar.contains(event.target))return;
    quick.hidden=true;quickButton.setAttribute('aria-expanded','false');
  },{capture:true});
  renderQuick();
  const refresh=()=>{renderQuick();if(dialog.open)renderSearch();};
  return {
    list:()=>dynamicCommands().map(({id,label,category})=>({id,label,category})),
    registerProvider:(provider:()=>readonly CommandDefinition[])=>{
      providers.push(provider);refresh();
      return ()=>{const i=providers.indexOf(provider);if(i>=0)providers.splice(i,1);refresh();};
    },
    refresh,contextKey:execution?.contextKey,
    invoke:(id:string)=>{
      const command=find(id);
      if(!command)return {ok:false,reason:'この機能はまだ利用できません。'};
      const reason=command.availability();
      if(reason)return {ok:false,reason};
      try{
        const outcome=command.execute();
        if(outcome instanceof Promise)void outcome.catch(error=>{
          status.textContent=error instanceof Error?error.message:'操作を実行できませんでした。';
        });
        remember(id);renderQuick();
        return {ok:true,reason:null};
      }catch(error){return {ok:false,reason:error instanceof Error?error.message:'実行できませんでした。'};}
    },
    invokeAsync:async(id:string)=>{
      const command=find(id);
      if(!command)return {ok:false,reason:'この機能はまだ利用できません。',settled:false};
      const result=await invokeCommandAsync(command,execution?.contextKey);
      if(result.ok){remember(id);renderQuick();}
      return result;
    },
  };
}
