/**
 * C05 floating reference windows. No reference content enters the artwork
 * renderer, saved raster tiles or exported composited images.
 */
import {readBoard,writeBoard,newBoardItem,type BoardSnapshot,type BoardItem} from './referenceBoardStore';
import {getAsset} from './library';
import {exportAssetPack,importAssetPack,readAssetPack} from './packs';
import type {PortableSectionInput} from '../persistence/format';
import type {PreservedPortableData} from '../persistence/portable';
import type {ForegroundColor} from '../color/model';
export type ReferenceBoardService=Readonly<{
  add:(assetId:string)=>Promise<void>;
  refresh:()=>Promise<void>;
  refreshIfChanged:()=>Promise<void>;
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
export function installReferenceBoard(options:Options):ReferenceBoardService{
  const panel=document.getElementById('referenceBoxBody');
  if(!panel)return {
    add:async()=>{},refresh:async()=>{},refreshIfChanged:async()=>{},
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
  root.append(title,intro,buttons,navigator,groupRow,list,status);panel.append(root);
  const canvasLayer=document.createElement('div');canvasLayer.id='c05ReferenceLayer';canvasLayer.className='c05-reference-layer';
  document.body.append(canvasLayer);
  let currentDoc:string|null=null,board:BoardSnapshot|null=null;
  let saving:Promise<void>=Promise.resolve(),transition=0,renderEpoch=0;
  let back:BoardSnapshot[]=[],forward:BoardSnapshot[]=[];
  const urls=new Map<string,string>();
  const error=(reason:unknown)=>status.textContent=reason instanceof Error?reason.message:String(reason);
  function download(name:string,blob:Blob){
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function snapshot(){if(!board)throw Error('作品がまだ選ばれていません。');return board;}
  const clone=(value:BoardSnapshot):BoardSnapshot=>({
    ...value,items:value.items.map(item=>({...item}))
  });
  function syncAfter(change:BoardSnapshot,history=true){
    if(!board||board.documentId!==change.documentId)return;
    if(history){back.push(clone(board));if(back.length>60)back.shift();forward=[];}
    board=change;
    const expectedDocument=change.documentId;
    saving=saving.catch(()=>{}).then(async()=>{
      if(options.getDocumentId()!==expectedDocument)return;
      await writeBoard(change);
    }).catch(error);
    void render();drawList();
  }
  async function refreshIfChanged(){
    const id=options.getDocumentId();
    if(id===currentDoc)return;
    currentDoc=id;transition++;back=[];forward=[];board=null;
    for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();canvasLayer.replaceChildren();list.replaceChildren();
    if(!id){status.textContent='作品を開くと、資料を並べられます。';return;}
    try{
      const current=transition,data=await readBoard(id);
      if(current!==transition||id!==currentDoc)return;
      board=data;await render();drawList();
    }catch(e){error(e);}
  }
  async function refresh(){
    currentDoc=null;await refreshIfChanged();
  }
  async function add(assetId:string){
    await refreshIfChanged();
    if(!board)throw Error('作品を開いてから資料を追加してください。');
    const asset=await getAsset(assetId);
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
    syncAfter({...board,hidden:!board.hidden});
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
  async function exportLayout(){
    await refreshIfChanged();if(!board)throw Error('作品がありません。');
    return new Blob([JSON.stringify(board,null,2)],{type:'application/json'});
  }
  const NATIVE_ID='c05.reference-board';
  const NATIVE_TYPE='reference.board.embedded.v1';
  async function exportNative():Promise<PortableSectionInput|null>{
    await refreshIfChanged();
    if(!board)return null;
    await saving;
    const current=board;
    // Include each original file only once, even if the same reference is shown
    // in several windows. The corresponding document pixels remain untouched.
    const ids=[...new Set(current.items.map(item=>item.assetId))];
    const packageBlob=await exportAssetPack(ids);
    const packageInfo=JSON.parse(await packageBlob.text()) as unknown;
    const data={schema:'illustro.reference-bundle',version:1,board:current,pack:packageInfo};
    return {id:NATIVE_ID,type:NATIVE_TYPE,required:false,bytes:new TextEncoder().encode(JSON.stringify(data))};
  }
  async function importNative(preserved:PreservedPortableData|undefined):Promise<void>{
    const section=preserved?.optionalSections.find(item=>item.id===NATIVE_ID&&item.type===NATIVE_TYPE);
    if(!section)return;
    await refreshIfChanged();
    const doc=options.getDocumentId();
    if(!doc||!board)return;
    // Do not erase the user's current local board when opening an older file.
    if(board.items.length>0){status.textContent='端末に保存した資料配置を維持しました。';return;}
    if(section.bytes.byteLength>70*1024*1024)throw Error('作品内の資料が大きすぎます。');
    const raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(section.bytes)) as unknown;
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('作品内の資料情報が正しくありません。');
    const data=raw as Record<string,unknown>;
    if(data.schema!=='illustro.reference-bundle'||data.version!==1||!data.board||!data.pack)
      throw Error('対応していない資料データです。');
    const embedded=await readAssetPack(new Blob([JSON.stringify(data.pack)],{type:'application/json'}));
    const result=await importAssetPack(embedded);
    if(result.failures.length)throw Error('資料の一部を復元できませんでした：'+result.failures.slice(0,2).join('、'));
    const input=data.board as Partial<BoardSnapshot>;
    if(!Array.isArray(input.items)||input.items.length>80)throw Error('資料の配置情報が正しくありません。');
    const newItems:BoardItem[]=input.items.map((item,index)=>{
      if(!item||typeof item.assetId!=='string'||!result.renamedIds[item.assetId])
        throw Error('資料の参照先を復元できませんでした。');
      return {
        ...newBoardItem(result.renamedIds[item.assetId]!,index),
        ...item,assetId:result.renamedIds[item.assetId]!,
        id:crypto.randomUUID()
      };
    });
    const imported:BoardSnapshot={version:1,documentId:doc,items:newItems,hidden:!!input.hidden};
    syncAfter(imported,false);
    status.textContent=newItems.length+'枚の資料を作品ファイルから読み込みました。';
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
    show.textContent=current.hidden?'資料をすべて再表示':'資料を一時的に隠す';
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
    // Rebuild only as a user requests a board operation, not per stroke.
    canvasLayer.replaceChildren();
    const needed=new Set(snapshotBoard.items.map(i=>i.assetId));
    for(const [id,url] of urls)if(!needed.has(id)){URL.revokeObjectURL(url);urls.delete(id);}
    canvasLayer.hidden=snapshotBoard.hidden;
    for(const item of snapshotBoard.items){
      if(epoch!==renderEpoch||update!==transition||board?.documentId!==snapshotBoard.documentId)return;
      if(item.hidden)continue;
      const asset=await getAsset(item.assetId);
      if(epoch!==renderEpoch||update!==transition||board?.documentId!==snapshotBoard.documentId)return;
      const frame=document.createElement('section');frame.className='c05-reference-frame';
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
            frame.style.left=safePos(start.item.x+dx,0,innerWidth-100)+'px';
            frame.style.top=safePos(start.item.y+dy,0,innerHeight-70)+'px';
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
            x:safePos(item.x+dx,0,innerWidth-100),y:safePos(item.y+dy,0,innerHeight-70)
          }:mode==='size'?{
            width:safePos(item.width+dx,160,Math.max(180,innerWidth-20)),
            height:safePos(item.height+dy,120,Math.max(140,innerHeight-30))
          }:{panX:item.panX+dx,panY:item.panY+dy});
        };
        handle.addEventListener('pointerup',event=>finish(event,false));
        handle.addEventListener('pointercancel',event=>finish(event,true));
      };
      frame.append(heading,imageArea,footer,resize);canvasLayer.append(frame);
      attachDrag(heading,'frame');attachDrag(resize,'size');attachDrag(imageArea,'image');
    }
  }
  groupSelect.onchange=()=>drawList();
  void refreshIfChanged();
  return {add,refresh,refreshIfChanged,exportLayout,undo,redo,exportNative,importNative};
}
