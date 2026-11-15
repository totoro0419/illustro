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

export function polygonOf(path:EditablePath):ArtPoint[]{
  if(path.shape==='rectangle'){
    const a=path.points[0]!,b=path.points.at(-1)!;
    return [a,{x:b.x,y:a.y},b,{x:a.x,y:b.y}];
  }
  if(!path.closed||path.points.length<3||path.points.some(point=>point.inX!==undefined||point.outX!==undefined||point.move))
    throw Error('形の重なりを求めるには、閉じた直線の多角形か長方形を選んでください。');
  return [...path.points];
}
const side=(p:ArtPoint,a:ArtPoint,b:ArtPoint)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
export function intersectPolygons(subject:ArtPoint[],clip:ArtPoint[]){
  if(clip.length<3||subject.length<3)return [];
  const area=clip.reduce((sum,p,i)=>{const next=clip[(i+1)%clip.length]!;return sum+p.x*next.y-p.y*next.x;},0);
  const sign=Math.sign(area);
  if(!sign||clip.some((p,i)=>side(clip[(i+2)%clip.length]!,p,clip[(i+1)%clip.length]!)*sign<0))
    throw Error('重なりの境界に使う形は、へこみのない多角形を選んでください。');
  let result=subject;
  for(let i=0;i<clip.length;i++){
    const a=clip[i]!,b=clip[(i+1)%clip.length]!,input=result;
    result=[];
    if(!input.length)break;
    let previous=input.at(-1)!,prior=side(previous,a,b)*sign;
    for(const point of input){
      const current=side(point,a,b)*sign;
      if((current>=0)!==(prior>=0)){
        const t=prior/(prior-current);
        result.push({x:previous.x+(point.x-previous.x)*t,y:previous.y+(point.y-previous.y)*t});
      }
      if(current>=0)result.push(point);
      previous=point;prior=current;
    }
  }
  return result.filter((point,i)=>i===0||distance(point,result[i-1]!)>.000001);
}
