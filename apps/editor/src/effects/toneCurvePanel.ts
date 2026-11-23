import {button,labelledField,numberField,selectField} from '../artwork/tools';
import {curveFromLegacy,curveTable,MAX_CURVE_POINTS,type CurvePoint} from './toneCurve';
import type {EffectStep} from './rasterSettings';

export function installToneCurvePanel(host:HTMLElement,step:EffectStep,change:(step:EffectStep)=>void,status:HTMLOutputElement){
  let points=[...(step.curve??curveFromLegacy(step.values)??[{x:0,y:0},{x:255,y:255}])],selected=0;
  let sample:number|null=null,pointer:{id:number;x:number;out:number}|null=null;
  const channel=selectField(host,'成分',[['0','RGB'],['1','赤'],['2','緑'],['3','青']]);
  channel.value=String(step.values[0]);
  const graph=document.createElement('canvas');graph.width=256;graph.height=256;
  graph.style.cssText='width:100%;max-width:300px;aspect-ratio:1;touch-action:none;display:block';
  graph.setAttribute('aria-label','トーンカーブのグラフ。タップで点を追加、点をドラッグして調整。');host.append(graph);
  const point=document.createElement('select');labelledField(host,'編集する点',point);
  const x=numberField(host,'入力',0,0,255),y=numberField(host,'出力',0,0,255);
  function write(){
    change({...step,values:[Number(channel.value),...step.values.slice(1)],curve:[...points]});
  }
  function paint(){
    const ctx=graph.getContext('2d');if(!ctx)return;
    ctx.fillStyle='#303640';ctx.fillRect(0,0,256,256);ctx.strokeStyle='#626e7c';ctx.lineWidth=1;
    ctx.beginPath();for(const p of [64,128,192]){ctx.moveTo(p,0);ctx.lineTo(p,255);ctx.moveTo(0,p);ctx.lineTo(255,p);}ctx.stroke();
    if(sample!==null){ctx.strokeStyle='#ffc65c';ctx.beginPath();ctx.moveTo(sample,0);ctx.lineTo(sample,255);ctx.stroke();}
    ctx.strokeStyle='#d3f3ff';ctx.lineWidth=2;ctx.beginPath();
    points.forEach((p,i)=>i?ctx.lineTo(p.x,255-p.y):ctx.moveTo(p.x,255-p.y));ctx.stroke();
    points.forEach((p,i)=>{ctx.fillStyle=i===selected?'#ffc65c':'#fff';ctx.beginPath();ctx.arc(p.x,255-p.y,5,0,2*Math.PI);ctx.fill();});
  }
  function refresh(){
    point.replaceChildren(...points.map((p,i)=>new Option(p.x+' → '+p.y,String(i))));
    point.value=String(selected);const p=points[selected]!;
    x.min=String(points[selected-1]===undefined?0:points[selected-1]!.x+1);
    x.max=String(points[selected+1]===undefined?255:points[selected+1]!.x-1);
    x.value=String(p.x);y.value=String(p.y);
    x.disabled=remove.disabled=selected===0||selected===points.length-1;
    add.disabled=points.length>=MAX_CURVE_POINTS;paint();
  }
  function update(px:number,py:number){
    points[selected]={x:x.disabled?points[selected]!.x:Math.min(Number(x.max),Math.max(Number(x.min),px)),y:Math.max(0,Math.min(255,py))};
    write();refresh();
  }
  function insert(px:number,py:number){
    if(points.length>=MAX_CURVE_POINTS)return false;
    const i=points.findIndex(p=>p.x>=px);
    if(i<=0||points[i]!.x===px)return false;
    points.splice(i,0,{x:px,y:py});selected=i;write();refresh();return true;
  }
  const add=button('点を追加',()=>{
    let left=points[selected]!,right=points[selected+1]??points[selected]!;
    if(right.x-left.x<2){
      const gap=points.findIndex((p,i)=>i>0&&p.x-points[i-1]!.x>1);
      if(gap<0)return;
      left=points[gap-1]!;right=points[gap]!;
    }
    const px=(left.x+right.x)>>1;insert(px,curveTable(points)[px]!);
  },status);
  const remove=button('点を削除',()=>{
    if(!selected||selected===points.length-1)return;
    points.splice(selected,1);selected--;write();refresh();
  },status);
  const reset=button('対角線に戻す',()=>{points=[{x:0,y:0},{x:255,y:255}];selected=0;write();refresh();},status);
  host.append(add,remove,reset);
  point.onchange=()=>{selected=Number(point.value);refresh();};
  channel.onchange=()=>{write();refresh();};
  x.onchange=y.onchange=()=>{if(x.validity.valid&&y.validity.valid&&x.value&&y.value)update(x.valueAsNumber,y.valueAsNumber);else refresh();};
  function coordinates(event:PointerEvent){
    const rect=graph.getBoundingClientRect();
    return {x:Math.max(0,Math.min(255,Math.round((event.clientX-rect.left)*255/rect.width))),
      y:Math.max(0,Math.min(255,Math.round((rect.bottom-event.clientY)*255/rect.height)))};
  }
  graph.onpointerdown=event=>{
    if(event.button!==0)return;
    const p=coordinates(event),index=points.findIndex(k=>Math.hypot(k.x-p.x,k.y-p.y)<13);
    if(index>=0){selected=index;refresh();}
    else if(!insert(p.x,p.y))return;
    graph.setPointerCapture(event.pointerId);
  };
  graph.onpointermove=event=>{if(graph.hasPointerCapture(event.pointerId)){const p=coordinates(event);update(p.x,p.y);}};
  refresh();
  return {
    inspect(value:Uint8ClampedArray){
      if(!value[3])return;
      const c=Number(channel.value);
      sample=c?value[c-1]!:Math.round(.2126*value[0]!+.7152*value[1]!+.0722*value[2]!);paint();
    },
    drag(event:PointerEvent,deltaY:number|null){
      if(deltaY===null){
        if(sample===null)return;
        const existing=points.findIndex(p=>p.x===sample);
        if(existing>=0){selected=existing;refresh();}
        else if(!insert(sample,curveTable(points)[sample]!))return;
        pointer={id:event.pointerId,x:points[selected]!.x,out:points[selected]!.y};
      }else if(pointer?.id===event.pointerId)update(pointer.x,pointer.out-Math.round(deltaY));
    },
    release(){pointer=null;},
  };
}
