import type {Point} from './canvasView';
import {symmetryCopies,symmetryPoint,type SymmetrySettings} from './strokeSymmetry';

/** Bounded tracing guides for sibling symmetry strokes while the pen moves.
 * The guides are deliberately approximate; brush engine replay remains the
 * authoritative pixel result at stroke completion. */
export function symmetryStrokePreview(
  points:readonly Point[],settings:SymmetrySettings,maxPoints=512
):readonly (readonly Point[])[]{
  if(settings.mode==='off'||!points.length)return [];
  const limit=Math.max(2,Math.min(1024,Math.round(maxPoints)));
  const stride=Math.max(1,Math.ceil(points.length/limit));
  const sampled=points.filter((_,index)=>index%stride===0||index===points.length-1);
  return symmetryCopies(settings).map(transform=>sampled.map(point=>symmetryPoint(point,settings,transform)));
}
