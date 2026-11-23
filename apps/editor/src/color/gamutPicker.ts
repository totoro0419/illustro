import {hex,type ForegroundColor} from './model';
import {inGamutMask,oklchToSrgb,toOklch,type GamutMask,type Oklch} from './oklch';
import {labelledField,numberField,button} from '../artwork/tools';

const storedKey=(id:string)=>'illustro.color.gamut-mask.v1.'+id;
const defaults:GamutMask={enabled:false,hue:0,spread:360,minLight:0,maxLight:1,maxChroma:.4};
function readMask(id:string):GamutMask{
  try{
    const value=JSON.parse(localStorage.getItem(storedKey(id))??'null');
    if(value&&typeof value.enabled==='boolean'&&value.hue>=0&&value.hue<=360&&value.spread>=0&&value.spread<=360&&
      value.minLight>=0&&value.maxLight<=1&&value.minLight<=value.maxLight&&value.maxChroma>=0&&value.maxChroma<=.4)return value;
  }catch{}
  return defaults;
}
export function installGamutPicker(host:HTMLElement,state:ForegroundColor){
  const details=document.createElement('details');details.className='c06-clipboard-panel';
  const summary=document.createElement('summary');summary.textContent='明るさと色域（OKLCH）';
  const controls=document.createElement('div');controls.className='c06-clipboard-grid';
  const light=numberField(controls,'見た目の明るさ L（%）',50,0,100,.0001);
  const chroma=numberField(controls,'色の鮮やかさ C',.1,0,.4,.000001);
  const hue=numberField(controls,'色相 H（°）',0,0,360,.0001);
  const canvas=document.createElement('canvas');canvas.width=180;canvas.height=80;
  canvas.style.cssText='width:100%;max-width:360px;height:auto';
  canvas.setAttribute('aria-label','横が色相、縦が明るさ。選べない部分は灰色。数値入力でも選べます。');
  const maskGroup=document.createElement('details'),maskTitle=document.createElement('summary');
  maskTitle.textContent='使う色の範囲を絞る';
  const maskInputs=document.createElement('div');maskInputs.className='c06-clipboard-grid';
  const enabled=document.createElement('input');enabled.type='checkbox';
  labelledField(maskInputs,'このパレットの色域マスクを有効にする',enabled);
  const centre=numberField(maskInputs,'許可する色相の中心（°）',0,0,360);
  const spread=numberField(maskInputs,'許可する色相の幅（°）',360,0,360);
  const minLight=numberField(maskInputs,'最小の明るさ（%）',0,0,100);
  const maxLight=numberField(maskInputs,'最大の明るさ（%）',100,0,100);
  const maxChroma=numberField(maskInputs,'最大の鮮やかさ',.4,0,.4,.001);
  const status=document.createElement('output');status.setAttribute('role','status');
  const maskStatus=document.createElement('output');maskStatus.setAttribute('role','status');
  const actions=document.createElement('div');actions.className='box-actions';
  const swatch=document.createElement('span');
  swatch.style.cssText='display:inline-block;width:2em;height:1em;border:1px solid currentColor';
  swatch.setAttribute('aria-hidden','true');
  let mask=defaults,activeId='',previewFrame=0;
  function readColor(){
    if([light,chroma,hue].some(field=>!field.validity.valid||!field.value))return null;
    return {lightness:light.valueAsNumber/100,chroma:chroma.valueAsNumber,hue:hue.valueAsNumber};
  }
  function showColor(value:Oklch){
    light.value=(value.lightness*100).toFixed(4);
    chroma.value=value.chroma.toFixed(6);hue.value=value.hue.toFixed(4);refresh();
  }
  function loadPalette(){
    activeId=state.paletteId;mask=readMask(activeId);
    enabled.checked=mask.enabled;centre.value=String(mask.hue);spread.value=String(mask.spread);
    minLight.value=String(mask.minLight*100);maxLight.value=String(mask.maxLight*100);maxChroma.value=String(mask.maxChroma);
    maskStatus.textContent=state.availablePalettes.find(p=>p.id===activeId)?.name??'';
  }
  function refresh(){
    const candidate=readColor(),display=candidate?oklchToSrgb(candidate):null;
    const allowed=display&&candidate&&inGamutMask(candidate,mask);
    accept.disabled=!allowed;
    swatch.style.backgroundColor=display?hex(display):'transparent';
    status.textContent=!candidate?'数値を範囲内で入力してください。':!display?'この色は作品のsRGB色域外です。':
      !allowed?'この色はパレットで絞った範囲の外です。':hex(display);
    if(previewFrame)return;
    previewFrame=requestAnimationFrame(()=>{
      previewFrame=0;
      if(!details.open)return;
      const context=canvas.getContext('2d');if(!context)return;
      const {width,height}=canvas,image=context.createImageData(width,height),c=readColor()?.chroma??0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const candidate={lightness:1-y/(height-1),chroma:c,hue:x/width*360};
        const color=inGamutMask(candidate,mask)?oklchToSrgb(candidate):null;
        const i=(y*width+x)*4,gray=(x+y)%7<3?180:205;
        image.data[i]=color?color.r*255:gray;image.data[i+1]=color?color.g*255:gray;
        image.data[i+2]=color?color.b*255:gray;image.data[i+3]=255;
      }
      context.putImageData(image,0,0);
      const current=readColor();
      if(current){
        context.strokeStyle='#fff';context.lineWidth=3;
        context.beginPath();context.arc(current.hue/360*(width-1),(1-current.lightness)*(height-1),4,0,2*Math.PI);context.stroke();
        context.strokeStyle='#252525';context.lineWidth=1;context.stroke();
      }
    });
  }
  const accept=button('描画色に使う',()=>{
    const candidate=readColor(),color=candidate?oklchToSrgb(candidate):null;
    if(candidate&&color&&inGamutMask(candidate,mask))state.choose(color);
  },status);
  const reload=button('現在の色に戻す',()=>showColor(toOklch(state.current)),status);
  const saveMask=button('色域マスクを保存',()=>{
    const inputs=[centre,spread,minLight,maxLight,maxChroma];
    if(inputs.some(input=>!input.validity.valid||!input.value)||minLight.valueAsNumber>maxLight.valueAsNumber)
      throw Error('色域マスクの範囲を確認してください。');
    const next={enabled:enabled.checked,hue:centre.valueAsNumber,spread:spread.valueAsNumber,
      minLight:minLight.valueAsNumber/100,maxLight:maxLight.valueAsNumber/100,maxChroma:maxChroma.valueAsNumber};
    try{localStorage.setItem(storedKey(activeId),JSON.stringify(next));}
    catch{throw Error('色域マスクを端末に保存できませんでした。');}
    mask=next;maskStatus.textContent='このパレットに保存しました。';refresh();
  },maskStatus);
  for(const input of [light,chroma,hue])input.oninput=refresh;
  canvas.onclick=event=>{
    const rect=canvas.getBoundingClientRect(),x=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
    const y=Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));
    showColor({lightness:1-y,hue:x*360,chroma:chroma.valueAsNumber||0});
  };
  const unbind=state.subscribe(()=>{
    if(activeId!==state.paletteId){loadPalette();if(details.open)refresh();}
  });
  details.ontoggle=()=>{if(details.open){loadPalette();showColor(toOklch(state.current));}};
  actions.append(accept,reload,swatch);
  maskGroup.append(maskTitle,maskInputs,saveMask,maskStatus);
  details.append(summary,controls,canvas,actions,status,maskGroup);
  host.append(details);
  return unbind;
}
