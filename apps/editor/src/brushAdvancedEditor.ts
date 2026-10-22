import type {FoundationPreset,Curve} from '@illustro/brush-rt';
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
 {id:'brushScatterRadius',minimum:0,maximum:200,read:p=>p.scatter.radius*100,write:(p,v)=>{p.scatter.radius=v/100;}}
];
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T|null;
const readable=(n:number,decimals=0)=>String(Number(n.toFixed(decimals)));

export function installBrushAdvancedEditor(hooks:Hooks):{sync:(preset:FoundationPreset)=>void}{
 let selectedPoint=1;
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
 el<HTMLSelectElement>('brushTipShape')?.addEventListener('change',e=>apply(p=>{p.tip.shape=(e.target as HTMLSelectElement).value;}));
 el<HTMLSelectElement>('brushTextureKind')?.addEventListener('change',e=>apply(p=>{p.texture.paper.kind=(e.target as HTMLSelectElement).value as 'paper'|'noise'|'hatch';p.texture.paper.resource=null;}));
 el<HTMLSelectElement>('brushStabilizationScope')?.addEventListener('change',e=>apply(p=>{p.stabilization.scope=(e.target as HTMLSelectElement).value as 'brush'|'common';}));
 el<HTMLSelectElement>('brushFadeScope')?.addEventListener('change',e=>apply(p=>{if(p.forceFade)p.forceFade.scope=(e.target as HTMLSelectElement).value as 'brush'|'common';}));
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
  set('brushStabilizationScope',p.stabilization.scope);
  set('brushFadeScope',p.forceFade?.scope??'brush');
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
