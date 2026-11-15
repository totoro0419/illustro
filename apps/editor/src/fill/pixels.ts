import {growOrShrink,rasterizeSelection,type MaskData} from '../selection/mask';
import type {Point} from '../transform/geometry';

export type FillSettings=Readonly<{
  method:'color'|'line'|'lasso'|'lasso-closed';tolerance:number;gap:number;opacity:number;color:string;
  erase:boolean;contiguous:boolean;closedOnly:boolean;
  edge?:number;edgeShape?:'square'|'round';traceWidth?:number;condition?:'all'|'transparent'|'color';excluded?:readonly number[];included?:readonly number[];
}>;
export type Walls=readonly Readonly<{remove:boolean;points:readonly Point[]}>[];
export type GapCandidate=Readonly<{from:Point;to:Point;length:number}>;
export type RegionGraph=Readonly<{
  width:number;height:number;walls:Uint8Array;bridges:Uint8Array;labels:Uint32Array;external:Uint8Array;count:number;
  candidates:readonly GapCandidate[];
  neighborOffsets:Uint32Array;neighbors:Uint32Array;depth:Int32Array;
}>;

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

function regionTopology(labels:Uint32Array,width:number,height:number,external:Uint8Array){
  // Consecutive labels separated by a wall share a boundary. Label 0 is
  // outside the canvas and accounts for strokes touching the canvas edge.
  const contacts=new Map<number,Set<number>>();
  const link=(a:number,b:number)=>{
    if(a===b)return;
    const first=contacts.get(a)??new Set<number>(),second=contacts.get(b)??new Set<number>();
    first.add(b);second.add(a);contacts.set(a,first);contacts.set(b,second);
  };
  const scan=(start:number,skip:number,length:number)=>{
    let previous=0;
    for(let i=0;i<length;i++){
      const current=labels[start+i*skip]!;
      if(!current||current===previous)continue;
      link(previous,current);previous=current;
    }
    link(previous,0);
  };
  for(let y=0;y<height;y++)scan(y*width,1,width);
  for(let x=0;x<width;x++)scan(x,width,height);
  const neighborOffsets=new Uint32Array(external.length+1);
  for(let id=0;id<external.length;id++)neighborOffsets[id+1]=neighborOffsets[id]!+(contacts.get(id)?.size??0);
  const neighbors=new Uint32Array(neighborOffsets[external.length]!);
  for(const [id,values] of contacts)neighbors.set([...values].sort((a,b)=>a-b),neighborOffsets[id]!);
  const depth=new Int32Array(external.length).fill(-1),queue=new Uint32Array(depth.length);
  let next=0,tail=0;
  depth[0]=0;queue[tail++]=0;
  for(let id=1;id<external.length;id++)if(external[id]){depth[id]=0;queue[tail++]=id;}
  while(next<tail){
    const id=queue[next++]!;
    for(let i=neighborOffsets[id]!;i<neighborOffsets[id+1]!;i++){
      const other=neighbors[i]!;
      if(depth[other]!>=0)continue;
      depth[other]=depth[id]!+1;queue[tail++]=other;
    }
  }
  return {neighborOffsets,neighbors,depth};
}

export function fillBoundaries(source:Uint8Array,width:number,height:number,tolerance:number,gap:number,manual:Walls=[]){
  const count=width*height,walls=new Uint8Array(count);
  const threshold=Math.max(1,tolerance*2.55);
  for(let i=0;i<count;i++){
    const p=i*4,ink=(255-(source[p]!*.2126+source[p+1]!*.7152+source[p+2]!*.0722))*source[p+3]!/255;
    if(ink>=threshold)walls[i]=1;
  }
  const radius=Math.round(limit(gap,0,12)),original=walls.slice(),bridges=new Uint8Array(count),candidates:GapCandidate[]=[];
  const connect=(x:number,y:number,dx:number,dy:number)=>{
    let from:Point|null=null,steps=0;
    while(x>=0&&y>=0&&x<width&&y<height){
      if(original[y*width+x]){
        if(from&&steps>1&&steps<=radius+1){
          const distance=Math.hypot(x-from.x,y-from.y);
          // Diagonal scanning must find a real gap, not bridge a corner around an existing line.
          if(distance<=radius+1&&(!dx||!dy||
            (!original[from.y*width+from.x+dx]&&!original[(from.y+dy)*width+from.x]))){
            if(candidates.length<4096)candidates.push({from,to:{x,y},length:distance-1});
            for(let step=1;step<steps;step++){
              const i=(from.y+dy*step)*width+from.x+dx*step;
              walls[i]=bridges[i]=1;
            }
          }
        }
        from={x,y};steps=0;
      }
      if(from&&++steps>radius+1)from=null;
      x+=dx;y+=dy;
    }
  };
  if(radius){
    for(let x=0;x<width;x++){connect(x,0,0,1);connect(x,0,1,1);connect(x,0,-1,1);}
    for(let y=0;y<height;y++){
      connect(0,y,1,0);
      if(y){connect(0,y,1,1);connect(width-1,y,-1,1);}
    }
  }
  for(const {remove,points} of manual){
    for(let i=0;i<points.length;i++){
      const a=points[Math.max(0,i-1)]!,b=points[i]!,steps=Math.max(1,Math.ceil(Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))*2));
      for(let j=0;j<=steps;j++){
        const x=Math.floor(a.x+(b.x-a.x)*j/steps),y=Math.floor(a.y+(b.y-a.y)*j/steps);
        if(x<0||x>=width||y<0||y>=height)continue;
        walls[y*width+x]=remove?0:1;
        bridges[y*width+x]=0;
      }
    }
  }
  return {walls,bridges,candidates};
}

