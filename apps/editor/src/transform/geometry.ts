import type {LiquifyStroke,TransformBounds,TransformMesh,TransformQuad} from '@illustro/core';
import {quadrilateralMapping} from './quadrilateral';
import {meshMapping} from './mesh';
import {liquifyMapping} from './liquify';
import type {MaskData} from '../selection/mask';

export type Point={x:number;y:number};
export type Deform='affine'|'perspective'|'free'|'projective'|'skew'|'mesh-grid'|'cage'|'liquify'|'mesh'|'push'|'expand'|'pinch'|'twist'|'restore';
export type Transform=Readonly<{
  mode:Deform;dx:number;dy:number;sx:number;sy:number;angle:number;shear:number;
  perspective:number;warpX:number;warpY:number;cx:number;cy:number;radius:number;strength:number;
  interpolation:'nearest'|'bilinear'|'area';
  liquify?:readonly LiquifyStroke[];
  mesh?:Readonly<{bounds:TransformBounds;controls:TransformMesh}>;
  quadrilateral?:Readonly<{bounds:TransformBounds;corners:TransformQuad}>;
}>;
export const initialTransform:Transform={mode:'affine',dx:0,dy:0,sx:1,sy:1,angle:0,shear:0,
  perspective:0,warpX:0,warpY:0,cx:0,cy:0,radius:80,strength:.35,interpolation:'bilinear'};

export function cornerMode(mode:Deform):mode is 'free'|'projective'|'skew'{
  return mode==='free'||mode==='projective'||mode==='skew';
}

export function meshMode(mode:Deform):mode is 'mesh-grid'|'cage'{
  return mode==='mesh-grid'||mode==='cage';
}
export function inverseTransform(t:Transform,width:number,height:number){
  if(t.mode==='liquify')return liquifyMapping(t.liquify??[]).inverse;
  if(meshMode(t.mode)){
    if(!t.mesh)throw Error('変形の制御点を指定してください。');
    return meshMapping(t.mesh.bounds,t.mesh.controls).inverse;
  }
  if(cornerMode(t.mode)){
    if(!t.quadrilateral)throw Error('変形する四隅を指定してください。');
    return quadrilateralMapping(t.quadrilateral.bounds,t.quadrilateral.corners,t.mode).inverse;
  }
  const cos=Math.cos(t.angle*Math.PI/180),sin=Math.sin(t.angle*Math.PI/180);
  if(!t.sx||!t.sy||!Number.isFinite(t.sx*t.sy))throw Error('縦と横の倍率を0以外にしてください。');
  if(t.mode==='perspective'&&Math.abs(t.perspective)>=.8)throw Error('遠近の強さを80%未満にしてください。');
  if(t.mode==='mesh'&&(Math.abs(t.warpX)>=width/4||Math.abs(t.warpY)>=height/4))
    throw Error('折り重ならないように中央の移動量を小さくしてください。');
  if(t.mode==='mesh')return (x:number,y:number):Point=>{
    const weight=(x:number,y:number)=>Math.max(0,1-Math.abs(2*x/width-1))*Math.max(0,1-Math.abs(2*y/height-1));
    let sx=x,sy=y;
    for(let i=0;i<18;i++){
      const w=weight(sx,sy);
      sx=x-t.warpX*w;sy=y-t.warpY*w;
    }
    return {x:sx,y:sy};
  };
  if(t.mode!=='affine'&&t.mode!=='perspective')return (x:number,y:number):Point=>{
    const dx=x-t.cx,dy=y-t.cy,r=Math.max(1,t.radius),d=Math.hypot(dx,dy);
    if(d>=r||t.mode==='restore')return {x,y};
    const a=(1-d/r)**2*t.strength;
    if(t.mode==='push')return {x:x-t.warpX*a,y:y-t.warpY*a};
    if(t.mode==='expand')return {x:x-dx*a,y:y-dy*a};
    if(t.mode==='pinch')return {x:x+dx*a,y:y+dy*a};
    return {x:t.cx+dx*Math.cos(a)-dy*Math.sin(a),y:t.cy+dx*Math.sin(a)+dy*Math.cos(a)};
  };
  return (x:number,y:number):Point=>{
    const dx=x-t.cx-t.dx,dy=y-t.cy-t.dy;
    let u=(dx*cos+dy*sin),v=(-dx*sin+dy*cos)/t.sy;
    u=(u-t.shear*v)/t.sx;
    if(t.mode==='perspective'){
      const divisor=1-t.perspective*v/Math.max(1,height);
      if(divisor<=.0001)return {x:-1,y:-1};
      u/=divisor;v/=divisor;
    }
    return {x:u+t.cx,y:v+t.cy};
  };
}

type Pixel=readonly [number,number,number,number];
const empty:Pixel=[0,0,0,0];
function sample(source:Uint8Array,width:number,height:number,x:number,y:number,mask:MaskData|null):Pixel{
  const px=Math.floor(x),py=Math.floor(y);
  if(!Number.isFinite(px)||!Number.isFinite(py)||px<0||py<0||px>=width||py>=height)return empty;
  const index=py*width+px,at=index*4,a=source[at+3]!/255*(mask?mask.alpha[index]!/255:1);
  return [source[at]!*a,source[at+1]!*a,source[at+2]!*a,a];
}

/** Exact box area coverage for axis-aligned affine shrinking. The work is
 * proportional to the source pixels covered by each output cell, so a 32x
 * reduction doesn't silently skip 3 out of 4 source columns as an 8x8
 * fixed-grid supersample would. No document-sized integral-image buffers. */
