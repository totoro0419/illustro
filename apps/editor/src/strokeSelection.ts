import type {Point} from './canvasView';

/** BRU-010 initial rectangle mask. Geometry is stored in document pixels. */
export type SelectionRect=Readonly<{x:number;y:number;width:number;height:number}>;

export function rectangleFromPoints(a:Point,b:Point):SelectionRect{
 return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y)};
}
export function selectionContains(rect:SelectionRect,point:Point):boolean{
 return point.x>=rect.x&&point.y>=rect.y&&point.x<=rect.x+rect.width&&point.y<=rect.y+rect.height;
}
export function insetSelection(rect:SelectionRect,padding:number):SelectionRect|null{
 if(!Number.isFinite(padding)||padding<0||rect.width<=padding*2||rect.height<=padding*2)return null;
 return {x:rect.x+padding,y:rect.y+padding,width:rect.width-2*padding,height:rect.height-2*padding};
}
/** From an accepted inside sample, stop at the first selection boundary. */
export function clipSelectionExit(from:Point,to:Point,rect:SelectionRect):Point{
 if(selectionContains(rect,to))return to;
 const dx=to.x-from.x,dy=to.y-from.y;
 let t=1;
 if(dx>0)t=Math.min(t,(rect.x+rect.width-from.x)/dx);
 else if(dx<0)t=Math.min(t,(rect.x-from.x)/dx);
 if(dy>0)t=Math.min(t,(rect.y+rect.height-from.y)/dy);
 else if(dy<0)t=Math.min(t,(rect.y-from.y)/dy);
 t=Math.max(0,Math.min(1,t));
 return {x:from.x+dx*t,y:from.y+dy*t};
}
export function clampSelectionRect(rect:SelectionRect,width:number,height:number):SelectionRect{
 const x=Math.max(0,Math.min(width,rect.x));
 const y=Math.max(0,Math.min(height,rect.y));
 return {x,y,width:Math.max(0,Math.min(width,rect.x+rect.width)-x),height:Math.max(0,Math.min(height,rect.y+rect.height)-y)};
}
