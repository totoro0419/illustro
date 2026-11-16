import type {ColorHint,RegionWalls} from '@illustro/core';
import {growOrShrink,rasterizeSelection,type MaskData} from '../selection/mask';
import type {Point} from '../transform/geometry';

export type FillSettings=Readonly<{
  method:'color'|'line'|'lasso'|'lasso-closed';tolerance:number;gap:number;opacity:number;color:string;
  erase:boolean;contiguous:boolean;closedOnly:boolean;
  edge?:number;edgeShape?:'square'|'round';traceWidth?:number;condition?:'all'|'transparent'|'color';
  alphaTolerance?:number;matchColor?:string;excluded?:readonly number[];included?:readonly number[];
}>;
export type Walls=RegionWalls;
export type GapCandidate=Readonly<{from:Point;to:Point;length:number;kind?:'tips'|'edge'|'junction'|'near'}>;
export type RegionGraph=Readonly<{
  width:number;height:number;walls:Uint8Array;bridges:Uint8Array;labels:Uint32Array;external:Uint8Array;count:number;
  candidates:readonly GapCandidate[];
  neighborOffsets:Uint32Array;neighbors:Uint32Array;depth:Int32Array;anchors:Uint32Array;hasInk:boolean;
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
    // Only regions actually touching the canvas edge contact region 0.
    // A wall-separated interior region must not be treated as outside.
    let previous=0,betweenWalls=false;
    for(let i=0;i<length;i++){
      const current=labels[start+i*skip]!;
      if(!current){betweenWalls=true;continue;}
      if(i===0)link(0,current);
      if(previous&&current!==previous&&betweenWalls)link(previous,current);
      previous=current;betweenWalls=false;
    }
    const last=labels[start+(length-1)*skip]!;
    if(last)link(last,0);
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
  if(!Number.isSafeInteger(count)||width<1||height<1||source.length<count*4)
    throw Error('線画の画像サイズが正しくありません。');
  const threshold=Math.max(12,tolerance*2.55);
  // Transparent art: every sufficiently visible stroke can be a boundary, including white.
  // Opaque art: use the consistent canvas-corner background instead of assuming black ink.
  const corners=[0,width-1,(height-1)*width,count-1].map(index=>index*4);
  const visibleCorners=corners.filter(at=>source[at+3]!>=240);
  const matching=(a:number,b:number)=>[0,1,2].every(channel=>Math.abs(source[a+channel]!-source[b+channel]!)<=24);
  // An isolated stroke may touch one corner. Choose the majority, not simply the first.
  const reference=visibleCorners.reduce<{at:number;matches:number}|null>((best,at)=>{
    const matches=visibleCorners.filter(other=>matching(at,other)).length;
    return !best||matches>best.matches?{at,matches}:best;
  },null);
  const opaqueBackground=reference&&reference.matches>=3?reference.at:undefined;
  const uncertainOpaqueBackground=visibleCorners.length>=3&&opaqueBackground===undefined;
  for(let i=0;i<count;i++){
    const p=i*4,alpha=source[p+3]!;
    if(!alpha)continue;
    if(opaqueBackground===undefined){
      // On an ambiguous opaque canvas, fall back conservatively to the old
      // darkness detector instead of marking the entire picture as a wall.
      const ink=uncertainOpaqueBackground
        ?(255-(source[p]!*.2126+source[p+1]!*.7152+source[p+2]!*.0722))*alpha/255
        :alpha;
      if(ink>=threshold)walls[i]=1;
    }else{
      // Avoid per-pixel array creation: this runs up to 16 million times on 4000px art.
      const colorDifference=Math.max(
        Math.abs(source[p]!-source[opaqueBackground]!),
        Math.abs(source[p+1]!-source[opaqueBackground+1]!),
        Math.abs(source[p+2]!-source[opaqueBackground+2]!));
      if(colorDifference*alpha/255>=threshold||alpha<240&&240-alpha>=threshold)walls[i]=1;
    }
  }
  const radius=Math.round(limit(gap,0,12)),original=walls.slice(),bridges=new Uint8Array(count),candidates:GapCandidate[]=[];
  const directions=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]] as const;
  const tipDirection=(at:Point)=>{
    const neighbors=directions.filter(([dx,dy])=>{
      const x=at.x+dx,y=at.y+dy;
      return x>=0&&y>=0&&x<width&&y<height&&original[y*width+x];
    });
    return neighbors.length===1?neighbors[0]:null;
  };
  const connect=(x:number,y:number,dx:number,dy:number)=>{
    let from:Point|null=null,steps=0;
    while(x>=0&&y>=0&&x<width&&y<height){
      if(original[y*width+x]){
        if(from&&steps>1&&steps<=radius+1){
          const distance=Math.hypot(x-from.x,y-from.y);
          // Diagonal scanning must find a real gap, not bridge a corner around an existing line.
          const first=tipDirection(from),last=tipDirection({x,y});
          const alignment=first&&last&&
            ((x-from.x)*first[0]+(y-from.y)*first[1])/distance<=-.7&&
            ((from.x-x)*last[0]+(from.y-y)*last[1])/distance<=-.7;
          // Automatic repairs are restricted to two opposing, unambiguous tips.
          // Parallel strokes, corners and junctions remain open unless manually accepted.
          if(alignment&&distance<=radius+1&&(!dx||!dy||
            (!original[from.y*width+from.x+dx]&&!original[(from.y+dy)*width+from.x]))){
            if(candidates.length<4096)candidates.push({from,to:{x,y},length:distance-1,kind:'tips'});
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
  for(const {remove,preserveInk,points} of manual){
    for(let i=0;i<points.length;i++){
      const a=points[Math.max(0,i-1)]!,b=points[i]!,steps=Math.max(1,Math.ceil(Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))*2));
      for(let j=0;j<=steps;j++){
        const x=Math.floor(a.x+(b.x-a.x)*j/steps),y=Math.floor(a.y+(b.y-a.y)*j/steps);
        if(x<0||x>=width||y<0||y>=height)continue;
        const index=y*width+x;
        if(remove&&preserveInk&&original[index])continue;
        walls[index]=remove?0:1;
        bridges[index]=0;
      }
    }
  }
  const remaining=candidates.filter(({from,to})=>{
    const dx=Math.sign(to.x-from.x),dy=Math.sign(to.y-from.y),steps=Math.max(Math.abs(to.x-from.x),Math.abs(to.y-from.y));
    for(let i=1;i<steps;i++)if(bridges[(from.y+dy*i)*width+from.x+dx*i])return true;
    return false;
  });
  return {walls,bridges,candidates:remaining};
}

export function buildRegions(source:Uint8Array,width:number,height:number,tolerance:number,gap:number,manual:Walls):RegionGraph{
  const count=width*height,{walls,bridges,candidates}=fillBoundaries(source,width,height,tolerance,gap,manual);
  const labels=new Uint32Array(count),queue=new Uint32Array(count),external:number[]=[0],anchors=[0];
  let regions=0;
  for(let i=0;i<count;i++){
    if(walls[i]||labels[i])continue;
    regions++;anchors.push(i);
    const outside=flood(width,height,i,j=>!walls[j]&&!labels[j],j=>{labels[j]=regions;},queue);
    external.push(outside?1:0);
  }
  const externalFlags=Uint8Array.from(external);
  return {width,height,walls,bridges,labels,external:externalFlags,count:regions,candidates,anchors:Uint32Array.from(anchors),hasInk:walls.some(Boolean),
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

function* sampledPath(points:readonly Point[]){
  for(let i=0;i<points.length;i++){
    const a=points[Math.max(0,i-1)]!,b=points[i]!;
    const steps=Math.max(1,Math.ceil(Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))*2));
    for(let j=1;j<=steps;j++)yield {x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps};
  }
}

export function fillMask(source:Uint8Array,width:number,height:number,settings:FillSettings,points:readonly Point[],
  graph:RegionGraph|null,selection:MaskData|null,bridges?:Uint8Array,destination?:Uint8Array|null):MaskData{
  const length=width*height;
  let alpha:Uint8Array=new Uint8Array(length);
  const seed=(point:Point)=>{
    const x=Math.floor(point.x),y=Math.floor(point.y);
    return x<0||y<0||x>=width||y>=height?-1:y*width+x;
  };
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
    for(const point of sampledPath(points)){
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
    const p=target*4,tolerance=settings.tolerance*2.55,alphaTolerance=(settings.alphaTolerance??settings.tolerance)*2.55;
    const equalColor=(i:number)=>{
      const a=i*4,sa=source[a+3]!,ta=source[p+3]!;
      if(!sa&&!ta)return true;
      if(!sa||!ta)return Math.abs(sa-ta)<=alphaTolerance;
      const rgb=Math.hypot(source[a]!-source[p]!,source[a+1]!-source[p+1]!,source[a+2]!-source[p+2]!)/Math.sqrt(3);
      return rgb<=tolerance&&Math.abs(sa-ta)<=alphaTolerance;
    };
    if(settings.contiguous){
      const queue=new Uint32Array(length);
      for(const point of sampledPath(points)){
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
  for(let i=0;i<length;i++){
    if(!alpha[i])continue;
    if(selection)alpha[i]=Math.round(alpha[i]!*selection.alpha[i]!/255);
    // The reference controls geometry; the destination controls pixel conditions.
    if(!destinationEligible(destination,i,settings))alpha[i]=0;
  }
  return {width,height,alpha};
}

function applyColor(result:Uint8ClampedArray,p:number,rgb:readonly number[],a:number,erase:boolean,alphaLocked:boolean){
  const background=result[p+3]!/255;
  if(erase){
    if(alphaLocked)return;
    result[p+3]=background*(1-a)*255;
    if(!result[p+3])result.fill(0,p,p+3);
    return;
  }
  if(alphaLocked){
    if(background)for(let c=0;c<3;c++)result[p+c]=rgb[c]!*a+result[p+c]!*(1-a);
    return;
  }
  const total=a+background*(1-a);
  for(let c=0;c<3;c++)result[p+c]=(rgb[c]!*a+result[p+c]!*background*(1-a))/total;
  result[p+3]=total*255;
}
const colorChannels=(color:string)=>[1,3,5].map(offset=>parseInt(color.slice(offset,offset+2),16));
function destinationEligible(destination:Uint8Array|null|undefined,index:number,settings:FillSettings){
  if(settings.condition==='transparent')return !(destination?.[index*4+3]??0);
  if(settings.condition==='color'){
    const p=index*4,rgb=colorChannels(settings.matchColor??settings.color);
    return !!destination?.[p+3]&&
      Math.hypot(destination[p]!-rgb[0]!,destination[p+1]!-rgb[1]!,destination[p+2]!-rgb[2]!)<=settings.tolerance*4.42;
  }
  return true;
}

export function colorMask(target:Uint8Array|null,mask:MaskData,settings:FillSettings,alphaLocked:boolean){
  const result=target?new Uint8ClampedArray(target):new Uint8ClampedArray(mask.alpha.length*4);
  const rgb=colorChannels(settings.color);
  for(let i=0;i<mask.alpha.length;i++){
    const a=mask.alpha[i]!*settings.opacity/255;
    if(a)applyColor(result,i*4,rgb,a,settings.erase,alphaLocked);
  }
  return result;
}

export function paintColorHints(graph:RegionGraph,hints:readonly ColorHint[],target:Uint8Array|null,
  selection:MaskData|null,settings:FillSettings,alphaLocked:boolean){
  const {width,height,labels}=graph,assignments=new Map<number,number>(),colors=hints.map(hint=>{
    return {erase:hint.color===null,channels:hint.color?colorChannels(hint.color):[]};
  });
  const excluded=new Set(settings.excluded);
  for(const [index,hint] of hints.entries()){
    const radius=Math.max(0,Math.floor((hint.width-1)/2));
    for(const point of sampledPath(hint.points)){
      const px=Math.floor(point.x),py=Math.floor(point.y);
      for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++){
        if(x*x+y*y>radius*radius||px+x<0||py+y<0||px+x>=width||py+y>=height)continue;
        const id=labels[(py+y)*width+px+x]!;
        if(id&&!excluded.has(id)&&(!settings.closedOnly||!graph.external[id]))assignments.set(id,index);
      }
    }
  }
  if(!assignments.size)throw Error('色指示が塗れる領域に触れていません。');
  const alpha=new Uint8Array(labels.length),pixels=target?new Uint8ClampedArray(target):new Uint8ClampedArray(labels.length*4);
  for(let i=0;i<labels.length;i++){
    const id=assignments.get(labels[i]!);
    if(id===undefined)continue;
    const color=colors[id]!,selected=selection?.alpha[i]??255,value=selected*settings.opacity/255;
    if(!value||!destinationEligible(target,i,settings))continue;
    alpha[i]=selected;
    applyColor(pixels,i*4,color.channels,value,color.erase,alphaLocked);
  }
  return {pixels,mask:{width,height,alpha}};
}

export function suggestLocalGaps(graph:RegionGraph,at:Point,reach:number,manual:Walls){
  const {width,height,walls,bridges}=graph;
  const radius=Math.max(3,Math.min(12,reach)),extent=radius+3;
  const isInk=(x:number,y:number)=>x>=0&&y>=0&&x<width&&y<height&&
    !!walls[y*width+x]&&!bridges[y*width+x];
  const directions=[[-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1]] as const;
  const nodes=[];
  for(let y=Math.max(0,Math.ceil(at.y-extent));y<=Math.min(height-1,Math.floor(at.y+extent));y++){
    for(let x=Math.max(0,Math.ceil(at.x-extent));x<=Math.min(width-1,Math.floor(at.x+extent));x++){
      if(!isInk(x,y))continue;
      const neighbors=directions.map(([dx,dy])=>isInk(x+dx,y+dy));
      const ink=neighbors.filter(Boolean).length;
      if(!ink||ink===8)continue;
      const branches=neighbors.filter((filled,index)=>filled&&!neighbors[(index+7)%8]).length;
      const inward=directions.reduce((sum,[dx,dy],index)=>neighbors[index]?{x:sum.x+dx,y:sum.y+dy}:sum,{x:0,y:0});
      nodes.push({x,y,inward,tip:ink<=3&&branches===1,junction:branches>=3});
    }
  }
  const proposals:Array<{candidate:GapCandidate;score:number}>=[];
  const rejected=new Set(manual.filter(edit=>edit.remove&&edit.preserveInk)
    .flatMap(edit=>edit.points.filter(point=>Math.hypot(point.x-at.x,point.y-at.y)<=extent*2)
      .map(point=>Math.round(point.x)+','+Math.round(point.y))));
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
    const a=nodes[i]!,b=nodes[j]!,dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
    if(length<1.99||length>radius+1)continue;
    const midpoint=Math.hypot((a.x+b.x)/2-at.x,(a.y+b.y)/2-at.y);
    if(midpoint>radius*.8+1)continue;
    if(a.tip&&dx*a.inward.x+dy*a.inward.y>0||b.tip&&dx*b.inward.x+dy*b.inward.y<0)continue;
    let obstruction=false;
    const steps=Math.max(Math.abs(dx),Math.abs(dy));
    for(let step=1;step<steps;step++){
      const x=Math.round(a.x+dx*step/steps),y=Math.round(a.y+dy*step/steps);
      if(isInk(x,y)||rejected.has(x+','+y)){obstruction=true;break;}
    }
    if(obstruction)continue;
    const kind=a.junction||b.junction?'junction':a.tip&&b.tip?'tips':a.tip||b.tip?'edge':'near';
    const score=length+midpoint*(kind==='tips'?.7:1.1)+(kind==='near'?4:kind==='junction'?2:0);
    proposals.push({candidate:{from:{x:a.x,y:a.y},to:{x:b.x,y:b.y},length:length-1,kind},score});
  }
  proposals.sort((a,b)=>a.score-b.score);
  const output:GapCandidate[]=[];
  for(const {candidate} of proposals){
    if(output.some(other=>other.kind===candidate.kind&&
      Math.hypot(other.from.x-candidate.from.x,other.from.y-candidate.from.y)+
      Math.hypot(other.to.x-candidate.to.x,other.to.y-candidate.to.y)<4))continue;
    output.push(candidate);
    if(output.length>=24)break;
  }
  return output;
}

export function sharedBoundary(graph:RegionGraph,first:number,second:number,near?:Point):readonly Point[]{
  if(first===second||first<1||second<1||first>graph.count||second>graph.count)
    throw Error('隣り合う二つの領域を選んでください。');
  const {width,height,labels}=graph;
  let best=Infinity,result:readonly Point[]=[];
  const scan=(start:number,step:number,length:number)=>{
    let last=0,at=start;
    for(let j=0;j<length;j++){
      const i=start+j*step,id=labels[i]!;
      if(!id)continue;
      if((last===first&&id===second)||(last===second&&id===first)){
        const span=(i-at)/step-1;
        if(span>0){
          const from=at+step,to=i-step;
          const a={x:from%width,y:Math.floor(from/width)},b={x:to%width,y:Math.floor(to/width)};
          const score=span+(near?Math.hypot((a.x+b.x)/2-near.x,(a.y+b.y)/2-near.y)*.05:0);
          if(score<best){best=score;result=[a,b];}
        }
      }
      last=id;at=i;
    }
  };
  for(let y=0;y<height;y++)scan(y*width,1,width);
  for(let x=0;x<width;x++)scan(x,width,height);
  if(!result.length)throw Error('二つの領域の共通境界を見つけられませんでした。境界を手でなぞってください。');
  return result;
}
