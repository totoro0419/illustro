import type {ArtPoint,EditablePath} from '@illustro/core';

const distance=(a:ArtPoint,b:ArtPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
function segmentDistance(p:ArtPoint,a:ArtPoint,b:ArtPoint){
  const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
  const u=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;
  return Math.hypot(p.x-a.x-dx*u,p.y-a.y-dy*u);
}
export function simplifyPath(points:readonly ArtPoint[],error:number){
  if(points.length<3)return [...points];
  const keep=new Uint8Array(points.length),queue:Array<[number,number]>=[[0,points.length-1]];
  keep[0]=1;keep[points.length-1]=1;
  while(queue.length){
    const [first,last]=queue.pop()!;
    let best=error,index=-1;
    for(let i=first+1;i<last;i++){
      const d=segmentDistance(points[i]!,points[first]!,points[last]!);
      if(d>best){best=d;index=i;}
    }
    if(index>=0){keep[index]=1;queue.push([first,index],[index,last]);}
  }
  return points.filter((_,index)=>keep[index]);
}
export function smoothPath(points:readonly ArtPoint[],closed:boolean,amount:number){
  return points.map((point,index)=>{
    const a=points[index-1]??(closed?points.at(-1)!:point),b=points[index+1]??(closed?points[0]!:point);
    const dx=(b.x-a.x)*amount/6,dy=(b.y-a.y)*amount/6;
    return {...point,inX:point.x-dx,inY:point.y-dy,outX:point.x+dx,outY:point.y+dy};
  });
}
export function eraseSegment(path:EditablePath,point:ArtPoint){
  if(path.shape==='rectangle'||path.shape==='ellipse'||path.points.some(p=>p.move||p.close))
    throw Error('この形は区間消去に対応していません。レイヤーの削除か点の編集を使ってください。');
  let best=Math.max(10,path.width*2),cut=-1;
  for(let i=0;i<path.points.length-(path.closed?0:1);i++){
    const a=path.points[i]!,b=path.points[(i+1)%path.points.length]!;
    let d=segmentDistance(point,a,b);
    if(a.outX!==undefined||b.inX!==undefined){
      let previous=a;d=Infinity;
      for(let j=1;j<=16;j++){
        const t=j/16,u=1-t;
        const coord=(a:number,b:number,c:number,d:number)=>u**3*a+3*u*u*t*b+3*u*t*t*c+t**3*d;
        const next={x:coord(a.x,a.outX??a.x,b.inX??b.x,b.x),y:coord(a.y,a.outY??a.y,b.inY??b.y,b.y)};
        d=Math.min(d,segmentDistance(point,previous,next));previous=next;
      }
    }
    if(d<best){best=d;cut=i;}
  }
  if(cut<0)throw Error('消したい線の近くを指定してください。');
  if(path.points.length===2)throw Error('線をすべて消す場合はレイヤーを削除してください。');
  if(path.closed)return {...path,closed:false,fill:null,points:[...path.points.slice(cut+1),...path.points.slice(0,cut+1)]};
  const left=path.points.slice(0,cut+1),right=path.points.slice(cut+1);
  const points=[...(left.length>1?left:[]),...(right.length>1?right.map((p,i)=>i?p:{...p,move:true}):[])];
  return {...path,fill:null,points};
}

/** Combine independent strokes without changing the native, backwards-compatible path format. */
export function appendPathStroke(base:EditablePath,stroke:EditablePath):EditablePath{
  if(base.booleanOperands||stroke.booleanOperands)throw Error('図形演算の元データを含む形には追加できません。');
  if(base.shape==='rectangle'||base.shape==='ellipse'||stroke.shape==='rectangle'||stroke.shape==='ellipse'||
    base.closed||stroke.closed||base.points.some(point=>point.close)||stroke.points.some(point=>point.close))
    throw Error('別の線を追加するには、閉じていないベクター線を選んでください。');
  if(base.fill||stroke.fill)throw Error('線を追加する前に内側の塗りをオフにしてください。');
  if(base.stroke!==stroke.stroke||base.width!==stroke.width||base.lineStyle!==stroke.lineStyle||
    (base.opacity??1)!==(stroke.opacity??1))
    throw Error('同じレイヤーに追加する線は、色・太さ・線の種類をそろえてください。');
  if(base.points.length+stroke.points.length>4096)throw Error('このレイヤーの点が4096個を超えます。別のレイヤーに描いてください。');
  const first=stroke.points[0]!;
  return {...base,points:[...base.points,{...first,move:true},...stroke.points.slice(1)]};
}

/** Remove the nearest complete subpath; null means the layer itself must be removed atomically. */
export function eraseWholeStroke(path:EditablePath,position:ArtPoint):EditablePath|null{
  const groups:ArtPoint[][]=[];
  if(path.shape==='rectangle'||path.shape==='ellipse')groups.push([...path.points]);
  else{
    for(const point of path.points){
      if((point.move||groups.length===0)&&(!groups.length||groups.at(-1)!.length))groups.push([]);
      groups.at(-1)!.push(point);
    }
  }
  let nearest=-1,best=Math.max(10,path.width*2);
  for(let i=0;i<groups.length;i++){
    const group=groups[i]!;
    if(group.length<2)continue;
    const sampled=sampledPath({...path,points:group,closed:path.closed&&groups.length===1})[0]??[];
    for(let j=1;j<sampled.length;j++){
      const d=segmentDistance(position,sampled[j-1]!,sampled[j]!);
      if(d<best){best=d;nearest=i;}
    }
  }
  if(nearest<0)throw Error('消したいベクター線の近くを指定してください。');
  if(groups.length===1)return null;
  const remaining=groups.filter((_,i)=>i!==nearest);
  const points=remaining.flatMap((group,i)=>group.map((p,j)=>{
    if(j>0)return p;
    if(i>0)return {...p,move:true};
    const {move,...rest}=p;
    return rest;
  }));
  if(points.length<2)throw Error('残った線が短すぎます。レイヤーごと消してください。');
  return {...path,shape:path.shape==='freehand'?'freehand':'polyline',closed:false,points};
}

/**
 * Adaptive Bézier sampling limits geometric error rather than sampling by fixed distance.
 * The cap prevents unusually complex drawings from freezing a canvas operation.
 */
export function sampledPath(path:EditablePath,tolerance=.5,maxPoints=65536):ArtPoint[][]{
  const anchors=path.points,first=anchors[0]!,last=anchors.at(-1)!;
  if(path.shape==='rectangle')return [[first,{x:last.x,y:first.y},last,{x:first.x,y:last.y},first]];
  if(path.shape==='ellipse'){
    const cx=(first.x+last.x)/2,cy=(first.y+last.y)/2,rx=Math.abs(first.x-last.x)/2,ry=Math.abs(first.y-last.y)/2;
    const count=Math.min(2048,Math.max(40,Math.ceil(Math.PI*Math.sqrt(Math.max(rx,ry)/(2*Math.max(.05,tolerance))))));
    return [Array.from({length:count+1},(_,i)=>{const t=i*2*Math.PI/count;return {x:cx+Math.cos(t)*rx,y:cy+Math.sin(t)*ry};})];
  }
  const groups:ArtPoint[][]=[];
  let group:ArtPoint[]=[];
  let prior:ArtPoint|null=null,anchor:ArtPoint|null=null,total=0;
  const checkBudget=()=>{if(total>maxPoints)throw Error('線の点が多すぎます。先に点を減らしてください。');};
  function addCurve(a:ArtPoint,b:ArtPoint){
    if(a.outX===undefined&&b.inX===undefined){group.push(b);total++;checkBudget();return;}
    const p0=a,p1={x:a.outX??a.x,y:a.outY??a.y},p2={x:b.inX??b.x,y:b.inY??b.y},p3=b;
    const lerp=(l:ArtPoint,r:ArtPoint)=>({x:(l.x+r.x)/2,y:(l.y+r.y)/2});
    let samples=0;
    // The former 255-segment cap could force the last part of a complex curve
    // into one visibly straight edge. Expand it only when the overall point
    // budget allows, retaining a strict upper bound for 4K operations.
    const curveBudget=Math.min(2048,Math.max(255,
      Math.floor((maxPoints-anchors.length)/Math.max(1,anchors.length-1))));
    function flatten(a0:ArtPoint,a1:ArtPoint,a2:ArtPoint,a3:ArtPoint,begin:number,end:number,depth:number){
      const flat=Math.max(segmentDistance(a1,a0,a3),segmentDistance(a2,a0,a3));
      if(flat<=tolerance||depth>=14||samples>=curveBudget){
        group.push({...a3,pressure:(p0.pressure??1)+((p3.pressure??1)-(p0.pressure??1))*end});
        samples++;total++;checkBudget();return;
      }
      const q0=lerp(a0,a1),q1=lerp(a1,a2),q2=lerp(a2,a3);
      const r0=lerp(q0,q1),r1=lerp(q1,q2),mid=lerp(r0,r1),middle=(begin+end)/2;
      flatten(a0,q0,r0,mid,begin,middle,depth+1);
      flatten(mid,r1,q2,a3,middle,end,depth+1);
    }
    flatten(p0,p1,p2,p3,0,1,0);
  }
  for(const point of anchors){
    if(point.move||!prior){
      if(group.length)groups.push(group);
      group=[point];total++;checkBudget();anchor=point;
    }else addCurve(prior,point);
    if(point.close&&anchor){addCurve(point,anchor);groups.push(group);group=[];prior=null;anchor=null;}
    else prior=point;
  }
  if(group.length){
    if(path.closed&&prior&&anchor)addCurve(prior,anchor);
    groups.push(group);
  }
  return groups;
}

type Coordinate=[number,number];
type Polygon=Coordinate[][];
type ShapeMode='union'|'intersection'|'difference'|'xor';
export async function combineShapes(current:EditablePath,other:EditablePath,mode:ShapeMode):Promise<EditablePath>{
  const polygon=(input:EditablePath):Polygon=>{
    const result=sampledPath(input,.25,8192);
    if(!result.length||result.some(ring=>ring.length<4||distance(ring[0]!,ring.at(-1)!)>.00001))
      throw Error('形状演算には面を持つ閉じた形を選んでください。');
    // The source's even-odd fill can contain separate island outlines as well as holes.
    return result.map(ring=>ring.map(p=>[p.x,p.y]));
  };
  const a=polygon(current),b=polygon(other);
  const imported=await import('polygon-clipping');
  const operations=('default' in imported?imported.default:imported) as typeof imported;
  const rings=(polygon:Polygon)=>{
    const [outer,...rings]=polygon;
    if(!outer)throw Error('形状の輪郭がありません。');
    return rings.length?operations.xor([outer],...rings.map(ring=>[ring])):[[outer]];
  };
  const groups=operations[mode](rings(a),rings(b));
  const points=groups.flatMap(group=>group.flatMap(ring=>
    ring.slice(0,-1).map(([x,y],index,list):ArtPoint=>({x,y,...(index===0?{move:true}:{}),...(index===list.length-1?{close:true}:{})}))));
  if(points.length<3)throw Error('演算結果に面がありません。');
  if(points.length>4096)throw Error('演算結果の点が多すぎます。元の形の点数を減らしてください。');
  // Keep copies of both input shapes for later re-editing, without changing how older renderers display the result.
  const {booleanOperands:_ignoredA,...left}=current,{booleanOperands:_ignoredB,...right}=other;
  return {...current,shape:'polyline',closed:false,points,fill:current.fill??current.stroke,
    booleanOperands:{mode,a:left,b:right}};
}

export function splitPath(path:EditablePath,index:number):EditablePath{
  if(path.shape==='rectangle'||path.shape==='ellipse'||path.points.some(p=>p.move||p.close)||index<1||index>=path.points.length-1)
    throw Error('開いた線の途中にある点を選んでください。');
  if(path.closed)throw Error('先に線を開いてから分割してください。');
  const point=path.points[index]!;
  return {...path,fill:null,points:[...path.points.slice(0,index+1),{...point,move:true},...path.points.slice(index+1)]};
}
function reversePath(points:readonly ArtPoint[]){
  return [...points].reverse().map(point=>{
    const {inX,inY,outX,outY,...rest}=point;
    return {...rest,...(outX===undefined||outY===undefined?{}:{inX:outX,inY:outY}),
      ...(inX===undefined||inY===undefined?{}:{outX:inX,outY:inY})};
  });
}
export function joinPaths(a:EditablePath,b:EditablePath,maxGap=24):EditablePath{
  for(const path of [a,b])if(path.closed||path.shape==='rectangle'||path.shape==='ellipse'||path.points.some(point=>point.move||point.close))
    throw Error('接続するには開いた線を2本選んでください。');
  const paths=[[a.points,b.points],[a.points,reversePath(b.points)],
    [reversePath(a.points),b.points],[reversePath(a.points),reversePath(b.points)]] as const;
  const candidates=paths.map(([left,right])=>({left,right,length:distance(left.at(-1)!,right[0]!)}));
  candidates.sort((a,b)=>a.length-b.length);
  const {left,right,length}=candidates[0]!;
  if(!Number.isFinite(maxGap)||maxGap<0||length>maxGap)
    throw Error('2本の端が離れています。まず端の点を近づけてください。');
  if(left.length+right.length>4096)throw Error('接続する線の点が多すぎます。点を減らしてください。');
  return {...a,shape:'bezier',points:[...left,...right],fill:null,closed:false};
}

export function eraseBetweenIntersections(path:EditablePath,reference:EditablePath,position:ArtPoint):EditablePath{
  if(path.closed||path.shape==='ellipse'||path.shape==='rectangle'||path.points.some(p=>p.move||p.close))
    throw Error('交点まで消すには、開いた1本の線を選んでください。');
  const subject=sampledPath(path)[0]!,edges=sampledPath(reference);
  if(subject.length>4096||edges.reduce((n,edge)=>n+edge.length,0)>8192)throw Error('線が複雑です。先に点を減らしてください。');
  const stops=[0,subject.length-1];
  let nearest=0,best=Infinity;
  for(let i=1;i<subject.length;i++){
    const a=subject[i-1]!,b=subject[i]!,vx=b.x-a.x,vy=b.y-a.y,den=vx*vx+vy*vy;
    if(!den)continue;
    const fraction=Math.max(0,Math.min(1,((position.x-a.x)*vx+(position.y-a.y)*vy)/den)),d=segmentDistance(position,a,b);
    if(d<best){best=d;nearest=i-1+fraction;}
    for(const line of edges)for(let j=1;j<line.length;j++){
      const c=line[j-1]!,d=line[j]!,wx=d.x-c.x,wy=d.y-c.y,cross=vx*wy-vy*wx;
      if(Math.abs(cross)<.000001)continue;
      const t=((c.x-a.x)*wy-(c.y-a.y)*wx)/cross;
      const u=((c.x-a.x)*vy-(c.y-a.y)*vx)/cross;
      if(t>=0&&t<=1&&u>=0&&u<=1)stops.push(i-1+t);
    }
  }
  if(best>Math.max(10,path.width*2)||stops.length<=2)throw Error('交点のある線の近くをタップしてください。');
  let low=0,high=Infinity;
  for(const stop of stops){if(stop<=nearest)low=Math.max(low,stop);else high=Math.min(high,stop);}
  if(!Number.isFinite(high))throw Error('交点より内側の区間を指定してください。');
  const at=(index:number)=>{
    const i=Math.floor(index),a=subject[i]!,b=subject[i+1]??a,t=index-i;
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  };
  const left=low>0?[...subject.slice(0,Math.ceil(low)).map(p=>({x:p.x,y:p.y})),at(low)]:[];
  const right=high<subject.length-1?[{...at(high),move:left.length>0},...subject.slice(Math.floor(high)+1).map(p=>({x:p.x,y:p.y}))]:[];
  if(left.length+right.length<2)throw Error('線をすべて消す場合はレイヤーを削除してください。');
  return {...path,shape:'polyline',points:[...left,...right],closed:false,fill:null};
}
