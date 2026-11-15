import type {FoundationPreset} from '@illustro/brush-rt';
import {addCurvePoint,moveCurvePoint,removeCurvePoint} from './brushEditorModel';

type Hooks={
 getPreset:()=>FoundationPreset|null;
 edit:(change:(draft:FoundationPreset)=>void)=>boolean;
 message:(value:string)=>void;
};
type NumberField={id:string;minimum:number;maximum:number;decimals?:number;
 read:(p:FoundationPreset)=>number;write:(p:FoundationPreset,v:number)=>void};
const degrees=180/Math.PI;
const numberFields:NumberField[]=[
 {id:'brushFadeStart',minimum:0,maximum:100,read:p=>(p.forceFade?.start??0)*100,write:(p,v)=>{if(p.forceFade)p.forceFade.start=v/100;}},
 {id:'brushFadeEnd',minimum:0,maximum:100,read:p=>(p.forceFade?.end??0)*100,write:(p,v)=>{if(p.forceFade)p.forceFade.end=v/100;}},
 {id:'brushFadeMin',minimum:0,maximum:100,read:p=>(p.forceFade?.minimum??0)*100,write:(p,v)=>{if(p.forceFade)p.forceFade.minimum=v/100;}},
 {id:'brushHardness',minimum:0,maximum:100,read:p=>p.tip.hardness*100,write:(p,v)=>{p.tip.hardness=v/100;}},
 {id:'brushTipAspect',minimum:1,maximum:100,read:p=>p.tip.aspect*100,write:(p,v)=>{p.tip.aspect=v/100;}},
 {id:'brushTipAngle',minimum:-180,maximum:180,decimals:1,read:p=>p.tip.angle*degrees,write:(p,v)=>{p.tip.angle=v/degrees;}},
 {id:'brushTextureScale',minimum:.1,maximum:64,decimals:2,read:p=>p.texture.paper.scale,write:(p,v)=>{p.texture.paper.scale=v;}},
 {id:'brushTextureRotation',minimum:-180,maximum:180,decimals:1,read:p=>p.texture.paper.rotation*degrees,write:(p,v)=>{p.texture.paper.rotation=v/degrees;}},
 {id:'brushStabilizationFast',minimum:0,maximum:100,read:p=>p.stabilization.fast*100,write:(p,v)=>{p.stabilization.fast=v/100;}},
 {id:'brushWidthChange',minimum:0,maximum:16,decimals:2,read:p=>p.pressure.sizeSlope??0,write:(p,v)=>{p.pressure.sizeSlope=v;}},
 {id:'brushScatterRadius',minimum:0,maximum:200,read:p=>p.scatter.radius*100,write:(p,v)=>{p.scatter.radius=v/100;}}
];
const el=<T extends Element>(id:string)=>document.getElementById(id) as T|null;
const readable=(n:number,decimals=0)=>String(Number(n.toFixed(decimals)));

