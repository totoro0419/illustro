import {validateEditableArtwork,type EditableText,type LayerId} from '@illustro/core';
import {fontAssets,fontFamily,importFont,outlineText} from './fonts';
import {runArtwork} from './run';
import {button,labelledField,locate,numberField,paintPreview,selectField,type ArtworkActions} from './tools';

export function installTextPanel(host:HTMLElement,api:ArtworkActions){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const title=document.createElement('summary');title.textContent='文字';
  const controls=document.createElement('div'),actions=document.createElement('div');
  controls.className=actions.className='c06-clipboard-grid';
  const status=document.createElement('output');status.setAttribute('role','status');
  const preview=document.createElement('canvas');preview.hidden=true;preview.style.maxWidth='100%';
  const text=document.createElement('textarea');text.rows=4;text.maxLength=8192;labelledField(controls,'文字を入力',text);
  const x=numberField(controls,'配置 X',0,-8192,16384,.5),y=numberField(controls,'配置 Y',0,-8192,16384,.5);
  const size=numberField(controls,'文字サイズ（px）',48,1,4096,.5);
  const align=selectField(controls,'横書きの揃え方',[['left','左'],['center','中央'],['right','右']] as const);
  const spacing=numberField(controls,'文字間隔（px）',0,-4096,4096,.5);
  const lineHeight=numberField(controls,'行間（文字サイズに対する倍率）',1.25,.2,8,.05);
  const direction=selectField(controls,'文字の向き',[['horizontal','横書き'],['vertical','縦書き']] as const);
  const color=document.createElement('input');color.type='color';labelledField(controls,'文字の色',color);
  const family=selectField(controls,'フォント',[]);
  const systemFont=selectField(controls,'端末のフォント',[
    ['sans-serif','ゴシック'],['serif','明朝'],['monospace','等幅']
  ] as const);
  const file=document.createElement('input');file.type='file';file.hidden=true;file.accept='.ttf,.otf,.woff,.woff2';
  let fontId='',editing:LayerId|undefined,previewRequest=0,initialized=false,composing=false;

  async function refreshFonts(){
    const assets=await fontAssets();
    family.replaceChildren(new Option('端末のフォントを使う',''),...assets.map(asset=>new Option(asset.name,asset.id)));
    if(fontId&&!assets.some(asset=>asset.id===fontId)){
      family.add(new Option('不足しているフォント',fontId));
      status.textContent='元のフォントがこの端末にありません。保存済みの外観を保持しています。編集を適用する前にフォントを選び直してください。';
    }
    family.value=fontId;
    systemFont.disabled=!!fontId;
  }
  function draft():EditableText{
    return validateEditableArtwork({
      kind:'text',text:text.value.replace(/\r\n?/g,'\n'),origin:{x:x.valueAsNumber,y:y.valueAsNumber},
      size:size.valueAsNumber,align:align.value,spacing:spacing.valueAsNumber,lineHeight:lineHeight.valueAsNumber,
      vertical:direction.value==='vertical',color:color.value,family:fontId?fontFamily(fontId):systemFont.value,
      ...(fontId?{fontAsset:fontId}:{})
    }) as EditableText;
  }
  async function show(content:EditableText|Awaited<ReturnType<typeof outlineText>>){
    const context=api.context(),request=++previewRequest;
    if(!context)return;
    const ratio=Math.min(1,280/Math.max(context.width,context.height));
    const width=Math.max(1,Math.round(context.width*ratio)),height=Math.max(1,Math.round(context.height*ratio));
    try{
      const pixels=await runArtwork({content,width:context.width,height:context.height,outputWidth:width,outputHeight:height});
      if(request===previewRequest)paintPreview(preview,pixels,width,height);
    }catch(error){if(request===previewRequest){preview.hidden=true;throw error;}}
  }
  async function refresh(){
    if(composing||!text.value.trim()){preview.hidden=true;return;}
    try{await show(draft());}catch(error){status.textContent=error instanceof Error?error.message:String(error);}
  }
  function reset(){
    const context=api.context();
    if(!context)throw Error('作品を開いてください。');
    editing=undefined;initialized=true;fontId='';text.value='';
    x.value=String(Math.round(context.width/4));y.value=String(Math.round(context.height/4));
    color.value=context.color;direction.value='horizontal';align.value='left';
    preview.hidden=true;status.textContent='新しい文字を入力してください。';
  }
  function selectedText(){
    const layer=api.context()?.selected;
    if(layer?.content?.kind!=='text')throw Error('先に文字レイヤーを選んでください。');
    return {id:layer.id,name:layer.name,content:layer.content};
  }
  function write(content:EditableText){
    text.value=content.text;x.value=String(content.origin.x);y.value=String(content.origin.y);
    size.value=String(content.size);align.value=content.align;spacing.value=String(content.spacing);
    lineHeight.value=String(content.lineHeight);direction.value=content.vertical?'vertical':'horizontal';
    color.value=content.color;fontId=content.fontAsset??'';
    if(!fontId)systemFont.value=content.family;
  }
  family.onchange=()=>{fontId=family.value;systemFont.disabled=!!fontId;void refresh();};
  controls.addEventListener('change',()=>void refresh());
  text.addEventListener('compositionstart',()=>{composing=true;});
  text.addEventListener('compositionend',()=>{composing=false;void refresh();});
  text.oninput=()=>void refresh();
  file.onchange=async()=>{
    const selected=file.files?.[0];file.value='';
    if(!selected)return;
    try{
      const asset=await importFont(selected);
      fontId=asset.id;await refreshFonts();await refresh();status.textContent='フォントをこの端末の素材庫へ読み込みました。';
    }catch(error){status.textContent=error instanceof Error?error.message:String(error);}
  };
  actions.append(
    button('新しい文字',async()=>{reset();await refreshFonts();text.focus();},status),
    button('選んだ文字を編集',async()=>{
      const current=selectedText();editing=current.id;initialized=true;write(current.content);
      status.textContent=current.name+'を編集します。';await refreshFonts();await refresh();
    },status),
    button('キャンバスで配置を指定',()=>{
      const context=api.context();
      if(!context)throw Error('作品を開いてください。');
      status.textContent='文字を置く場所をタップしてください。';
      locate(context.drawing,points=>{
        x.value=String(Math.round(points[0]!.x));y.value=String(Math.round(points[0]!.y));void refresh();
      });
    },status),
    button('フォントを読み込む',()=>file.click(),status),
    button('文字を適用',async()=>{
      if(composing)throw Error('変換中の文字を確定してください。');
      await api.save(draft(),'文字',editing);status.textContent='文字レイヤーに保存しました。';
    },status),
    button('文字の輪郭をパスへ変換',async()=>{
      const current=selectedText(),outline=await outlineText(current.content);
      await show(outline);
      if(confirm('文字レイヤーを残し、文字の輪郭を新しいパスにしますか？ パス上では文章や書体を変更できなくなります。')){
        const context=api.context();
        if(context?.selected.id!==current.id)throw Error('文字レイヤーを選び直してください。');
        await api.save(outline,current.name+'（輪郭）');
        status.textContent='元の文字を残して輪郭のレイヤーを追加しました。';
      }
    },status),
    button('描画用レイヤーへ変換',async()=>{
      const context=api.context();
      if(!context?.selected.content)throw Error('文字・図形・グラデーションのレイヤーを選んでください。');
      if(!confirm('見た目を保ち、元の文字や図形の編集情報を取り除きます。直後にUndoで戻せます。変換しますか？'))return;
      await api.rasterize(context.selected.id);editing=undefined;status.textContent='描画用レイヤーへ変換しました。';
    },status)
  );
  panel.ontoggle=()=>{
    if(!panel.open)return;
    if(!initialized&&api.context())reset();
    void refreshFonts().catch(error=>{status.textContent=error instanceof Error?error.message:String(error);});
  };
  panel.append(title,controls,actions,file,preview,status);host.append(panel);
}
