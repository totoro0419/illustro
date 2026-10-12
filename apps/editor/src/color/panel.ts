import {ForegroundColor,exportPalette,clamp,hex,fromHex,hslToRgb,hsvToRgb,rgb,rgbToHsl,rgbToHsv,type RGB} from './model';

const id=<T extends HTMLElement>(name:string)=>document.getElementById(name) as T;
const button=(label:string,action:string)=>'<button type="button" data-color-action="'+action+'">'+label+'</button>';
export function colorMarkup():string {
 return '<div class="color-workbench">'+
 '<div class="color-current"><button id="colorCurrent" class="color-chip" aria-label="今の色" type="button"></button><div class="color-describe"><strong>今の色</strong><output id="colorCode">#1F2633</output></div><button id="colorPrevious" class="color-chip color-previous" aria-label="前の色に戻す" type="button"></button><span class="color-previous-label">前の色</span></div>'+
 '<div class="color-tabs" role="tablist" aria-label="色の設定">'+['選ぶ','数値','パレット','履歴'].map((name,i)=>'<button role="tab" class="color-tab" type="button" id="colorTab'+i+'" aria-controls="colorPanel'+i+'" aria-selected="'+(i===0)+'" tabindex="'+(i===0?0:-1)+'">'+name+'</button>').join('')+'</div>'+
 '<section id="colorPanel0" class="color-tabpanel" role="tabpanel" aria-labelledby="colorTab0">'+
 '<div class="color-picker" id="colorPicker"><div id="colorRing" class="color-ring" aria-hidden="true"><i id="colorHueMarker" class="color-ring-marker"></i></div>'+
 '<div id="colorPlane" class="color-plane" aria-hidden="true"><div class="color-plane-white"></div><div class="color-plane-black"></div><i id="colorSvMarker" class="color-sv-marker"></i></div></div>'+
 '<p class="color-help">外側の輪で色味、内側で鮮やかさと明るさを選びます。細かい調整は「数値」から行えます。</p>'+
 '<label class="color-hex-label" for="colorHex">色の番号（HEX）<input id="colorHex" maxlength="7" spellcheck="false" inputmode="text" autocomplete="off" value="#1F2633"></label><small id="colorHexError" class="color-error" role="status"></small>'+
 '<label class="color-sample-source">スポイトで拾う場所<select id="colorSampleSource"><option value="composite">見えている絵全体</option><option value="layer">今のレイヤーだけ</option></select></label><div class="color-quick-actions">'+button('スポイトを使う','eyedropper')+button('今の色を保存','add-current')+'</div></section>'+
 '<section id="colorPanel1" class="color-tabpanel" role="tabpanel" aria-labelledby="colorTab1" hidden>'+
 '<div role="radiogroup" class="color-models" aria-label="色の表し方">'+['HSV','HSL','RGB'].map((m,i)=>'<label><input type="radio" name="colorModel" value="'+m+'" '+(i===0?'checked':'')+'><span>'+m+'</span></label>').join('')+'</div>'+
 '<div id="colorValueChannels" class="color-value-channels"></div><p class="color-help">スライダーでも数字でも調整できます。確定はEnter、取り消しはEscです。</p></section>'+
 '<section id="colorPanel2" class="color-tabpanel" role="tabpanel" aria-labelledby="colorTab2" hidden>'+
 '<label for="colorPaletteSelect">使うパレット<select id="colorPaletteSelect"></select></label>'+
 '<div class="color-palette-actions">'+button('新しく作る','new-palette')+button('名前を変える','rename-palette')+'</div>'+
 '<div class="color-palette-actions">'+button('現在の色を追加','add-current')+button('書き出す','export-palette')+button('読み込む','import-palette')+'</div>'+
 '<input type="file" id="colorPaletteFile" accept=".json,application/json" hidden><div id="colorPaletteList" class="color-swatch-grid" role="group" aria-label="パレットの色"></div>'+
 '<p class="color-help">各色の「前」「後」で並べ替えできます。ファイルはIllustroのパレット形式（JSON）です。</p><small id="colorPaletteError" class="color-error" role="status"></small></section>'+
 '<section id="colorPanel3" class="color-tabpanel" role="tabpanel" aria-labelledby="colorTab3" hidden>'+
 '<div class="color-history-heading"><span>最近使った色（最大24色）</span>'+button('消去','clear-history')+'</div>'+
 '<div id="colorHistoryList" class="color-swatch-grid" role="group" aria-label="最近使った色"></div>'+
 '<p class="color-help">操作を確定した色だけ記録します。絵の「元に戻す」とは別です。</p></section>'+
 '</div>';
}

