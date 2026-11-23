import {toolConfirmation} from '../ui/toolConfirmation';
import {installWorkspaceDetails} from '../ui/workspaceDetails';
import {validateGradientMap,type GradientMap,type GradientStop} from '@illustro/core';
import {gradientMapIndex,gradientMapTable,mapGradientPixel} from '@illustro/brush-rt';
import {button,labelledField,numberField,paintPreview,selectField} from './tools';
import {gradientToneInspection} from './gradientToneInspection';

export type GradientMapDraft=Readonly<{
  map:GradientMap|null;
  source:ImageData;
  coverage:Uint8Array;
  pixelsAt:(x:number,y:number)=>readonly [number,number];
  /** Original 1:1 document pixels retained only for a small central inspection crop. */
  exact?:Readonly<{
    source:ImageData;coverage:Uint8Array;
    pixelsAt:(x:number,y:number)=>readonly [number,number];
    x:number;y:number;
  }>;
  apply:(map:GradientMap)=>Promise<void>;
}>;
/** Keep a small 1:1 crop from the already-rendered document, without retaining
 * the full 4K RGBA buffer after capture. Pixel coordinates are not rescaled. */
export function extractGradientMapCrop(
  pixels:Uint8Array|Uint8ClampedArray,width:number,height:number,
  coverageAt:(x:number,y:number)=>number,size=128
){
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
    pixels.length!==width*height*4||!Number.isSafeInteger(size)||size<1||size>256)
    throw Error('原寸プレビューの画像サイズが正しくありません。');
  const w=Math.min(width,size),h=Math.min(height,size);
  const x=Math.floor((width-w)/2),y=Math.floor((height-h)/2);
  const rgba=new Uint8ClampedArray(w*h*4),coverage=new Uint8Array(w*h);
  for(let row=0;row<h;row++)for(let col=0;col<w;col++){
    const px=x+col,py=y+row,to=row*w+col,from=(py*width+px)*4;
    rgba.set(pixels.subarray(from,from+4),to*4);
    const amount=coverageAt(px,py);
    coverage[to]=Math.round(Math.max(0,Math.min(1,Number.isFinite(amount)?amount:0))*255);
  }
  return {x,y,width:w,height:h,rgba,coverage};
}
const defaults:readonly GradientStop[]=[
  {at:0,color:'#232037',opacity:1,midpoint:.5},
  {at:1,color:'#f5ba72',opacity:1,midpoint:.5}
];

