import type {LiquifyStroke,TransformPoint} from '@illustro/core';
import type {MaskStrokePoint} from '../layerMaskEditing';

const bucketSize=96;
type Dab={x:number;y:number;dx:number;dy:number;r:number;amount:number;mode:LiquifyStroke['mode']};

export function makeLiquifyStroke(mode:LiquifyStroke['mode'],radius:number,strength:number,points:readonly MaskStrokePoint[]){
  const first=points[0];
  if(!first)return null;
  const samples=[first],spacing=Math.max(2,radius*.24);
  for(let i=1;i<points.length;i++){
    const previous=points[i-1]!,next=points[i]!;
    const count=Math.max(1,Math.ceil(Math.hypot(next.x-previous.x,next.y-previous.y)/spacing));
    for(let j=1;j<=count;j++){
      const t=j/count,last=samples.at(-1)!;
      const sample={x:previous.x+(next.x-previous.x)*t,y:previous.y+(next.y-previous.y)*t,pressure:previous.pressure+(next.pressure-previous.pressure)*t};
      if(j===count&&i===points.length-1||Math.hypot(sample.x-last.x,sample.y-last.y)>=spacing*.8)samples.push(sample);
      if(samples.length>2048)throw Error('一筆が長すぎます。いくつかに分けてください。');
    }
  }
  return {mode,radius,strength,points:samples} satisfies LiquifyStroke;
}

export function liquifyMapping(strokes:readonly LiquifyStroke[]){
  const cells=new Map<string,Dab[]>(),protection=new Map<string,Dab[]>();
  const key=(x:number,y:number)=>Math.floor(x/bucketSize)+','+Math.floor(y/bucketSize);
  let cellsUsed=0;
  for(const stroke of strokes){
    for(let i=0;i<stroke.points.length;i++){
      const p=stroke.points[i]!,previous=stroke.points[i-1]??p;
      const r=stroke.radius*Math.max(.2,Math.sqrt(p.pressure)),dx=p.x-previous.x,dy=p.y-previous.y;
      const scale=Math.min(1,r*.25/Math.max(1,Math.hypot(dx,dy)));
      const dab={x:p.x,y:p.y,dx:dx*scale,dy:dy*scale,r,amount:stroke.strength*p.pressure,mode:stroke.mode};
      const map=stroke.mode==='protect'||stroke.mode==='unprotect'?protection:cells;
      for(let y=Math.floor((p.y-r)/bucketSize);y<=Math.floor((p.y+r)/bucketSize);y++){
        for(let x=Math.floor((p.x-r)/bucketSize);x<=Math.floor((p.x+r)/bucketSize);x++){
          if(++cellsUsed>2_000_000)throw Error('ブラシの範囲や筆数が大きすぎます。半径を下げるか適用してから続けてください。');
          const id=x+','+y,list=map.get(id);
          if(list)list.push(dab);else map.set(id,[dab]);
        }
      }
    }
  }
  const intensity=(dab:Dab,x:number,y:number)=>{
    const q=((x-dab.x)**2+(y-dab.y)**2)/(dab.r*dab.r);
    return q<1?(1-q)**2*dab.amount:0;
  };
  const coverage=(x:number,y:number)=>{
    let value=0;
    for(const dab of protection.get(key(x,y))??[]){
      const a=intensity(dab,x,y);
      if(dab.mode==='protect')value=Math.max(value,a);
      else value*=1-a;
    }
    return value;
  };
  const inverse=(x:number,y:number):TransformPoint=>{
    const list=cells.get(key(x,y));
    if(!list)return {x,y};
    const protectedAt=coverage(x,y);
    if(protectedAt>=.999)return {x,y};
    let offsetX=0,offsetY=0;
    for(const dab of list){
      const amount=intensity(dab,x,y);
      if(!amount)continue;
      const dx=x-dab.x,dy=y-dab.y;
      if(dab.mode==='restore'){offsetX*=1-amount;offsetY*=1-amount;continue;}
      if(dab.mode==='push'){offsetX-=dab.dx*amount;offsetY-=dab.dy*amount;continue;}
      if(dab.mode==='twist'){offsetX-=dy*amount*.18;offsetY+=dx*amount*.18;continue;}
      const scale=amount*(dab.mode==='expand'?-.18:.18);
      offsetX+=dx*scale;offsetY+=dy*scale;
    }
    const available=1-Math.max(protectedAt,coverage(x+offsetX,y+offsetY));
    return {x:x+available*offsetX,y:y+available*offsetY};
  };
  const forward=(x:number,y:number):TransformPoint|null=>{
    let px=x,py=y;
    for(let step=0;step<16;step++){
      const point=inverse(px,py),ex=point.x-x,ey=point.y-y;
      if(Math.hypot(ex,ey)<.035)return {x:px,y:py};
      const across=inverse(px+.25,py),down=inverse(px,py+.25);
      const xx=(across.x-point.x)*4,xy=(down.x-point.x)*4;
      const yx=(across.y-point.y)*4,yy=(down.y-point.y)*4;
      const determinant=xx*yy-xy*yx;
      if(determinant<.08)return null;
      const dx=(ex*yy-ey*xy)/determinant,dy=(ey*xx-ex*yx)/determinant;
      const scale=Math.min(1,24/Math.max(1,Math.hypot(dx,dy)));
      px-=dx*scale;py-=dy*scale;
    }
    return null;
  };
  return {inverse,forward,coverage};
}
