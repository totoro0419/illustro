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

export function pixelGridWarning(t:Transform):string|null{
  if(t.interpolation!=='nearest')return '色を混ぜずに変形するには「ドット絵向け」を選んでください。';
  if(t.mode!=='affine'||t.shear!==0||!Number.isInteger(t.angle/90))
    return '画素の形が崩れることがあります。整数倍の拡大、直角の回転、左右上下反転なら画素の形を保てます。';
  const integer=(n:number)=>Math.abs(n-Math.round(n))<1e-7;
  if(!Number.isInteger(t.sx)||!Number.isInteger(t.sy)||!t.sx||!t.sy)
    return '縦横を整数倍にしないと、画素の列が抜けたり幅が不均一になることがあります。';
  const angle=t.angle*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
  const x=t.cx+t.dx-(t.cx*t.sx*cos-t.cy*t.sy*sin);
  const y=t.cy+t.dy-(t.cx*t.sx*sin+t.cy*t.sy*cos);
  return integer(x)&&integer(y)?null:'変形後の画素の境界が格子の間に来ます。移動量や回転の中心を調整してください。';
}
