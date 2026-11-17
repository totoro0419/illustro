import {initialTransform,type Transform} from './geometry';

export type GroupTransformOptions=Readonly<{
 dx:number;dy:number;sx:number;sy:number;angle:number;
 interpolation:'nearest'|'bilinear'|'area';
}>;
export type GroupBounds=Readonly<{x:number;y:number;width:number;height:number}>;
export type GroupItem=Readonly<{id:string;bounds:GroupBounds}>;
export type GroupOutline=Readonly<{id:string;before:GroupBounds;after:readonly {x:number;y:number}[]}>;
/** All layers share the same group center and the same transform, so their
 * relative alignment is preserved. No layer's pixels are merged or flattened. */
export function groupTransformPlan(
 items:readonly GroupItem[],width:number,height:number,options:GroupTransformOptions
):{settings:Transform;outlines:GroupOutline[]}{
 if(items.length<2||!items.every(i=>i.bounds.width>0&&i.bounds.height>0))
  throw Error('変形するレイヤーを2枚以上選んでください。');
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
   ![options.dx,options.dy,options.sx,options.sy,options.angle].every(Number.isFinite)||
   Math.abs(options.dx)>8192||Math.abs(options.dy)>8192||
   Math.abs(options.sx)>16||Math.abs(options.sy)>16||
   Math.abs(options.sx)<.001||Math.abs(options.sy)<.001||
   Math.abs(options.angle)>360||!['nearest','bilinear','area'].includes(options.interpolation))
  throw Error('移動・回転・拡縮の値が正しくありません。');
 const x0=Math.min(...items.map(i=>i.bounds.x)),x1=Math.max(...items.map(i=>i.bounds.x+i.bounds.width));
 const y0=Math.min(...items.map(i=>i.bounds.y)),y1=Math.max(...items.map(i=>i.bounds.y+i.bounds.height));
 const cx=(x0+x1)/2,cy=(y0+y1)/2;
 const settings:Transform={...initialTransform,mode:'affine',cx,cy,...options};
 const a=options.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 const apply=(x:number,y:number)=>{
  const dx=(x-cx)*options.sx,dy=(y-cy)*options.sy;
  return {x:cx+options.dx+dx*c-dy*s,y:cy+options.dy+dx*s+dy*c};
 };
 return {settings,outlines:items.map(item=>{
  const {x,y,width:w,height:h}=item.bounds;
  return {id:item.id,before:item.bounds,after:[
   apply(x,y),apply(x+w,y),apply(x+w,y+h),apply(x,y+h)
  ]};
 })};
}
