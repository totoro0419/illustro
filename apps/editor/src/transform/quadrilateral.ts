import type {TransformBounds,TransformPoint,TransformQuad} from '@illustro/core';

type Point=TransformPoint;
type Matrix=readonly [number,number,number,number,number,number,number,number,number];
const subtract=(a:Point,b:Point)=>({x:a.x-b.x,y:a.y-b.y});
const cross=(a:Point,b:Point)=>a.x*b.y-a.y*b.x;

export function rectCorners(box:TransformBounds):TransformQuad{
  const {x,y,width,height}=box;
  return [{x,y},{x:x+width,y},{x:x+width,y:y+height},{x,y:y+height}];
}

export function validQuadrilateral(corners:TransformQuad){
  const turns=corners.map((point,index)=>cross(
    subtract(corners[(index+1)%4]!,point),
    subtract(corners[(index+2)%4]!,corners[(index+1)%4]!)
  ));
  if(corners.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))||
    !(turns.every(turn=>turn>.002)||turns.every(turn=>turn<-.002)))
    throw Error('角が交差したか、角同士が近すぎます。四隅を順に並べてください。');
}

function invert(matrix:Matrix):Matrix{
  const [a,b,c,d,e,f,g,h,i]=matrix;
  const inverse:Matrix=[e*i-f*h,c*h-b*i,b*f-c*e,f*g-d*i,a*i-c*g,c*d-a*f,d*h-e*g,b*g-a*h,a*e-b*d];
  const det=a*inverse[0]+b*inverse[3]+c*inverse[6];
  if(Math.abs(det)<1e-12||!Number.isFinite(det))throw Error('元に戻せない遠近変形です。');
  return inverse;
}

function matrixPoint(matrix:Matrix,x:number,y:number):Point{
  const [a,b,c,d,e,f,g,h,i]=matrix,w=g*x+h*y+i;
  if(Math.abs(w)<1e-10)return {x:Infinity,y:Infinity};
  return {x:(a*x+b*y+c)/w,y:(d*x+e*y+f)/w};
}

export function quadrilateralMapping(box:TransformBounds,corners:TransformQuad,mode:'free'|'projective'|'skew'){
  validQuadrilateral(corners);
  const [a,b,c,d]=corners;
  const ab=subtract(b,a),ad=subtract(d,a),bend=subtract(subtract(c,d),ab);
  const minX=Math.min(...corners.map(p=>p.x))-1,maxX=Math.max(...corners.map(p=>p.x))+1;
  const minY=Math.min(...corners.map(p=>p.y))-1,maxY=Math.max(...corners.map(p=>p.y))+1;
  const outside={x:-Infinity,y:-Infinity};
  const drawBox=(u:number,v:number)=>({x:box.x+u*box.width,y:box.y+v*box.height});
  const sourceBox=(x:number,y:number)=>({x:(x-box.x)/box.width,y:(y-box.y)/box.height});
  const missing=(x:number,y:number)=>x<minX||x>maxX||y<minY||y>maxY;
  if(mode!=='free'){
    const bc=subtract(b,c),dc=subtract(d,c),det=cross(bc,dc);
    const g=cross(bend,dc)/det,h=cross(bc,bend)/det;
    if([1+g,1+h,1+g+h].some(w=>w<=1e-8))throw Error('遠近変形が消失点をまたいでいます。');
    const matrix:Matrix=[ab.x+g*b.x,ad.x+h*d.x,a.x,ab.y+g*b.y,ad.y+h*d.y,a.y,g,h,1];
    const reversed=invert(matrix);
    return {
      forward:(x:number,y:number)=>{const p=sourceBox(x,y);return matrixPoint(matrix,p.x,p.y);},
      inverse:(x:number,y:number,limit=true)=>{
        if(limit&&missing(x,y))return outside;
        const p=matrixPoint(reversed,x,y);
        return drawBox(p.x,p.y);
      }
    };
  }
  const draw=(u:number,v:number)=>({
    x:a.x+ab.x*u+ad.x*v+bend.x*u*v,y:a.y+ab.y*u+ad.y*v+bend.y*u*v
  });
  return {
    forward:(x:number,y:number)=>{const p=sourceBox(x,y);return draw(p.x,p.y);},
    inverse:(x:number,y:number,limit=true)=>{
      if(limit&&missing(x,y))return outside;
      let u=.5,v=.5;
      for(let iteration=0;iteration<14;iteration++){
        const p=draw(u,v),error={x:p.x-x,y:p.y-y};
        if(Math.abs(error.x)+Math.abs(error.y)<1e-6)return drawBox(u,v);
        const du={x:ab.x+bend.x*v,y:ab.y+bend.y*v},dv={x:ad.x+bend.x*u,y:ad.y+bend.y*u};
        const det=cross(du,dv);
        if(Math.abs(det)<1e-10)return outside;
        u-=cross(error,dv)/det;v-=cross(du,error)/det;
      }
      return outside;
    }
  };
}

export function alphaBounds(pixels:Uint8Array,width:number,height:number):TransformBounds|null{
  let left=width,top=height,right=0,bottom=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(!pixels[(y*width+x)*4+3])continue;
    left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);
  }
  return right&&bottom?{x:left,y:top,width:right-left,height:bottom-top}:null;
}

export function cornersTowardVanishingPoint(corners:TransformQuad,point:Point):TransformQuad{
  const [topLeft,topRight,bottomRight,bottomLeft]=corners;
  const upperMiddle={x:(topLeft.x+topRight.x)/2,y:(topLeft.y+topRight.y)/2};
  const lowerMiddle={x:(bottomLeft.x+bottomRight.x)/2,y:(bottomLeft.y+bottomRight.y)/2};
  const vertical=subtract(upperMiddle,lowerMiddle),direction=subtract(point,lowerMiddle);
  const along=(direction.x*vertical.x+direction.y*vertical.y)/(direction.x**2+direction.y**2);
  if(!Number.isFinite(along)||along<=0||along>=.99)throw Error('消失点は、絞りたい上辺より奥に置いてください。');
  const toward=(corner:Point)=>({x:corner.x+(point.x-corner.x)*along,y:corner.y+(point.y-corner.y)*along});
  return [toward(bottomLeft),toward(bottomRight),bottomRight,bottomLeft];
}