export function installColorPanel(state:ForegroundColor,options:{onPickTool:()=>void,onBrushColor:()=>void}){
 let active=0,model='HSV' as 'HSV'|'HSL'|'RGB',hueMemory=rgbToHsv(state.current).h;
 const tabs=Array.from({length:4},(_,i)=>id<HTMLButtonElement>('colorTab'+i));
 const selectTab=(n:number,focus=false)=>{active=(n+4)%4;tabs.forEach((t,i)=>{t.setAttribute('aria-selected',String(i===active));t.tabIndex=i===active?0:-1;id<HTMLElement>('colorPanel'+i).hidden=i!==active;});if(focus)tabs[active]!.focus();if(active===1)renderChannels();};
 tabs.forEach((tab,n)=>{tab.onclick=()=>selectTab(n);tab.onkeydown=e=>{const step=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:e.key==='Home'?-99:e.key==='End'?99:0;if(!step)return;e.preventDefault();selectTab(step===-99?0:step===99?3:n+step,true);};});
 const current=id<HTMLElement>('colorCurrent'),previous=id<HTMLButtonElement>('colorPrevious'),code=id<HTMLOutputElement>('colorCode'),ring=id<HTMLElement>('colorRing'),plane=id<HTMLElement>('colorPlane'),hexField=id<HTMLInputElement>('colorHex');
 let channelEditing=false;
 function reflect(){const c=state.current,hsv=rgbToHsv(c);if(hsv.s>1e-7&&hsv.v>1e-7)hueMemory=hsv.h;
  current.style.backgroundColor=hex(c);code.textContent=hex(c);previous.style.backgroundColor=hex(state.previous);
  id<HTMLElement>('colorBoxSummary').textContent=hex(c);
  ring.style.setProperty('--hue',String(hueMemory));plane.style.setProperty('--pure',hex(hsvToRgb(hueMemory,1,1)));
  const angle=hueMemory*Math.PI/180,rad=81;const hue=id<HTMLElement>('colorHueMarker');hue.style.left='calc(50% + '+Math.round(Math.cos(angle)*rad)+'px)';hue.style.top='calc(50% + '+Math.round(Math.sin(angle)*rad)+'px)';
  const marker=id<HTMLElement>('colorSvMarker');marker.style.left=(hsv.s*100)+'%';marker.style.top=((1-hsv.v)*100)+'%';
  if(document.activeElement!==hexField)hexField.value=hex(c);
  if(!channelEditing&&active===1)updateChannels();
  options.onBrushColor();
 }
 current.onclick=()=>selectTab(0,true);previous.onclick=()=>state.choose(state.previous);
 let editingHex=false;
 const commitHex=()=>{if(!editingHex)return;const parsed=fromHex(hexField.value);if(!parsed){id('colorHexError').textContent='#の後に6桁の英数字（0〜9、A〜F）を入力してください。';if(document.activeElement!==hexField){editingHex=false;state.cancel();}return;}editingHex=false;id('colorHexError').textContent='';state.commit(parsed);};
 hexField.addEventListener('focus',()=>{editingHex=true;state.begin();});
 hexField.addEventListener('input',()=>{const c=fromHex(hexField.value);if(c){id('colorHexError').textContent='';state.preview(c);}});
 hexField.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();editingHex=false;state.cancel();hexField.value=hex(state.current);id('colorHexError').textContent='';hexField.blur();}else if(e.key==='Enter'){e.preventDefault();commitHex();hexField.blur();}});
 hexField.addEventListener('blur',commitHex);
 // The ring and square are pointer-only surfaces with complete exact numeric alternatives.
 let pointer:number|null=null,part:'ring'|'plane'|null=null;
 const picker=id<HTMLElement>('colorPicker');
 function movePicker(e:PointerEvent){
  if(pointer!==e.pointerId||!part)return;
  if(part==='ring'){
   const r=ring.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;
   const h=(Math.atan2(y,x)*180/Math.PI+360)%360,sv=rgbToHsv(state.current);
   hueMemory=h;state.preview(hsvToRgb(h,sv.s,sv.v));
  }else{
   const r=plane.getBoundingClientRect(),sv=rgbToHsv(state.current);
   state.preview(hsvToRgb(hueMemory,clamp((e.clientX-r.left)/r.width),1-clamp((e.clientY-r.top)/r.height)));
  }
 }
 picker.addEventListener('pointerdown',e=>{
  if(pointer!==null)return;const target=e.target as HTMLElement;
  part=target.closest('#colorPlane')?'plane':target.closest('#colorRing')?'ring':null;
  if(!part)return;pointer=e.pointerId;state.begin();picker.setPointerCapture(e.pointerId);movePicker(e);e.preventDefault();
 });
 picker.addEventListener('pointermove',movePicker);
 picker.addEventListener('pointerup',e=>{if(e.pointerId!==pointer)return;movePicker(e);pointer=null;part=null;state.commit();});
 picker.addEventListener('pointercancel',e=>{if(e.pointerId!==pointer)return;pointer=null;part=null;state.cancel();});
 picker.addEventListener('lostpointercapture',e=>{if(e.pointerId!==pointer)return;pointer=null;part=null;state.cancel();});
 const models=document.querySelectorAll<HTMLInputElement>('input[name="colorModel"]');
 models.forEach(el=>el.onchange=()=>{if(el.checked){model=el.value as typeof model;renderChannels();}});
 const channels=id<HTMLElement>('colorValueChannels');
 const channelDef=()=>model==='RGB'?[['R','赤',255],['G','緑',255],['B','青',255]] as const:model==='HSL'?[['H','色相',360],['S','鮮やかさ',100],['L','明るさ',100]] as const:[['H','色相',360],['S','鮮やかさ',100],['V','明るさ',100]] as const;
 const values=()=>{const c=state.current,hsv=rgbToHsv(c),hsl=rgbToHsl(c);return model==='RGB'?[c.r*255,c.g*255,c.b*255]:model==='HSL'?[hsl.h,hsl.s*100,hsl.l*100]:[hsv.h,hsv.s*100,hsv.v*100];};
 function commitValue(index:number,value:number){if(!Number.isFinite(value))return false;const defs=channelDef();if(value<0||value>defs[index]![2])return false;
  const v=values();v[index]=value;if(model!=='RGB'&&index===0)hueMemory=value;state.preview(model==='RGB'?rgb(v[0]!/255,v[1]!/255,v[2]!/255):model==='HSL'?hslToRgb(v[0]!,v[1]!/100,v[2]!/100):hsvToRgb(v[0]!,v[1]!/100,v[2]!/100));return true;
 }
 function renderChannels(){
  channels.replaceChildren();channelDef().forEach(([ch,label,max],i)=>{
   const row=document.createElement('div');row.className='color-value-row';
   row.innerHTML='<label for="colorSlider'+i+'">'+label+'</label><input type="range" id="colorSlider'+i+'" min="0" max="'+max+'" step="0.1" aria-label="'+label+'のスライダー"><input type="number" id="colorNumber'+i+'" min="0" max="'+max+'" step="0.1" aria-label="'+label+'の数値"><span class="color-unit">'+(model==='RGB'?'':i===0?'°':'%')+'</span>';
   channels.append(row);
   const slider=id<HTMLInputElement>('colorSlider'+i),number=id<HTMLInputElement>('colorNumber'+i);
   slider.onpointerdown=()=>state.begin();
   slider.oninput=()=>{state.begin();commitValue(i,Number(slider.value));};
   slider.onchange=()=>state.commit();
   slider.onpointercancel=()=>state.cancel();
   number.onfocus=()=>{channelEditing=true;state.begin();};
   number.oninput=()=>{if(number.value!==''&&number.validity.valid)commitValue(i,Number(number.value));};
   const finish=()=>{if(!channelEditing)return;const n=Number(number.value);
    if(number.value===''||!Number.isFinite(n)||!number.validity.valid||!commitValue(i,n)){number.setCustomValidity('0〜'+max+'の数字を入力してください。');number.reportValidity();if(document.activeElement!==number){channelEditing=false;state.cancel();}return;}
    number.setCustomValidity('');channelEditing=false;state.commit();};
   number.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();channelEditing=false;number.setCustomValidity('');state.cancel();updateChannels();number.blur();}else if(e.key==='Enter'){e.preventDefault();finish();if(!channelEditing)number.blur();}};
   number.onblur=finish;
  });updateChannels();
 }
 function updateChannels(){const v=values();v.forEach((n,i)=>{const s=document.getElementById('colorSlider'+i) as HTMLInputElement|null,f=document.getElementById('colorNumber'+i) as HTMLInputElement|null;if(s)s.value=String(n);if(f&&document.activeElement!==f)f.value=String(Math.round(n*10)/10);});}
 const list=id<HTMLElement>('colorPaletteList'),history=id<HTMLElement>('colorHistoryList'),selector=id<HTMLSelectElement>('colorPaletteSelect');
 function makeChip(color:RGB,label:string,onSelect:()=>void):HTMLButtonElement{
  const b=document.createElement('button');b.type='button';b.className='color-swatch';b.style.backgroundColor=hex(color);b.title=label+' '+hex(color);b.setAttribute('aria-label',label+' '+hex(color));b.setAttribute('aria-pressed',String(hex(color)===hex(state.current)));b.onclick=onSelect;return b;
 }
 function renderCollections(){
  selector.replaceChildren(...state.palettes.map(p=>{const op=new Option(p.name,p.id);op.selected=p.id===state.paletteId;return op;}));
  list.replaceChildren();
  for(const [i,s] of state.palette.swatches.entries()){
   const cell=document.createElement('div');cell.className='color-swatch-cell';cell.append(makeChip(s.color,'保存した色 '+(i+1),()=>state.choose(s.color)));
   for(const [mark,move] of [['◀',-1],['▶',1],['×',0]] as const){const b=document.createElement('button');b.className='color-swatch-move';b.type='button';b.textContent=mark;b.setAttribute('aria-label',move===0?'色を削除':move<0?'前へ移動':'後へ移動');b.disabled=move!==0&&(i+move<0||i+move>=state.palette.swatches.length);b.onclick=()=>move===0?state.removeSwatch(s.id):state.moveSwatch(s.id,move);cell.append(b);}list.append(cell);
  }
  if(!list.childElementCount)list.textContent='色がありません。「現在の色を追加」で登録できます。';
  history.replaceChildren(...state.history.map((c,i)=>makeChip(c,'最近の色 '+(i+1),()=>state.choose(c))));
  if(!history.childElementCount)history.textContent='まだ色の履歴はありません。';
 }
 selector.onchange=()=>state.selectPalette(selector.value);
 const error=id<HTMLElement>('colorPaletteError');
 const actions=document.querySelectorAll<HTMLButtonElement>('[data-color-action]');
 actions.forEach(b=>b.onclick=async()=>{
  const name=b.dataset.colorAction;error.textContent='';
  try{
   switch(name){
    case 'eyedropper':options.onPickTool();break;
    case 'add-current':state.addSwatch();break;
    case 'clear-history':state.clearHistory();break;
    case 'new-palette':{const n=prompt('新しいパレットの名前','新しいパレット');if(n!==null)state.createPalette(n);break;}
    case 'rename-palette':{const n=prompt('パレットの新しい名前',state.palette.name);if(n!==null)state.renamePalette(n);break;}
    case 'export-palette':{const payload=new Blob([exportPalette(state.palette)],{type:'application/json'});const url=URL.createObjectURL(payload),a=document.createElement('a');a.href=url;a.download='illustro-palette.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);break;}
    case 'import-palette':id<HTMLInputElement>('colorPaletteFile').click();break;
   }
  }catch(e){error.textContent=e instanceof Error?e.message:String(e);}
 });
  id<HTMLInputElement>('colorPaletteFile').onchange=async e=>{
  const field=e.target as HTMLInputElement,file=field.files?.[0];field.value='';if(!file)return;
  if(file.size>262144){error.textContent='ファイルが大きすぎます（256KBまで）。';return;}
  try{state.importPalette(await file.text());selectTab(2);}catch(ex){error.textContent=ex instanceof Error?ex.message:String(ex);}
 };
 const unsubscribe=state.subscribe(()=>{reflect();if(!state.isEditing)renderCollections();});
 reflect();renderCollections();
 return {destroy:unsubscribe,showTab:selectTab};
}
