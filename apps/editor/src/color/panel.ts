import {ForegroundColor,exportPalette,clamp,hex,fromHex,hslToRgb,hsvToRgb,rgb,rgbToHsl,rgbToHsv,type RGB} from './model';

const id=<T extends HTMLElement>(name:string)=>document.getElementById(name) as T;
const button=(label:string,action:string,cls='')=>'<button type="button" class="'+cls+'" data-color-action="'+action+'">'+label+'</button>';

/** One default experience: select a color. Numeric work and management are optional disclosures. */
export function colorMarkup():string {
 return '<div class="color-workbench">'+
 '<div class="color-current" aria-label="現在の色と変更前の色">'+
  '<button id="colorCurrent" class="color-chip" type="button" aria-label="現在の色"></button>'+
  '<div class="color-describe"><strong>現在の色</strong><output id="colorCode">#1F2633</output></div>'+
  '<button id="colorPrevious" class="color-chip color-previous" type="button" aria-label="変更前の色に戻す"></button><span class="color-previous-label">変更前</span>'+
 '</div>'+
 '<div class="color-mode-switch" role="tablist" aria-label="カラーウィンドウ">'+
  '<button type="button" id="colorShowColor" role="tab" aria-controls="colorScreen" aria-selected="true" tabindex="0">カラー</button>'+
  '<button type="button" id="colorShowPalette" role="tab" aria-controls="colorPaletteScreen" aria-selected="false" tabindex="-1">パレット</button>'+
 '</div>'+
 '<section id="colorScreen" role="tabpanel" aria-labelledby="colorShowColor" class="color-primary">'+
  '<div class="color-picker" id="colorPicker">'+
   '<div id="colorRing" class="color-ring" role="slider" tabindex="0" aria-label="色相" aria-valuemin="0" aria-valuemax="359" aria-valuenow="0"></div>'+
   '<i id="colorHueMarker" class="color-ring-marker" aria-hidden="true"></i>'+
   '<div id="colorPlane" class="color-plane" role="group" aria-label="彩度と明度"><div class="color-plane-white"></div><div class="color-plane-black"></div><i id="colorSvMarker" class="color-sv-marker"></i></div>'+
  '</div>'+
  '<label class="color-hex-label" for="colorHex"><span>カラーコード</span><input id="colorHex" maxlength="7" spellcheck="false" inputmode="text" autocomplete="off" aria-describedby="colorHexError" value="#1F2633"></label>'+
  '<small id="colorHexError" class="color-error" role="status"></small>'+
  '<div id="colorValueChannels" class="color-value-channels"></div>'+
  '<div class="color-value-footer"><span class="color-mode-caption">色の数値</span>'+
   '<div role="radiogroup" class="color-models" aria-label="カラー形式">'+
    ['HSV','RGB','HSL'].map((m,i)=>'<label><input type="radio" name="colorModel" value="'+m+'" '+(i===0?'checked':'')+'><span>'+(m==='HSV'?'HSB':m)+'</span></label>').join('')+
   '</div>'+
  '</div>'+
  '<details id="colorEyedropperOptions" class="color-disclosure color-sample-options"><summary>スポイトの参照先</summary><div class="color-detail-inner">'+
   '<label class="color-sample-source" for="colorSampleSource">取得する場所<select id="colorSampleSource"><option value="composite">見えている絵全体</option><option value="layer">選んでいるレイヤー</option></select></label>'+
  '</div></details>'+
 '</section>'+
 '<section id="colorPaletteScreen" role="tabpanel" aria-labelledby="colorShowPalette" class="color-palette-screen" hidden>'+
  '<div class="color-section-header"><h3>カラーパレット</h3>'+button('＋ 色を追加','add-current','color-add-button')+'</div>'+
  '<label for="colorPaletteSelect" class="color-palette-choice"><span>パレット</span><select id="colorPaletteSelect" aria-label="使うパレット"></select></label>'+
  '<div id="colorPaletteList" class="color-swatch-grid color-favorites-grid" role="group" aria-label="カラーパレット"></div>'+
  '<div class="color-section-header color-history-heading"><h3>カラー履歴</h3></div>'+
  '<div id="colorHistoryList" class="color-swatch-grid color-history-strip" role="group" aria-label="カラー履歴"></div>'+
  '<details id="colorPaletteTools" class="color-disclosure color-manage"><summary>パレットの編集・管理</summary><div class="color-detail-inner">'+
   '<div class="color-palette-actions">'+button('新規作成','new-palette')+button('名前の変更','rename-palette')+'</div>'+
   '<div class="color-palette-actions">'+button('書き出す','export-palette')+button('読み込む','import-palette')+'</div>'+
   '<input type="file" id="colorPaletteFile" accept=".json,application/json" hidden>'+
   '<p class="color-help">色の並べ替え・削除</p><div id="colorPaletteManageList" class="color-manage-grid" role="group" aria-label="パレットの色の並べ替え・削除"></div>'+
   '<small id="colorPaletteError" class="color-error" role="status"></small>'+
  '</div></details>'+
 '</section>'+
 '<div class="color-palette-notice" id="colorActionNotice" role="status" aria-live="polite"></div>'+
 '<dialog id="colorPaletteDialog" class="color-palette-dialog" aria-labelledby="colorPaletteDialogTitle"><form id="colorPaletteForm"><h3 id="colorPaletteDialogTitle">新しいパレット</h3><label for="colorPaletteName">パレットの名前<input id="colorPaletteName" type="text" maxlength="80" required autocomplete="off"></label><small id="colorPaletteDialogError" class="color-error" role="alert"></small><div class="color-dialog-actions"><button id="colorPaletteCancel" type="button">やめる</button><button id="colorPaletteConfirm" type="submit">保存</button></div></form></dialog>'+
 '</div>';
}

