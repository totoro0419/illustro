import type {TransformBounds,TransformMesh,TransformPoint} from '@illustro/core';
import {rectCorners} from './quadrilateral';

type Point=TransformPoint;
type Triangle=readonly [Point,Point,Point];
const signedArea=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const outside={x:-Infinity,y:-Infinity};
const midpoint=(a:Point,b:Point)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const lerp=(a:Point,b:Point,t:number)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});

export function gridMesh(bounds:TransformBounds,columns=3,rows=3):Extract<TransformMesh,{kind:'grid'}>{
  const points=Array.from({length:columns*rows},(_,index)=>({
    x:bounds.x+bounds.width*(index%columns)/(columns-1),
    y:bounds.y+bounds.height*Math.floor(index/columns)/(rows-1),
    fixed:false
  }));
  return {kind:'grid',columns,rows,points};
}

export function cageMesh(bounds:TransformBounds):Extract<TransformMesh,{kind:'cage'}>{
  const source=rectCorners(bounds);
  return {kind:'cage',source,points:source.map(point=>({...point,fixed:false}))};
}

export function meshEdges(mesh:TransformMesh):readonly (readonly [number,number])[]{
  if(mesh.kind==='cage')return mesh.points.map((_,i)=>[i,(i+1)%mesh.points.length] as const);
  const {columns,rows}=mesh,edges:Array<[number,number]>=[];
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
    const i=y*columns+x;
    if(x+1<columns)edges.push([i,i+1]);
    if(y+1<rows)edges.push([i,i+columns]);
  }
  return edges;
}

