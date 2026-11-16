import {validateArtworkGuides,validateEditableArtwork,type ArtworkGuide,type ArtPoint,type EditablePath} from '@illustro/core';
import {addAsset,getAsset,listAssets} from '../assets/library';
import type {BrushSurface} from '../brushSurface';
import {normalizeGuideSettings,type GuideSettings} from '../strokeGuide';
import {runArtwork} from './run';
import {button,labelledField,numberField,selectField,type ArtworkActions} from './tools';

const guideMime='application/x-illustro-guide-set+json',shapeMime='application/x-illustro-shape+json';
const legacyKey='illustro.ruler-presets.v1';
type Dimensions={width:number;height:number};
type Preset=Dimensions&({kind:'guides';guides:readonly ArtworkGuide[]}|{kind:'shape';path:EditablePath});

function parsePreset(input:unknown):Preset{
  const value=input as Partial<Preset>|null;
  if(!value||!Number.isFinite(value.width)||!Number.isFinite(value.height)||value.width!<=0||value.height!<=0)
    throw Error('プリセットの元サイズを読み込めません。');
  const size={width:value.width!,height:value.height!};
  if(value.kind==='guides')return {...size,kind:'guides',guides:validateArtworkGuides(value.guides)};
  if(value.kind==='shape'){
    const path=validateEditableArtwork(value.path);
    if(path?.kind==='path')return {...size,kind:'shape',path};
  }
  throw Error('このプリセットを読み込めません。');
}
function place(preset:Preset,sx:number,sy:number,x:number,y:number):Preset{
  const position=(p:{x:number;y:number})=>({x:p.x*sx+x,y:p.y*sy+y});
  const minScale=Math.min(sx,sy);
  if(preset.kind==='guides'){
    const guides=preset.guides.map(guide=>{
      const rad=guide.angle*Math.PI/180;
      return {...guide,id:crypto.randomUUID(),origin:position(guide.origin),vanishing:guide.vanishing.map(position),
        angle:Math.atan2(Math.sin(rad)*sy,Math.cos(rad)*sx)*180/Math.PI,
        kind:guide.kind==='circle'&&sx!==sy?'ellipse':guide.kind,
        rx:Math.max(1,guide.rx*sx),ry:Math.max(1,(guide.kind==='circle'?guide.rx:guide.ry)*sy),
        spacing:Math.max(1,guide.spacing*minScale),range:guide.range*minScale};
    });
    return {...preset,guides:validateArtworkGuides(guides)};
  }
  const point=(p:ArtPoint):ArtPoint=>({
    ...p,...position(p),
    ...(p.inX===undefined||p.inY===undefined?{}:{inX:p.inX*sx+x,inY:p.inY*sy+y}),
    ...(p.outX===undefined||p.outY===undefined?{}:{outX:p.outX*sx+x,outY:p.outY*sy+y})
  });
  const path=validateEditableArtwork({...preset.path,width:preset.path.width*minScale,points:preset.path.points.map(point)}) as EditablePath;
  return {...preset,path};
}

