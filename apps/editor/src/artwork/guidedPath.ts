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
    return {...point,x:next.x,y:next.y};
  });
}
