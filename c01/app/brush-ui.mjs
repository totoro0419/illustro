import {domains,preset,presets,sources,validateBrush} from './brush-engine.mjs';
import {defaultInput} from './stroke-input.mjs';

const byId=id=>document.getElementById(id);
const correctionChoices=[['off','OFF'],['light','軽い'],['strong','強い'],['custom','詳細']];
const labels={
 pressure:'筆圧',tilt:'傾き',azimuth:'方位',barrel:'軸回転',speed:'速度',direction:'方向',
 distance:'距離',time:'時間',start:'始端距離',end:'終端距離',random:'乱数',size:'サイズ',opacity:'不透明度',
 flow:'流量',spacing:'間隔',angle:'回転',scatter:'散布',aspect:'縦横比',shear:'せん断',
 hue:'色相',saturation:'彩度',value:'明度',hardness:'硬さ',depth:'紙目の強さ',textureScale:'紙目の倍率',particles:'粒子'
};
const options=(values)=>values.map(item=>Array.isArray(item)?item:[item,labels[item]||item]);
function field(parent,text,value,config,change){
 const label=document.createElement('label'), control=document.createElement(Array.isArray(config)?'select':'input');
 label.append(text,control);parent.append(label);
 if(Array.isArray(config)) for(const [id,caption] of options(config)) control.add(new Option(caption,id));
 else Object.assign(control,config);
 if(control.type==='checkbox')control.checked=value;
 else control.value=value;
 control.addEventListener('change',()=>change(control.type==='checkbox'?control.checked:control.type==='number'?control.valueAsNumber:control.value));
 return control;
}
const button=(parent,text,action)=>{
 const element=document.createElement('button');element.type='button';element.textContent=text;
 element.addEventListener('click',action);parent.append(element);return element;
};
const groups=[
 ['先端と形状',[
  ['tip','先端',[['round','丸'],['square','四角'],['diamond','ひし形'],['bitmap','画像']]],
  ['hardness','硬さ',[0,1,.01]],['spacing','間隔（直径比）',[.01,2,.01]],['scatter','散布 px',[0,400,1]],
  ['angle','回転 °',[-360,360,1]],['particles','粒子数',[1,8,1]],['aspect','縦横比',[.05,2,.01]],['shear','せん断',[-1,1,.01]]
 ]],
 ['テクスチャと紙質',[
  ['texture','紙目',[['none','なし'],['graphite','グラファイト'],['paper','紙']]],
  ['textureAnchor','座標',[['document','文書固定'],['stroke','先端に追従']]],
  ['textureScale','倍率',[.1,16,.1]],['textureAngle','回転 °',[-360,360,1]],['depth','強さ',[0,1,.01]]
 ]],
 ['入り抜き',[
  ['taper','強制入り抜き','checkbox'],['start','始端長さ',[0,1000,.1]],['end','終端長さ',[0,1000,.1]],
  ['taperUnit','単位',[['px','文書 px'],['diameter','直径の倍数']]],['taperShape','形状',[['smooth','なだらか'],['linear','直線']]],
  ['minWidth','最小幅 px',[0,300,.05]],['taperAlpha','不透明度への強さ',[0,1,.01]]
 ]],
 ['補正と合成',[
  ['correction','補正',[['global','全体設定に従う'],...correctionChoices]],['positionTau','位置補正 秒',[0,.2,.0005]],
  ['speedTau','速度補正 秒',[0,.2,.0005]],['pressureTau','筆圧補正 秒',[0,.2,.0005]],
  ['blend','合成',[['over','通常'],['erase','消去'],['behind','背面'],['alpha-lock','アルファ保持']]],
  ['accumulate','一筆内で不透明度を累積','checkbox'],['opacityFactor','画材の不透明度上限',[0,1,.01]],['pigment','画材の流量係数',[0,1,.01]]
 ]]
];
const number=(min,max,step)=>({type:'number',min,max,step});
function setting(parent,label,value,config,change){
 return field(parent,label,value,config==='checkbox'?{type:'checkbox'}:typeof config[0]==='number'?number(...config):config,change);
}
function details(parent,title,open=false){
 const element=document.createElement('details'), summary=document.createElement('summary');
 summary.textContent=title;element.open=open;element.append(summary);parent.append(element);return element;
}
function readPreferences(){
 try{return JSON.parse(localStorage.getItem('illustro.c02.settings')||'{}')||{}}catch{return {}}
}

