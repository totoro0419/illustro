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

function polygonArea(points:readonly Point[]){
 if(points.length<3)return 0;
 const origin=points[0]!;
 let twice=0;
 for(let i=1;i<points.length-1;i++){
   const a=points[i]!,b=points[i+1]!;
   twice+=(a.x-origin.x)*(b.y-origin.y)-(a.y-origin.y)*(b.x-origin.x);
 }
 return twice/2;
}
/** Exact source-pixel coverage of an affine output pixel (a parallelogram).
 * Unlike a fixed sampling grid this cannot skip repeating stripes at strong
 * reductions. Fully covered cells avoid polygon clipping and allocations. */
function sampleAreaQuad(source:Uint8Array,width:number,height:number,quad:readonly Point[],mask:MaskData|null):Pixel{
 const signedArea=polygonArea(quad),area=Math.abs(signedArea);
 if(!Number.isFinite(area)||area<=0)return empty;
 const x0=Math.max(0,Math.floor(Math.min(...quad.map(p=>p.x))));
 const x1=Math.min(width,Math.ceil(Math.max(...quad.map(p=>p.x))));
 const y0=Math.max(0,Math.floor(Math.min(...quad.map(p=>p.y))));
 const y1=Math.min(height,Math.ceil(Math.max(...quad.map(p=>p.y))));
 if(x0>=x1||y0>=y1)return empty;
 const sign=Math.sign(signedArea);
 const edges=quad.map((p,i)=>{
   const q=quad[(i+1)%quad.length]!,dx=q.x-p.x,dy=q.y-p.y;
   return {a:-dy*sign,b:dx*sign,c:(dy*p.x-dx*p.y)*sign};
 });
 const clip=(points:readonly Point[],axis:'x'|'y',bound:number,greater:boolean)=>{
   const out:Point[]=[];
   for(let i=0;i<points.length;i++){
     const a=points[i]!,b=points[(i+1)%points.length]!;
     const inside=greater?a[axis]>=bound:a[axis]<=bound;
     const next=greater?b[axis]>=bound:b[axis]<=bound;
     if(inside)out.push(a);
     if(inside!==next){
       const t=(bound-a[axis])/(b[axis]-a[axis]);
       out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
     }
   }
   return out;
 };
 let red=0,green=0,blue=0,alpha=0;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
   const at=y*width+x,opacity=source[at*4+3]!/255*(mask?mask.alpha[at]!/255:1);
   if(!opacity)continue;
   let full=true,outside=false;
   for(const {a,b,c} of edges){
     const max=a*(a>=0?x+1:x)+b*(b>=0?y+1:y)+c;
     if(max<=0){outside=true;break;}
     const min=a*(a>=0?x:x+1)+b*(b>=0?y:y+1)+c;
     if(min<0)full=false;
   }
   if(outside)continue;
   const coverage=full?1:Math.min(1,Math.abs(polygonArea(
     clip(clip(clip(clip(quad,'x',x,true),'x',x+1,false),'y',y,true),'y',y+1,false)
   )));
   const contribution=coverage/area*opacity;
   red+=source[at*4]!*contribution;green+=source[at*4+1]!*contribution;
   blue+=source[at*4+2]!*contribution;alpha+=contribution;
 }
 return [red,green,blue,alpha];
}

/** Integrate locally linear source footprints, subdividing curved mappings.
 * Unlike a fixed 8×8 point grid, a footprint includes every covered source
 * pixel even at a strong reduction. Curvature is bounded to .125 source px
 * where possible, with four subdivisions limiting extreme-warp work. */
