import type {LayerId,TransformBounds,TransformPoint} from '@illustro/core';

export type LayoutItem=Readonly<{id:LayerId;name:string;bounds:TransformBounds;fixed:boolean}>;
export type LayoutMove=Readonly<{item:LayoutItem;dx:number;dy:number}>;
export type Arrangement='left'|'center-x'|'right'|'top'|'center-y'|'bottom'|'spread-x'|'spread-y';
export type SnapMark=Readonly<{value:number;name:string}>;
export type SnapTargets=Readonly<{x:readonly SnapMark[];y:readonly SnapMark[]}>;
export function alignLayers(items:readonly LayoutItem[],reference:LayoutItem,operation:Arrangement):readonly LayoutMove[]{
  const horizontal=['left','center-x','right','spread-x'].includes(operation);
  const component=horizontal?'x':'y',size=horizontal?'width':'height';
  const coordinates=items.map(item=>({item,start:item.bounds[component],size:item.bounds[size]}));
  const shift=(item:LayoutItem,distance:number)=>({item,dx:horizontal?distance:0,dy:horizontal?0:distance});
  if(operation.startsWith('spread')){
    if(coordinates.length<3)throw Error('均等に並べるにはレイヤーを3枚以上選んでください。');
    coordinates.sort((a,b)=>a.start-b.start);
    const last=coordinates.at(-1)!,first=coordinates[0]!;
    const gap=(last.start+last.size-first.start-coordinates.reduce((sum,item)=>sum+item.size,0))/(coordinates.length-1);
    let position=first.start;
    const moves=coordinates.map(({item,start,size},index)=>{
      const distance=index===0||index===coordinates.length-1?0:position-start;
      position+=size+gap;
      return shift(item,distance);
    });
    if(moves.some(move=>move.item.fixed&&(move.dx||move.dy)))
      throw Error('均等配置で移動するレイヤーのロックを解除してください。');
    return moves;
  }
  const fraction=operation.startsWith('center')?.5:operation==='right'||operation==='bottom'?1:0;
  const anchor=reference.bounds[component]+reference.bounds[size]*fraction;
  const moves=coordinates.map(({item,start,size})=>shift(item,item.id===reference.id?0:anchor-start-size*fraction));
  if(moves.some(move=>move.item.fixed&&(move.dx||move.dy)))throw Error('移動するレイヤーのロックを解除してください。');
  return moves;
}
export function snapLayout(point:TransformPoint,bounds:TransformBounds|null,targets:SnapTargets,threshold:number,pixels:boolean){
  const snap=(value:number,axis:'x'|'y')=>{
    const values=bounds?[
      value+bounds[axis],value+bounds[axis]+bounds[axis==='x'?'width':'height']/2,
      value+bounds[axis]+bounds[axis==='x'?'width':'height']
    ]:[value];
    let mark=pixels?Math.round(values[0]!):undefined,delta=pixels?Math.round(values[0]!)-values[0]!:0,label=pixels?'画素':'',distance=threshold+.0001;
    for(const anchor of values)for(const target of targets[axis]){
      const offset=target.value-anchor;
      if(Math.abs(offset)<distance){distance=Math.abs(offset);delta=offset;label=target.name;mark=target.value;}
    }
    return {value:value+delta,label,delta,mark};
  };
  return {x:snap(point.x,'x'),y:snap(point.y,'y')};
}
