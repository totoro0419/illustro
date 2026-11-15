import type {RevisionId} from './ids';
import {validateLayerMask,type PixelLayerMask} from './layerMask';

export type TransformPoint=Readonly<{x:number;y:number}>;
export type TransformQuad=readonly [TransformPoint,TransformPoint,TransformPoint,TransformPoint];
export type TransformBounds=Readonly<{x:number;y:number;width:number;height:number}>;
export type TransformHandle=TransformPoint&Readonly<{fixed:boolean}>;
export type TransformMesh=
  |Readonly<{kind:'grid';columns:number;rows:number;points:readonly TransformHandle[]}>
  |Readonly<{kind:'cage';source:readonly TransformPoint[];points:readonly TransformHandle[]}>;
export type LiquifyStroke=Readonly<{
  mode:'push'|'expand'|'pinch'|'twist'|'restore'|'protect'|'unprotect';
  radius:number;strength:number;
  points:readonly (TransformPoint&Readonly<{pressure:number}>)[];
}>;
type LayerDeformationSource=Readonly<{
  version:1;
  sourceRevision:RevisionId;
  bounds:TransformBounds;
  interpolation:'nearest'|'bilinear'|'area';
  selection:PixelLayerMask|null;
  linkedMask:boolean;
  maskDigest?:string;
}>;

export type LayerDeformation=LayerDeformationSource&(
  |Readonly<{mode:'free'|'projective'|'skew';corners:TransformQuad}>
  |Readonly<{mode:'mesh-grid'|'cage';mesh:TransformMesh}>
  |Readonly<{mode:'liquify';strokes:readonly LiquifyStroke[]}>
);
const validated=new WeakSet<object>();
export function validateLayerDeformation(input:unknown):LayerDeformation|null{
  if(input==null)return null;
  const invalid=()=>new Error('保存された変形データが正しくありません。');
  if(typeof input!=='object')throw invalid();
  if(validated.has(input))return input as LayerDeformation;
  const value=input as LayerDeformation;
  const {version,sourceRevision,mode,bounds,interpolation,selection,linkedMask,maskDigest}=value;
  const coordinate=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=1e6;
  if(version!==1||typeof sourceRevision!=='string'||
    !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(sourceRevision)||
    (mode!=='free'&&mode!=='projective'&&mode!=='skew'&&mode!=='mesh-grid'&&mode!=='cage'&&mode!=='liquify')||
    !bounds||!coordinate(bounds.x)||!coordinate(bounds.y)||!coordinate(bounds.width)||!coordinate(bounds.height)||
    bounds.width<1||bounds.height<1||
    (interpolation!=='nearest'&&interpolation!=='bilinear'&&interpolation!=='area')||typeof linkedMask!=='boolean'||
    (maskDigest!==undefined&&(typeof maskDigest!=='string'||!/^[a-f\d]{64}$/.test(maskDigest))))
    throw invalid();
  const corner=(point:TransformPoint)=>{
    if(!point||!coordinate(point.x)||!coordinate(point.y))throw invalid();
    return Object.freeze({x:point.x,y:point.y});
  };
  const mask=validateLayerMask(selection);
  if(mask&&mask.shape!=='pixels')throw invalid();
  const base={version,sourceRevision,bounds:Object.freeze({x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height}),
    interpolation,selection:mask,linkedMask,...(maskDigest?{maskDigest}:{})};
  let safe:LayerDeformation;
  if(value.mode==='liquify'){
    if(!Array.isArray(value.strokes)||value.strokes.length>512)throw invalid();
    let total=0;
    const strokes=value.strokes.map((stroke:LiquifyStroke)=>{
      if(!stroke||!['push','expand','pinch','twist','restore','protect','unprotect'].includes(stroke.mode)||
        !coordinate(stroke.radius)||stroke.radius<1||stroke.radius>4096||!coordinate(stroke.strength)||stroke.strength<0||stroke.strength>1||
        !Array.isArray(stroke.points)||!stroke.points.length||stroke.points.length>2048)throw invalid();
      total+=stroke.points.length;
      if(total>32_768)throw invalid();
      const points=stroke.points.map((point:LiquifyStroke['points'][number])=>{
        if(!point||!coordinate(point.pressure)||point.pressure<0||point.pressure>1)throw invalid();
        return Object.freeze({...corner(point),pressure:point.pressure});
      });
      return Object.freeze({mode:stroke.mode,radius:stroke.radius,strength:stroke.strength,points:Object.freeze(points)});
    });
    safe=Object.freeze({...base,mode:value.mode,strokes:Object.freeze(strokes)});
  }else if(value.mode==='mesh-grid'||value.mode==='cage'){
    const mesh=value.mesh;
    if(!mesh||!Array.isArray(mesh.points)||mesh.points.length>36)throw invalid();
    const points=Object.freeze(mesh.points.map((point:TransformHandle)=>{
      if(!point||typeof point.fixed!=='boolean')throw invalid();
      return Object.freeze({...corner(point),fixed:point.fixed});
    }));
    if(value.mode==='mesh-grid'&&mesh.kind==='grid'){
      if(!Number.isInteger(mesh.columns)||!Number.isInteger(mesh.rows)||mesh.columns<2||mesh.rows<2||
        mesh.columns>6||mesh.rows>6||points.length!==mesh.columns*mesh.rows)throw invalid();
      safe=Object.freeze({...base,mode:value.mode,mesh:Object.freeze({kind:mesh.kind,columns:mesh.columns,rows:mesh.rows,points})});
    }else if(value.mode==='cage'&&mesh.kind==='cage'){
      if(!Array.isArray(mesh.source)||mesh.source.length!==points.length||points.length<3)throw invalid();
      safe=Object.freeze({...base,mode:value.mode,mesh:Object.freeze({kind:mesh.kind,source:Object.freeze(mesh.source.map(corner)),points})});
    }else throw invalid();
  }else{
    const corners='corners' in value?value.corners:undefined;
    if(!Array.isArray(corners)||corners.length!==4)throw invalid();
    safe=Object.freeze({...base,mode:value.mode,
      corners:Object.freeze([corner(corners[0]),corner(corners[1]),corner(corners[2]),corner(corners[3])] as const)});
  }
  validated.add(safe);
  return safe;
}
