import type {StrokeRecord} from '@illustro/brush-rt';

export type StrokeComparison=(record:StrokeRecord,fromZoom:number,toZoom:number)=>void;

export function installStrokeComparison(host:HTMLElement,setListener:(listener:StrokeComparison|null)=>void){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const legend=document.createElement('summary');legend.textContent='入力と筆跡の軌跡を比較';
  const instructions=document.createElement('p');
  instructions.textContent='開いたままキャンバスに描くと、入力した位置と補正後の筆跡を同じ位置関係で比べられます。青が実際に届いた点、橙が描画に使った点です。';
  const canvas=document.createElement('canvas');
  canvas.width=400;canvas.height=206;canvas.style.cssText='display:block;max-width:100%;height:auto';
  canvas.setAttribute('aria-label','入力と補正後の筆跡を重ねた比較図');
  const status=document.createElement('output');status.setAttribute('role','status');
  const trace:StrokeComparison=(record,fromZoom,toZoom)=>{
    const context=canvas.getContext('2d');
    if(!context||!record.raw.length)return;
    const sampled=<T,>(items:readonly T[])=>{
      if(items.length<=1000)return items;
      return Array.from({length:1000},(_,index)=>items[Math.round(index*(items.length-1)/999)]!);
    };
    const input=sampled(record.raw);
    const plotted=sampled(record.commands).map(command=>({x:command[0]!,y:command[1]!}));
    const points=[...input,...plotted];
    const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
    const spanX=Math.max(...points.map(p=>p.x))-x,spanY=Math.max(...points.map(p=>p.y))-y;
    const scale=Math.min((canvas.width-28)/Math.max(1,spanX),(canvas.height-28)/Math.max(1,spanY));
    const originX=(canvas.width-spanX*scale)/2,originY=(canvas.height-spanY*scale)/2;
    context.clearRect(0,0,canvas.width,canvas.height);
    context.fillStyle='#f5f8fc';context.fillRect(0,0,canvas.width,canvas.height);
    for(const [trajectory,color,dashed] of [[input,'#215eae',true],[plotted,'#b94b08',false]] as const){
      context.strokeStyle=context.fillStyle=color;context.lineWidth=1.6;context.setLineDash(dashed?[4,3]:[]);
      context.beginPath();
      for(const [index,point] of trajectory.entries()){
        const px=originX+(point.x-x)*scale,py=originY+(point.y-y)*scale;
        if(index===0)context.moveTo(px,py);else context.lineTo(px,py);
      }
      context.stroke();
      if(trajectory.length<=1&&trajectory[0]){
        context.beginPath();context.arc(originX+(trajectory[0].x-x)*scale,originY+(trajectory[0].y-y)*scale,dashed?4:2,0,2*Math.PI);context.fill();
      }
    }
    status.textContent='入力 '+record.raw.length+' 点、描画点 '+record.commands.length+' 点。拡大率 '+
      Math.round(fromZoom*100)+'% → '+Math.round(toZoom*100)+'%。';
  };
  panel.addEventListener('toggle',()=>{
    setListener(panel.open?trace:null);
    if(panel.open)status.textContent='次の一筆をお待ちください。';
  });
  panel.append(legend,instructions,canvas,status);host.append(panel);
}
