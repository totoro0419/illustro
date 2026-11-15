import type {LayerId,RevisionId} from './ids';

export type RegionPoint=Readonly<{x:number;y:number}>;
export type RegionWalls=readonly Readonly<{remove:boolean;points:readonly RegionPoint[]}>[];
export type LineRegions=Readonly<{
  sourceRevision:RevisionId;
  sources:readonly LayerId[];
  reference:'active'|'merged'|'layer'|'layers'|'vector'|'vector-visible';
  tolerance:number;gap:number;manual:RegionWalls;
}>;

export function validateLineRegions(value:unknown):LineRegions|null{
  if(value==null)return null;
  const error=()=>new Error('線画領域の保存データが正しくありません。');
  if(typeof value!=='object')throw error();
  const {sourceRevision,sources,reference,tolerance,gap,manual}=value as LineRegions;
  const uuid=(input:unknown)=>typeof input==='string'&&/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(input);
  if(!uuid(sourceRevision)||!Array.isArray(sources)||sources.length>256||sources.some(id=>!uuid(id))||
    !['active','merged','layer','layers','vector','vector-visible'].includes(reference)||
    reference!=='merged'&&!sources.length||!Number.isFinite(tolerance)||tolerance<0||tolerance>100||
    !Number.isFinite(gap)||gap<0||gap>12||!Array.isArray(manual)||manual.length>256)throw error();
  let total=0;
  const walls:RegionWalls=Object.freeze(manual.map((wall:RegionWalls[number])=>{
    if(!wall||typeof wall.remove!=='boolean'||!Array.isArray(wall.points)||!wall.points.length||wall.points.length>4096)throw error();
    total+=wall.points.length;if(total>32768)throw error();
    const points=wall.points.map((point:RegionPoint)=>{
      if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||Math.abs(point.x)>1e5||Math.abs(point.y)>1e5)throw error();
      return Object.freeze({x:point.x,y:point.y});
    });
    return Object.freeze({remove:wall.remove,points:Object.freeze(points)});
  }));
  return Object.freeze({sourceRevision,sources:Object.freeze([...sources]),reference,tolerance,gap,manual:walls});
}
