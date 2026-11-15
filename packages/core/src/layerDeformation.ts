import type {RevisionId} from './ids';
import {validateLayerMask,type PixelLayerMask} from './layerMask';

export type TransformPoint=Readonly<{x:number;y:number}>;
export type TransformQuad=readonly [TransformPoint,TransformPoint,TransformPoint,TransformPoint];
export type TransformBounds=Readonly<{x:number;y:number;width:number;height:number}>;
export type LayerDeformation=Readonly<{
  version:1;
  sourceRevision:RevisionId;
  mode:'free'|'projective'|'skew';
  bounds:TransformBounds;
  corners:TransformQuad;
  interpolation:'nearest'|'bilinear'|'area';
  selection:PixelLayerMask|null;
  linkedMask:boolean;
  maskDigest?:string;
}>;

const validated=new WeakSet<object>();
export function validateLayerDeformation(input:unknown):LayerDeformation|null{
  if(input==null)return null;
  const invalid=()=>new Error('保存された変形データが正しくありません。');
  if(typeof input!=='object')throw invalid();
  if(validated.has(input))return input as LayerDeformation;
  const {version,sourceRevision,mode,bounds,corners,interpolation,selection,linkedMask,maskDigest}=input as LayerDeformation;
  const coordinate=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=1e6;
  if(version!==1||typeof sourceRevision!=='string'||
    !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(sourceRevision)||
    (mode!=='free'&&mode!=='projective'&&mode!=='skew')||
    !bounds||!coordinate(bounds.x)||!coordinate(bounds.y)||!coordinate(bounds.width)||!coordinate(bounds.height)||
    bounds.width<1||bounds.height<1||!Array.isArray(corners)||corners.length!==4||
    (interpolation!=='nearest'&&interpolation!=='bilinear'&&interpolation!=='area')||typeof linkedMask!=='boolean'||
    (maskDigest!==undefined&&(typeof maskDigest!=='string'||!/^[a-f\d]{64}$/.test(maskDigest))))
    throw invalid();
  const corner=(point:TransformPoint)=>{
    if(!point||!coordinate(point.x)||!coordinate(point.y))throw invalid();
    return Object.freeze({x:point.x,y:point.y});
  };
  const mask=validateLayerMask(selection);
  if(mask&&mask.shape!=='pixels')throw invalid();
  const safe:LayerDeformation=Object.freeze({
    version,sourceRevision,mode,bounds:Object.freeze({x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height}),
    corners:Object.freeze([corner(corners[0]),corner(corners[1]),corner(corners[2]),corner(corners[3])] as const),
    interpolation,selection:mask,linkedMask,...(maskDigest?{maskDigest}:{})
  });
  validated.add(safe);
  return safe;
}
