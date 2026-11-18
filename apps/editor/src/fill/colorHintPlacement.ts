import type {ColorHint} from '@illustro/core';
import type {Point} from '../transform/geometry';

/** Translate an existing color hint without stretching its line when its
 * center reaches the image border. Both touch/pen dragging and tap relocation
 * use this same pure operation. */
export function moveColorHint(hint:ColorHint,center:Point,width:number,height:number):ColorHint{
 if(!hint.points.length||!Number.isFinite(center.x)||!Number.isFinite(center.y)||
   !Number.isSafeInteger(width)||width<1||!Number.isSafeInteger(height)||height<1)
   throw Error('色指示の位置を変更できません。');
 const points=hint.points;
 const old={x:points.reduce((sum,p)=>sum+p.x,0)/points.length,
   y:points.reduce((sum,p)=>sum+p.y,0)/points.length};
 const bounds={left:Math.min(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),
   right:Math.max(...points.map(p=>p.x)),bottom:Math.max(...points.map(p=>p.y))};
 const dx=Math.max(-bounds.left,Math.min(width-1-bounds.right,center.x-old.x));
 const dy=Math.max(-bounds.top,Math.min(height-1-bounds.bottom,center.y-old.y));
 return {...hint,points:points.map(point=>({...point,x:point.x+dx,y:point.y+dy}))};
}
export function colorHintCenter(hint:ColorHint):Point{
 if(!hint.points.length)throw Error('色指示に線がありません。');
 return {x:hint.points.reduce((a,p)=>a+p.x,0)/hint.points.length,
   y:hint.points.reduce((a,p)=>a+p.y,0)/hint.points.length};
}
