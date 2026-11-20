import {mapArtworkPoint,inverseArtworkAffine,type ArtPoint,type EditablePath} from '@illustro/core';

export type VectorDragHandle=Readonly<{index:number;kind:'in'|'out'}>;

/** Shared preview/commit geometry: moving an anchor also moves its Bezier handles. */
export function vectorPointDrag(path:EditablePath,picked:number,anchorCount:number,
  handles:readonly VectorDragHandle[],position:Readonly<{x:number;y:number}>):EditablePath{
  if(!Number.isFinite(position.x)||!Number.isFinite(position.y))
    throw Error('点の位置が正しくありません。');
  if(path.transform)position=mapArtworkPoint(position,inverseArtworkAffine(path.transform));
  const points:ArtPoint[]=[...path.points];
  if(picked>=0&&picked<anchorCount){
    const previous=points[picked];
    if(!previous)throw Error('編集する点が見つかりません。');
    const dx=position.x-previous.x,dy=position.y-previous.y;
    points[picked]={...previous,x:position.x,y:position.y,
      ...(previous.inX===undefined||previous.inY===undefined?{}:
        {inX:previous.inX+dx,inY:previous.inY+dy}),
      ...(previous.outX===undefined||previous.outY===undefined?{}:
        {outX:previous.outX+dx,outY:previous.outY+dy})};
  }else{
    const handle=handles[picked-anchorCount];
    const previous=handle&&points[handle.index];
    if(!handle||!previous)throw Error('編集する曲線ハンドルが見つかりません。');
    points[handle.index]=handle.kind==='in'?
      {...previous,inX:position.x,inY:position.y}:
      {...previous,outX:position.x,outY:position.y};
  }
  // A modified source must not retain a stale cached Boolean result.
  const {booleanOperands:_previousOperands,...editable}=path;
  return {...editable,points};
}