export function installGradientMapPanel(host:HTMLElement,api:{
  capture:(edit:boolean)=>Promise<GradientMapDraft>;
  storeColors:(colors:readonly string[])=>void;
}){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';panel.dataset.editPanel='gradient-map';
  const heading=document.createElement('summary');heading.textContent='グラデーションマップ・階調';
  const actions=document.createElement('div');actions.className='c06-clipboard-grid';
  const editor=document.createElement('div');editor.hidden=true;
  const showSettings=document.createElement('button');
  showSettings.type='button';showSettings.textContent='調整の設定を開く';showSettings.hidden=true;
  const settings=installWorkspaceDetails('色と階調の設定','effectsBox',showSettings);
  settings.body.append(editor);
  const fields=document.createElement('div');fields.className='c06-clipboard-grid';
  const status=document.createElement('output');status.setAttribute('role','status');
  const levels=numberField(fields,'階調数',256,2,256);
  const dither=document.createElement('input');dither.type='checkbox';
  labelledField(fields,'色の段差を目立ちにくくする',dither);
  const view=selectField(fields,'見比べる',[
    ['after','反映後'],['before','反映前'],['split','左が反映前・右が反映後']
  ] as const);
  const stopFields=document.createElement('div');stopFields.className='c06-clipboard-grid';
  const comparison=document.createElement('canvas');
  comparison.style.maxWidth='100%';comparison.setAttribute('aria-label','作品の加工前後のプレビュー');
  const exactLabel=document.createElement('p');
  exactLabel.hidden=true;
  const exactPreview=document.createElement('canvas');
  exactPreview.hidden=true;
  exactPreview.style.cssText='max-width:100%;width:384px;image-rendering:pixelated';
  exactPreview.setAttribute('aria-label','作品中央の原寸画素での加工前後の比較');
  const mappingLabel=document.createElement('p');mappingLabel.textContent='上が元の明るさ、下が置き換わる色';
  const mapping=document.createElement('canvas');
  mapping.style.maxWidth='100%';mapping.setAttribute('aria-label',mappingLabel.textContent);
  const tone=document.createElement('input');tone.type='range';tone.min='0';tone.max='255';tone.step='1';tone.value='128';
  labelledField(fields,'元の明るさを1段階ずつ確認',tone);
  const toneInfo=document.createElement('output');toneInfo.setAttribute('role','status');
  const toneSwatch=document.createElement('canvas');toneSwatch.width=64;toneSwatch.height=64;
  toneSwatch.style.cssText='width:64px;height:64px;border:1px solid currentColor';
  toneSwatch.setAttribute('aria-label','選んだ明るさに対応する出力色の拡大表示');
  let draft:GradientMapDraft|null=null,sequence=0;
  let stops=[...defaults];

  function data(){
    return validateGradientMap({stops,levels:levels.valueAsNumber,dither:dither.checked});
  }

  function refreshTone(){
    if(!draft)return;
    const map=data();
    const detail=gradientToneInspection(map,tone.valueAsNumber);
    const [r,g,b,a]=detail.rgba;
    const ctx=toneSwatch.getContext('2d');
    if(ctx){
      ctx.clearRect(0,0,64,64);
      ctx.fillStyle='rgba('+[r,g,b,a!/255].join(',')+')';
      ctx.fillRect(0,0,64,64);
    }
    toneInfo.textContent='入力 '+detail.tone+'/255 → 出力 RGB ('+[r,g,b].join(',')+
      ')・透明度 '+a+'/255。隣の明るさとの差は前 '+detail.previousDifference+
      '、後 '+detail.nextDifference+'。全256段階で色が変わる境目は '+detail.transitions+'か所です。'+
      (map.dither?'実際の作品では位置による色の散らし方も反映されます。':'');
  }
  function refresh(){
    if(!draft)return;
    try{
      const map=data(),table=gradientMapTable(map);
      const paintMapped=(target:HTMLCanvasElement,sample:Pick<GradientMapDraft,'source'|'coverage'|'pixelsAt'>)=>{
        const {source,coverage,pixelsAt}=sample,{width,height}=source;
        const pixels=new Uint8ClampedArray(source.data);
        if(view.value!=='before')for(let y=0;y<height;y++)for(let x=view.value==='split'?Math.floor(width/2):0;x<width;x++){
          const i=y*width+x,[originalX,originalY]=pixelsAt(x,y);
          mapGradientPixel(pixels,i*4,table,map,originalX,originalY,coverage[i]!/255);
        }
        paintPreview(target,pixels,width,height);
      };
      paintMapped(comparison,draft);
      if(draft.exact){
        paintMapped(exactPreview,draft.exact);
        exactLabel.textContent='作品中央の原寸 '+draft.exact.source.width+'×'+draft.exact.source.height+
          ' 画素（左上 '+draft.exact.x+', '+draft.exact.y+'）。拡大して色の段差を確認できます。';
        exactLabel.hidden=false;exactPreview.hidden=false;
      }else{exactLabel.hidden=true;exactPreview.hidden=true;}
      const band=new Uint8ClampedArray(256*28*4);
      for(let y=0;y<28;y++)for(let x=0;x<256;x++){
        const offset=(y*256+x)*4;
        if(y<14){band.set([x,x,x,255],offset);continue;}
        const index=gradientMapIndex(map,x/255,x,y-14)*4;
        band.set(table.subarray(index,index+4),offset);
      }
      paintPreview(mapping,band,256,28);
      refreshTone();status.textContent='';
    }catch(error){status.textContent=error instanceof Error?error.message:String(error);}
  }

  function renderStops(){
    stopFields.replaceChildren();
    for(const [index,stop] of stops.entries()){
      const row=document.createElement('div');row.className='c06-clipboard-grid';
      const position=numberField(row,'明るさ（%）',stop.at*100,0,100,.1);
      const color=document.createElement('input');color.type='color';color.value=stop.color;
      labelledField(row,'出力色',color);
      const midpoint=numberField(row,'次の色までの中間（%）',stop.midpoint*100,1,99,.1);
      const opacity=numberField(row,'置き換える強さ（%）',stop.opacity*100,0,100,.1);
      row.onchange=()=>{
        stops[index]={at:position.valueAsNumber/100,color:color.value,midpoint:midpoint.valueAsNumber/100,opacity:opacity.valueAsNumber/100};
        refresh();
      };
      if(stops.length>2)row.append(button('この色を外す',()=>{
        stops.splice(index,1);renderStops();refresh();
      },status));
      stopFields.append(row);
    }
    if(stops.length<64)stopFields.append(button('色を追加',()=>{
      stops.push({at:.5,color:'#a46870',opacity:1,midpoint:.5});renderStops();refresh();
    },status));
  }
  fields.onchange=refresh;
  tone.oninput=()=>{try{refreshTone();}catch(error){status.textContent=String(error);}};

  async function start(edit:boolean){
    panel.open=true;
    const id=++sequence;
    status.textContent='元の絵を読み込んでいます。';
    editor.hidden=true;showSettings.hidden=true;settings.show(false);draft=null;exactLabel.hidden=true;exactPreview.hidden=true;
    const next=await api.capture(edit);
    if(id!==sequence)return;
    draft=next;
    stops=[...(next.map?.stops??defaults)];levels.value=String(next.map?.levels??256);
    dither.checked=next.map?.dither??false;view.value='after';
    renderStops();editor.hidden=false;showSettings.hidden=false;settings.show(true);refresh();
  }
  const close=()=>{
    sequence++;draft=null;editor.hidden=true;showSettings.hidden=true;settings.show(false);exactLabel.hidden=true;exactPreview.hidden=true;
  };
  actions.append(
    button('調整レイヤーを作る',()=>start(false),status),
    button('選んだ調整レイヤーを編集',()=>start(true),status)
  );
  const finish=document.createElement('div');finish.className='c06-clipboard-grid';
  finish.append(
    toolConfirmation(button('確定',async()=>{
      if(!draft)throw Error('調整を開き直してください。');
      const current=draft;
      await current.apply(data());
      if(draft===current){close();status.textContent='色の調整を作品に反映しました。';}
    },status),'apply'),
    toolConfirmation(button('取り消す',()=>{close();status.textContent='色の調整を取り消しました。';},status),'cancel'),
    button('停止点の色をパレットへ追加',()=>{
      api.storeColors(data().stops.map(stop=>stop.color));
      status.textContent='停止点の色をパレットへ追加しました。';
    },status)
  );
  panel.addEventListener('toggle',()=>{if(!panel.open)close();});
  editor.append(fields,mappingLabel,mapping,toneSwatch,toneInfo,comparison,exactLabel,exactPreview,stopFields,finish);
  panel.append(heading,actions,showSettings,status);host.append(panel);
  return {show:(edit:boolean)=>{void start(edit).catch(error=>{status.textContent=String(error);});}};
}
