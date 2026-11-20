import type {ArtPoint,ArtworkGuide} from '@illustro/core';
import type {GuideSettings} from '../strokeGuide';
import {lockArtworkGuide,lockStraightGuide,snapToStraightGuide} from '../strokeGuide';

/** Shape/gradient placement uses the same ruler selection and projection as
 * the brush. Freeze the chosen axis for all points in one gesture. */
export function snapArtworkPathToGuide<T extends ArtPoint>(
  points:readonly T[],guides:readonly ArtworkGuide[],settings:GuideSettings,preferred:string|null
):T[]{
  if(points.length<2)return [...points];
  const first=points[0]!,last=points.at(-1)!;
  const heading={x:last.x-first.x,y:last.y-first.y};
  const selected=guides.length?lockArtworkGuide(first,guides,false,preferred,heading):null;
  const locked=selected?.guide??lockStraightGuide(first,settings,false);
  if(!locked)return [...points];
  return points.map(point=>{
    const next=snapToStraightGuide(point,locked);
    // Bézier handles are part of the curve, not decorative UI markers.
    // Snap them to the same frozen guide as their anchor to prevent the
    // committed curve from bending away from the displayed ruler.
    const input=point.inX!==undefined&&point.inY!==undefined
      ?snapToStraightGuide({x:point.inX,y:point.inY},locked):null;
    const output=point.outX!==undefined&&point.outY!==undefined
      ?snapToStraightGuide({x:point.outX,y:point.outY},locked):null;
    return {...point,x:next.x,y:next.y,
      ...(input?{inX:input.x,inY:input.y}:{}),
      ...(output?{outX:output.x,outY:output.y}:{})};
  });
}