export function buildRegions(source:Uint8Array,width:number,height:number,tolerance:number,gap:number,manual:Walls):RegionGraph{
  const count=width*height,{walls,bridges,candidates}=fillBoundaries(source,width,height,tolerance,gap,manual);
  const labels=new Uint32Array(count),queue=new Uint32Array(count),external:number[]=[0];
  let regions=0;
  for(let i=0;i<count;i++){
    if(walls[i]||labels[i])continue;
    regions++;
    const outside=flood(width,height,i,j=>!walls[j]&&!labels[j],j=>{labels[j]=regions;},queue);
    external.push(outside?1:0);
  }
  const externalFlags=Uint8Array.from(external);
  return {width,height,walls,bridges,labels,external:externalFlags,count:regions,candidates,
    ...regionTopology(labels,width,height,externalFlags)};
}

function roundedEdge(mask:MaskData,radius:number,grow:boolean){
  const {width,height,alpha}=mask,distances=new Uint16Array(alpha.length);
  const far=0x7fff;
  for(let i=0;i<alpha.length;i++)distances[i]=(alpha[i]!>127)===grow?0:far;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x;
    let distance=distances[i]!;
    if(x)distance=Math.min(distance,distances[i-1]!+10);
    if(y)distance=Math.min(distance,distances[i-width]!+10,
      x?distances[i-width-1]!+14:far,x+1<width?distances[i-width+1]!+14:far);
    distances[i]=distance;
  }
  for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){
    const i=y*width+x;
    let distance=distances[i]!;
    if(x+1<width)distance=Math.min(distance,distances[i+1]!+10);
    if(y+1<height)distance=Math.min(distance,distances[i+width]!+10,
      x?distances[i+width-1]!+14:far,x+1<width?distances[i+width+1]!+14:far);
    distances[i]=distance;
  }
  return Uint8Array.from(alpha,(a,i)=>{
    const fade=limit(((radius+.5)*10-distances[i]!)/10,0,1);
    return grow?Math.max(a,Math.round(255*fade)):Math.min(a,Math.round(255*(1-fade)));
  });
}

export function unpaintedFillEdges(mask:MaskData,pixels:Uint8ClampedArray|null,selection:MaskData|null,ink:Uint8Array){
  const nearby=growOrShrink(mask,2,'grow').alpha,remaining=new Uint8Array(nearby.length);
  for(let i=0;i<remaining.length;i++){
    if(nearby[i]&&!mask.alpha[i]&&(!selection||selection.alpha[i])&&!ink[i]&&!(pixels?.[i*4+3]))
      remaining[i]=255;
  }
  return remaining;
}

export function fillMask(source:Uint8Array,width:number,height:number,settings:FillSettings,points:readonly Point[],
  graph:RegionGraph|null,selection:MaskData|null,bridges?:Uint8Array):MaskData{
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
  if(settings.method==='lasso'||settings.method==='lasso-closed'){
    if(points.length<3)throw Error('塗る範囲を一筆で囲んでください。');
    alpha=rasterizeSelection({type:'lasso',points},width,height).alpha;
    if(settings.method==='lasso-closed'){
      if(!graph)throw Error('先に線画を解析してください。');
      const rejected=new Set<number>(settings.excluded),inside=new Set<number>();
      for(let i=0;i<length;i++){
        const id=graph.labels[i]!;
        if(!id)continue;
        if(alpha[i])inside.add(id);else rejected.add(id);
      }
      for(let i=0;i<length;i++){
        const id=graph.labels[i]!;
        if(!id||!inside.has(id)||rejected.has(id)||graph.external[id])alpha[i]=0;
      }
    }
  }else if(settings.method==='line'){
    if(!graph)throw Error('先に線画を解析してください。');
    const excluded=new Set(settings.excluded);
    const regions=new Set((settings.included??[]).filter(id=>!excluded.has(id)&&(!settings.closedOnly||!graph.external[id])));
    const traceRadius=Math.max(0,Math.min(12,Math.round((settings.traceWidth??1)/2-.5)));
    for(const point of sampledPath()){
      for(let y=-traceRadius;y<=traceRadius;y++)for(let x=-traceRadius;x<=traceRadius;x++){
        if(x*x+y*y>traceRadius*traceRadius)continue;
        const i=seed({x:point.x+x,y:point.y+y}),id=graph.labels[i]??0;
        if(id&&!excluded.has(id)&&(!settings.closedOnly||!graph.external[id]))regions.add(id);
      }
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
        if(start<0||alpha[start]||bridges?.[start]||!equalColor(start))continue;
        flood(width,height,start,i=>!alpha[i]&&!bridges?.[i]&&equalColor(i),i=>{alpha[i]=255;},queue);
      }
    }else for(let i=0;i<length;i++)if(equalColor(i))alpha[i]=255;
  }
  const edge=settings.edge??0;
  if(edge&&alpha.some(Boolean)){
    const radius=Math.min(24,Math.abs(edge)),mask={width,height,alpha};
    alpha=settings.edgeShape==='round'?roundedEdge(mask,radius,edge>0):growOrShrink(mask,radius,edge>0?'grow':'shrink').alpha;
  }
  const rgb=[1,3,5].map(offset=>parseInt(settings.color.slice(offset,offset+2),16));
  for(let i=0;i<length;i++){
    if(!alpha[i])continue;
    if(selection)alpha[i]=Math.round(alpha[i]!*selection.alpha[i]!/255);
    if(settings.condition==='transparent'&&source[i*4+3])alpha[i]=0;
    if(settings.condition==='color'){
      const p=i*4;
      if(!source[p+3]||Math.hypot(source[p]!-rgb[0]!,source[p+1]!-rgb[1]!,source[p+2]!-rgb[2]!)>settings.tolerance*4.42)alpha[i]=0;
    }
  }
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
