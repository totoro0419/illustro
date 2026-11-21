import type {Transform} from './geometry';

/** These are transparent, changeable suggestions, not AI image-classification.
 * We never silently change a user's pixel interpolation choice. */
export type ArtworkKind='illustration'|'line-art'|'pixel-art'|'photo';
export type InterpolationAdvice=Readonly<{
 value:Transform['interpolation'];label:string;reason:string;
}>;
export function recommendInterpolation(
 kind:ArtworkKind,transform:Pick<Transform,'mode'|'sx'|'sy'|'angle'|'shear'>
):InterpolationAdvice{
 if(kind==='pixel-art')return {
  value:'nearest',label:'ドット絵向け',
  reason:'色の境界をぼかさず、画素の形を保ちます。小さく縮めると細部が欠ける場合があります。'
 };
 const shrinking=transform.mode==='affine'&&Number.isFinite(transform.sx)&&
  Number.isFinite(transform.sy)&&Math.abs(transform.sx)>0&&Math.abs(transform.sy)>0&&
  Math.min(Math.abs(transform.sx),Math.abs(transform.sy))<.75;
 const supportsAccurateArea=shrinking&&transform.angle%360===0&&transform.shear===0;
 if(supportsAccurateArea)return {
  value:'area',label:'縮小向け',
  reason:'回転・傾斜のない縮小なので、元の画素の面積を平均して線や写真の細部の欠けを抑えます。'
 };
 return {
  value:'bilinear',label:'なめらか',
  reason:kind==='line-art'?'線の縁を自然につなぎます。ドット単位の輪郭を残す場合は「ドット絵向け」を選んでください。':
   '拡大・回転・ゆがみでも自然な見え方を優先します。必要なら別の方法に変更できます。'
 };
}