function triangles(bounds:TransformBounds,mesh:TransformMesh){
  const topology:Array<[number,number,number]>=[];
  const target:Point[]=[...mesh.points];
  let source:Point[];
  if(mesh.kind==='grid'){
    const {columns,rows}=mesh;
    source=[...gridMesh(bounds,columns,rows).points];
    for(let y=0;y<rows-1;y++)for(let x=0;x<columns-1;x++){
      const a=y*columns+x,b=a+1,d=a+columns,c=d+1;
      topology.push([a,b,c],[a,c,d]);
    }
  }else{
    source=[...mesh.source];
    const n=source.length,center={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
    let weight=0,dx=0,dy=0;
    for(let k=0;k<n;k++){
      const next=(k+1)%n,a=mesh.source[k]!,b=mesh.source[next]!,pa=mesh.points[k]!,pb=mesh.points[next]!;
      const length=Math.hypot(a.x-b.x,a.y-b.y);
      weight+=length;
      dx+=length*(pa.x-a.x+pb.x-b.x)/2;
      dy+=length*(pa.y-a.y+pb.y-b.y)/2;
    }
    source.push(center);
    target.push({x:center.x+dx/weight,y:center.y+dy/weight});
    for(let k=0;k<n;k++)topology.push([k,(k+1)%n,n]);
  }
  for(const indices of topology){
    const a=target[indices[0]]!,b=target[indices[1]]!,c=target[indices[2]]!;
    if(!Number.isFinite(a.x+a.y+b.x+b.y+c.x+c.y)||signedArea(a,b,c)<=1e-4)
      throw Error('網目が折り重なりました。点を戻して、面が裏返らない形にしてください。');
  }
  const boundary=mesh.kind==='cage'?target.slice(0,-1):gridBoundary(target,mesh.columns,mesh.rows);
  checkBoundary(boundary);
  const asTriangle=(points:Point[],indices:readonly [number,number,number]):Triangle=>
    [points[indices[0]]!,points[indices[1]]!,points[indices[2]]!];
  return topology.map(indices=>({source:asTriangle(source,indices),target:asTriangle(target,indices)}));
}

function gridBoundary(points:readonly Point[],columns:number,rows:number){
  const perimeter:Point[]=[];
  for(let x=0;x<columns-1;x++)perimeter.push(points[x]!);
  for(let y=0;y<rows-1;y++)perimeter.push(points[y*columns+columns-1]!);
  for(let x=columns-1;x>0;x--)perimeter.push(points[(rows-1)*columns+x]!);
  for(let y=rows-1;y>0;y--)perimeter.push(points[y*columns]!);
  return perimeter;
}

function checkBoundary(points:readonly Point[]){
  for(let i=0;i<points.length;i++)for(let j=i+2;j<points.length;j++){
    if(i===0&&j===points.length-1)continue;
    const a=points[i]!,b=points[(i+1)%points.length]!,c=points[j]!,d=points[(j+1)%points.length]!;
    if(Math.max(a.x,b.x)<Math.min(c.x,d.x)||Math.max(c.x,d.x)<Math.min(a.x,b.x)||
      Math.max(a.y,b.y)<Math.min(c.y,d.y)||Math.max(c.y,d.y)<Math.min(a.y,b.y))continue;
    if(signedArea(a,b,c)*signedArea(a,b,d)<=0&&signedArea(c,d,a)*signedArea(c,d,b)<=0)
      throw Error('外周が交差しました。点の並び順を確認してください。');
  }
}

function surfaceMap(patches:readonly {from:Triangle;to:Triangle}[]){
  const vertices=patches.flatMap(item=>item.from),level=12;
  const left=Math.min(...vertices.map(p=>p.x)),right=Math.max(...vertices.map(p=>p.x));
  const top=Math.min(...vertices.map(p=>p.y)),bottom=Math.max(...vertices.map(p=>p.y));
  const cellX=(x:number)=>Math.min(level-1,Math.max(0,Math.floor((x-left)*level/(right-left))));
  const cellY=(y:number)=>Math.min(level-1,Math.max(0,Math.floor((y-top)*level/(bottom-top))));
  const grid:Array<Array<{from:Triangle;to:Triangle;area:number}>>=Array.from({length:level**2},()=>[]);
  for(const item of patches){
    const [a,b,c]=item.from,rowA=cellY(Math.min(a.y,b.y,c.y)),rowB=cellY(Math.max(a.y,b.y,c.y));
    const colA=cellX(Math.min(a.x,b.x,c.x)),colB=cellX(Math.max(a.x,b.x,c.x));
    const entry={...item,area:signedArea(a,b,c)};
    for(let row=rowA;row<=rowB;row++)for(let col=colA;col<=colB;col++)grid[row*level+col]!.push(entry);
  }
  return (x:number,y:number):Point=>{
    if(x<left||x>right||y<top||y>bottom)return outside;
    const point={x,y};
    for(const {from,to,area} of grid[cellY(y)*level+cellX(x)]!){
      if(area<=1e-8)continue;
      const u=signedArea(from[0],point,from[2])/area,v=signedArea(from[0],from[1],point)/area,w=1-u-v;
      if(u< -1e-8||v< -1e-8||w< -1e-8)continue;
      return {x:to[0].x*w+to[1].x*u+to[2].x*v,y:to[0].y*w+to[1].y*u+to[2].y*v};
    }
    return outside;
  };
}

export function meshMapping(bounds:TransformBounds,mesh:TransformMesh){
  const patches=triangles(bounds,mesh);
  const forward=surfaceMap(patches.map(({source,target})=>({from:source,to:target})));
  const inverse=surfaceMap(patches.map(({source,target})=>({from:target,to:source})));
  return {forward,inverse};
}

export function changeGrid(bounds:TransformBounds,mesh:Extract<TransformMesh,{kind:'grid'}>,columns:number,rows:number){
  if(!Number.isInteger(columns)||!Number.isInteger(rows)||columns<2||rows<2||columns>32||rows>32)
    throw Error('網目の分割数は縦横とも2〜32にしてください。');
  const next=gridMesh(bounds,columns,rows),old=gridMesh(bounds,mesh.columns,mesh.rows);
  // An unmatched pin cannot be represented exactly in the new topology. Never silently drop it.
  const locked=old.points.filter((_,index)=>mesh.points[index]?.fixed);
  if(locked.some(point=>!next.points.some(nextPoint=>
    Math.abs(point.x-nextPoint.x)<1e-8&&Math.abs(point.y-nextPoint.y)<1e-8)))
    throw Error('固定した点が消える分割です。別の分割数にするか、先に固定を解除してください。');
  const mapped=meshMapping(bounds,mesh).forward;
  return {...next,points:next.points.map(point=>{
    const position=mapped(point.x,point.y);
    const oldIndex=old.points.findIndex(p=>Math.hypot(p.x-point.x,p.y-point.y)<1e-8);
    if(!Number.isFinite(position.x)||!Number.isFinite(position.y))
      throw Error('網目の範囲外に点ができました。分割数を変えてください。');
    return {...position,fixed:mesh.points[oldIndex]?.fixed??false};
  })};
}

export function addCagePoint(mesh:Extract<TransformMesh,{kind:'cage'}>,index:number){
  const i=(index+1)%mesh.points.length;
  const source=[...mesh.source],points=[...mesh.points];
  source.splice(index+1,0,midpoint(mesh.source[index]!,mesh.source[i]!));
  points.splice(index+1,0,{...lerp(mesh.points[index]!,mesh.points[i]!,.5),fixed:false});
  return {...mesh,source,points};
}
