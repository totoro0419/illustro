/** COL-005 C04: non-destructive color-harmony and luminance comparison. */
import {type RGB,type ForegroundColor,rgbToHsv,hsvToRgb,hex} from './model';

export type HarmonyMode='complement'|'analogous'|'triad'|'split';
type VisionMode='none'|'protan'|'deutan'|'tritan';
// Machado, Oliveira & Fernandes (2009), full-severity matrices for linear RGB.
// These are approximation modes for visual comparison, not a medical diagnosis.
const VISION_MATRICES:Readonly<Record<Exclude<VisionMode,'none'>,readonly number[]>>={
  protan:[.152286,1.052583,-.204868,.114503,.786281,.099216,-.003882,-.048116,1.051998],
  deutan:[.367322,.860646,-.227968,.280085,.672501,.047413,-.011820,.042940,.968881],
  tritan:[1.255528,-.076749,-.178779,-.078411,.930809,.147602,.004733,.691367,.303900],
};
function installVisionSvg(){
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('width','0');svg.setAttribute('height','0');
  svg.setAttribute('aria-hidden','true');
  svg.style.cssText='position:absolute;width:0;height:0;pointer-events:none;overflow:hidden';
  const defs=document.createElementNS(ns,'defs');
  for(const [key,coefficients] of Object.entries(VISION_MATRICES)){
    const filter=document.createElementNS(ns,'filter');
    filter.setAttribute('id','c04-vision-'+key);
    filter.setAttribute('color-interpolation-filters','linearRGB');
    const matrix=document.createElementNS(ns,'feColorMatrix');
    matrix.setAttribute('type','matrix');
    matrix.setAttribute('values',[
      ...coefficients.slice(0,3),0,0,
      ...coefficients.slice(3,6),0,0,
      ...coefficients.slice(6,9),0,0,
      0,0,0,1,0
    ].join(' '));
    filter.append(matrix);defs.append(filter);
  }
  svg.append(defs);document.body.append(svg);
  return svg;
}
export function relativeLuminance(color:RGB){
  const linear=(channel:number)=>channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4;
  return .2126*linear(color.r)+.7152*linear(color.g)+.0722*linear(color.b);
}
export function luminanceContrast(a:RGB,b:RGB){
  const [hi,lo]=[relativeLuminance(a),relativeLuminance(b)].sort((x,y)=>y-x);
  return (hi!+.05)/(lo!+.05);
}
export function harmonyColors(color:RGB,mode:HarmonyMode):readonly RGB[]{
  const hsv=rgbToHsv(color);
  const offsets:Readonly<Record<HarmonyMode,readonly number[]>>={
    complement:[180],analogous:[-30,30],triad:[120,240],split:[150,210],
  };
  return offsets[mode].map(offset=>hsvToRgb(hsv.h+offset,hsv.s,hsv.v));
}

export function installHarmonyTools(state:ForegroundColor){
  const target=document.getElementById('colorEyedropperOptions');
  const screen=document.getElementById('colorScreen');
  if(!screen)return {destroy:()=>{}};
  const wrapper=document.createElement('details');wrapper.className='c04-color-harmony';
  const heading=document.createElement('summary');heading.textContent='配色・明るさの比較';
  const contents=document.createElement('section');
  const mode=document.createElement('select');mode.setAttribute('aria-label','配色候補の種類');
  for(const [key,name] of [['analogous','近い色'],['complement','反対の色'],['triad','3色の組合せ'],['split','反対色の両隣']] as const)
    mode.add(new Option(name,key));
  const choices=document.createElement('div');choices.className='c04-harmony-options';
  const contrast=document.createElement('output');contrast.setAttribute('role','status');
  const visionFilter=installVisionSvg();
  const vision=document.createElement('select');vision.setAttribute('aria-label','色覚の見え方を比べる');
  for(const [value,label] of [
    ['none','通常の表示'],['protan','赤の違いを感じにくい見え方（参考）'],
    ['deutan','緑の違いを感じにくい見え方（参考）'],
    ['tritan','青の違いを感じにくい見え方（参考）']
  ] as const)vision.add(new Option(label,value));
  const visionCaption=document.createElement('label');
  visionCaption.textContent='色覚の見え方を比較';visionCaption.append(vision);
  const gray=document.createElement('input');gray.type='checkbox';
  const grayLabel=document.createElement('label');grayLabel.append(gray,document.createTextNode(' 作品を白黒表示で確認する（元の色は変更しません）'));
  const notice=document.createElement('p');notice.textContent='候補の色を押すと現在の描画色だけ変更します。作品の画素や履歴は変更されません。';
  const limitation=document.createElement('small');
  limitation.textContent='色覚の違いを研究モデルで近似した表示です。実際の一人ひとりの見え方を完全に示すものではありません。';
  contents.append(mode,choices,contrast,grayLabel,visionCaption,limitation,notice);
  wrapper.append(heading,contents);
  if(target)target.before(wrapper);else screen.append(wrapper);
  const displayGray=()=>{
    document.body.classList.toggle('c04-gray-proof',gray.checked);
    grayLabel.title=gray.checked?'表示だけが白黒になっています。元の色は保持しています。':'白黒確認はオフです。';
  };
  gray.onchange=()=>{
    if(gray.checked)vision.value='none';
    document.body.dataset.c04Vision=vision.value;
    displayGray();
  };
  vision.onchange=()=>{
    if(vision.value!=='none')gray.checked=false;
    document.body.dataset.c04Vision=vision.value;
    displayGray();
  };
  const render=()=>{
    if(!wrapper.open)return;
    const original=state.current,values=harmonyColors(original,mode.value as HarmonyMode);
    choices.replaceChildren();
    const currentLum=relativeLuminance(original);
    for(let i=0;i<values.length;i++){
      const color=values[i]!,button=document.createElement('button');
      button.type='button';button.className='c04-harmony-swatch';
      const chip=document.createElement('i');chip.style.background=hex(color);
      const title=document.createElement('span');title.textContent=hex(color);
      const delta=(Math.abs(relativeLuminance(color)-currentLum)*100).toFixed(1);
      const subtitle=document.createElement('small');subtitle.textContent='明るさの差 '+delta+'%';
      button.setAttribute('aria-label','候補 '+(i+1)+' '+hex(color)+' を現在の色にする');
      button.append(chip,title,subtitle);button.onclick=()=>state.choose(color);
      choices.append(button);
    }
    const white:RGB={r:1,g:1,b:1},black:RGB={r:0,g:0,b:0};
    contrast.textContent='白との明暗比 '+luminanceContrast(original,white).toFixed(2)+
      ' : 1 / 黒との明暗比 '+luminanceContrast(original,black).toFixed(2)+' : 1';
  };
  wrapper.addEventListener('toggle',render);mode.onchange=render;
  const unsubscribe=state.subscribe(render);
  const cleanup=()=>{
    unsubscribe();document.body.classList.remove('c04-gray-proof');document.body.dataset.c04Vision='none';visionFilter.remove();
  };
  // Page transitions may keep the color picker mounted. Only the checkbox may
  // enter grayscale mode; never change the document color space or export bytes.
  return {destroy:cleanup};
}
