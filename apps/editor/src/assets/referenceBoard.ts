/**
 * C05 floating reference windows. No reference content enters the artwork
 * renderer, saved raster tiles or exported composited images.
 */
import {readBoard,writeBoard,decodeBoardRecord,newBoardItem,type BoardSnapshot,type BoardItem} from './referenceBoardStore';
import {getAsset,addAsset,type AssetEntry} from './library';
import {canReuseExternalReference,parseExternalReferences,type ExternalReference} from './referenceBundleMode';
import {referenceFrameKey} from './referenceFrameKey';
import {exportAssetPack,importAssetPack,readAssetPack,type PackManifest} from './packs';
import type {PortableSectionInput} from '../persistence/format';
import type {PreservedPortableData} from '../persistence/portable';
import type {ForegroundColor} from '../color/model';
export type ReferenceBoardService=Readonly<{
  add:(assetId:string)=>Promise<void>;
  refresh:()=>Promise<void>;
  refreshIfChanged:()=>Promise<void>;
  flush:()=>Promise<void>;
  exportLayout:()=>Promise<Blob>;
  undo:()=>Promise<void>;
  redo:()=>Promise<void>;
  exportNative:()=>Promise<PortableSectionInput|null>;
  importNative:(preserved:PreservedPortableData|undefined)=>Promise<void>;
}>;
type Options=Readonly<{
  getDocumentId:()=>string|null;
  onPickColor:(assetId:string)=>Promise<void>;
  color:ForegroundColor;
}>;
const input=(label:string,handler:()=>void)=>{
  const btn=document.createElement('button');btn.type='button';btn.textContent=label;btn.onclick=handler;return btn;
};
const safePos=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
/** Explicitly replace a stale embedded bundle if references cannot be exported. */
export function referenceUnavailableSection(documentId:string):PortableSectionInput{
  if(!documentId)throw Error('参考資料の作品IDがありません。');
  return {
    id:'c05.reference-board',type:'reference.board.embedded.v1',required:false,
    bytes:new TextEncoder().encode(JSON.stringify({
      schema:'illustro.reference-unavailable',version:1,documentId
    }))
  };
}
export function installReferenceBoard(options:Options):ReferenceBoardService{
  const panel=document.getElementById('referenceBoxBody');
  if(!panel)return {
    add:async()=>{},refresh:async()=>{},refreshIfChanged:async()=>{},flush:async()=>{},
    exportLayout:async()=>new Blob(),undo:async()=>{},redo:async()=>{},
    exportNative:async()=>null,importNative:async()=>{}
  };
  panel.replaceChildren();
  const root=document.createElement('div');root.className='c05-reference-editor';
  const title=document.createElement('h4');title.textContent='参考資料';
  const intro=document.createElement('p');
  intro.textContent='絵とは別に資料を表示します。印刷や画像への書き出しには含めません。';
  const list=document.createElement('div');list.className='c05-reference-list';
  const navigator=document.createElement('details');navigator.className='c05-reference-navigator';
  const navTitle=document.createElement('summary');navTitle.textContent='資料の全体と細部を見る';
  const navSelect=document.createElement('select');navSelect.setAttribute('aria-label','ナビゲーターで見る資料');
  const navPair=document.createElement('div');navPair.className='c05-reference-nav-pair';
  const navFull=document.createElement('div'),navDetail=document.createElement('div');
  navFull.className='c05-reference-nav-full';navDetail.className='c05-reference-nav-detail';
  navPair.append(navFull,navDetail);
  const navHelp=document.createElement('p');navHelp.textContent='左は資料全体、右は拡大した詳細です。左の画像を押すと表示位置を調整します。';
  navigator.append(navTitle,navSelect,navHelp,navPair);
  const status=document.createElement('output');status.setAttribute('role','status');
  const buttons=document.createElement('div');buttons.className='c05-reference-actions';
  const show=input('資料を表示 / 隠す',()=>void toggleVisibility());
  const undoButton=input('資料の操作を戻す',()=>void undo());
  const redoButton=input('資料をやり直す',()=>void redo());
  const exportButton=input('配置を書き出す',()=>void exportLayout().then(blob=>download('illustro-reference-layout.json',blob)).catch(error));
  const refreshButton=input('表示を更新',()=>void refresh());
  buttons.append(show,undoButton,redoButton,exportButton,refreshButton);
  const groupRow=document.createElement('div');groupRow.className='c05-reference-groups';
  const groupSelect=document.createElement('select');groupSelect.setAttribute('aria-label','資料のグループ');
  const groupToggle=input('グループを隠す',()=>void toggleGroup());
  groupRow.append(groupSelect,groupToggle);
  const nativeMode=document.createElement('select');
  nativeMode.setAttribute('aria-label','作品ファイルに参考画像を含めるか');
  nativeMode.add(new Option('画像を作品ファイルに含める（別端末でも開ける）','embedded'));
  nativeMode.add(new Option('この端末の素材庫を参照（画像は含めない）','linked'));
  const modeLabel=document.createElement('label');modeLabel.className='c05-reference-native-mode';
  modeLabel.append('作品ファイルの参考画像',nativeMode);
  const modeHelp=document.createElement('p');modeHelp.className='c05-reference-mode-help';
  modeHelp.textContent='画像を含めない場合、別端末や素材庫を削除した後は元画像を選び直す必要があります。';
  root.append(title,intro,buttons,modeLabel,modeHelp,navigator,groupRow,list,status);panel.append(root);
  const canvasLayer=document.createElement('div');canvasLayer.id='c05ReferenceLayer';canvasLayer.className='c05-reference-layer';
  document.body.append(canvasLayer);
  let currentDoc:string|null=null,board:BoardSnapshot|null=null;
  let saving:Promise<void>=Promise.resolve(),transition=0,renderEpoch=0;
  // Retain the newest unconfirmed layout per work in memory: a failed write
  // must not be mistaken for an empty/stale stored board on a rapid switch.
  const pendingBoardWrites=new Map<string,BoardSnapshot>();
  let saveError:unknown=null,temporaryHidden=false;
  const nativeModeKey=(id:string)=>'illustro.c05.reference-native-mode.'+id;
  nativeMode.onchange=()=>{
    const id=options.getDocumentId();
    if(!id)return;
    try{localStorage.setItem(nativeModeKey(id),nativeMode.value);}catch{}
    status.textContent=nativeMode.value==='linked'
      ?'作品ファイルには画像を入れず、端末の素材庫を参照します。別端末では画像の再選択が必要です。'
      :'作品ファイルに参考画像を含めます。';
  };
  let back:BoardSnapshot[]=[],forward:BoardSnapshot[]=[];
  const urls=new Map<string,string>();
  const assetCache=new Map<string,AssetEntry|null>();
  const error=(reason:unknown)=>{status.textContent=reason instanceof Error?reason.message:String(reason);};
  function download(name:string,blob:Blob){
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function snapshot(){if(!board)throw Error('作品がまだ選ばれていません。');return board;}
  const clone=(value:BoardSnapshot):BoardSnapshot=>({
    ...value,items:value.items.map(item=>({...item}))
  });
  const fitWithinWindow=(source:BoardSnapshot):BoardSnapshot=>{
    let changed=false;
    const items=source.items.map(item=>{
      const x=safePos(item.x,0,Math.max(0,innerWidth-100));
      const y=safePos(item.y,0,Math.max(0,innerHeight-70));
      if(x===item.x&&y===item.y)return item;
      changed=true;return {...item,x,y};
    });
    return changed?{...source,items}:source;
  };
  function syncAfter(change:BoardSnapshot,history=true){
    if(!board||board.documentId!==change.documentId)return;
    if(history){back.push(clone(board));if(back.length>60)back.shift();forward=[];}
    board=change;
    const pending=clone(change);
    pendingBoardWrites.set(change.documentId,pending);
    // Each write keeps the exact document and snapshot it was queued for.
    saving=saving.then(()=>writeBoard(pending),()=>writeBoard(pending))
      .then(()=>{
        if(pendingBoardWrites.get(change.documentId)===pending)
          pendingBoardWrites.delete(change.documentId);
        saveError=null;
      },reason=>{saveError=reason;error(reason);});
    void render().catch(error);drawList();
  }
  async function refreshIfChanged(){
    const id=options.getDocumentId();
    if(id===currentDoc)return;
    currentDoc=id;transition++;back=[];forward=[];board=null;temporaryHidden=false;
    nativeMode.disabled=!id;
    let remembered='embedded';
    if(id)try{remembered=localStorage.getItem(nativeModeKey(id))??'embedded';}catch{}
    nativeMode.value=remembered==='linked'?'linked':'embedded';
    for(const url of urls.values())URL.revokeObjectURL(url);
    urls.clear();assetCache.clear();canvasLayer.replaceChildren();list.replaceChildren();
    if(!id){status.textContent='作品を開くと、資料を並べられます。';return;}
    try{
      const current=transition;
      // Wait for older work's outstanding writes before reading this work.
      // Otherwise rapid A→B→A switches can resurrect an old board and save it.
      await saving;
      const unconfirmed=pendingBoardWrites.get(id);
      const data=unconfirmed??await readBoard(id);
      if(current!==transition||id!==currentDoc)return;
      board=data;temporaryHidden=false;
      if(unconfirmed)status.textContent='資料の最新配置はまだ端末へ保存できていません。配置を書き出して保護してください。';
      const fitted=fitWithinWindow(data);
      if(fitted!==data)syncAfter(fitted,false);
      else {await render();drawList();}
    }catch(e){error(e);}
  }
  async function refresh(){
    currentDoc=null;assetCache.clear();await refreshIfChanged();
  }
  async function add(assetId:string){
    await refreshIfChanged();
    if(!board)throw Error('作品を開いてから資料を追加してください。');
    const targetDocument=board.documentId;
    const asset=await getAsset(assetId);
    if(board?.documentId!==targetDocument||options.getDocumentId()!==targetDocument)
      throw Error('作品を切り替えたため、参考資料の追加を中止しました。');
    if(!asset||asset.deleted||asset.kind!=='reference'||!asset.mime.startsWith('image/'))
      throw Error('この素材は参考画像として開けません。');
    if(board.items.length>=80)throw Error('資料は1作品80枚までです。');
    syncAfter({...board,items:[...board.items,newBoardItem(assetId,board.items.length)]});
    status.textContent='資料を追加しました。';
  }
  function changeItem(itemId:string,patch:Partial<BoardItem>,history=true){
    const prior=snapshot(),item=prior.items.find(x=>x.id===itemId);
    if(!item)return;
    const next={...item,...patch};
    syncAfter({...prior,items:prior.items.map(x=>x.id===itemId?next:x)},history);
  }
  function removeItem(itemId:string){
    const prior=snapshot();
    const target=prior.items.find(x=>x.id===itemId);if(!target)return;
    if(!window.confirm('この資料を作品の資料ボードから外しますか？ 素材庫の元画像は残ります。'))return;
    syncAfter({...prior,items:prior.items.filter(x=>x.id!==itemId)});
  }
  async function toggleVisibility(){
    await refreshIfChanged();if(!board)return;
    temporaryHidden=!temporaryHidden;
    canvasLayer.hidden=temporaryHidden;
    drawList();
  }
  async function undo(){
    if(!board||!back.length)return;
    forward.push(clone(board));board=back.pop()!;
    syncAfter(board,false);
  }
  async function redo(){
    if(!board||!forward.length)return;
    back.push(clone(board));board=forward.pop()!;
    syncAfter(board,false);
  }
  async function flush(){await saving;if(saveError)throw saveError;}
  async function exportLayout(){
    await refreshIfChanged();if(!board)throw Error('作品がありません。');
    await flush();
    return new Blob([JSON.stringify(board,null,2)],{type:'application/json'});
  }
  const NATIVE_ID='c05.reference-board';
  const NATIVE_TYPE='reference.board.embedded.v1';
  async function exportNative():Promise<PortableSectionInput|null>{
    const id=options.getDocumentId();
    if(!id)return null;
    let current:BoardSnapshot;
    try{current=board?.documentId===id?clone(board):await readBoard(id);}
    catch{
      // A damaged local reference record must never stop the artwork save. An
      // explicit marker replaces any stale optional section in the saved file.
      const warning='参考資料の配置を読み取れませんでした。作品本体は保存しますが、資料はこのファイルに含まれません。端末側の元データは変更していません。';
      status.textContent=warning;
      window.dispatchEvent(new CustomEvent('illustro:reference-save-warning',{detail:{message:warning,documentId:id,omittedAssetIds:[]}}));
      return referenceUnavailableSection(id);
    }
    // Reference files are optional. Missing or oversized images must not block
    // saving the user's artwork. Keep ALL placements, including missing items,
    // so that the original reference can be reattached later.
    const ids=[...new Set(current.items.map(item=>item.assetId))];
    if(nativeMode.value==='linked'){
      const externalRefs:ExternalReference[]=[],missing:string[]=[];
      for(const assetId of ids){
        let asset:AssetEntry|null=null;
        try{asset=await getAsset(assetId);}catch{/* Keep the placement for manual recovery. */}
        if(asset&&!asset.deleted&&asset.kind==='reference'&&asset.mime.startsWith('image/')&&
          asset.mime.length<=180&&asset.bytes>=1&&asset.bytes<=32*1024*1024){
          externalRefs.push({assetId,name:asset.name,bytes:asset.bytes,mime:asset.mime});
        }else missing.push(assetId);
      }
      if(missing.length){
        const warning=missing.length+'枚の参考画像が素材庫で見つかりません。作品の配置は残します。';
        status.textContent=warning;
        window.dispatchEvent(new CustomEvent('illustro:reference-save-warning',{
          detail:{message:warning,documentId:id,omittedAssetIds:missing}
        }));
      }
      const emptyPack:PackManifest={schema:'illustro.asset-pack',version:1,createdAt:Date.now(),items:[]};
      const data={schema:'illustro.reference-bundle',version:1,storageMode:'linked',
        board:{...current,hidden:false},pack:emptyPack,externalRefs,omittedAssetIds:missing};
      return {id:NATIVE_ID,type:NATIVE_TYPE,required:false,
        bytes:new TextEncoder().encode(JSON.stringify(data))};
    }
    let pack:PackManifest;
    const omitted:string[]=[];
    try{
      pack=await readAssetPack(await exportAssetPack(ids));
    }catch{
      const items:PackManifest['items'][number][]=[];
      let bytes=0;
      for(const assetId of ids){
        try{
          const part=await readAssetPack(await exportAssetPack([assetId]));
          const item=part.items[0];
          if(!item||bytes+item.bytes>48*1024*1024){omitted.push(assetId);continue;}
          items.push(item);bytes+=item.bytes;
        }catch{omitted.push(assetId);}
      }
      pack={schema:'illustro.asset-pack',version:1,createdAt:Date.now(),items};
    }
    if(omitted.length){
      const warning=omitted.length+'件の参考画像を作品ファイルに含められませんでした。絵と資料の配置は保存されます。元の画像を確認してください。';
      status.textContent=warning;
      window.dispatchEvent(new CustomEvent('illustro:reference-save-warning',{detail:{message:warning,documentId:id,omittedAssetIds:omitted}}));
    }
    const data={schema:'illustro.reference-bundle',version:1,board:{...current,hidden:false},pack,omittedAssetIds:omitted};
    return {id:NATIVE_ID,type:NATIVE_TYPE,required:false,bytes:new TextEncoder().encode(JSON.stringify(data))};
  }
  async function importNative(preserved:PreservedPortableData|undefined):Promise<void>{
    const section=preserved?.optionalSections.find(item=>item.id===NATIVE_ID&&item.type===NATIVE_TYPE);
    if(!section)return;
    await refreshIfChanged();
    const doc=options.getDocumentId(),epoch=transition;
    if(!doc||board?.documentId!==doc)return;
    if(section.bytes.byteLength>70*1024*1024)throw Error('作品内の参考資料が大きすぎます。');
    const raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(section.bytes)) as unknown;
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('作品内の参考資料が正しくありません。');
    const data=raw as Record<string,unknown>;
    if(data.schema==='illustro.reference-unavailable')
      throw Error('参考資料が不完全な状態で保存された作品です。絵は開けますが、端末に残る資料を確認してください。');
    if(data.schema!=='illustro.reference-bundle'||data.version!==1||!data.board||!data.pack)
      throw Error('対応していない参考資料データです。');
    // Validate ALL fields (including IDs, pan, rotation, group and duplicate
    // entries) before modifying the stored board or the asset library.
    const incoming=data.board as Partial<BoardSnapshot>;
    if(typeof incoming.documentId!=='string'||!incoming.documentId)
      throw Error('参考資料の保存元作品を確認できません。');
    // A duplicated artwork legitimately has a new document ID, while its
    // portable reference attachment still remembers the source work ID.
    const input=decodeBoardRecord(incoming.documentId,incoming);

    // Never silently prefer a stale local layout over the file being opened.
    // Keep the old layout intact when the user declines replacement.
    if(board.items.length){
      const local=JSON.stringify(board.items.map(item=>({...item,id:null})));
      const incoming=JSON.stringify(input.items.map(item=>({...item,id:null})));
      if(local===incoming){status.textContent='参考資料はすでに読み込まれています。';return;}
      if(!window.confirm('この端末には同じ作品の参考資料が残っています。開いた作品ファイルの資料配置で置き換えますか？\n「キャンセル」で端末側の配置を残します。')){
        status.textContent='端末に保存してある資料配置を残しました。';return;
      }
    }
    const storageMode=data.storageMode===undefined||data.storageMode==='embedded'?'embedded':
      data.storageMode==='linked'?'linked':null;
    if(!storageMode)throw Error('参考画像の保存方式が正しくありません。');
    const externalRefs=storageMode==='linked'?parseExternalReferences(data.externalRefs):[];
    const reusable=new Set<string>();
    if(storageMode==='linked'){
      for(const reference of externalRefs){
        const local=await getAsset(reference.assetId);
        if(canReuseExternalReference(reference,local))reusable.add(reference.assetId);
      }
    }
    const embedded=await readAssetPack(new Blob([JSON.stringify(data.pack)],{type:'application/json'}));
    if(epoch!==transition||options.getDocumentId()!==doc)return;
    const result=await importAssetPack(embedded,{atomic:true});
    assetCache.clear();
    if(epoch!==transition||options.getDocumentId()!==doc)return;
    // If an image that WAS embedded fails to import, never accidentally display
    // an unrelated local image which happens to use the same asset identifier.
    // The missing: prefix retains the original ID for a later repair.
    // Absent embedded assets are ALWAYS placeholders, not unverified local
    // content sharing the same ID. This prevents wrong-reference substitution.
    const resolveId=(id:string)=>result.renamedIds[id]??(reusable.has(id)?id:'missing:'+id);
    const newItems:BoardItem[]=input.items.map((item,index)=>({
      ...newBoardItem(resolveId(item.assetId),index),
      ...item,assetId:resolveId(item.assetId),
      id:crypto.randomUUID()
    }));
    const imported:BoardSnapshot={version:1,documentId:doc,items:newItems,hidden:false};
    const previous=clone(board);
    syncAfter(imported,false);
    try{await flush();}
    catch(error){
      // The original local record is still intact after an IndexedDB failure.
      // Do not leave the UI claiming that an unpersisted import succeeded.
      if(epoch===transition&&board?.documentId===doc){
        board=previous;void render().catch(reason=>{status.textContent=String(reason);});drawList();
      }
      throw error;
    }
    if(epoch!==transition||options.getDocumentId()!==doc)return;
    temporaryHidden=false;
    const missing=new Set([
      ...input.items.filter(item=>!result.renamedIds[item.assetId]&&!reusable.has(item.assetId)).map(item=>item.assetId),
      ...(Array.isArray(data.omittedAssetIds)?data.omittedAssetIds.filter((id):id is string=>typeof id==='string'):[])
    ]);
    status.textContent=newItems.length+'枚の資料配置を読み込みました。'+(missing.size||result.failures.length?
      '元画像が不足している項目があります（'+Math.max(missing.size,result.failures.length)+'件）。配置は保持しました。':'');
  }
  function toggleGroup(){
    if(!board||!groupSelect.value)return;
    const group=groupSelect.value;
    const hidden=board.items.filter(i=>i.group===group).every(i=>i.hidden);
    syncAfter({...board,items:board.items.map(item=>item.group===group?{...item,hidden:!hidden}:item)});
  }
  async function drawNavigator(){
    if(!navigator.open||!board)return;
    const item=board.items.find(entry=>entry.id===navSelect.value)??board.items[0];
    navFull.replaceChildren();navDetail.replaceChildren();
    if(!item)return;
    const asset=await getAsset(item.assetId);
    if(!asset||!asset.mime.startsWith('image/')){
      navFull.textContent='資料がありません。';return;
    }
    let url=urls.get(asset.id);
    if(!url){url=URL.createObjectURL(asset.data);urls.set(asset.id,url);}
    const img=document.createElement('img');img.src=url;img.alt=asset.name;img.draggable=false;
    img.title='表示の中心を変更';img.onclick=event=>{
      const rect=img.getBoundingClientRect();
      if(rect.width<=0||rect.height<=0)return;
      const x=(event.clientX-rect.left)/rect.width-.5;
      const y=(event.clientY-rect.top)/rect.height-.5;
      changeItem(item.id,{panX:-x*item.width*item.zoom,panY:-y*item.height*item.zoom});
    };
    navFull.append(img);
    const detail=document.createElement('img');detail.src=url;detail.alt=asset.name+'の細部';
    detail.style.transform='translate('+item.panX/2+'px,'+item.panY/2+'px) rotate('+item.rotation+'deg) '+
      'scale('+(item.zoom*(item.flipX?-1:1))+','+(item.zoom*(item.flipY?-1:1))+')';
    detail.style.filter=item.grayscale?'grayscale(1)':'';
    navDetail.append(detail);
  }
  navigator.addEventListener('toggle',()=>{if(navigator.open)void drawNavigator().catch(error);});
  navSelect.onchange=()=>void drawNavigator().catch(error);
  function drawList(){
    list.replaceChildren();const current=board;
    undoButton.disabled=!back.length;redoButton.disabled=!forward.length;
    if(!current){list.textContent='作品を開いてください。';return;}
    const currentNav=navSelect.value;
    navSelect.replaceChildren(...current.items.map((item,index)=>
      new Option((item.group?item.group+' / ':'')+'資料 '+(index+1),item.id)));
    if(current.items.some(item=>item.id===currentNav))navSelect.value=currentNav;
    if(navigator.open)void drawNavigator().catch(error);
    const group=groupSelect.value;
    const groups=[...new Set(current.items.map(i=>i.group).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja-JP'));
    groupSelect.replaceChildren(new Option('グループを選ぶ',''),...groups.map(value=>new Option(value,value)));
    if(groups.includes(group))groupSelect.value=group;
    groupToggle.disabled=!groupSelect.value;
    const members=current.items.filter(i=>i.group===groupSelect.value);
    groupToggle.textContent=members.length&&members.every(i=>i.hidden)?'グループを再表示':'グループを隠す';
    show.textContent=temporaryHidden?'資料をすべて再表示':'資料を一時的に隠す';
    for(const item of current.items){
      const row=document.createElement('div');row.className='c05-reference-row';
      const name=document.createElement('span');name.textContent='資料 '+item.assetId.slice(0,8);
      const groupName=item.group?'（'+item.group+'）':'';
      name.textContent='資料 '+item.assetId.slice(0,8)+groupName;
      void getAsset(item.assetId).then(asset=>{
        if(row.isConnected)name.textContent=(asset?.name??'不足している資料')+groupName;
      }).catch(()=>{});
      const groupButton=input('グループ',()=>{
        const name=window.prompt('この資料のグループ名（空欄で解除）',item.group);
        if(name!==null)changeItem(item.id,{group:name.trim().slice(0,60)});
      });
      const pin=input(item.pinned?'固定解除':'位置を固定',()=>changeItem(item.id,{pinned:!item.pinned}));
      const visible=input(item.hidden?'再表示':'隠す',()=>changeItem(item.id,{hidden:!item.hidden}));
      const sample=input('採色',()=>void options.onPickColor(item.assetId).catch(error));
      const remove=input('外す',()=>removeItem(item.id));
      row.append(name,groupButton,pin,visible,sample,remove);list.append(row);
    }
  }
  async function render(){
    const epoch=++renderEpoch,snapshotBoard=board;
    if(!snapshotBoard)return;
    const update=transition;
    // Read assets concurrently and swap the complete view only once. Previous
    // windows stay visible while an IndexedDB lookup is in progress.
    const visible=snapshotBoard.items.filter(item=>!item.hidden);
    const resolved=await Promise.all(visible.map(async item=>{
      let asset:AssetEntry|null;
      if(assetCache.has(item.assetId))asset=assetCache.get(item.assetId)??null;
      else{
        asset=await getAsset(item.assetId);
        assetCache.set(item.assetId,asset);
      }
      return {item,asset};
    }));
    if(epoch!==renderEpoch||update!==transition||board?.documentId!==snapshotBoard.documentId)return;
    const needed=new Set(snapshotBoard.items.map(i=>i.assetId));
    for(const [id,url] of urls)if(!needed.has(id)){URL.revokeObjectURL(url);urls.delete(id);}
    const existing=new Map([...canvasLayer.querySelectorAll<HTMLElement>(':scope > .c05-reference-frame')]
      .map(frame=>[frame.dataset.referenceId??'',frame]));
    const desired:HTMLElement[]=[];
    canvasLayer.hidden=temporaryHidden;
    for(const {item,asset} of resolved){
      const signature=referenceFrameKey(item,asset);
      const retained=existing.get(item.id);
      if(retained?.dataset.referenceSignature===signature){
        desired.push(retained);
        continue;
      }
      const frame=document.createElement('section');frame.className='c05-reference-frame';
      frame.dataset.referenceSignature=signature;
      frame.style.left=item.x+'px';frame.style.top=item.y+'px';
      frame.style.width=item.width+'px';frame.style.height=item.height+'px';
      if(item.front)frame.classList.add('c05-reference-front');
      frame.dataset.referenceId=item.id;
      const heading=document.createElement('header');heading.className='c05-reference-heading';
      const label=document.createElement('strong');label.textContent=asset?.name??'資料が見つかりません';
      const pin=input(item.pinned?'固定中':'固定',()=>changeItem(item.id,{pinned:!item.pinned}));
      heading.append(label,pin);
      const imageArea=document.createElement('div');imageArea.className='c05-reference-image-area';
      const image=document.createElement('img');image.alt=asset?.name??'資料';
      image.draggable=false;
      if(asset?.data instanceof Blob&&asset.mime.startsWith('image/')){
        let url=urls.get(asset.id);
        if(!url){url=URL.createObjectURL(asset.data);urls.set(asset.id,url);}
        image.src=url;
      }else{
        const missing=document.createElement('p');missing.textContent='参照画像が見つかりません。素材庫から元データを復元してください。';
        imageArea.append(missing);
      }
      image.style.transform='translate('+item.panX+'px,'+item.panY+'px) '+
        'rotate('+item.rotation+'deg) scale('+(item.zoom*(item.flipX?-1:1))+','+(item.zoom*(item.flipY?-1:1))+')';
      image.style.filter=item.grayscale?'grayscale(1)':'';
      if(image.src)imageArea.append(image);
      const footer=document.createElement('footer');footer.className='c05-reference-tools';
      const tool=(title:string,fn:()=>void)=>footer.append(input(title,fn));
      tool('拡大',()=>changeItem(item.id,{zoom:Math.min(16,item.zoom*1.2)}));
      tool('縮小',()=>changeItem(item.id,{zoom:Math.max(.1,item.zoom/1.2)}));
      tool('回転',()=>changeItem(item.id,{rotation:(item.rotation+90)%360}));
      tool('左右反転',()=>changeItem(item.id,{flipX:!item.flipX}));
      tool('上下反転',()=>changeItem(item.id,{flipY:!item.flipY}));
      tool('グレー',()=>changeItem(item.id,{grayscale:!item.grayscale}));
      tool('採色',()=>void options.onPickColor(item.assetId).catch(error));
      const resize=document.createElement('button');resize.className='c05-reference-resize';resize.type='button';resize.title='右下を動かして大きさを変更';resize.textContent='↘';
      const attachDrag=(handle:HTMLElement,mode:'frame'|'size'|'image')=>{
        let start:{id:number;x:number;y:number;item:BoardItem}|null=null;
        handle.style.touchAction='none';
        handle.addEventListener('pointerdown',event=>{
          if(item.pinned||event.button!==0)return;
          if(event.target instanceof Element&&event.target.closest('button'))return;
          event.preventDefault();event.stopPropagation();
          start={id:event.pointerId,x:event.clientX,y:event.clientY,item};
          handle.setPointerCapture(event.pointerId);
        });
        handle.addEventListener('pointermove',event=>{
          if(!start||event.pointerId!==start.id)return;
          const dx=event.clientX-start.x,dy=event.clientY-start.y;
          if(mode==='frame'){
            frame.style.left=safePos(start.item.x+dx,0,Math.max(0,innerWidth-100))+'px';
            frame.style.top=safePos(start.item.y+dy,0,Math.max(0,innerHeight-70))+'px';
          }else if(mode==='size'){
            frame.style.width=safePos(start.item.width+dx,160,Math.max(180,innerWidth-20))+'px';
            frame.style.height=safePos(start.item.height+dy,120,Math.max(140,innerHeight-30))+'px';
          }else{
            image.style.transform='translate('+(start.item.panX+dx)+'px,'+(start.item.panY+dy)+'px) '+
              'rotate('+item.rotation+'deg) scale('+(item.zoom*(item.flipX?-1:1))+','+(item.zoom*(item.flipY?-1:1))+')';
          }
        });
        const finish=(event:PointerEvent,cancelled:boolean)=>{
          if(!start||event.pointerId!==start.id)return;
          const from=start;start=null;
          if(cancelled)return;
          const dx=event.clientX-from.x,dy=event.clientY-from.y;
          if(Math.hypot(dx,dy)<1)return;
          changeItem(item.id,mode==='frame'?{
            x:safePos(item.x+dx,0,Math.max(0,innerWidth-100)),y:safePos(item.y+dy,0,Math.max(0,innerHeight-70))
          }:mode==='size'?{
            width:safePos(item.width+dx,160,Math.max(180,innerWidth-20)),
            height:safePos(item.height+dy,120,Math.max(140,innerHeight-30))
          }:{panX:item.panX+dx,panY:item.panY+dy});
        };
        handle.addEventListener('pointerup',event=>finish(event,false));
        handle.addEventListener('pointercancel',event=>finish(event,true));
      };
      frame.append(heading,imageArea,footer,resize);desired.push(frame);
      attachDrag(heading,'frame');attachDrag(resize,'size');attachDrag(imageArea,'image');
    }
    if(epoch===renderEpoch&&update===transition&&board?.documentId===snapshotBoard.documentId){
      // Replacing only the changed frame keeps pointer capture, scroll and
      // interaction state of the other floating windows intact.
      const retained=new Set(desired);
      for(const child of [...canvasLayer.children]){
        if(!retained.has(child as HTMLElement))child.remove();
      }
      for(const [index,frame] of desired.entries()){
        if(canvasLayer.children[index]!==frame)
          canvasLayer.insertBefore(frame,canvasLayer.children[index]??null);
      }
    }
  }
  // Keep the reference title/drag handle reachable after orientation or window
  // size changes. This also protects the corrected position across restarts.
  let resizeTimer:ReturnType<typeof setTimeout>|null=null;
  window.addEventListener('resize',()=>{
    if(resizeTimer!==null)clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{
      resizeTimer=null;
      if(!board)return;
      const fitted=fitWithinWindow(board);
      if(fitted!==board)syncAfter(fitted,false);
    },140);
  });
  groupSelect.onchange=()=>drawList();
  void refreshIfChanged();
  return {add,refresh,refreshIfChanged,flush,exportLayout,undo,redo,exportNative,importNative};
}
