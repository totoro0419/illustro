import {rasterizeSelection,type MaskData} from '../selection/mask';
import type {Point} from '../transform/geometry';

export type FillSettings=Readonly<{
  method:'color'|'line'|'lasso';tolerance:number;gap:number;opacity:number;color:string;
  erase:boolean;contiguous:boolean;closedOnly:boolean;
}>;
export type Walls=readonly Readonly<{remove:boolean;points:readonly Point[]}>[];
export type RegionGraph=Readonly<{width:number;height:number;walls:Uint8Array;labels:Uint32Array;external:Uint8Array;count:number}>;

const limit=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
function flood(width:number,height:number,seed:number,hit:(index:number)=>boolean,write:(index:number)=>void,queue:Uint32Array){
  if(seed<0||seed>=width*height||!hit(seed))return false;
  let front=0,back=1,touchesEdge=false;
  queue[0]=seed;write(seed);
  const visit=(i:number)=>{if(hit(i)){write(i);queue[back++]=i;}};
  while(front<back){
    const p=queue[front++]!,x=p%width,y=Math.floor(p/width);
    if(x>0)visit(p-1);else touchesEdge=true;
    if(x+1<width)visit(p+1);else touchesEdge=true;
    if(y>0)visit(p-width);else touchesEdge=true;
    if(y+1<height)visit(p+width);else touchesEdge=true;
  }
  return touchesEdge;
}

export function buildRegions(source:Uint8Array,width:number,height:number,tolerance:number,gap:number,manual:Walls):RegionGraph{
  const count=width*height,walls=new Uint8Array(count);
  const threshold=Math.max(1,tolerance*2.55);
  for(let i=0;i<count;i++){
    const p=i*4,ink=(255-(source[p]!*.2126+source[p+1]!*.7152+source[p+2]!*.0722))*source[p+3]!/255;
    if(ink>=threshold)walls[i]=1;
  }
  const radius=Math.round(limit(gap,0,12));
  if(radius){
    // Bridge small gaps between opposing line pixels in both axis directions.
    for(let direction=0;direction<2;direction++){
      const length=direction?height:width,groups=direction?width:height,step=direction?width:1;
      for(let line=0;line<groups;line++){
        const offset=direction?line:line*width;
        let previous=-Infinity;
        for(let i=0;i<length;i++){
          if(!walls[offset+i*step])continue;
          if(i-previous<=radius+1)for(let j=previous+1;j<i;j++)walls[offset+j*step]=1;
          previous=i;
        }
      }
    }
  }
  for(const {remove,points} of manual){
    for(let i=0;i<points.length;i++){
      const a=points[Math.max(0,i-1)]!,b=points[i]!,steps=Math.max(1,Math.ceil(Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))*2));
      for(let j=0;j<=steps;j++){
        const x=Math.floor(a.x+(b.x-a.x)*j/steps),y=Math.floor(a.y+(b.y-a.y)*j/steps);
        if(x<0||x>=width||y<0||y>=height)continue;
        walls[y*width+x]=remove?0:1;
      }
    }
  }
  const labels=new Uint32Array(count),queue=new Uint32Array(count),external:number[]=[0];
  let regions=0;
  for(let i=0;i<count;i++){
    if(walls[i]||labels[i])continue;
    regions++;
    const outside=flood(width,height,i,j=>!walls[j]&&!labels[j],j=>{labels[j]=regions;},queue);
    external.push(outside?1:0);
  }
  return {width,height,walls,labels,external:Uint8Array.from(external),count:regions};
}

export function fillMask(source:Uint8Array,width:number,height:number,settings:FillSettings,points:readonly Point[],
  graph:RegionGraph|null,selection:MaskData|null):MaskData{
  const length=width*height;
  let alpha:Uint8Array=new Uint8Array(length);
  const seed=(point:Point)=>{
    const x=Math.floor(point.x),y=Math.floor(point.y);
    return x<0||y<0||x>=width||y>=height?-1:y*width+x;
  };
  function* sampledPath(){
    for(let i=0;i<points.length;i++){
      const a=points[Math.max(0,i-1)]!,b=points[i]!;
      const steps=Math.max(1,Math.ceil(Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))*2));
      for(let j=1;j<=steps;j++)yield {x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps};
    }
  }
  if(settings.method==='lasso'){
    if(points.length<3)throw Error('塗る範囲を一筆で囲んでください。');
    alpha=rasterizeSelection({type:'lasso',points},width,height).alpha;
  }else if(settings.method==='line'){
    if(!graph)throw Error('先に線画を解析してください。');
    const regions=new Set<number>();
    for(const point of sampledPath()){
      const i=seed(point),id=graph.labels[i]??0;
      if(id&&(!settings.closedOnly||!graph.external[id]))regions.add(id);
    }
    if(!regions.size)throw Error('塗れる領域がありません。線の上や開いた領域を避けてください。');
    for(let i=0;i<length;i++)if(regions.has(graph.labels[i]!))alpha[i]=255;
  }else{
    const target=seed(points[0]??{x:-1,y:-1});
    if(target<0)throw Error('キャンバスの中を指定してください。');
    const p=target*4,tolerance=settings.tolerance*2.55;
    const equalColor=(i:number)=>{
      const a=i*4,sa=source[a+3]!,ta=source[p+3]!;
      if(!sa&&!ta)return true;
      if(!sa||!ta)return Math.abs(sa-ta)<=tolerance;
      const rgb=Math.hypot(source[a]!-source[p]!,source[a+1]!-source[p+1]!,source[a+2]!-source[p+2]!)/Math.sqrt(3);
      return Math.max(rgb,Math.abs(sa-ta))<=tolerance;
    };
    if(settings.contiguous){
      const queue=new Uint32Array(length);
      for(const point of sampledPath()){
        const start=seed(point);
        if(start<0||alpha[start]||!equalColor(start))continue;
        flood(width,height,start,i=>!alpha[i]&&equalColor(i),i=>{alpha[i]=255;},queue);
      }
    }else for(let i=0;i<length;i++)if(equalColor(i))alpha[i]=255;
  }
  if(selection)for(let i=0;i<length;i++)alpha[i]=Math.round(alpha[i]!*selection.alpha[i]!/255);
  return {width,height,alpha};
}

export function colorMask(target:Uint8Array|null,mask:MaskData,settings:FillSettings,alphaLocked:boolean){
  const result=target?new Uint8ClampedArray(target):new Uint8ClampedArray(mask.alpha.length*4);
  const rgb=[1,3,5].map(offset=>parseInt(settings.color.slice(offset,offset+2),16));
  for(let i=0;i<mask.alpha.length;i++){
    const a=mask.alpha[i]!*settings.opacity/255,p=i*4,background=result[p+3]!/255;
    if(!a)continue;
    if(settings.erase){
      if(alphaLocked)continue;
      result[p+3]=background*(1-a)*255;
      if(!result[p+3])result.fill(0,p,p+3);
      continue;
    }
    if(alphaLocked){
      if(background)for(let c=0;c<3;c++)result[p+c]=rgb[c]!*a+result[p+c]!*(1-a);
      continue;
    }
    const total=a+background*(1-a);
    for(let c=0;c<3;c++)result[p+c]=(rgb[c]!*a+result[p+c]!*background*(1-a))/total;
    result[p+3]=total*255;
  }
  return result;
}