function sampleAreaBox(source:Uint8Array,width:number,height:number,
 x0:number,y0:number,x1:number,y1:number,mask:MaskData|null):Pixel{
 const left=Math.min(x0,x1),right=Math.max(x0,x1);
 const top=Math.min(y0,y1),bottom=Math.max(y0,y1);
 const area=(right-left)*(bottom-top);
 if(!Number.isFinite(area)||area<=0)return empty;
 const startX=Math.max(0,Math.floor(left)),endX=Math.min(width,Math.ceil(right));
 const startY=Math.max(0,Math.floor(top)),endY=Math.min(height,Math.ceil(bottom));
 if(startX>=endX||startY>=endY)return empty;
 let red=0,green=0,blue=0,alpha=0;
 const inverseArea=1/area;
 for(let y=startY;y<endY;y++){
  const overlapY=Math.max(0,Math.min(y+1,bottom)-Math.max(y,top));
  for(let x=startX;x<endX;x++){
   const overlapX=Math.max(0,Math.min(x+1,right)-Math.max(x,left));
   if(overlapX<=0||overlapY<=0)continue;
   const index=y*width+x,at=index*4;
   const a=source[at+3]!/255*(mask?mask.alpha[index]!/255:1);
   const contribution=overlapX*overlapY*inverseArea*a;
   red+=source[at]!*contribution;
   green+=source[at+1]!*contribution;
   blue+=source[at+2]!*contribution;
   alpha+=contribution;
  }
 }
 return [red,green,blue,alpha];
}
export function transformRaster(source:Uint8Array,width:number,height:number,t:Transform,selection:MaskData|null=null,
  previewWidth=width,previewHeight=height,showProtection=false){
  if(source.length!==width*height*4)throw Error('変形する画像の大きさが一致しません。');
  const warp=t.mode==='liquify'?liquifyMapping(t.liquify??[]):null;
  const inverse=warp?.inverse??inverseTransform(t,width,height),out=new Uint8ClampedArray(previewWidth*previewHeight*4);
  const sx=width/previewWidth,sy=height/previewHeight;
  const exactArea=t.interpolation==='area'&&t.mode==='affine'&&t.angle%360===0&&t.shear===0;
  const read=(x:number,y:number):Pixel=>{
    if(!Number.isFinite(x)||!Number.isFinite(y))return empty;
    if(t.interpolation==='nearest')return sample(source,width,height,x,y,selection);
    const left=Math.floor(x-.5),top=Math.floor(y-.5),dx=x-left-.5,dy=y-top-.5;
    const a=sample(source,width,height,left,top,selection),b=sample(source,width,height,left+1,top,selection);
    const c=sample(source,width,height,left,top+1,selection),d=sample(source,width,height,left+1,top+1,selection);
    const channel=(i:0|1|2|3)=>(a[i]*(1-dx)+b[i]*dx)*(1-dy)+(c[i]*(1-dx)+d[i]*dx)*dy;
    return [channel(0),channel(1),channel(2),channel(3)];
  };
  // Four fixed samples alias badly at 8x or larger reductions (e.g. checkerboards).
  // Increase the sample grid only when the user chooses high-quality area filtering;
  // cap it to keep CPU and preview latency bounded.
  const reduction=t.mode==='affine'?Math.max(1,1/Math.max(1e-6,Math.abs(t.sx)),1/Math.max(1e-6,Math.abs(t.sy))):1;
  const samples=t.interpolation==='area'?Math.min(8,Math.max(4,Math.ceil(Math.max(sx,sy)*reduction))):1;
  const area=t.interpolation==='area'?Array.from({length:samples},(_,index)=>(index+.5)/samples-.5):[0];
  for(let y=0;y<previewHeight;y++)for(let x=0;x<previewWidth;x++){
    const px=(x+.5)*sx,py=(y+.5)*sy,index=(y*previewWidth+x)*4;
    let red=0,green=0,blue=0,alpha=0;
    if(exactArea){
      const topLeft=inverse(px-sx/2,py-sy/2),bottomRight=inverse(px+sx/2,py+sy/2);
      const value=sampleAreaBox(source,width,height,topLeft.x,topLeft.y,bottomRight.x,bottomRight.y,selection);
      red=value[0];green=value[1];blue=value[2];alpha=value[3];
    }else{
      for(const oy of area)for(const ox of area){
        const p=inverse(px+ox*sx,py+oy*sy),value=read(p.x,p.y);
        red+=value[0];green+=value[1];blue+=value[2];alpha+=value[3];
      }
      const n=area.length**2;
      red/=n;green/=n;blue/=n;alpha/=n;
    }
    if(selection){
      const base=sample(source,width,height,px,py,null);
      const amount=selection.alpha[Math.floor(py)*width+Math.floor(px)]!/255;
      // The moved pixels and original pixels occupy complementary portions of the source selection.
      const remaining=1-amount;
      const uncovered=Math.min(1-alpha,remaining);
      red+=base[0]*uncovered;green+=base[1]*uncovered;blue+=base[2]*uncovered;alpha+=base[3]*uncovered;
    }
    const protection=showProtection&&warp?warp.coverage(px,py)*.43:0;
    if(protection){
      red=red*(1-protection)+40*protection;
      green=green*(1-protection)+145*protection;
      blue=blue*(1-protection)+240*protection;
      alpha=alpha*(1-protection)+protection;
    }
    if(alpha>0){out[index]=red/alpha;out[index+1]=green/alpha;out[index+2]=blue/alpha;out[index+3]=alpha*255;}
  }
  return out;
}
