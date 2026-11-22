import {installOrbitPicker} from './orbit';
import {installHarmonyTools} from './harmony';
import {ORBIT_WHEEL,orbitHuePaths} from './orbitGeometry';
import {ForegroundColor,exportPalette,clamp,hex,fromHex,hslToRgb,hsvToRgb,rgb,rgbToHsl,rgbToHsv,type RGB} from './model';

const id=<T extends HTMLElement>(name:string)=>document.getElementById(name) as T;
const button=(label:string,action:string,cls='')=>'<button type="button" class="'+cls+'" data-color-action="'+action+'">'+label+'</button>';

/** Familiar two-view Color/Palette panel with a compact Classic/Orbit selector. */
export function colorSettingsMarkup(){
 return '<div id="workspaceColorSettings"><label>色相環の表示形式 <select id="colorPickerMode" aria-label="色選択の表示モード" title="色選択の表示モード"><option value="classic">クラシック</option><option value="orbit">オービット</option></select></label></div>'+
 '<div class="c04-secondary-color"><label>背景の色 <input id="c04BackgroundColor" type="color" value="#FFFFFF" aria-label="背景色を選ぶ"></label><button id="c04SwapColor" type="button">描画色と交換</button></div>'+
 '<button type="button" id="openEyedropperSettings">スポイトの設定</button>';
}
export function colorMarkup():string {
 const arcs=orbitHuePaths();
 return '<div class="color-workbench">'+
 '<div class="color-current" aria-label="現在の色">'+
  '<button id="colorCurrent" class="color-chip" type="button" aria-label="現在の色"></button>'+
  '<div class="color-describe"><strong>現在の色</strong><output id="colorCode">#1F2633</output></div>'+
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
  '<div id="colorOrbitPicker" class="color-orbit-picker" hidden aria-label="オービット色選択">'+
   '<div id="colorOrbitPlane" class="color-orbit-plane" role="group" aria-label="彩度・明るさの調整"><div class="color-orbit-white"></div><div class="color-orbit-black"></div><span id="colorOrbitSvMarker" class="color-orbit-sv-marker" aria-hidden="true"></span></div>'+
   '<canvas id="colorOrbitWheel" class="color-orbit-wheel" role="slider" tabindex="0" width="640" height="320" aria-label="色相。短くタップして表示中の色を選択。円周をなぞって回転、手前は左右スライド" aria-valuemin="0" aria-valuemax="359" aria-valuenow="0"></canvas>'+
   '<svg id="colorOrbitHueBackHit" class="color-orbit-hue-hit color-orbit-hue-back" viewBox="0 0 '+ORBIT_WHEEL.width+' '+ORBIT_WHEEL.height+'" preserveAspectRatio="none" aria-hidden="true">'+
    '<path id="colorOrbitTopArc" d="'+arcs.top+'" fill="transparent"/>'+
   '</svg>'+
   '<canvas id="colorOrbitWheelFront" class="color-orbit-wheel color-orbit-wheel-front" width="640" height="320" aria-hidden="true"></canvas>'+
   '<svg id="colorOrbitHueHit" class="color-orbit-hue-hit color-orbit-hue-front" viewBox="0 0 '+ORBIT_WHEEL.width+' '+ORBIT_WHEEL.height+'" preserveAspectRatio="none" aria-hidden="true">'+
    '<path id="colorOrbitFrontArc" d="'+arcs.front+'" fill="transparent"/>'+
   '</svg>'+
   '<span class="color-orbit-hint">タップで選色・円周をなぞって回転・手前は左右スライド</span>'+
  '</div>'+
  '<div class="paint-color-values">'+
  '<label class="color-hex-label" for="colorHex"><span>カラーコード</span><input id="colorHex" maxlength="7" spellcheck="false" inputmode="text" autocomplete="off" aria-describedby="colorHexError" value="#1F2633"></label>'+
  '<small id="colorHexError" class="color-error" role="status"></small>'+
  '<div role="tablist" class="color-models" aria-label="色の数値形式">'+
   ['HSV','RGB','HSL'].map((m,i)=>'<button type="button" id="colorModel'+m+'" role="tab" aria-controls="colorValueChannels" aria-selected="'+(i===0)+'" tabindex="'+(i===0?0:-1)+'" value="'+m+'">'+m+'</button>').join('')+
  '</div><div id="colorValueChannels" role="tabpanel" aria-labelledby="colorModelHSV" class="color-value-channels"></div>'+
  '<div class="c04-color-opacity"><label for="c04ColorOpacity">色の不透明度</label><input id="c04ColorOpacity" type="range" data-unit="%" min="0" max="100" step="1" value="100" aria-label="描画色の不透明度"><input id="c04ColorOpacityNumber" type="number" min="0" max="100" step="1" value="100" aria-label="描画色の不透明度の数値"></div><small id="c04ColorOpacityStatus" role="status"></small>'+
  '</div></section>'+
  '<dialog id="colorEyedropperOptions" class="color-sample-options" aria-labelledby="eyedropperSettingsTitle"><h3 id="eyedropperSettingsTitle">スポイトの設定</h3><div class="color-detail-inner">'+
   '<label class="color-sample-source" for="colorSampleSource">取得する場所<select id="colorSampleSource"><option value="composite">見えている絵全体</option><option value="layer">選んでいるレイヤー</option><option value="specific">指定したレイヤー</option></select></label>'+
   '<label class="color-sample-source" id="colorSampleLayerLabel" hidden>取得するレイヤー<select id="colorSampleLayerId"></select></label>'+
   '<label class="color-sample-source">取得する範囲<select id="colorSampleDiameter"><option value="1">1画素（点）</option><option value="3">3×3画素の平均</option><option value="5">5×5画素の平均</option></select></label>'+
   '<label class="color-sample-source">透明の扱い<select id="colorSampleTransparency"><option value="skip">透明な画素は除外</option><option value="keep">透明も平均に含める</option><option value="white">白背景上の見た目</option></select></label>'+
   '<output id="colorSampleActiveSummary" class="color-sample-current" role="status" aria-live="polite">現在の採色元: 見えている作品全体</output>'+
   '<button id="referenceSampleOpen" type="button">参考画像から色を取る</button><small>作品の補助線・選択枠・色覚確認表示は採色に含めません。</small>'+
  '</div><form method="dialog"><button type="submit">閉じる</button></form></dialog>'+
 '<section id="colorPaletteScreen" role="tabpanel" aria-labelledby="colorShowPalette" class="color-palette-screen" hidden>'+
  '<div class="color-section-header"><h3>カラーパレット</h3>'+button('＋ 色を追加','add-current','color-add-button')+'</div>'+
  '<label for="colorPaletteSelect" class="color-palette-choice"><span>パレット</span><select id="colorPaletteSelect" aria-label="使うパレット"></select></label>'+
  '<div id="colorPaletteList" class="color-swatch-grid color-favorites-grid" role="group" aria-label="カラーパレット"></div>'+
  '<div class="color-section-header color-history-heading"><h3>カラー履歴</h3>'+button('履歴を消去','clear-history')+'</div>'+
  '<div id="colorHistoryList" class="color-swatch-grid color-history-strip" role="group" aria-label="カラー履歴"></div>'+
  '<details id="colorPaletteTools" class="color-disclosure color-manage"><summary>パレットの編集・管理</summary><div class="color-detail-inner">'+
   '<div class="color-palette-actions">'+button('新規作成','new-palette')+button('名前の変更','rename-palette')+'</div>'+
   '<div class="color-palette-actions">'+button('書き出す','export-palette')+button('読み込む','import-palette')+'</div>'+
  '<label class="c04-palette-folder-label">整理用フォルダー名<input id="c04PaletteFolder" type="text" maxlength="80" placeholder="例：背景・人物・資料"></label>'+
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
 const harmony=installHarmonyTools(state);
 let model='HSV' as 'HSV'|'HSL'|'RGB',hueMemory=rgbToHsv(state.current).h;
 // Black RGB cannot encode the selected saturation. Preserve the SV marker
 // coordinate separately when Value reaches zero.
 let saturationMemory=rgbToHsv(state.current).s,orbitStartSaturation=saturationMemory;
 const current=id<HTMLElement>('colorCurrent'),code=id<HTMLOutputElement>('colorCode'),
  ring=id<HTMLElement>('colorRing'),plane=id<HTMLElement>('colorPlane'),hexField=id<HTMLInputElement>('colorHex'),
  notice=id<HTMLElement>('colorActionNotice'),
  colorScreen=id<HTMLElement>('colorScreen'),paletteScreen=id<HTMLElement>('colorPaletteScreen'),
  showColor=id<HTMLButtonElement>('colorShowColor'),showPalette=id<HTMLButtonElement>('colorShowPalette');
 const classicPicker=id<HTMLElement>('colorPicker'),orbitPicker=id<HTMLElement>('colorOrbitPicker'),
  modeSelect=id<HTMLSelectElement>('colorPickerMode');
 const readStoredMode=()=>{try{return localStorage.getItem('illustro-color-picker-mode');}catch{return null;}};
 let pickerMode:'classic'|'orbit'='classic';
 const orbit=installOrbitPicker(orbitPicker,{
  getHue:()=>hueMemory,
  getSv:()=>{const c=rgbToHsv(state.current);return {s:c.v<=1e-7?saturationMemory:c.s,v:c.v};},
  onPreview:(h,s,v)=>{hueMemory=h;saturationMemory=clamp(s);state.preview(hsvToRgb(h,s,v));},
  begin:()=>{orbitStartSaturation=saturationMemory;state.begin();},
   commit:()=>state.commit(),cancel:()=>{saturationMemory=orbitStartSaturation;state.cancel();},
 });
 function setPickerMode(mode:'classic'|'orbit',store=true){
  pickerMode=mode;classicPicker.hidden=mode!=='classic';orbitPicker.hidden=mode!=='orbit';
  modeSelect.value=mode;
  const color=rgbToHsv(state.current);
  if(mode==='orbit')orbit.reflect(hueMemory,color.v<=1e-7?saturationMemory:color.s,color.v);
  if(store){try{localStorage.setItem('illustro-color-picker-mode',mode);}catch{/* browser storage may be restricted */}}
 }
 modeSelect.onchange=()=>setPickerMode(modeSelect.value==='orbit'?'orbit':'classic');
 setPickerMode(readStoredMode()==='classic'?'classic':'orbit',false);
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
  if(hsv.v>1e-7){saturationMemory=hsv.s;if(hsv.s>1e-7)hueMemory=hsv.h;}
  const displayS=hsv.v<=1e-7?saturationMemory:hsv.s;
  document.getElementById('colorPage')?.style.setProperty('--current-paint-color',hex(c));
  current.style.backgroundColor=hex(c);code.textContent=hex(c);
  id<HTMLInputElement>('c04BackgroundColor').value=hex(state.background);
  const opacity=Math.round(state.opacity*100);
  id<HTMLInputElement>('c04ColorOpacity').value=String(opacity);
  const opacityNumber=id<HTMLInputElement>('c04ColorOpacityNumber');
  if(document.activeElement!==opacityNumber)opacityNumber.value=String(opacity);
  id<HTMLElement>('colorBoxSummary').textContent=hex(c);
  plane.style.setProperty('--pure',hex(hsvToRgb(hueMemory,1,1)));
  const angle=hueMemory*Math.PI/180,hue=id<HTMLElement>('colorHueMarker');
  hue.style.left=(50+45.5*Math.cos(angle))+'%';hue.style.top=(50+45.5*Math.sin(angle))+'%';
  const marker=id<HTMLElement>('colorSvMarker');marker.style.left=(displayS*100)+'%';marker.style.top=((1-hsv.v)*100)+'%';
  ring.setAttribute('aria-valuenow',String(Math.round(hueMemory)%360));
  ring.setAttribute('aria-valuetext','色相 '+Math.round(hueMemory)+'度');
  if(pickerMode==='orbit')orbit.reflect(hueMemory,displayS,hsv.v);
  if(document.activeElement!==hexField)hexField.value=hex(c);
  if(!channelEditing)updateChannels();
  // Preview can fire on every pointer move. Touch only chips whose selected
  // state actually changes; avoid walking 2×256 palette controls each move.
  const nextHex=hex(c);
  if(nextHex!==selectedChipHex){
    for(const chip of chipsByHex.get(selectedChipHex)??[])chip.setAttribute('aria-pressed','false');
    for(const chip of chipsByHex.get(nextHex)??[])chip.setAttribute('aria-pressed','true');
    selectedChipHex=nextHex;
  }
  options.onBrushColor();
 }
 const opacityRange=id<HTMLInputElement>('c04ColorOpacity'),opacityNumeric=id<HTMLInputElement>('c04ColorOpacityNumber'),
   opacityStatus=id<HTMLElement>('c04ColorOpacityStatus');
 opacityRange.oninput=()=>{state.setOpacity(Number(opacityRange.value)/100);opacityStatus.textContent='';};
 const finishOpacity=()=>{
  if(!opacityNumeric.validity.valid||!Number.isFinite(opacityNumeric.valueAsNumber)){
    opacityStatus.textContent='0〜100の数字を入力してください。';
    return false;
  }
  const value=opacityNumeric.valueAsNumber/100;
  if(value!==state.opacity)state.setOpacity(value);
  opacityStatus.textContent='';
  return true;
 };
 opacityNumeric.onchange=finishOpacity;
 opacityNumeric.onblur=()=>{opacityNumeric.value=String(Math.round(state.opacity*100));};
 opacityNumeric.onkeydown=event=>{
  if(event.key==='Enter'){event.preventDefault();if(finishOpacity())opacityNumeric.blur();}
  if(event.key==='Escape'){event.preventDefault();opacityNumeric.value=String(Math.round(state.opacity*100));opacityStatus.textContent='';opacityNumeric.blur();}
 };
 current.onclick=()=>{(pickerMode==='orbit'?id<HTMLElement>('colorOrbitWheel'):ring).focus({preventScroll:true});};
 id<HTMLInputElement>('c04BackgroundColor').onchange=event=>{const next=fromHex((event.target as HTMLInputElement).value);if(next)state.setBackground(next);};
 id<HTMLButtonElement>('c04SwapColor').onclick=()=>state.swapBackground();
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
   const sv=rgbToHsv(state.current);state.preview(hsvToRgb(hueMemory,sv.v<=1e-7?saturationMemory:sv.s,sv.v));
  }else{
   const r=plane.getBoundingClientRect(),side=plane.offsetWidth;
   const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
   const saturation=clamp(.5+(dx+dy)/(Math.SQRT2*side));
   saturationMemory=saturation;
   const brightness=1-clamp(.5+(-dx+dy)/(Math.SQRT2*side));
   state.preview(hsvToRgb(hueMemory,saturation,brightness));
  }
 }
 picker.addEventListener('pointerdown',e=>{
  if(pointer!==null)return;
  const target=e.target as HTMLElement;
  part=target.closest('#colorPlane')?'plane':target.closest('#colorRing,#colorHueMarker')?'ring':null;
  if(part==='ring'){
   // Masked-out center must NOT act as a hue control. The hue band alone is interactive.
   const r=ring.getBoundingClientRect(),dist=Math.hypot(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2);
   const band=parseFloat(getComputedStyle(ring).getPropertyValue('--hue-ring-width'))||22;
   if(dist<r.width/2-band-3||dist>r.width/2+3)part=null;
  }
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
  hueMemory=h;state.choose(hsvToRgb(h,sv.v<=1e-7?saturationMemory:sv.s,sv.v));
 });
 const models=[...document.querySelectorAll<HTMLButtonElement>('.color-models [role=tab]')];
 const channels=id<HTMLElement>('colorValueChannels');
 const selectModel=(next:typeof model,focus=false)=>{
  model=next;
  for(const tab of models){
   const selected=tab.value===model;
   tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
   if(selected){channels.setAttribute('aria-labelledby',tab.id);if(focus)tab.focus();}
  }
  renderChannels();
 };
 for(const [index,tab] of models.entries()){
  tab.onclick=()=>selectModel(tab.value as typeof model);
  tab.onkeydown=event=>{
   const key=event.key;
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(key))return;
   event.preventDefault();
   const at=key==='Home'?0:key==='End'?models.length-1:(index+models.length+(key==='ArrowRight'?1:-1))%models.length;
   selectModel(models[at]!.value as typeof model,true);
  };
 }
 const channelDef=()=>model==='RGB'?[['R','赤',255],['G','緑',255],['B','青',255]] as const:model==='HSL'?[['H','色相',360],['S','鮮やかさ',100],['L','明るさ',100]] as const:[['H','色相',360],['S','鮮やかさ',100],['V','明るさ',100]] as const;
 const values=()=>{const c=state.current,hsv=rgbToHsv(c),hsl=rgbToHsl(c);return model==='RGB'?[c.r*255,c.g*255,c.b*255]:model==='HSL'?[hsl.h,hsl.s*100,hsl.l*100]:[hueMemory,(hsv.v<=1e-7?saturationMemory:hsv.s)*100,hsv.v*100];};
 function previewValue(index:number,value:number){
  if(!Number.isFinite(value))return false;const defs=channelDef();if(value<0||value>defs[index]![2])return false;
  const v=values();v[index]=value;if(model!=='RGB'&&index===0)hueMemory=value;
  if(model==='HSV'&&index===1)saturationMemory=value/100;
  state.preview(model==='RGB'?rgb(v[0]!/255,v[1]!/255,v[2]!/255):model==='HSL'?hslToRgb(v[0]!,v[1]!/100,v[2]!/100):hsvToRgb(v[0]!,v[1]!/100,v[2]!/100));return true;
 }
 function renderChannels(){
  channels.replaceChildren();channelDef().forEach(([,label,max],i)=>{
   const row=document.createElement('div');row.className='color-value-row';
   row.innerHTML='<label for="colorSlider'+i+'">'+label+'</label><input type="range" id="colorSlider'+i+'" min="0" max="'+max+'" step="0.1" data-unit="'+(model==='RGB'?'':i===0?'°':'%')+'" aria-label="'+label+'のスライダー"><input type="number" id="colorNumber'+i+'" min="0" max="'+max+'" step="0.1" aria-label="'+label+'の数値">';
   channels.append(row);const slider=id<HTMLInputElement>('colorSlider'+i),number=id<HTMLInputElement>('colorNumber'+i);
   slider.onpointerdown=()=>state.begin();slider.oninput=()=>{state.begin();previewValue(i,Number(slider.value));};
   slider.onchange=()=>state.commit();slider.onpointercancel=()=>state.cancel();
   number.onfocus=()=>{channelEditing=true;state.begin();};
   number.oninput=()=>{number.setCustomValidity('');if(number.value!==''&&number.validity.valid)previewValue(i,Number(number.value));};
   const finish=()=>{if(!channelEditing)return;const n=Number(number.value);
    if(number.value===''||!Number.isFinite(n)||!number.validity.valid||!previewValue(i,n)){
     if(document.activeElement===number){
      number.setCustomValidity('0〜'+max+'の数字を入力してください。');number.reportValidity();
     }else{number.setCustomValidity('');channelEditing=false;state.cancel();}
     return;
    }number.setCustomValidity('');channelEditing=false;state.commit();
   };
   number.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();channelEditing=false;number.setCustomValidity('');state.cancel();updateChannels();number.blur();}else if(e.key==='Enter'){e.preventDefault();finish();if(!channelEditing)number.blur();}};
   number.onblur=finish;
  });updateChannels();
 }
 function updateChannels(){const v=values();v.forEach((n,i)=>{const s=document.getElementById('colorSlider'+i) as HTMLInputElement|null,f=document.getElementById('colorNumber'+i) as HTMLInputElement|null;if(s)s.value=String(n);if(f&&document.activeElement!==f)f.value=String(Math.round(n*10)/10);});}
 // HSB/RGB/HSL values are directly visible below the diamond.
 const list=id<HTMLElement>('colorPaletteList'),manager=id<HTMLElement>('colorPaletteManageList'),history=id<HTMLElement>('colorHistoryList'),selector=id<HTMLSelectElement>('colorPaletteSelect');
 const clearHistory=document.querySelector<HTMLButtonElement>('[data-color-action="clear-history"]')!;
 const chipsByHex=new Map<string,HTMLButtonElement[]>();
 let selectedChipHex=hex(state.current),renderedCollectionsVersion=-1;
 function makeChip(color:RGB,label:string,onSelect:()=>void):HTMLButtonElement{
  const b=document.createElement('button');b.type='button';b.className='color-swatch';b.style.backgroundColor=hex(color);b.dataset.hex=hex(color);b.title=label+' '+hex(color);b.setAttribute('aria-label',label+' '+hex(color));b.setAttribute('aria-pressed',String(hex(color)===hex(state.current)));b.onclick=onSelect;
  const key=b.dataset.hex!;const registered=chipsByHex.get(key);
  if(registered)registered.push(b);else chipsByHex.set(key,[b]);
  return b;
 }
 function renderCollections(){
  chipsByHex.clear();
  selector.replaceChildren(...state.availablePalettes.map(p=>{const op=new Option((p.folder?p.folder+' / ':'')+p.name,p.id);op.selected=p.id===state.paletteId;return op;}));
  const folder=id<HTMLInputElement>('c04PaletteFolder');if(document.activeElement!==folder)folder.value=state.palette.folder??'';
  list.replaceChildren();manager.replaceChildren();
  for(const [i,s] of state.palette.swatches.entries()){
   list.append(makeChip(s.color,'保存した色 '+(i+1)+(s.tags?.length?' タグ: '+s.tags.join('・'):''),()=>state.choose(s.color)));
   const cell=document.createElement('div');cell.className='color-swatch-cell';
   cell.append(makeChip(s.color,'保存した色 '+(i+1),()=>state.choose(s.color)));
   for(const [mark,move] of [['◀',-1],['▶',1],['×',0]] as const){
    const b=document.createElement('button');b.className='color-swatch-move';b.type='button';b.textContent=mark;
    b.setAttribute('aria-label',move===0?'色を削除':move<0?'前へ移動':'後へ移動');
    b.disabled=move!==0&&(i+move<0||i+move>=state.palette.swatches.length);
    b.onclick=()=>move===0?state.removeSwatch(s.id):state.moveSwatch(s.id,move);cell.append(b);
   }
   const tags=document.createElement('input');tags.type='text';tags.className='c04-color-tags';
   tags.maxLength=240;tags.placeholder='タグ（カンマ区切り）';tags.value=(s.tags??[]).join(', ');
   tags.setAttribute('aria-label','保存した色 '+(i+1)+' のタグ');
   tags.onchange=()=>state.setSwatchTags(s.id,tags.value.split(/[,、，]+/));
   cell.append(tags);manager.append(cell);
  }
  if(!list.childElementCount)list.innerHTML='<span class="color-empty">「＋ 色を追加」で現在の色を登録</span>';
  if(!manager.childElementCount)manager.innerHTML='<span class="color-empty">保存した色はありません。</span>';
  history.replaceChildren(...state.history.map((c,i)=>makeChip(c,'最近の色 '+(i+1),()=>state.choose(c))));
  clearHistory.disabled=state.history.length===0;
  if(!history.childElementCount)history.innerHTML='<span class="color-empty">色を選ぶと、ここからすぐ戻せます。</span>';
  selectedChipHex=hex(state.current);
  renderedCollectionsVersion=state.collectionsVersion;
 }
 selector.onchange=()=>state.selectPalette(selector.value);
 id<HTMLInputElement>('c04PaletteFolder').onchange=e=>state.setPaletteFolder((e.target as HTMLInputElement).value);
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
    case 'clear-history':state.clearHistory();notice.textContent='カラー履歴を消去しました。';break;
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
 const unsubscribe=state.subscribe(()=>{
  reflect();
  if(!state.isEditing&&state.collectionsVersion!==renderedCollectionsVersion)renderCollections();
 });
 renderChannels();reflect();renderCollections();
 return {destroy:()=>{unsubscribe();orbit.destroy();harmony.destroy();},showTab:(n:number)=>{selectScreen(n>=2?'palette':'color');if(n===1)selectModel('RGB');}};
}