export function installArtworkPresets(host:HTMLElement,api:ArtworkActions,store:{
  read:()=>readonly ArtworkGuide[];save:(values:readonly ArtworkGuide[],label:string)=>Promise<void>;
}){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const title=document.createElement('summary');title.textContent='定規・図形のプリセット';
  const controls=document.createElement('div');controls.className='c06-clipboard-grid';
  const guides=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent='登録する定規';
  const output=document.createElement('output');output.setAttribute('role','status');
  const name=document.createElement('input');name.maxLength=100;labelledField(controls,'プリセットの名前',name);
  const saved=selectField(controls,'素材庫のプリセット',[] as [string,string][]);
  const placement=selectField(controls,'配置サイズ',[['original','元の座標と大きさ'],['relative','この作品の縦横に合わせる']] as const);
  const x=numberField(controls,'横の移動（px）',0,-100000,100000,.1);
  const y=numberField(controls,'縦の移動（px）',0,-100000,100000,.1);
  const use=new Set<string>();
  let preview:{value:Preset;drawing:BrushSurface;base:readonly ArtworkGuide[];name:string}|null=null,serial=0;
  let old:Record<string,Partial<GuideSettings>>={};
  try{old=JSON.parse(localStorage.getItem(legacyKey)??'{}')??{};}catch{}
  function stop(){
    serial++;
    if(preview?.value.kind==='guides')preview.drawing.previewArtworkGuides(null);
    else preview?.drawing.showArtworkPreview(null);
    preview=null;
  }
  async function refresh(){
    const before=saved.value;
    const assets=(await listAssets()).filter(asset=>!asset.hidden&&(asset.mime===guideMime||asset.mime===shapeMime));
    saved.replaceChildren(...assets.map(asset=>new Option(asset.name,asset.id)),...Object.keys(old).map(item=>new Option(item+'（旧定規）','old:'+item)));
    if([...saved.options].some(option=>option.value===before))saved.value=before;
    guides.replaceChildren(legend);
    for(const guide of store.read()){
      const input=document.createElement('input');input.type='checkbox';input.checked=use.has(guide.id);
      input.onchange=()=>{if(input.checked)use.add(guide.id);else use.delete(guide.id);};
      labelledField(guides,guide.name,input);
    }
  }
  async function register(kind:Preset['kind']){
    const ctx=api.context(),label=name.value.trim();
    if(!ctx||!label)throw Error('作品を開き、プリセット名を入力してください。');
    const size={width:ctx.width,height:ctx.height};
    const selected=ctx.selected.content;
    const values=store.read().filter(guide=>use.has(guide.id));
    if(kind==='guides'&&!values.length)throw Error('登録する定規を選んでください。');
    if(kind==='shape'&&selected?.kind!=='path')throw Error('登録する図形レイヤーを選んでください。');
    const data=kind==='guides'?{...size,kind,guides:values}:{...size,kind,path:selected};
    const asset=await addAsset({kind:'shape',name:label,data:new Blob([JSON.stringify(data)],{type:kind==='guides'?guideMime:shapeMime})});
    await refresh();saved.value=asset.id;output.textContent='素材庫に登録しました。';
  }
  async function show(){
    stop();const request=serial;
    const ctx=api.context(),label=saved.selectedOptions[0]?.text;
    if(!ctx||!label)throw Error('作品を開き、読み込むプリセットを選んでください。');
    let value:Preset;
    if(saved.value.startsWith('old:')){
      const legacy=normalizeGuideSettings(old[saved.value.slice(4)]??{});
      value={kind:'guides',width:ctx.width,height:ctx.height,guides:[{
        id:crypto.randomUUID(),name:saved.value.slice(4).slice(0,80),kind:legacy.kind??'straight',
        origin:{x:legacy.x??0,y:legacy.y??0},vanishing:[{x:0,y:0},{x:0,y:0}],activeAxis:0,
        angle:legacy.angle,rx:legacy.rx??120,ry:legacy.ry??72,spacing:legacy.step??32,strength:legacy.strength,
        range:0,enabled:legacy.enabled,locked:false,applyEraser:legacy.applyEraser
      }]};
    }else{
      const asset=await getAsset(saved.value);
      if(!asset||asset.deleted)throw Error('指定したプリセットが素材庫にありません。');
      value=parsePreset(JSON.parse(await asset.data.text()));
    }
    const relative=placement.value==='relative';
    const candidate=place(value,relative?ctx.width/value.width:1,relative?ctx.height/value.height:1,x.valueAsNumber,y.valueAsNumber);
    const base=store.read();
    if(request!==serial||api.context()?.drawing!==ctx.drawing)return;
    if(candidate.kind==='guides')ctx.drawing.previewArtworkGuides(validateArtworkGuides([...base,...candidate.guides]));
    else{
      const scale=Math.min(1,640/Math.max(ctx.width,ctx.height));
      const outputWidth=Math.max(1,Math.round(ctx.width*scale)),outputHeight=Math.max(1,Math.round(ctx.height*scale));
      const pixels=await runArtwork({content:candidate.path,width:ctx.width,height:ctx.height,outputWidth,outputHeight});
      if(request!==serial||api.context()?.drawing!==ctx.drawing)return;
      ctx.drawing.showArtworkPreview(new ImageData(pixels,outputWidth,outputHeight));
    }
    preview={value:candidate,drawing:ctx.drawing,base,name:label};
    output.textContent=`元の作品 ${value.width} × ${value.height} px。キャンバスで位置を確認して確定できます。`;
  }
  controls.addEventListener('change',stop);
  panel.ontoggle=()=>{if(panel.open)void refresh().catch(error=>{output.textContent=String(error);});else stop();};
  panel.append(title,controls,guides,
    button('定規セットを登録',()=>register('guides'),output),
    button('選んだ図形を登録',()=>register('shape'),output),
    button('配置をプレビュー',show,output),
    button('配置を確定',async()=>{
      const draft=preview;
      if(!draft||api.context()?.drawing!==draft.drawing)throw Error('配置をプレビューしてください。');
      if(draft.value.kind==='guides'){
        if(store.read()!==draft.base)throw Error('定規が変更されました。もう一度プレビューしてください。');
        await store.save([...draft.base,...draft.value.guides],'定規セットを配置');
      }else await api.save(draft.value.path,draft.name);
      stop();await refresh();output.textContent='作品に配置しました。';
    },output),
    button('取消',stop,output),output
  );
  host.append(panel);
}
