import {toolConfirmation} from '../ui/toolConfirmation';
import type {LayerId,LayerImageLink} from '@illustro/core';
import {button,labelledField,numberField,selectField} from '../artwork/tools';

type ImageDraft=Readonly<{before:ImageData|null;after:ImageData;description:string;apply:()=>Promise<void>}>;
type ImageActions=Readonly<{
  current:()=>{name:string;link:LayerImageLink|null;missing:boolean};
  sources:()=>readonly {id:LayerId;name:string}[];
  prepare:(action:'link'|'embed'|'update'|'reselect'|'instance'|'rebind'|'move',source?:LayerId,position?:{x:number;y:number})=>Promise<ImageDraft|null>;
  finish:(action:'embed'|'independent')=>Promise<void>;
}>;
export function installImageLinkPanel(host:HTMLElement,api:ImageActions){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';panel.dataset.editPanel='image-link';
  const heading=document.createElement('summary');heading.textContent='リンク画像・埋め込み・同じ画像の複製';
  const meta=document.createElement('output');meta.setAttribute('role','status');
  const options=document.createElement('div');options.className='c06-clipboard-grid';
  const source=selectField(options,'元にする画像レイヤー',[]);
  const positioned=document.createElement('input');positioned.type='checkbox';labelledField(options,'配置する座標を指定',positioned);
  const x=numberField(options,'左端 X（px）',0,0,8192),y=numberField(options,'上端 Y（px）',0,0,8192);
  const status=document.createElement('output');status.setAttribute('role','status');
  const images=document.createElement('div');images.className='c06-clipboard-grid';
  const pre=document.createElement('canvas'),post=document.createElement('canvas');
  function figure(canvas:HTMLCanvasElement,label:string){
    const holder=document.createElement('figure'),caption=document.createElement('figcaption');caption.textContent=label;
    canvas.style.maxWidth='100%';holder.append(canvas,caption);images.append(holder);return holder;
  }
  const prior=figure(pre,'現在の画像');figure(post,'適用後の候補');images.hidden=true;
  let draft:ImageDraft|null=null;
  function refresh(){
    if(!panel.open)return;
    const {name,link,missing}=api.current(),list=api.sources(),previous=source.value;
    source.replaceChildren(new Option('選択してください',''),...list.map(item=>new Option(item.name,item.id)));
    if(list.some(item=>item.id===previous))source.value=previous;
    meta.textContent=link?name+'。'+(link.kind==='linked'?'外部リンク':link.kind==='embedded'?'作品に埋め込み':'同じ元画像の複製')+
      ' ／ '+link.name+' ／ 版 '+link.digest.slice(0,10)+(missing?' ／ 元の画像が見つかりません。保存済みの絵は表示されます。':''):name+'。画像の参照なし';
  }
  function render(canvas:HTMLCanvasElement,image:ImageData){
    canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d')?.putImageData(image,0,0);
  }
  async function prepare(action:Parameters<ImageActions['prepare']>[0],sourceId?:LayerId){
    clear();
    draft=await api.prepare(action,sourceId,positioned.checked?{x:x.valueAsNumber,y:y.valueAsNumber}:undefined);
    if(!draft){status.textContent='見つかった元画像は現在の版と同じです。';return;}
    if(draft.before)render(pre,draft.before);
    render(post,draft.after);prior.hidden=!draft.before;
    images.hidden=false;apply.disabled=false;status.textContent=draft.description;
  }
  function clear(){draft=null;images.hidden=true;apply.disabled=true;}
  const apply=button('表示した候補を確定',async()=>{
    if(!draft)return;
    await draft.apply();clear();refresh();status.textContent='画像の設定を反映しました。';
  },status);
  apply.disabled=true;
  const act=(label:string,action:Parameters<ImageActions['prepare']>[0])=>button(label,()=>prepare(action),status);
  const target=(label:string,action:'instance'|'rebind')=>button(label,()=>{
    if(!source.value)throw Error('元にする画像レイヤーを選んでください。');
    return prepare(action,source.value as LayerId);
  },status);
  options.append(act('ファイルをリンクして配置','link'),act('ファイルを埋め込んで配置','embed'),
    act('外部ファイルの更新を確認','update'),act('元ファイルを選び直す','reselect'),
    target('同じ画像を参照する複製を作る','instance'),act('選んだ画像の位置を変更','move'),target('複製の元を選び直す','rebind'),
    button('選択レイヤーの現在の画像を埋め込む',async()=>{await api.finish('embed');refresh();},status),
    button('参照を解除して独立した描画レイヤーにする',async()=>{await api.finish('independent');refresh();},status),
    toolConfirmation(apply,'apply'),toolConfirmation(button('候補を取り消す',clear,status),'cancel'));
  panel.append(heading,meta,options,images,status);host.append(panel);panel.ontoggle=()=>{if(panel.open)refresh();else clear();};
  return {refresh};
}
