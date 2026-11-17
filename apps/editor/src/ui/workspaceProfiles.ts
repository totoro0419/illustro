import type {FloatPlacement,FloatingPanelService} from './floatingPanels';
import type {ToolLayout,ToolbarSettingsService} from './toolbarSettings';
import {validateShortcutSettings} from './shortcutSettings';
/** C04 UI-002 / UI-006: personal layout state only; artwork undo is untouched. */
type WorkspaceLayout=Readonly<{
  width:number;leftHanded:boolean;compact:boolean;
  boxes:readonly string[];expanded:Readonly<Record<string,boolean>>;floats:readonly FloatPlacement[];tools:ToolLayout;
}>;
type Profile=Readonly<{name:string;layout:WorkspaceLayout}>;
type ProfileFile=Readonly<{schema:'illustro.workspace.profiles';version:1;profiles:readonly Profile[]}>;
const KEY='illustro.c04.workspace.profiles.v1';
const ORDER_KEY='illustro.c04.workspace.box-order';
const HANDED_KEY='illustro.c04.workspace.left-handed';
const DENSITY_KEY='illustro.c04.workspace.compact-density';
const SHORTCUT_KEY='illustro.c04.shortcut-settings.v1';
const BUNDLE_SCHEMA='illustro.c04.workspace-shortcuts';
const own=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const read=(k:string)=>{try{return localStorage.getItem(k)}catch{return null;}};
const write=(k:string,v:string)=>{try{localStorage.setItem(k,v);return true;}catch{return false;}};
const knownBoxes=()=>[...document.querySelectorAll<HTMLElement>('#boxStack .workspace-box[data-box-id]')];
function normalLayout(value:unknown,existing:readonly string[]):WorkspaceLayout{
  if(!own(value)||typeof value.width!=='number'||!Number.isFinite(value.width)||
    typeof value.leftHanded!=='boolean'||typeof value.compact!=='boolean'||
    !Array.isArray(value.boxes)||!own(value.expanded))throw new Error('作業欄の設定形式が正しくありません。');
  const boxes=(value.boxes as unknown[]).filter((v):v is string=>typeof v==='string');
  if(boxes.length!==(value.boxes as unknown[]).length||boxes.length>100||new Set(boxes).size!==boxes.length)throw new Error('作業欄の並び順が正しくありません。');
  const expanded:Record<string,boolean>={};
  for(const key of existing){
    const entry=value.expanded[key];
    if(typeof entry==='boolean')expanded[key]=entry;
  }
  return {width:Math.min(440,Math.max(288,Math.round(value.width))),
    leftHanded:value.leftHanded,compact:value.compact,boxes,expanded,
    floats:Array.isArray(value.floats)?value.floats.filter((p):p is FloatPlacement=>!!p&&typeof p==='object'&&typeof p.id==='string'&&['x','y','width','height'].every(k=>Number.isFinite(p[k]))):[],
    tools:own(value.tools)&&Array.isArray(value.tools.order)&&Array.isArray(value.tools.hidden)?
      {order:value.tools.order.filter((id):id is string=>typeof id==='string'),
       hidden:value.tools.hidden.filter((id):id is string=>typeof id==='string')}:{order:[],hidden:[]}};
}
function parseFile(value:unknown,existing:readonly string[]):Profile[]{
  if(!own(value)||value.schema!=='illustro.workspace.profiles'||value.version!==1||
    !Array.isArray(value.profiles)||value.profiles.length>32)throw new Error('対応していないWorkspace設定ファイルです。');
  const profiles:Profile[]=[];
  for(const item of value.profiles){
    if(!own(item)||typeof item.name!=='string'||!item.name.trim()||item.name.length>80)throw new Error('設定名が正しくありません。');
    if(profiles.some(profile=>profile.name===item.name))throw new Error('同じ名前が複数あります。');
    profiles.push({name:item.name,layout:normalLayout(item.layout,existing)});
  }
  return profiles;
}
/** Verify an imported workspace profile file without changing saved settings. */
export function validateWorkspaceProfiles(value:unknown,existing:readonly string[]):void{parseFile(value,existing);}
const toFile=(profiles:readonly Profile[]):ProfileFile=>({schema:'illustro.workspace.profiles',version:1,profiles});
function download(name:string,text:string){
  const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),0);
}