export function installBrushAdvancedEditor(hooks:Hooks):{sync:(preset:FoundationPreset)=>void}{
 let selectedPoint=1;
 let importSequence=0;
 let dragging:number|null=null;
 const chart=el<SVGSVGElement>('brushCurveChart');
 const pointPicker=el<HTMLSelectElement>('brushCurvePoint');
 const xInput=el<HTMLInputElement>('brushCurveX');
 const yInput=el<HTMLInputElement>('brushCurveY');
 function apply(change:(p:FoundationPreset)=>void){
  if(!hooks.edit(change)){const p=hooks.getPreset();if(p)sync(p);return false;}
  const p=hooks.getPreset();if(p)sync(p);
  return true;
 }
 for(const field of numberFields){
  const range=el<HTMLInputElement>(field.id);
  const numeric=el<HTMLInputElement>(field.id+'Number');
  if(!range||!numeric)continue;
  const update=(input:HTMLInputElement)=>{
   const value=Number(input.value);
   if(!input.value||!Number.isFinite(value)||value<field.minimum||value>field.maximum){
    hooks.message('設定値が範囲外です');
    const p=hooks.getPreset();if(p)sync(p);return;
   }
   apply(p=>field.write(p,value));
  };
  range.addEventListener('input',()=>update(range));
  numeric.addEventListener('change',()=>update(numeric));
 }
 const toggleFields=[
  ['brushTipFollow',(p:FoundationPreset,v:boolean)=>{p.tip.direction=v;}],
  ['brushScatterEnabled',(p:FoundationPreset,v:boolean)=>{p.scatter.enabled=v;}]
 ] as const;
 for(const [id,edit] of toggleFields)el<HTMLInputElement>(id)?.addEventListener('change',e=>apply(p=>edit(p,(e.target as HTMLInputElement).checked)));
 el<HTMLSelectElement>('brushTipShape')?.addEventListener('change',e=>apply(p=>{
  const shape=(e.target as HTMLSelectElement).value;
  if(shape==='mask'){
   if(p.tip.shape!=='mask')throw new Error('先に先端画像を読み込んでください。');
   return;
  }
  p.tip.shape=shape;p.tip.resource=null;delete p.resources['editor-tip-image'];
 }));
 el<HTMLSelectElement>('brushTextureKind')?.addEventListener('change',e=>apply(p=>{
  const kind=(e.target as HTMLSelectElement).value as 'paper'|'noise'|'hatch'|'image';
  if(kind==='image'){
   if(p.texture.paper.kind!=='image')throw new Error('先に紙の質感の画像を読み込んでください。');
   return;
  }
  p.texture.paper.kind=kind;p.texture.paper.resource=null;delete p.resources['editor-paper-image'];
 }));
 el<HTMLSelectElement>('brushTextureSpace')?.addEventListener('change',e=>
  apply(p=>{p.texture.paper.space=(e.target as HTMLSelectElement).value as 'paper'|'tip';}));
 for(const [id,kind] of [['brushTipFile','mask'],['brushTextureFile','texture']] as const){
  el<HTMLInputElement>(id)?.addEventListener('change',async event=>{
   const input=event.target as HTMLInputElement,file=input.files?.[0];input.value='';
   const original=hooks.getPreset();if(!file||!original)return;
   const request=++importSequence;
   try{
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024)
     throw new Error('8 MB以下のPNG・JPEG・WebP画像を選んでください。');
    const bitmap=await createImageBitmap(file);
    let width:number,height:number,alpha:number[];
    try{
     const factor=Math.min(1,64/Math.max(bitmap.width,bitmap.height));
     width=Math.max(1,Math.round(bitmap.width*factor));height=Math.max(1,Math.round(bitmap.height*factor));
     const canvas=new OffscreenCanvas(width,height),ctx=canvas.getContext('2d',{willReadFrequently:true});
     if(!ctx)throw new Error('画像を読み込めませんでした。');
     ctx.drawImage(bitmap,0,0,width,height);
     const pixels=ctx.getImageData(0,0,width,height).data;
     const hasTransparency=pixels.some((value,index)=>index%4===3&&value<255);
     alpha=Array.from({length:width*height},(_,i)=>{
      const index=i*4,opacity=pixels[index+3]!/255;
      if(kind==='mask'&&hasTransparency)return opacity;
      const light=(pixels[index]!*.2126+pixels[index+1]!*.7152+pixels[index+2]!*.0722)/255;
      return (kind==='mask'?1-light:light)*opacity;
     });
     if(!alpha.some(value=>value>0))throw new Error('描画に使える部分がない画像です。');
    }finally{bitmap.close();}
    if(request!==importSequence||hooks.getPreset()?.id!==original.id)return;
    if(apply(p=>{
     const key=kind==='mask'?'editor-tip-image':'editor-paper-image';
     p.resources[key]={kind,width,height,alpha,label:file.name.slice(0,120)};
     if(kind==='mask'){p.tip.shape='mask';p.tip.resource=key;}
     else{p.texture.paper.kind='image';p.texture.paper.resource=key;if(!p.texture.paper.strength)p.texture.paper.strength=.4;}
    }))hooks.message(kind==='mask'?'先端画像を設定しました。':'紙の質感に画像を設定しました。');
   }catch(error){if(request===importSequence)hooks.message(error instanceof Error?error.message:String(error));}
  });
 }
 el<HTMLSelectElement>('brushStabilizationMode')?.addEventListener('change',e=>apply(p=>{p.stabilization.speedMode=(e.target as HTMLSelectElement).value as 'increase'|'reduce';}));
 el<HTMLInputElement>('brushPrediction')?.addEventListener('change',e=>apply(p=>{p.prediction.enabled=(e.target as HTMLInputElement).checked;}));
 function pickPoint(index:number){selectedPoint=index;const p=hooks.getPreset();if(p)sync(p);}
 pointPicker?.addEventListener('change',()=>pickPoint(Number(pointPicker.value)));
 function editPoint(){
  const p=hooks.getPreset();if(!p||!xInput||!yInput)return;
  const index=Math.min(p.pressure.curve.length-1,Math.max(0,selectedPoint));
  const x=Number(xInput.value)/100,y=Number(yInput.value)/100;
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1||y<0||y>1){hooks.message('曲線は0〜100%で指定してください');sync(p);return;}
  apply(draft=>{draft.pressure.curve=moveCurvePoint(draft.pressure.curve,index,x,y);});
 }
 xInput?.addEventListener('change',editPoint);yInput?.addEventListener('change',editPoint);
 el<HTMLButtonElement>('brushCurveAdd')?.addEventListener('click',()=>{
  const p=hooks.getPreset();if(!p)return;
  const curve=p.pressure.curve;
  if(curve.length>=12){hooks.message('制御点は最大12個までです');return;}
  let gap=-1,at=0;
  for(let i=1;i<curve.length;i++){const d=curve[i]![0]-curve[i-1]![0];if(d>gap){gap=d;at=i;}}
  const x=(curve[at-1]![0]+curve[at]![0])/2;
  if(apply(draft=>{draft.pressure.curve=addCurvePoint(draft.pressure.curve,x);})){selectedPoint=at;sync(hooks.getPreset()!);}
 });
 el<HTMLButtonElement>('brushCurveDelete')?.addEventListener('click',()=>{
  const p=hooks.getPreset();if(!p)return;
  if(selectedPoint<=0||selectedPoint>=p.pressure.curve.length-1){hooks.message('始点と終点は削除できません');return;}
  if(apply(draft=>{draft.pressure.curve=removeCurvePoint(draft.pressure.curve,selectedPoint);})){selectedPoint=Math.max(0,selectedPoint-1);sync(hooks.getPreset()!);}
 });
 el<HTMLButtonElement>('brushCurveStraight')?.addEventListener('click',()=>{selectedPoint=1;apply(p=>{p.pressure.curve=[[0,0],[1,1]];});});
 function graphCoord(e:PointerEvent){
  const r=chart!.getBoundingClientRect();
  return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,1-(e.clientY-r.top)/r.height))};
 }
 chart?.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  const p=hooks.getPreset();if(!p)return;
  const coord=graphCoord(event);
  const nearest=p.pressure.curve.map((point,i)=>({i,d:Math.hypot(point[0]-coord.x,point[1]-coord.y)})).sort((a,b)=>a.d-b.d)[0];
  if(nearest&&nearest.d<.12)selectedPoint=nearest.i;
  else if(p.pressure.curve.length<12&&coord.x>.001&&coord.x<.999){
   const at=p.pressure.curve.findIndex(point=>point[0]>coord.x);
   if(apply(draft=>{draft.pressure.curve=addCurvePoint(draft.pressure.curve,coord.x,coord.y);})){selectedPoint=at;}
   else return;
  }else return;
  dragging=event.pointerId;
  chart.setPointerCapture(event.pointerId);
  sync(hooks.getPreset()!);
  event.preventDefault();
 });
 chart?.addEventListener('pointermove',event=>{
  if(dragging!==event.pointerId)return;
  const p=hooks.getPreset();if(!p)return;
  const coord=graphCoord(event);
  const min=selectedPoint>0?p.pressure.curve[selectedPoint-1]![0]+.0002:0;
  const max=selectedPoint<p.pressure.curve.length-1?p.pressure.curve[selectedPoint+1]![0]-.0002:1;
  apply(draft=>{draft.pressure.curve=moveCurvePoint(draft.pressure.curve,selectedPoint,Math.max(min,Math.min(max,coord.x)),coord.y);});
 });
 for(const type of ['pointerup','pointercancel'])chart?.addEventListener(type,event=>{
  if(dragging===(event as PointerEvent).pointerId)dragging=null;
 });
 function sync(p:FoundationPreset){
  for(const field of numberFields){
   const value=readable(field.read(p),field.decimals??0);
   const range=el<HTMLInputElement>(field.id),numeric=el<HTMLInputElement>(field.id+'Number');
   if(range)range.value=value;
   if(numeric&&document.activeElement!==numeric)numeric.value=value;
  }
  const set=(id:string,value:string)=>{const node=el<HTMLInputElement|HTMLSelectElement>(id);if(node)node.value=value;};
  set('brushTipShape',p.tip.shape);
  set('brushTextureKind',p.texture.paper.kind);
  set('brushTextureSpace',p.texture.paper.space);
  const tipFile=el<HTMLInputElement>('brushTipFile');if(tipFile)tipFile.disabled=p.renderer==='sweep';
  set('brushStabilizationMode',p.stabilization.speedMode);
  const prediction=el<HTMLInputElement>('brushPrediction');if(prediction)prediction.checked=p.prediction.enabled;
  const follow=el<HTMLInputElement>('brushTipFollow');if(follow)follow.checked=p.tip.direction;
  const scatter=el<HTMLInputElement>('brushScatterEnabled');if(scatter)scatter.checked=p.scatter.enabled;
  const radius=el<HTMLInputElement>('brushScatterRadius');if(radius)radius.disabled=!p.scatter.enabled;
  const tip=el<HTMLSelectElement>('brushTipShape');
  if(tip){tip.disabled=p.renderer==='sweep';tip.title=tip.disabled?'このブラシは専用の線の品質を保つため、先端を変更できません':'';}
  const curve=p.pressure.curve;
  selectedPoint=Math.max(0,Math.min(curve.length-1,selectedPoint));
  if(pointPicker){
   pointPicker.replaceChildren(...curve.map((_,i)=>new Option(i===0?'始点':i===curve.length-1?'終点':'制御点 '+i,String(i))));
   pointPicker.value=String(selectedPoint);
  }
  if(xInput){xInput.value=readable(curve[selectedPoint]![0]*100,2);xInput.disabled=selectedPoint===0||selectedPoint===curve.length-1;}
  if(yInput)yInput.value=readable(curve[selectedPoint]![1]*100,2);
  const del=el<HTMLButtonElement>('brushCurveDelete');if(del)del.disabled=selectedPoint===0||selectedPoint===curve.length-1;
  const add=el<HTMLButtonElement>('brushCurveAdd');if(add)add.disabled=curve.length>=12;
  if(chart){
   const ns='http://www.w3.org/2000/svg';
   chart.replaceChildren();
   const grid=document.createElementNS(ns,'path');grid.setAttribute('d','M 0 60 H 120 M 60 0 V 120');
   grid.setAttribute('class','brush-curve-grid');chart.append(grid);
   const line=document.createElementNS(ns,'polyline');
   line.setAttribute('points',curve.map(point=>(point[0]*120)+','+((1-point[1])*120)).join(' '));
   line.setAttribute('class','brush-curve-line');chart.append(line);
   for(let i=0;i<curve.length;i++){
    const circle=document.createElementNS(ns,'circle');
    circle.setAttribute('cx',String(curve[i]![0]*120));circle.setAttribute('cy',String((1-curve[i]![1])*120));
    circle.setAttribute('r',String(i===selectedPoint?5:3.5));
    circle.setAttribute('class',i===selectedPoint?'brush-curve-point selected':'brush-curve-point');chart.append(circle);
   }
   chart.setAttribute('aria-label','筆圧曲線。制御点 '+(selectedPoint+1)+' / '+curve.length);
  }
 }
 return {sync};
}