function sampleWarpArea(source:Uint8Array,width:number,height:number,mask:MaskData|null,
 inverse:(x:number,y:number)=>Point,read:(x:number,y:number)=>Pixel,
 left:number,top:number,right:number,bottom:number,depth=0):Pixel{
 const mx=(left+right)/2,my=(top+bottom)/2;
 const corners=[inverse(left,top),inverse(right,top),inverse(right,bottom),inverse(left,bottom)];
 const mids=[inverse(mx,top),inverse(right,my),inverse(mx,bottom),inverse(left,my),inverse(mx,my)];
 const finite=corners.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
 let error=finite?0:Infinity;
 if(finite){
  for(let i=0;i<4;i++){
   const a=corners[i]!,b=corners[(i+1)%4]!,mid=mids[i]!;
   error=Math.max(error,Math.hypot(mid.x-(a.x+b.x)/2,mid.y-(a.y+b.y)/2));
  }
  const center=mids[4]!;
  error=Math.max(error,Math.hypot(center.x-corners.reduce((sum,p)=>sum+p.x,0)/4,
   center.y-corners.reduce((sum,p)=>sum+p.y,0)/4));
  // A fold or an invalid midpoint cannot be treated as a convex footprint.
  let sign=0;
  for(let i=0;i<4;i++){
   const a=corners[i]!,b=corners[(i+1)%4]!,c=corners[(i+2)%4]!;
   const cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
   if(cross&&sign&&Math.sign(cross)!==sign){error=Infinity;break;}
   if(cross)sign=Math.sign(cross);
  }
 }
 if(finite&&Number.isFinite(error)&&error<=.125)
  return sampleAreaQuad(source,width,height,corners,mask);
 if(depth>=4){
  if(finite&&Number.isFinite(error))return sampleAreaQuad(source,width,height,corners,mask);
  const center=mids[4]!;
  return read(center.x,center.y);
 }
 // Entirely unmapped cells outside quadrilateral/mesh bounds need no recursion.
 if(!finite&&[...corners,...mids].every(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return empty;
 const cells=[sampleWarpArea(source,width,height,mask,inverse,read,left,top,mx,my,depth+1),
  sampleWarpArea(source,width,height,mask,inverse,read,mx,top,right,my,depth+1),
  sampleWarpArea(source,width,height,mask,inverse,read,mx,my,right,bottom,depth+1),
  sampleWarpArea(source,width,height,mask,inverse,read,left,my,mx,bottom,depth+1)];
 const channel=(index:0|1|2|3)=>cells.reduce((sum,p)=>sum+p[index],0)/4;
 return [channel(0),channel(1),channel(2),channel(3)];
}
export function transformRaster(source:Uint8Array,width:number,height:number,t:Transform,selection:MaskData|null=null,
  previewWidth=width,previewHeight=height,showProtection=false){
  if(source.length!==width*height*4)throw Error('変形する画像の大きさが一致しません。');
  const warp=t.mode==='liquify'?liquifyMapping(t.liquify??[]):null;
  const inverse=warp?.inverse??inverseTransform(t,width,height),out=new Uint8ClampedArray(previewWidth*previewHeight*4);
  const sx=width/previewWidth,sy=height/previewHeight;
  const affineArea=t.interpolation==='area'&&t.mode==='affine';
  const exactArea=affineArea&&t.angle%90===0&&t.shear===0;
  const read=(x:number,y:number):Pixel=>{
    if(!Number.isFinite(x)||!Number.isFinite(y))return empty;
    if(t.interpolation==='nearest')return sample(source,width,height,x,y,selection);
    const left=Math.floor(x-.5),top=Math.floor(y-.5),dx=x-left-.5,dy=y-top-.5;
    const a=sample(source,width,height,left,top,selection),b=sample(source,width,height,left+1,top,selection);
    const c=sample(source,width,height,left,top+1,selection),d=sample(source,width,height,left+1,top+1,selection);
    const channel=(i:0|1|2|3)=>(a[i]*(1-dx)+b[i]*dx)*(1-dy)+(c[i]*(1-dx)+d[i]*dx)*dy;
    return [channel(0),channel(1),channel(2),channel(3)];
  };
  for(let y=0;y<previewHeight;y++)for(let x=0;x<previewWidth;x++){
    const px=(x+.5)*sx,py=(y+.5)*sy,index=(y*previewWidth+x)*4;
    let red=0,green=0,blue=0,alpha=0;
    if(exactArea){
      const topLeft=inverse(px-sx/2,py-sy/2),bottomRight=inverse(px+sx/2,py+sy/2);
      const value=sampleAreaBox(source,width,height,topLeft.x,topLeft.y,bottomRight.x,bottomRight.y,selection);
      red=value[0];green=value[1];blue=value[2];alpha=value[3];
    }else if(affineArea){
      const value=sampleAreaQuad(source,width,height,[
        inverse(px-sx/2,py-sy/2),inverse(px+sx/2,py-sy/2),
        inverse(px+sx/2,py+sy/2),inverse(px-sx/2,py+sy/2)
      ],selection);
      red=value[0];green=value[1];blue=value[2];alpha=value[3];
    }else if(t.interpolation==='area'){
      const value=sampleWarpArea(source,width,height,selection,inverse,read,px-sx/2,py-sy/2,px+sx/2,py+sy/2);
      red=value[0];green=value[1];blue=value[2];alpha=value[3];
    }else{
      const p=inverse(px,py),value=read(p.x,p.y);
      red=value[0];green=value[1];blue=value[2];alpha=value[3];
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