export type WorkspaceImportService=Readonly<{importText:(json:string)=>number}>;
export function installWorkspaceProfiles(
  floating:FloatingPanelService,toolbar:ToolbarSettingsService
):WorkspaceImportService|null{
  const panel=document.getElementById('workspaceBoxBody');
  const stackElement=document.getElementById('boxStack');
  const widthElement=document.getElementById('width');
  if(!panel||!stackElement||!(widthElement instanceof HTMLInputElement))return null;
  const stack=stackElement,width=widthElement;
  const boxIds=()=>[...stack.children].map(node=>node instanceof HTMLElement
    ?node.dataset.boxId??node.dataset.placeholderFor:null).filter((value):value is string=>!!value);
  let profiles:Profile[]=[];
  try{profiles=parseFile(JSON.parse(read(KEY)||'null'),boxIds());}catch{/* initial state */}
  const settings=document.createElement('section');settings.className='c04-workspace-settings';
  const title=document.createElement('h4');title.textContent='作業場を保存する';
  const select=document.createElement('select');select.setAttribute('aria-label','保存した作業場');
  const name=document.createElement('input');name.type='text';name.maxLength=80;name.placeholder='作業場の名前';
  const save=document.createElement('button'),apply=document.createElement('button'),remove=document.createElement('button');
  const reset=document.createElement('button'),exportButton=document.createElement('button'),importButton=document.createElement('button');
  const bundleExport=document.createElement('button'),bundleImport=document.createElement('button');
  save.textContent='今の配置を保存';apply.textContent='この配置に戻す';remove.textContent='削除';
  reset.textContent='初期配置に戻す';exportButton.textContent='設定を書き出す';importButton.textContent='設定を読み込む';
  bundleExport.textContent='作業場とキー設定をまとめて書き出す';
  bundleImport.textContent='作業場とキー設定をまとめて読み込む';
  const file=document.createElement('input');file.type='file';file.accept='application/json,.json';file.hidden=true;
  const bundleFile=document.createElement('input');bundleFile.type='file';bundleFile.accept='application/json,.json';bundleFile.hidden=true;
  const handed=document.createElement('input');handed.type='checkbox';
  const density=document.createElement('input');density.type='checkbox';
  const handedLabel=document.createElement('label');handedLabel.append(handed,document.createTextNode(' 左利き用に左右を入れ替える'));
  const densityLabel=document.createElement('label');densityLabel.append(density,document.createTextNode(' 画面の表示をコンパクトにする'));
  const status=document.createElement('output');status.setAttribute('role','status');
  const row=document.createElement('div');row.className='c04-workspace-actions';
  row.append(save,apply,remove,reset,exportButton,importButton,bundleExport,bundleImport);
  const preview=document.createElement('dialog');preview.className='c04-layout-preview';
  const previewTitle=document.createElement('h3');previewTitle.textContent='この作業場を使いますか？';
  const previewText=document.createElement('p');previewText.textContent='背景の配置を確認してください。キャンセルすると以前の配置へ戻ります。';
  const previewAccept=document.createElement('button');previewAccept.type='button';previewAccept.textContent='この配置を使う';
  const previewReject=document.createElement('button');previewReject.type='button';previewReject.textContent='元の配置に戻す';
  const previewActions=document.createElement('div');previewActions.className='c04-workspace-actions';
  previewActions.append(previewAccept,previewReject);preview.append(previewTitle,previewText,previewActions);
  document.body.append(preview);
  const presetLabel=document.createElement('label');presetLabel.textContent='標準の配置';
  const presetSelect=document.createElement('select');presetSelect.setAttribute('aria-label','用途に合わせた標準の配置');
  for(const [key,label] of [
    ['drawing','線画'],['painting','塗り'],['coloring','色塗り'],['photo','写真・資料'],
    ['pixel','ドット絵'],['minimal','最小限']
  ] as const)presetSelect.add(new Option(label,key));
  const presetApply=document.createElement('button');presetApply.type='button';presetApply.textContent='標準の配置を試す';
  presetLabel.append(presetSelect);settings.append(title,presetLabel,presetApply,name,select,row,handedLabel,densityLabel,file,bundleFile,status);
  panel.append(settings);
  const orderSaved=()=>{
    try{const order=JSON.parse(read(ORDER_KEY)||'null');return Array.isArray(order)?order.filter((v):v is string=>typeof v==='string'):[]}catch{return [];}
  };
  const rearrange=(order:readonly string[])=>{
    const children=new Map([...stack.children].filter((n):n is HTMLElement=>n instanceof HTMLElement)
      .map(n=>[n.dataset.boxId??n.dataset.placeholderFor??'',n]));
    const ids=[...order.filter(id=>children.has(id)),...boxIds().filter(id=>!order.includes(id))];
    for(const id of ids){const child=children.get(id);if(child)stack.append(child);}
    write(ORDER_KEY,JSON.stringify(boxIds()));
  };
  function snapshot():WorkspaceLayout{
    const expanded:Record<string,boolean>={};
    for(const box of knownBoxes())expanded[box.dataset.boxId!]=box.querySelector<HTMLButtonElement>('.box-toggle')?.getAttribute('aria-expanded')==='true';
    return {width:Number(width.value),leftHanded:handed.checked,compact:density.checked,boxes:boxIds(),expanded,floats:floating.snapshot(),tools:toolbar.snapshot()};
  }
  function setHanded(left:boolean){
    document.body.classList.toggle('workspace-left-handed',left);
    handed.checked=left;write(HANDED_KEY,String(left));
  }
  function setDensity(compact:boolean){
    document.body.classList.toggle('workspace-compact-density',compact);
    density.checked=compact;write(DENSITY_KEY,String(compact));
  }
  function applyLayout(layout:WorkspaceLayout){
    setHanded(layout.leftHanded);setDensity(layout.compact);
    floating.reset();rearrange(layout.boxes);
    floating.restore(layout.floats);toolbar.restore(layout.tools);
    width.value=String(layout.width);width.dispatchEvent(new Event('input',{bubbles:true}));
    for(const box of knownBoxes()){
      const desired=layout.expanded[box.dataset.boxId!];
      const toggle=box.querySelector<HTMLButtonElement>('.box-toggle');
      if(toggle&&typeof desired==='boolean'&&(toggle.getAttribute('aria-expanded')==='true')!==desired)toggle.click();
    }
  }
  function choices(selected?:string){
    const current=selected??select.value;
    select.replaceChildren(...profiles.map(profile=>new Option(profile.name,profile.name)));
    if(profiles.some(profile=>profile.name===current))select.value=current;
    const available=profiles.length>0;
    apply.disabled=remove.disabled=!available;
  }
  function persist(next:Profile[]):boolean{
    if(!write(KEY,JSON.stringify(toFile(next)))){
      status.textContent='端末の保存領域を使用できません。設定を書き出してください。';
      return false;
    }
    profiles=next;
    return true;
  }
  function bindMoving(){
    for(const box of knownBoxes()){
      const menu=box.querySelector<HTMLElement>('.box-more-menu');
      if(!menu||menu.querySelector('.c04-move-action'))continue;
      for(const [caption,delta] of [['上へ移動',-1],['下へ移動',1]] as const){
        const button=document.createElement('button');button.className='c04-move-action';
        button.type='button';button.textContent=caption;
        button.onclick=()=>{
          const nodes=knownBoxes(),i=nodes.indexOf(box),j=i+delta;
          if(j<0||j>=nodes.length)return;
          if(delta<0)stack.insertBefore(box,nodes[j]!);
          else stack.insertBefore(nodes[j]!,box);
          write(ORDER_KEY,JSON.stringify(boxIds()));
          menu.hidden=true;
          menu.closest('.workspace-box')?.querySelector('.box-more')?.setAttribute('aria-expanded','false');
          status.textContent='作業欄の順番を変更しました。';
        };
        menu.append(button);
      }
    }
  }
  select.onchange=()=>{name.value=select.value;};
  save.onclick=()=>{
    const label=name.value.trim();
    if(!label){status.textContent='保存する名前を入力してください。';return;}
    const found=profiles.findIndex(p=>p.name===label);
    if(found<0&&profiles.length>=32){status.textContent='保存できる配置は32件までです。';return;}
    const profile={name:label,layout:snapshot()};
    const next=[...profiles];
    if(found>=0)next[found]=profile;else next.push(profile);
    if(!persist(next))return;
    choices(label);status.textContent='現在の配置を「'+label+'」として保存しました。';
  };
  let rollback:WorkspaceLayout|null=null;
  const revert=()=>{if(rollback)applyLayout(rollback);rollback=null;};
  previewAccept.onclick=()=>{rollback=null;preview.close();status.textContent='この作業場を使います。';};
  previewReject.onclick=()=>{revert();preview.close();status.textContent='元の配置に戻しました。';};
  preview.addEventListener('cancel',revert);
  function tryLayout(layout:WorkspaceLayout,label:string){
    if(preview.open)return;
    rollback=snapshot();applyLayout(layout);
    previewTitle.textContent='「'+label+'」の配置を使いますか？';
    preview.showModal();
  }
  apply.onclick=()=>{
    const profile=profiles.find(p=>p.name===select.value);if(!profile)return;
    tryLayout(profile.layout,profile.name);
    name.value=profile.name;
  };
  presetApply.onclick=()=>{
    const choices:Readonly<Record<string,readonly string[]>>={
      drawing:['right.layers','right.brush','right.navigator'],
      painting:['right.layers','right.brush','right.color','right.reference'],
      coloring:['right.color','right.layers','right.brush','right.navigator'],
      photo:['right.reference','right.assets','right.effects','right.layers'],
      pixel:['right.color','right.layers','right.navigator'],
      minimal:['right.brush'],
    };
    const original=snapshot(),open=choices[presetSelect.value]??[];
    const expanded=Object.fromEntries(boxIds().map(id=>[id,open.includes(id)]));
    const layout:WorkspaceLayout={...original,expanded,compact:presetSelect.value==='minimal',floats:[]};
    tryLayout(layout,presetSelect.selectedOptions[0]?.textContent??'標準');
  };
  remove.onclick=()=>{
    const label=select.value,profile=profiles.find(p=>p.name===label);if(!profile)return;
    if(!window.confirm('「'+label+'」の保存済み配置を削除しますか？'))return;
    if(!persist(profiles.filter(p=>p!==profile)))return;
    choices();status.textContent='保存済み配置を削除しました。';
  };
  reset.onclick=()=>{
    if(!window.confirm('作業欄の表示と並び順を初期状態に戻しますか？ 作品の内容は変更されません。'))return;
    setHanded(false);setDensity(false);floating.reset();toolbar.reset();
    const original=[...stack.querySelectorAll<HTMLElement>('.workspace-box[data-box-id]')]
      .sort((a,b)=>DEFAULT_ORDER.indexOf(a.dataset.boxId!)-DEFAULT_ORDER.indexOf(b.dataset.boxId!));
    for(const box of original)stack.append(box);
    write(ORDER_KEY,JSON.stringify(boxIds()));
    document.getElementById('resetWidth')?.click();
    status.textContent='初期の作業場に戻しました。';
  };
  exportButton.onclick=()=>download('illustro-workspaces.json',JSON.stringify(toFile(profiles),null,2));
  importButton.onclick=()=>file.click();
  bundleExport.onclick=()=>{
    try{
      const savedShortcuts=read(SHORTCUT_KEY);
      const shortcutValue=savedShortcuts
        ?JSON.parse(savedShortcuts) as unknown
        :{schema:'illustro.user.shortcuts',version:1,bindings:[]};
      validateShortcutSettings(shortcutValue);
      // Both sections keep their original independent versioned storage.
      download('illustro-workspace-shortcuts.json',JSON.stringify({
        schema:BUNDLE_SCHEMA,version:1,workspace:toFile(profiles),shortcuts:shortcutValue
      },null,2));
      status.textContent='作業場とキー設定を一つのファイルに書き出しました。';
    }catch{status.textContent='キー設定に問題があるため、まとめて書き出せませんでした。';}
  };
  bundleImport.onclick=()=>bundleFile.click();
  bundleFile.onchange=async()=>{
    const source=bundleFile.files?.[0];bundleFile.value='';if(!source)return;
    try{
      if(source.size>1048576)throw Error('ファイルが大きすぎます。');
      const value=JSON.parse(await source.text()) as unknown;
      if(!own(value)||value.schema!==BUNDLE_SCHEMA||value.version!==1)
        throw Error('対応していない一括設定ファイルです。');
      const importedProfiles=parseFile(value.workspace,boxIds());
      validateShortcutSettings(value.shortcuts);
      if(!window.confirm('保存済みの作業場とキー設定を、このファイルの内容で置き換えますか？ 現在の作品は変更しません。'))return;
      const oldWorkspace=read(KEY),oldShortcuts=read(SHORTCUT_KEY);
      try{
        localStorage.setItem(KEY,JSON.stringify(value.workspace));
        localStorage.setItem(SHORTCUT_KEY,JSON.stringify(value.shortcuts));
      }catch{
        let reverted=true;
        try{
          if(oldWorkspace===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,oldWorkspace);
          if(oldShortcuts===null)localStorage.removeItem(SHORTCUT_KEY);else localStorage.setItem(SHORTCUT_KEY,oldShortcuts);
        }catch{reverted=false;}
        throw Error(reverted?'設定を保存できませんでした。以前の設定を維持しました。'
          :'保存に失敗し、一部の設定を元に戻せない可能性があります。書き出した設定を保管してください。');
      }
      profiles=importedProfiles;choices(importedProfiles[0]?.name);
      status.textContent='一括設定を保存しました。キー設定を反映するには、作品を保存したあとで画面を再読み込みしてください。';
    }catch(error){status.textContent=error instanceof Error?error.message:'一括設定を読み込めませんでした。';}
  };
  function importText(json:string):number{
    if(json.length>1048576)throw Error('ファイルが大きすぎます。');
    const imported=parseFile(JSON.parse(json),boxIds());
    const duplicate=imported.filter(x=>profiles.some(p=>p.name===x.name)).map(x=>x.name);
    if(duplicate.length&&!window.confirm('同名の設定 '+duplicate.join('、')+' を置き換えますか？'))return 0;
    const merged=profiles.filter(x=>!imported.some(y=>y.name===x.name)).concat(imported);
    if(merged.length>32)throw Error('保存できる配置は32件までです。');
    if(!persist(merged))throw Error('作業場の設定を保存できませんでした。');
    choices(imported[0]?.name);
    status.textContent=imported.length+'件の配置を読み込みました。対応しないパネルは元のまま残します。';
    return imported.length;
  }
  file.onchange=async()=>{
    const source=file.files?.[0];file.value='';if(!source)return;
    try{
      if(source.size>1048576)throw new Error('ファイルが大きすぎます。');
      importText(await source.text());
    }catch(e){status.textContent=e instanceof Error?e.message:'設定を読み込めませんでした。';}
  };
  handed.onchange=()=>setHanded(handed.checked);
  density.onchange=()=>setDensity(density.checked);
  rearrange(orderSaved());
  setHanded(read(HANDED_KEY)==='true');setDensity(read(DENSITY_KEY)==='true');
  choices();bindMoving();
  return {importText};
}
const DEFAULT_ORDER=[
 'right.layers','right.color','right.brush','right.inspector','right.reference','right.assets',
 'right.effects','right.navigator','right.history','right.automation','right.document','right.workspace'
];
