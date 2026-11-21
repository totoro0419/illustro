import {composeArtworkAffine,validateEditableArtwork,type EditableArtwork,type ArtworkAffine} from '@illustro/core';
import {initialTransform,type Transform} from './geometry';

export type GroupTransformOptions=Readonly<{
 dx:number;dy:number;sx:number;sy:number;angle:number;
 interpolation:'nearest'|'bilinear'|'area';
}>;
export type GroupBounds=Readonly<{x:number;y:number;width:number;height:number}>;
export type GroupItem=Readonly<{id:string;bounds:GroupBounds}>;
export type GroupOutline=Readonly<{id:string;before:GroupBounds;after:readonly {x:number;y:number}[]}>;
/** Compose from the original image rather than filtering already resampled
 * pixels again. Rotation + two scales + X shear represents any invertible 2D
 * affine matrix, including mirrored layers. */
export function composeGroupAffine(previous:Transform,next:Transform):Transform{
 if(previous.mode!=='affine'||next.mode!=='affine')throw Error('この変形は移動・回転・拡縮ではありません。');
 const matrix=(t:Transform)=>{
   const angle=t.angle*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
   const a=c*t.sx,b=c*t.shear-s*t.sy,d=s*t.shear+c*t.sy,e=s*t.sx;
   return {a,b,c:e,d,x:t.cx+t.dx-a*t.cx-b*t.cy,y:t.cy+t.dy-e*t.cx-d*t.cy};
 };
 const p=matrix(previous),n=matrix(next);
 const a=n.a*p.a+n.b*p.c,b=n.a*p.b+n.b*p.d;
 const c=n.c*p.a+n.d*p.c,d=n.c*p.b+n.d*p.d;
 const x=n.a*p.x+n.b*p.y+n.x,y=n.c*p.x+n.d*p.y+n.y;
 const sx=Math.hypot(a,c),sy=(a*d-b*c)/sx;
 if(![a,b,c,d,x,y,sx,sy].every(Number.isFinite)||
   Math.abs(sx)<.001||Math.abs(sy)<.001||Math.abs(sx*sy)<1e-12)
   throw Error('変形の倍率が小さすぎます。');
 const cx=previous.cx,cy=previous.cy;
 if(Math.abs(sx)>16||Math.abs(sy)>16||Math.abs((a*b+c*d)/sx)>4)
   throw Error('重ねた変形が倍率・傾きの上限を超えます。変形量を小さくしてください。');
 const dx=x+a*cx+b*cy-cx,dy=y+c*cx+d*cy-cy;
 const shear=(a*b+c*d)/sx,angle=Math.atan2(c,a)*180/Math.PI;
 if(![dx,dy,shear,angle].every(Number.isFinite))
   throw Error('重ねた変形の座標が正しくありません。');
 return {...initialTransform,mode:'affine',cx,cy,
   dx,dy,sx,sy,angle,shear,interpolation:next.interpolation};
}
/** All layers share the same group center and the same transform, so their
 * relative alignment is preserved. No layer's pixels are merged or flattened. */
export function groupTransformPlan(
 items:readonly GroupItem[],width:number,height:number,options:GroupTransformOptions
):{settings:Transform;outlines:GroupOutline[]}{
 if(items.length<2)
  throw Error('変形するレイヤーを2枚以上選んでください。');
 if(!items.every(i=>i.id.length>0&&
   [i.bounds.x,i.bounds.y,i.bounds.width,i.bounds.height,
    i.bounds.x+i.bounds.width,i.bounds.y+i.bounds.height].every(Number.isFinite)&&
   i.bounds.width>0&&i.bounds.height>0))
  throw Error('変形するレイヤーの範囲が正しくありません。');
 if(new Set(items.map(i=>i.id)).size!==items.length)
  throw Error('同じレイヤーを重複して変形できません。');
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
   ![options.dx,options.dy,options.sx,options.sy,options.angle].every(Number.isFinite)||
   Math.abs(options.dx)>8192||Math.abs(options.dy)>8192||
   Math.abs(options.sx)>16||Math.abs(options.sy)>16||
   Math.abs(options.sx)<.001||Math.abs(options.sy)<.001||
   Math.abs(options.angle)>360||!['nearest','bilinear','area'].includes(options.interpolation))
  throw Error('移動・回転・拡縮の値が正しくありません。');
 // Accumulate without spreading all layer bounds onto the JS call stack.
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(const {bounds} of items){
  x0=Math.min(x0,bounds.x);y0=Math.min(y0,bounds.y);
  x1=Math.max(x1,bounds.x+bounds.width);
  y1=Math.max(y1,bounds.y+bounds.height);
 }
 // Halving before addition also avoids overflow for large finite coordinates.
 const cx=x0/2+x1/2,cy=y0/2+y1/2;
 if(!Number.isFinite(cx)||!Number.isFinite(cy))
  throw Error('変形するレイヤーの中心が正しくありません。');
 const settings:Transform={...initialTransform,mode:'affine',cx,cy,...options};
 const a=options.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 const apply=(x:number,y:number)=>{
  const dx=(x-cx)*options.sx,dy=(y-cy)*options.sy;
  return {x:cx+options.dx+dx*c-dy*s,y:cy+options.dy+dx*s+dy*c};
 };
 const outlines=items.map(item=>{
  const {x,y,width:w,height:h}=item.bounds;
  return {id:item.id,before:item.bounds,after:[
   apply(x,y),apply(x+w,y),apply(x+w,y+h),apply(x,y+h)
  ]};
 });
 if(outlines.some(item=>item.after.some(point=>!Number.isFinite(point.x)||!Number.isFinite(point.y))))
  throw Error('変形後のレイヤー座標が正しくありません。');
 return {settings,outlines};
}

/** Same world-space affine used by image resampling, applied to native geometry. */
export function editableGroupTransform(content:EditableArtwork,settings:Transform):EditableArtwork{
 if(content.kind==='gradient')throw Error('グラデーションは色の広がりを保つため、専用画面で個別に編集してください。');
 if(content.kind==='path'&&content.booleanOperands?.sourceLayerIds)
   throw Error('連動する図形演算の結果は、元の図形を選んで変形してください。');
 if(settings.mode!=='affine')throw Error('図形と文字をまとめて編集できるのは移動・回転・拡縮です。');
 const angle=settings.angle*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 const a=c*settings.sx,b=s*settings.sx,cc=c*settings.shear-s*settings.sy,d=s*settings.shear+c*settings.sy;
 const matrix:ArtworkAffine={a,b,c:cc,d,e:settings.cx+settings.dx-a*settings.cx-cc*settings.cy,
   f:settings.cy+settings.dy-b*settings.cx-d*settings.cy};
 return validateEditableArtwork({...content,transform:composeArtworkAffine(matrix,content.transform)})!;
}
