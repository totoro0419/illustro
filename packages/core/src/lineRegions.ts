import type {LayerId,RevisionId} from './ids';

export type RegionPoint=Readonly<{x:number;y:number}>;
export type RegionWalls=readonly Readonly<{remove:boolean;preserveInk?:boolean;points:readonly RegionPoint[]}>[];
export type ColorHint=Readonly<{color:string|null;width:number;points:readonly RegionPoint[]}>;
export type LineRegions=Readonly<{
  sourceRevision:RevisionId;
  sources:readonly LayerId[];
  reference:'active'|'merged'|'layer'|'layers'|'vector'|'vector-visible';
  tolerance:number;gap:number;manual:RegionWalls;hints?:readonly ColorHint[];excluded?:readonly RegionPoint[];review?:'reviewed'|'needs-review';
}>;

export function validateLineRegions(value:unknown):LineRegions|null{
  if(value==null)return null;
  const error=()=>new Error('線画領域の保存データが正しくありません。');
  if(typeof value!=='object')throw error();
  const {sourceRevision,sources,reference,tolerance,gap,manual,hints,excluded,review}=value as LineRegions;
  const uuid=(input:unknown)=>typeof input==='string'&&/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(input);
  if(!uuid(sourceRevision)||!Array.isArray(sources)||sources.length>256||sources.some(id=>!uuid(id))||
    !['active','merged','layer','layers','vector','vector-visible'].includes(reference)||
    reference!=='merged'&&!sources.length||!Number.isFinite(tolerance)||tolerance<0||tolerance>100||
    !Number.isFinite(gap)||gap<0||gap>12||!Array.isArray(manual)||manual.length>256)throw error();
  let total=0;
  const readPoints=(items:readonly RegionPoint[])=>{
    if(!Array.isArray(items)||!items.length||items.length>4096)throw error();
    total+=items.length;if(total>32768)throw error();
    const points=items.map((point:RegionPoint)=>{
      if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||Math.abs(point.x)>1e5||Math.abs(point.y)>1e5)throw error();
      return Object.freeze({x:point.x,y:point.y});
    });
    return Object.freeze(points);
  };
  const walls:RegionWalls=Object.freeze(manual.map((wall:RegionWalls[number])=>{
    if(!wall||typeof wall.remove!=='boolean'||(wall.preserveInk!==undefined&&typeof wall.preserveInk!=='boolean'))throw error();
    return Object.freeze({remove:wall.remove,points:readPoints(wall.points),...(wall.preserveInk?{preserveInk:true}:{})});
  }));
  const hintValues=Array.isArray(hints)&&hints.length<=256?hints.map((hint:ColorHint)=>{
    if(!hint||hint.color!==null&&!/^#[0-9a-f]{6}$/i.test(hint.color)||!Number.isFinite(hint.width)||hint.width<1||hint.width>25)
      throw error();
    return Object.freeze({color:hint.color,width:hint.width,points:readPoints(hint.points)});
  }):null;
  if(hints!==undefined&&!hintValues||review!==undefined&&review!=='reviewed'&&review!=='needs-review')throw error();
  if(excluded!==undefined&&(!Array.isArray(excluded)||excluded.length>512))throw error();
  const exclusions=excluded?.length?readPoints(excluded):null;
  return Object.freeze({sourceRevision,sources:Object.freeze([...sources]),reference,tolerance,gap,manual:walls,
    ...(hintValues?{hints:Object.freeze(hintValues)}:{}),...(exclusions?{excluded:exclusions}:{}),...(review?{review}:{})});
}