export function brushUI({notify,onSelect,onPad,clearPad,sensors}){
 const stored=readPreferences(), brushes=new Map(Object.keys(presets).map(id=>[id,preset(id)]));
 for(const candidate of Array.isArray(stored.brushes)?stored.brushes:[])try{brushes.set(candidate.id,validateBrush(candidate))}catch{}
 const favorite=new Set(Array.isArray(stored.favorite)?stored.favorite:[]);
 let recent=Array.isArray(stored.recent)?stored.recent:[];
 let selected='gpen',filter='all',draft=null,editing=null,editSession=0;
 const input={...defaultInput};
 for(const key of ['touch','mouse','pen'])if(['pan','draw','sample'].includes(stored.input?.[key]))input[key]=stored.input[key];
 for(const key of ['palm','independent'])if(typeof stored.input?.[key]==='boolean')input[key]=stored.input[key];
 if(['none','erase','sample','pan'].includes(stored.input?.side))input.side=stored.input.side;
 if(['hold','once','toggle'].includes(stored.input?.sideMode))input.sideMode=stored.input.sideMode;
 if(['hardEraser','softEraser'].includes(stored.input?.eraser))input.eraser=stored.input.eraser;
 if(Number.isFinite(stored.input?.eraserSize)&&stored.input.eraserSize>=1&&stored.input.eraserSize<=300)input.eraserSize=stored.input.eraserSize;
 const correction={mode:'off',positionTau:.02,speedTau:0,pressureTau:0};
 for(const key of ['positionTau','speedTau','pressureTau'])if(Number.isFinite(stored.correction?.[key])&&stored.correction[key]>=0&&stored.correction[key]<=.2)correction[key]=stored.correction[key];
 if(correctionChoices.some(([id])=>id===stored.correction?.mode))correction.mode=stored.correction.mode;
 const persist=()=>{
  try{localStorage.setItem('illustro.c02.settings',JSON.stringify({brushes:[...brushes.values()],favorite:[...favorite],recent,input,correction}))}
  catch{notify('設定を端末に保存できませんでした。このタブでは使用できます')}
 };
 const list=byId('brush-list'),search=byId('brush-search'),star=byId('brush-star'),dialog=byId('brush-editor'), fields=byId('brush-fields');
 function refresh(){
  const query=search.value.trim().toLocaleLowerCase();
  const ids=filter==='recent'?recent:[...brushes.keys()];
  list.replaceChildren();
  for(const id of ids){
   const brush=brushes.get(id);
   if(!brush||(filter==='favorite'&&!favorite.has(id))||!(brush.name+' '+brush.tags).toLocaleLowerCase().includes(query))continue;
   list.add(new Option(brush.name+(brush.version>1?' •':''),id));
  }
  if(!list.options.length)list.add(new Option('該当するブラシがありません',''));
  list.value=[...list.options].some(o=>o.value===selected)?selected:'';
  star.textContent=favorite.has(selected)?'★':'☆';
  star.setAttribute('aria-pressed',String(favorite.has(selected)));
 }
 function select(id,log=true){
  if(!brushes.has(id))return;
  selected=id;
  if(log){recent=[id,...recent.filter(item=>item!==id)].slice(0,12);persist()}
  refresh();
 }
 search.addEventListener('input',refresh);
 list.addEventListener('change',()=>{if(list.value)onSelect(list.value,false)});
 byId('brush-filter').addEventListener('change',e=>{filter=e.target.value;refresh()});
 star.onclick=()=>{if(favorite.has(selected))favorite.delete(selected);else favorite.add(selected);persist();refresh()};
 const correctionPanel=byId('brush-correction');
 field(correctionPanel,'全体補正',correction.mode,correctionChoices,value=>{correction.mode=value;persist()});
 const globalDetails=details(correctionPanel,'全体補正の詳細');
 for(const [key,label] of [['positionTau','位置 秒'],['speedTau','速度依存 秒'],['pressureTau','筆圧 秒']]) {
  const control=setting(globalDetails,label,correction[key],[0,.2,.0005],value=>{
   if(value>=0&&value<=.2)correction[key]=value;else control.value=correction[key];
   persist();
  });
 }
 const inputPanel=byId('input-assignments');
 const inputFields=details(inputPanel,'入力割当と一時ツール');
 function syncFinger(){
  byId('finger-draw').checked=input.touch==='draw';
 }
 function renderInput(){
  for(const node of [...inputFields.children].slice(1))node.remove();
  for(const [key,label] of [['pen','ペン先'],['touch','指1本'],['mouse','マウス左']])
   field(inputFields,label,input[key],[['draw','描画'],['pan','移動'],['sample','採色']],value=>{input[key]=value;syncFinger();persist()});
  field(inputFields,'ペン接地中の手のひら抑止',input.palm,{type:'checkbox'},value=>{input.palm=value;persist()});
  field(inputFields,'サイドボタン',input.side,[['none','無効'],['erase','消去'],['sample','採色'],['pan','移動']],value=>{input.side=value;persist()});
  field(inputFields,'サイドボタンの動作',input.sideMode,[['hold','保持'],['once','次の操作だけ'],['toggle','切替']],value=>{input.sideMode=value;persist()});
  field(inputFields,'一時・後端消しゴム',input.eraser,[['hardEraser','硬い'],['softEraser','柔らかい']],value=>{input.eraser=value;persist()});
  field(inputFields,'消しゴムの径を独立',input.independent,{type:'checkbox'},value=>{input.independent=value;persist()});
  const sizeControl=field(inputFields,'独立した径 px',input.eraserSize,number(1,300,1),value=>{if(value>=1&&value<=300){input.eraserSize=value;persist()}else sizeControl.value=input.eraserSize});
  button(inputFields,'入力割当を初期化',()=>{Object.assign(input,defaultInput);syncFinger();persist();renderInput()});
 }
 byId('finger-draw').addEventListener('change',e=>{input.touch=e.target.checked?'draw':'pan';persist();renderInput()});
 syncFinger();renderInput();
 const error=byId('brush-error');
 const set=(key,value)=>{draft[key]=value;error.textContent=''};
 function renderEditor(){
  fields.replaceChildren();
  field(fields,'名前',draft.name,{type:'text',maxLength:80},value=>set('name',value));
  field(fields,'用途・タグ',draft.tags,{type:'text',maxLength:120},value=>set('tags',value));
  for(const [title,descriptors] of groups){
   const group=details(fields,title,title==='先端と形状');
   for(const [key,label,config] of descriptors) setting(group,label,draft[key],config,value=>set(key,value));
   if(title==='先端と形状'){
    const asset=field(group,'画像先端（最大128×128、透過を使用）','',{type:'file',accept:'image/png,image/webp,image/jpeg'},()=>{});
    asset.addEventListener('change',async()=>{
     const file=asset.files[0],session=editSession;
     if(!file)return;
     let image;
     try{
      if(file.size>2*1024*1024)throw Error('先端画像は2 MBまでです');
      image=await createImageBitmap(file);
      if(!dialog.open||session!==editSession)return;
      if(image.width>128||image.height>128)throw Error('先端画像は128×128 pxまでです');
      const canvas=Object.assign(document.createElement('canvas'),{width:image.width,height:image.height});
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
      const pixels=ctx.getImageData(0,0,image.width,image.height).data;
      const alpha=new Uint8Array(image.width*image.height);
      for(let i=0;i<alpha.length;i++)alpha[i]=pixels[i*4+3];
      const bytes=new Uint8Array(2+alpha.length);bytes.set([image.width,image.height]);bytes.set(alpha,2);
      const hash=await crypto.subtle.digest('SHA-256',bytes);
      if(!dialog.open||session!==editSession)return;
      const hex=data=>Array.from(data,v=>v.toString(16).padStart(2,'0')).join('');
      set('asset',{width:image.width,height:image.height,alpha:hex(alpha),sha256:hex(new Uint8Array(hash))});set('tip','bitmap');renderEditor();
     }catch(e){if(session===editSession)error.textContent=e.message}
     finally{image?.close()}
    });
   }
  }
  const dynamics=details(fields,'入力変調');
  const available=source=>source==='barrel'?sensors.barrel:['tilt','azimuth'].includes(source)?sensors.tilt:true;
  const mappingList=document.createElement('div');dynamics.append(mappingList);
  function addRow(node,i){
   const row=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent='変調 '+(i+1);row.append(legend);mappingList.append(row);
   setting(row,'有効',node.enabled,'checkbox',value=>{node.enabled=value});
   field(row,'入力',node.source,sources,value=>{node.source=value;renderMappings()});
   field(row,'出力',node.output,Object.keys(domains),value=>{node.output=value});
   field(row,'合成',node.operation,[['multiply','乗算'],['add','加算'],['replace','置換']],value=>{node.operation=value});
   for(const [key,caption,config] of [['min','出力の始値',[-10000,10000,.01]],['max','出力の終値',[-10000,10000,.01]],['scale','入力の上限（距離・時間・速度）',[.001,100000,.001]]]) {
    setting(row,caption,node[key],config,value=>{node[key]=value});
   }
   setting(row,'反転',node.invert,'checkbox',value=>{node.invert=value});
   field(row,'カーブの点 x:y（空白区切り）',node.knots.map(k=>k.join(':')).join(' '),{type:'text'},value=>{node.knots=value.trim().split(/\s+/).map(k=>k.split(':').map(Number))});
   if(!available(node.source)){
    const message=document.createElement('p');message.textContent='この入力は未検出です。代替値を空欄にするとこの変調を適用しません。';row.append(message);
   }
   field(row,'センサーが届かない場合の代替値（任意）',node.constant??'',number(0,1,.01),value=>{node.constant=Number.isNaN(value)?null:value});
   if(i)button(row,'上へ',()=>{[draft.maps[i-1],draft.maps[i]]=[node,draft.maps[i-1]];renderMappings()});
   button(row,'削除',()=>{draft.maps.splice(i,1);renderMappings()});
  }
  function renderMappings(){mappingList.replaceChildren();draft.maps.forEach(addRow)}
  renderMappings();
  button(dynamics,'変調を追加',()=>{
   if(draft.maps.length>=24){error.textContent='変調は24件までです';return}
   draft.maps.push({enabled:true,source:'pressure',output:'size',operation:'multiply',min:.1,max:1,scale:1,invert:false,knots:[[0,0],[1,1]]});
   renderMappings();
  });
 }
 function openEditor(){
  editing=brushes.get(selected);draft=structuredClone(editing);editSession++;
  error.textContent='';clearPad();renderEditor();dialog.showModal();
 }
 byId('brush-edit').onclick=openEditor;
 byId('brush-cancel').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{editSession++;clearPad()});
 byId('brush-reset').onclick=()=>{
  const original=preset(editing.origin||editing.id);
  draft={...original,id:editing.id,origin:editing.origin,version:editing.version};
  error.textContent='';renderEditor();
 };
 function saveDraft(copy){
  try{
   const next={...draft,id:copy?crypto.randomUUID():editing.id,version:copy?1:editing.version+1};
   if(copy){next.origin=editing.origin||editing.id;if(next.name===editing.name)next.name=(next.name.slice(0,70)+' コピー')}
   validateBrush(next);brushes.set(next.id,next);onSelect(next.id,false);dialog.close();
  }catch(e){error.textContent=e.message}
 }
 byId('brush-apply').onclick=()=>saveDraft(false);
 byId('brush-copy').onclick=()=>saveDraft(true);
 onPad(()=>{try{return [editing,validateBrush(structuredClone(draft))]}catch(e){error.textContent=e.message;return null}});
 refresh();
 return {get:id=>brushes.get(id),select,input,correction};
}
