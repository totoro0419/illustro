import {mapArtworkPoint,inverseArtworkAffine,composeArtworkAffine,type ArtPoint,type EditablePath} from '@illustro/core';

const distance=(a:ArtPoint,b:ArtPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
function requireUniformFill(path:EditablePath){
  if(path.fillRuns)throw Error('複数色の輪郭は点・ハンドルと部分色を編集できます。線の分割や図形演算をするには先に単色にそろえてください。');
}
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
/** Add a width control on the nearest segment without changing its geometry. */
export function insertPathWidthPoint(path:EditablePath,position:ArtPoint,pressure:number){
  if(path.shape==='rectangle'||path.shape==='ellipse'||path.empty||path.points.length<2)
    throw Error('幅の点を追加するにはベクター線を選んでください。');
  if(!Number.isFinite(pressure)||pressure<0||pressure>1)throw Error('線幅を0〜100%で指定してください。');
  if(path.transform)position=mapArtworkPoint(position,inverseArtworkAffine(path.transform));
  const lerp=(a:ArtPoint,b:ArtPoint,t:number)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  const controls=(a:ArtPoint,b:ArtPoint)=>[{x:a.outX??a.x,y:a.outY??a.y},{x:b.inX??b.x,y:b.inY??b.y}] as const;
  let best=Math.max(10,path.width*2),hit:{from:number;to:number;t:number}|null=null;
  const search=(from:number,to:number)=>{
    const a=path.points[from]!,b=path.points[to]!;
    const [c,d]=controls(a,b);
    const returnPoint=(t:number)=>{
      const l=lerp(a,c,t),m=lerp(c,d,t),r=lerp(d,b,t);
      return lerp(lerp(l,m,t),lerp(m,r,t),t);
    };
    let t:number;
    if(a.outX===undefined&&b.inX===undefined){
      const dx=b.x-a.x,dy=b.y-a.y;
      if(!dx&&!dy)return;
      t=Math.max(0,Math.min(1,((position.x-a.x)*dx+(position.y-a.y)*dy)/(dx*dx+dy*dy)));
    }else{
      if(position.x<Math.min(a.x,b.x,c.x,d.x)-best||position.x>Math.max(a.x,b.x,c.x,d.x)+best||
         position.y<Math.min(a.y,b.y,c.y,d.y)-best||position.y>Math.max(a.y,b.y,c.y,d.y)+best)return;
      let closest=Infinity,index=0;
      for(let i=0;i<=32;i++){
        const dist=distance(returnPoint(i/32),position);
        if(dist<closest){closest=dist;index=i;}
      }
      let lo=Math.max(0,(index-1)/32),hi=Math.min(1,(index+1)/32);
      for(let i=0;i<12;i++){
        const a=(2*lo+hi)/3,b=(lo+2*hi)/3;
        if(distance(returnPoint(a),position)<distance(returnPoint(b),position))hi=b;
        else lo=a;
      }
      t=(lo+hi)/2;
    }
    const error=distance(a.outX===undefined&&b.inX===undefined?lerp(a,b,t):returnPoint(t),position);
    if(error<best){best=error;hit={from,to,t};}
  };
  let start=0;
  path.points.forEach((point,index)=>{
    if(point.move)start=index;
    else if(index>0&&!path.points[index-1]?.close)search(index-1,index);
    if(point.close&&index>start)search(index,start);
  });
  if(path.closed&&!path.points.at(-1)?.close&&path.points.length-1>start)search(path.points.length-1,start);
  const target=hit as {from:number;to:number;t:number}|null;
  if(!target)throw Error('幅を変更したい線の近くを指定してください。');
  const {from,to,t}=target,points=[...path.points],a=points[from]!,b=points[to]!;
  const {booleanOperands:_operands,...editable}=path;
  if(t<=.003||t>=.997){
    const index=t<=.003?from:to;
    points[index]={...points[index]!,pressure};
    return {path:{...editable,points,lineStyle:'pressure' as const},index};
  }
  if(points.length>=4096)throw Error('幅の点を追加するには、先に線の点を減らしてください。');
  const index=from+1,closing=to<=from;
  let inserted:ArtPoint={...lerp(a,b,t),pressure};
  if(a.outX!==undefined||b.inX!==undefined){
    const [c,d]=controls(a,b);
    const l=lerp(a,c,t),m=lerp(c,d,t),r=lerp(d,b,t);
    const inner=lerp(l,m,t),outer=lerp(m,r,t);
    points[from]={...a,outX:l.x,outY:l.y};
    points[to]={...b,inX:r.x,inY:r.y};
    inserted={...lerp(inner,outer,t),pressure,inX:inner.x,inY:inner.y,outX:outer.x,outY:outer.y};
  }
  if(closing&&a.close){
    points[from]={...points[from]!,close:false};
    inserted={...inserted,close:true};
  }
  points.splice(index,0,inserted);
  const fillRuns=path.fillRuns?.map(run=>({...run,start:run.start>=index?run.start+1:run.start,
    end:run.end>index||(closing&&run.end===index)?run.end+1:run.end}));
  return {path:{...editable,points,lineStyle:'pressure' as const,...(fillRuns?{fillRuns}:{})},index};
}

export function eraseSegment(path:EditablePath,point:ArtPoint){
  if(path.transform)point=mapArtworkPoint(point,inverseArtworkAffine(path.transform));
  requireUniformFill(path);
  if(path.shape==='rectangle'||path.shape==='ellipse'||path.points.some(p=>p.move||p.close))
    throw Error('この形は区間消去に対応していません。レイヤーの削除か点の編集を使ってください。');
  let best=Math.max(10,path.width*2),cut=-1;
  for(let i=0;i<path.points.length-(path.closed?0:1);i++){
    const a=path.points[i]!,b=path.points[(i+1)%path.points.length]!;
    let d=segmentDistance(point,a,b);
    if(a.outX!==undefined||b.inX!==undefined){
      // A cubic can bow far away from its end-to-end chord. First reject
      // segments whose entire control hull is outside the hit radius.
      const xs=[a.x,a.outX??a.x,b.inX??b.x,b.x];
      const ys=[a.y,a.outY??a.y,b.inY??b.y,b.y];
      if(point.x<Math.min(...xs)-best||point.x>Math.max(...xs)+best||
         point.y<Math.min(...ys)-best||point.y>Math.max(...ys)+best)continue;
      const samples=sampledPath({...path,shape:'bezier',points:[a,b],closed:false},.5,4096)[0]!;
      d=Infinity;
      for(let j=1;j<samples.length;j++)
        d=Math.min(d,segmentDistance(point,samples[j-1]!,samples[j]!));
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
  if(base.transform||stroke.transform){
    const relative=composeArtworkAffine(base.transform?inverseArtworkAffine(base.transform):{a:1,b:0,c:0,d:1,e:0,f:0},stroke.transform);
    const {transform:_old,...local}=stroke;
    stroke={...local,points:stroke.points.map(p=>({...mapArtworkPoint(p,relative),
      ...(p.inX===undefined?{}:{inX:mapArtworkPoint({x:p.inX,y:p.inY!},relative).x,inY:mapArtworkPoint({x:p.inX,y:p.inY!},relative).y}),
      ...(p.outX===undefined?{}:{outX:mapArtworkPoint({x:p.outX,y:p.outY!},relative).x,outY:mapArtworkPoint({x:p.outX,y:p.outY!},relative).y})}))};
  }
  requireUniformFill(base);requireUniformFill(stroke);
  if(base.booleanOperands||stroke.booleanOperands)throw Error('図形演算の元データを含む形には追加できません。');
  if(base.shape==='rectangle'||base.shape==='ellipse'||stroke.shape==='rectangle'||stroke.shape==='ellipse'||
    base.closed||stroke.closed||base.points.some(point=>point.close)||stroke.points.some(point=>point.close))
    throw Error('別の線を追加するには、閉じていないベクター線を選んでください。');
  if(base.fill||stroke.fill)throw Error('線を追加する前に内側の塗りをオフにしてください。');
  if(base.stroke.toLowerCase()!==stroke.stroke.toLowerCase()||base.width!==stroke.width||(base.lineStyle??'solid')!==(stroke.lineStyle??'solid')||
    (base.opacity??1)!==(stroke.opacity??1))
    throw Error('同じレイヤーに追加する線は、色・太さ・線の種類をそろえてください。');
  if(base.points.length+stroke.points.length>4096)throw Error('このレイヤーの点が4096個を超えます。別のレイヤーに描いてください。');
  const first=stroke.points[0]!;
  return {...base,points:[...base.points,{...first,move:true},...stroke.points.slice(1)]};
}

/** Remove the nearest complete subpath; null means the layer itself must be removed atomically. */
export function eraseWholeStroke(path:EditablePath,position:ArtPoint):EditablePath|null{
  if(path.transform)position=mapArtworkPoint(position,inverseArtworkAffine(path.transform));
  if(path.fillRuns){
    let nearest=-1,best=Math.max(10,path.width*2);
    path.fillRuns.forEach((run,index)=>{
      const contours=sampledPath({...path,points:path.points.slice(run.start,run.end),closed:false},.5,8192);
      let inside=false,distanceToEdge=Infinity;
      for(const line of contours)for(let i=1;i<line.length;i++){
        const a=line[i-1]!,b=line[i]!;
        distanceToEdge=Math.min(distanceToEdge,segmentDistance(position,a,b));
        if((a.y>position.y)!==(b.y>position.y)&&position.x<(b.x-a.x)*(position.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
      }
      const score=path.fill&&inside?0:distanceToEdge;
      if(score<=best){best=score;nearest=index;}
    });
    if(nearest<0)throw Error('消したい文字の輪郭の近くを指定してください。');
    if(path.fillRuns.length===1)return null;
    const cut=path.fillRuns[nearest]!,length=cut.end-cut.start;
    const remaining=path.fillRuns.filter((_,i)=>i!==nearest).map(run=>run.start>=cut.end?
      {...run,start:run.start-length,end:run.end-length}:run);
    const points=[...path.points.slice(0,cut.start),...path.points.slice(cut.end)];
    const {fillRuns:_old,...rest}=path;
    const colors=new Set(remaining.map(run=>run.color.toLowerCase()));
    return {...rest,points,fill:path.fill?remaining[0]!.color:null,...(colors.size>1?{fillRuns:remaining}:{})};
  }
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
  if(path.shape==='rectangle'){
    if(maxPoints<5)throw Error('図形の輪郭に必要な点数を確保できません。');
    return [[first,{x:last.x,y:first.y},last,{x:first.x,y:last.y},first]];
  }
  if(path.shape==='ellipse'){
    const cx=(first.x+last.x)/2,cy=(first.y+last.y)/2,rx=Math.abs(first.x-last.x)/2,ry=Math.abs(first.y-last.y)/2;
    const radius=Math.max(rx,ry);
    const count=Math.min(2048,Math.max(40,Math.ceil(Math.PI*Math.sqrt(radius/(2*Math.max(.05,tolerance))))));
    // The maximum sagitta of each elliptical arc is bounded by that of a
    // circle with the major radius. Never silently exceed the caller's
    // tolerance or point budget when converting a large ellipse to edges.
    if(count+1>maxPoints)throw Error('図形の輪郭に必要な点数を確保できません。');
    if(radius*(1-Math.cos(Math.PI/count))>tolerance)
      throw Error('楕円の精度を保てる点数を超えました。許容幅を広げてください。');
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
      if(flat<=tolerance){
        group.push({...a3,pressure:(p0.pressure??1)+((p3.pressure??1)-(p0.pressure??1))*end});
        samples++;total++;checkBudget();return;
      }
      // Never silently replace an inaccurate high-curvature section with
      // one long straight edge when the safety budget is exhausted.
      if(depth>=14||samples>=curveBudget)
        throw Error('曲線の精度を保てる点数を超えました。点を減らすか許容幅を広げてください。');
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
export async function combineShapes(current:EditablePath,other:EditablePath,mode:ShapeMode,allowEmpty=false):Promise<EditablePath>{
  requireUniformFill(current);requireUniformFill(other);
  const polygon=(input:EditablePath):Polygon=>{
    if(input.empty)return [];
    const result=sampledPath(input,.25,8192);
    if(!result.length||result.some(ring=>ring.length<4||distance(ring[0]!,ring.at(-1)!)>.00001))
      throw Error('形状演算には面を持つ閉じた形を選んでください。');
    // The source's even-odd fill can contain separate island outlines as well as holes.
    return result.map(ring=>ring.map(p=>{const world=mapArtworkPoint(p,input.transform);return [world.x,world.y];}));
  };
  const a=polygon(current),b=polygon(other);
  const imported=await import('polygon-clipping');
  const operations=('default' in imported?imported.default:imported) as typeof imported;
  const rings=(polygon:Polygon)=>{
    const [outer,...rings]=polygon;
    if(!outer)return [];
    return rings.length?operations.xor([outer],...rings.map(ring=>[ring])):[[outer]];
  };
  const groups=operations[mode](rings(a),rings(b));
  const points=groups.flatMap(group=>group.flatMap(ring=>
    ring.slice(0,-1).map(([x,y],index,list):ArtPoint=>({x,y,...(index===0?{move:true}:{}),...(index===list.length-1?{close:true}:{})}))));
  const empty=points.length<3;
  if(empty){
    if(!allowEmpty)throw Error('演算結果に面がありません。');
    // A closed zero-area contour paints no pixels, including with an outline.
    // Keep three anchors for the ordinary path validator and legacy readers.
    points.push({x:0,y:0,move:true},{x:0,y:0},{x:0,y:0,close:true});
  }
  if(points.length>4096)throw Error('演算結果の点が多すぎます。元の形の点数を減らしてください。');
  // Keep copies of both input shapes for later re-editing, without changing how older renderers display the result.
  const {booleanOperands:_ignoredA,...left}=current,{booleanOperands:_ignoredB,...right}=other;
  const {empty:_empty,transform:_transform,...style}=current;
  return {...style,shape:'polyline',closed:false,points,fill:current.fill??current.stroke,
    ...(empty?{empty:true}:{}),booleanOperands:{mode,a:left,b:right}};
}

export function splitPath(path:EditablePath,index:number):EditablePath{
  requireUniformFill(path);
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
  if(JSON.stringify(a.transform)!==JSON.stringify(b.transform))throw Error('異なる変形を持つ線は、そのまま接続できません。');
  requireUniformFill(a);requireUniformFill(b);
  for(const path of [a,b])if(path.closed||path.shape==='rectangle'||path.shape==='ellipse'||path.points.some(point=>point.move||point.close))
    throw Error('接続するには開いた線を2本選んでください。');
  const paths=[[a.points,b.points],[a.points,reversePath(b.points)],
    [reversePath(a.points),b.points],[reversePath(a.points),reversePath(b.points)]] as const;
  const candidates=paths.map(([left,right])=>({left,right,length:distance(left.at(-1)!,right[0]!)}));
  candidates.sort((a,b)=>a.length-b.length);
  const {left,right,length}=candidates[0]!;
  if(!Number.isFinite(maxGap)||maxGap<0||length>maxGap)
    throw Error('2本の端が離れています。まず端の点を近づけてください。');
  const coincident=length<=.000001;
  if(left.length+right.length-(coincident?1:0)>4096)
    throw Error('接続する線の点が多すぎます。点を減らしてください。');
  // Handles on the two sides of a gap belong to the original strokes,
  // not the new bridge. Otherwise the bridge unexpectedly becomes a loop.
  const {outX:_outX,outY:_outY,...leftEnd}=left.at(-1)!;
  const {inX:_inX,inY:_inY,...rightStart}=right[0]!;
  const points=coincident?
    [...left.slice(0,-1),{...leftEnd,...(rightStart.outX===undefined?{}:{outX:rightStart.outX,outY:rightStart.outY})},...right.slice(1)]:
    [...left.slice(0,-1),leftEnd,rightStart,...right.slice(1)];
  return {...a,shape:'bezier',points,fill:null,closed:false};
}

export function eraseBetweenIntersections(path:EditablePath,reference:EditablePath,position:ArtPoint):EditablePath{
  if(path.transform||reference.transform)throw Error('変形を保持した線の交点消去にはまだ対応していません。線全体か区間の消去を使ってください。');
  requireUniformFill(path);
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