export function installColorPanel(state:ForegroundColor,options:{onPickTool:()=>void,onBrushColor:()=>void}){
 let model='HSV' as 'HSV'|'HSL'|'RGB',hueMemory=rgbToHsv(state.current).h;
 const current=id<HTMLElement>('colorCurrent'),previous=id<HTMLButtonElement>('colorPrevious'),code=id<HTMLOutputElement>('colorCode'),
  ring=id<HTMLElement>('colorRing'),plane=id<HTMLElement>('colorPlane'),hexField=id<HTMLInputElement>('colorHex'),
  notice=id<HTMLElement>('colorActionNotice'),
  colorScreen=id<HTMLElement>('colorScreen'),paletteScreen=id<HTMLElement>('colorPaletteScreen'),
  showColor=id<HTMLButtonElement>('colorShowColor'),showPalette=id<HTMLButtonElement>('colorShowPalette');
 let channelEditing=false,editingHex=false;
 const selectScreen=(next:'color'|'palette',focus=false)=>{
  colorScreen.hidden=next!=='color';paletteScreen.hidden=next!=='palette';
  showColor.setAttribute('aria-selected',String(next==='color'));showPalette.setAttribute('aria-selected',String(next==='palette'));
  showColor.tabIndex=next==='color'?0:-1;showPalette.tabIndex=next==='palette'?0:-1;
  if(focus)(next==='color'?showColor:showPalette).focus();
 };
 showColor.onclick=()=>selectScreen('color');showPalette.onclick=()=>selectScreen('palette');
 for(const tab of [showColor,showPalette])tab.onkeydown=e=>{
  if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
  e.preventDefault();selectScreen(e.key==='ArrowRight'||e.key==='End'?'palette':'color',true);
 };
 function reflect(){
  const c=state.current,hsv=rgbToHsv(c);
  if(hsv.s>1e-7&&hsv.v>1e-7)hueMemory=hsv.h;
  current.style.backgroundColor=hex(c);code.textContent=hex(c);previous.style.backgroundColor=hex(state.previous);
  id<HTMLElement>('colorBoxSummary').textContent=hex(c);
  plane.style.setProperty('--pure',hex(hsvToRgb(hueMemory,1,1)));
  const angle=hueMemory*Math.PI/180,hue=id<HTMLElement>('colorHueMarker');
  hue.style.left=(50+44*Math.cos(angle))+'%';hue.style.top=(50+44*Math.sin(angle))+'%';
  const marker=id<HTMLElement>('colorSvMarker');marker.style.left=(hsv.s*100)+'%';marker.style.top=((1-hsv.v)*100)+'%';
  ring.setAttribute('aria-valuenow',String(Math.round(hueMemory)%360));
  ring.setAttribute('aria-valuetext','色相 '+Math.round(hueMemory)+'度');
  if(document.activeElement!==hexField)hexField.value=hex(c);
  if(!channelEditing)updateChannels();
  for(const el of document.querySelectorAll<HTMLButtonElement>('.color-swatch')){
   el.setAttribute('aria-pressed',String(el.dataset.hex===hex(c)));
  }
  options.onBrushColor();
 }
 current.onclick=()=>{ring.focus({preventScroll:true});};
 previous.onclick=()=>state.choose(state.previous);
 const commitHex=()=>{if(!editingHex)return;const parsed=fromHex(hexField.value);
  if(!parsed){id('colorHexError').textContent='#の後に6桁の英数字を入力してください。';if(document.activeElement!==hexField){editingHex=false;state.cancel();hexField.value=hex(state.current);}return;}
  editingHex=false;id('colorHexError').textContent='';state.commit(parsed);
 };
 hexField.addEventListener('focus',()=>{editingHex=true;state.begin();});
 hexField.addEventListener('input',()=>{const c=fromHex(hexField.value);if(c){id('colorHexError').textContent='';state.preview(c);}});
 hexField.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();editingHex=false;state.cancel();hexField.value=hex(state.current);id('colorHexError').textContent='';hexField.blur();}else if(e.key==='Enter'){e.preventDefault();commitHex();hexField.blur();}});
 hexField.addEventListener('blur',commitHex);
 // Use inverse 45-degree rotation for the ibisPaint-style HSB diamond.
 let pointer:number|null=null,part:'ring'|'plane'|null=null;
 const picker=id<HTMLElement>('colorPicker');
 function movePicker(e:PointerEvent){
  if(pointer!==e.pointerId||!part)return;
  if(part==='ring'){
   const r=ring.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;
   hueMemory=(Math.atan2(y,x)*180/Math.PI+360)%360;
   const sv=rgbToHsv(state.current);state.preview(hsvToRgb(hueMemory,sv.s,sv.v));
  }else{
   const r=plane.getBoundingClientRect(),side=plane.offsetWidth;
   const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
   const saturation=clamp(.5+(dx+dy)/(Math.SQRT2*side));
   const brightness=1-clamp(.5+(-dx+dy)/(Math.SQRT2*side));
   state.preview(hsvToRgb(hueMemory,saturation,brightness));
  }
 }
 picker.addEventListener('pointerdown',e=>{
  if(pointer!==null)return;
  const target=e.target as HTMLElement;
  part=target.closest('#colorPlane')?'plane':target.closest('#colorRing,#colorHueMarker')?'ring':null;
  if(!part)return;pointer=e.pointerId;state.begin();picker.setPointerCapture(e.pointerId);movePicker(e);e.preventDefault();
 });
 picker.addEventListener('pointermove',movePicker);
 picker.addEventListener('pointerup',e=>{if(e.pointerId!==pointer)return;movePicker(e);pointer=null;part=null;state.commit();});
 picker.addEventListener('pointercancel',e=>{if(e.pointerId!==pointer)return;pointer=null;part=null;state.cancel();});
 picker.addEventListener('lostpointercapture',e=>{if(e.pointerId!==pointer)return;pointer=null;part=null;state.cancel();});
 ring.addEventListener('keydown',e=>{
  const delta=e.key==='ArrowRight'||e.key==='ArrowUp'?1:e.key==='ArrowLeft'||e.key==='ArrowDown'?-1:e.key==='PageUp'?10:e.key==='PageDown'?-10:null;
  if(delta===null&&e.key!=='Home'&&e.key!=='End')return;
  e.preventDefault();const h=e.key==='Home'?0:e.key==='End'?359:(hueMemory+delta!+360)%360,sv=rgbToHsv(state.current);
  hueMemory=h;state.choose(hsvToRgb(h,sv.s,sv.v));
 });
 const models=document.querySelectorAll<HTMLInputElement>('input[name="colorModel"]');
 models.forEach(el=>el.onchange=()=>{if(el.checked){model=el.value as typeof model;renderChannels();}});
 const channels=id<HTMLElement>('colorValueChannels');
 const channelDef=()=>model==='RGB'?[['R','赤',255],['G','緑',255],['B','青',255]] as const:model==='HSL'?[['H','色相',360],['S','鮮やかさ',100],['L','明るさ',100]] as const:[['H','色相',360],['S','鮮やかさ',100],['V','明るさ',100]] as const;
 const values=()=>{const c=state.current,hsv=rgbToHsv(c),hsl=rgbToHsl(c);return model==='RGB'?[c.r*255,c.g*255,c.b*255]:model==='HSL'?[hsl.h,hsl.s*100,hsl.l*100]:[hsv.h,hsv.s*100,hsv.v*100];};
 function previewValue(index:number,value:number){
  if(!Number.isFinite(value))return false;const defs=channelDef();if(value<0||value>defs[index]![2])return false;
  const v=values();v[index]=value;if(model!=='RGB'&&index===0)hueMemory=value;
  state.preview(model==='RGB'?rgb(v[0]!/255,v[1]!/255,v[2]!/255):model==='HSL'?hslToRgb(v[0]!,v[1]!/100,v[2]!/100):hsvToRgb(v[0]!,v[1]!/100,v[2]!/100));return true;
 }
 function renderChannels(){
  channels.replaceChildren();channelDef().forEach(([,label,max],i)=>{
   const row=document.createElement('div');row.className='color-value-row';
   row.innerHTML='<label for="colorSlider'+i+'">'+label+'</label><input type="range" id="colorSlider'+i+'" min="0" max="'+max+'" step="0.1" aria-label="'+label+'のスライダー"><input type="number" id="colorNumber'+i+'" min="0" max="'+max+'" step="0.1" aria-label="'+label+'の数値"><span class="color-unit">'+(model==='RGB'?'':i===0?'°':'%')+'</span>';
   channels.append(row);const slider=id<HTMLInputElement>('colorSlider'+i),number=id<HTMLInputElement>('colorNumber'+i);
   slider.onpointerdown=()=>state.begin();slider.oninput=()=>{state.begin();previewValue(i,Number(slider.value));};
   slider.onchange=()=>state.commit();slider.onpointercancel=()=>state.cancel();
   number.onfocus=()=>{channelEditing=true;state.begin();};
   number.oninput=()=>{if(number.value!==''&&number.validity.valid)previewValue(i,Number(number.value));};
   const finish=()=>{if(!channelEditing)return;const n=Number(number.value);
    if(number.value===''||!Number.isFinite(n)||!number.validity.valid||!previewValue(i,n)){
     number.setCustomValidity('0〜'+max+'の数字を入力してください。');number.reportValidity();
     if(document.activeElement!==number){channelEditing=false;state.cancel();}return;
    }number.setCustomValidity('');channelEditing=false;state.commit();
   };
   number.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();channelEditing=false;number.setCustomValidity('');state.cancel();updateChannels();number.blur();}else if(e.key==='Enter'){e.preventDefault();finish();if(!channelEditing)number.blur();}};
   number.onblur=finish;
  });updateChannels();
 }
 function updateChannels(){const v=values();v.forEach((n,i)=>{const s=document.getElementById('colorSlider'+i) as HTMLInputElement|null,f=document.getElementById('colorNumber'+i) as HTMLInputElement|null;if(s)s.value=String(n);if(f&&document.activeElement!==f)f.value=String(Math.round(n*10)/10);});}
 // HSB/RGB/HSL values are directly visible below the diamond.
 const list=id<HTMLElement>('colorPaletteList'),manager=id<HTMLElement>('colorPaletteManageList'),history=id<HTMLElement>('colorHistoryList'),selector=id<HTMLSelectElement>('colorPaletteSelect');
 function makeChip(color:RGB,label:string,onSelect:()=>void):HTMLButtonElement{
  const b=document.createElement('button');b.type='button';b.className='color-swatch';b.style.backgroundColor=hex(color);b.dataset.hex=hex(color);b.title=label+' '+hex(color);b.setAttribute('aria-label',label+' '+hex(color));b.setAttribute('aria-pressed',String(hex(color)===hex(state.current)));b.onclick=onSelect;return b;
 }
 function renderCollections(){
  selector.replaceChildren(...state.palettes.map(p=>{const op=new Option(p.name,p.id);op.selected=p.id===state.paletteId;return op;}));
  list.replaceChildren();manager.replaceChildren();
  for(const [i,s] of state.palette.swatches.entries()){
   list.append(makeChip(s.color,'保存した色 '+(i+1),()=>state.choose(s.color)));
   const cell=document.createElement('div');cell.className='color-swatch-cell';
   cell.append(makeChip(s.color,'保存した色 '+(i+1),()=>state.choose(s.color)));
   for(const [mark,move] of [['◀',-1],['▶',1],['×',0]] as const){
    const b=document.createElement('button');b.className='color-swatch-move';b.type='button';b.textContent=mark;
    b.setAttribute('aria-label',move===0?'色を削除':move<0?'前へ移動':'後へ移動');
    b.disabled=move!==0&&(i+move<0||i+move>=state.palette.swatches.length);
    b.onclick=()=>move===0?state.removeSwatch(s.id):state.moveSwatch(s.id,move);cell.append(b);
   }manager.append(cell);
  }
  if(!list.childElementCount)list.innerHTML='<span class="color-empty">「＋ 色を追加」で現在の色を登録</span>';
  if(!manager.childElementCount)manager.innerHTML='<span class="color-empty">保存した色はありません。</span>';
  history.replaceChildren(...state.history.map((c,i)=>makeChip(c,'最近の色 '+(i+1),()=>state.choose(c))));
  if(!history.childElementCount)history.innerHTML='<span class="color-empty">色を選ぶと、ここからすぐ戻せます。</span>';
 }
 selector.onchange=()=>state.selectPalette(selector.value);
 const error=id<HTMLElement>('colorPaletteError');
 const dialog=id<HTMLDialogElement>('colorPaletteDialog'),form=id<HTMLFormElement>('colorPaletteForm'),paletteName=id<HTMLInputElement>('colorPaletteName');
 let dialogMode:'new'|'rename'='new';
 function showPaletteDialog(mode:'new'|'rename'){dialogMode=mode;id('colorPaletteDialogTitle').textContent=mode==='new'?'新しいパレットを作る':'パレットの名前を変える';paletteName.value=mode==='new'?'':state.palette.name;id('colorPaletteDialogError').textContent='';dialog.showModal();paletteName.focus();}
 id<HTMLButtonElement>('colorPaletteCancel').onclick=()=>dialog.close();
 form.onsubmit=e=>{e.preventDefault();try{if(dialogMode==='new')state.createPalette(paletteName.value);else state.renamePalette(paletteName.value);dialog.close();notice.textContent='パレットを更新しました。';}catch(ex){id('colorPaletteDialogError').textContent=ex instanceof Error?ex.message:String(ex);}};
 document.querySelectorAll<HTMLButtonElement>('[data-color-action]').forEach(b=>b.onclick=async()=>{
  const name=b.dataset.colorAction;error.textContent='';notice.textContent='';
  try{
   switch(name){
    case 'eyedropper':options.onPickTool();break;
    case 'add-current':state.addSwatch();notice.textContent='今の色を保存しました。';break;
    case 'clear-history':state.clearHistory();break;
    case 'new-palette':showPaletteDialog('new');break;
    case 'rename-palette':showPaletteDialog('rename');break;
    case 'export-palette':{const payload=new Blob([exportPalette(state.palette)],{type:'application/json'});const url=URL.createObjectURL(payload),a=document.createElement('a');a.href=url;a.download='illustro-palette.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);break;}
    case 'import-palette':id<HTMLInputElement>('colorPaletteFile').click();break;
   }
  }catch(e){error.textContent=e instanceof Error?e.message:String(e);}
 });
 id<HTMLInputElement>('colorPaletteFile').onchange=async e=>{
  const field=e.target as HTMLInputElement,file=field.files?.[0];field.value='';if(!file)return;
  if(file.size>262144){error.textContent='ファイルが大きすぎます（256KBまで）。';return;}
  try{state.importPalette(await file.text());selectScreen('palette');notice.textContent='パレットを読み込みました。';}catch(ex){error.textContent=ex instanceof Error?ex.message:String(ex);}
 };
 const unsubscribe=state.subscribe(()=>{reflect();if(!state.isEditing)renderCollections();});
 renderChannels();reflect();renderCollections();
 return {destroy:unsubscribe,showTab:(n:number)=>{selectScreen(n>=2?'palette':'color');if(n===1){model='RGB';(document.querySelector<HTMLInputElement>('input[name="colorModel"][value="RGB"]')!).checked=true;renderChannels();}}};
}
