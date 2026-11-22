import {rgb,type RGB} from './model';

export type Oklch=Readonly<{lightness:number;chroma:number;hue:number}>;
const linear=(c:number)=>c<.04045?c/12.92:((c+.055)/1.055)**2.4;
const encoded=(c:number)=>c<=.0031308?12.92*c:1.055*c**(1/2.4)-.055;
const angle=(h:number)=>((h%360)+360)%360;

// D65 conversion matrices from Björn Ottosson's published Oklab definition.
export function toOklch(c:RGB):Oklch{
  const r=linear(c.r),g=linear(c.g),b=linear(c.b);
  const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
  const m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
  const s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  const lightness=.2104542553*l+.793617785*m-.0040720468*s;
  const a=1.9779984951*l-2.428592205*m+.4505937099*s;
  const blue=.0259040371*l+.7827717662*m-.808675766*s;
  const chroma=Math.hypot(a,blue);
  return {lightness,chroma,hue:chroma<1e-6?0:angle(Math.atan2(blue,a)*180/Math.PI)};
}
export function oklchToSrgb({lightness:l,chroma,hue}:Oklch):RGB|null{
  if(![l,chroma,hue].every(Number.isFinite)||l<0||l>1||chroma<0)return null;
  const a=chroma*Math.cos(hue*Math.PI/180),b=chroma*Math.sin(hue*Math.PI/180);
  const ll=(l+.3963377774*a+.2158037573*b)**3;
  const m=(l-.1055613458*a-.0638541728*b)**3;
  const s=(l-.0894841775*a-1.291485548*b)**3;
  const r=4.0767416621*ll-3.3077115913*m+.2309699292*s;
  const g=-1.2684380046*ll+2.6097574011*m-.3413193965*s;
  const blue=-.0041960863*ll-.7034186147*m+1.707614701*s;
  const epsilon=.00001;
  return Math.min(r,g,blue)>=-epsilon&&Math.max(r,g,blue)<=1+epsilon
    ?rgb(encoded(r),encoded(g),encoded(blue)):null;
}
export type GamutMask=Readonly<{enabled:boolean;hue:number;spread:number;minLight:number;maxLight:number;maxChroma:number}>;
export function inGamutMask(color:Oklch,mask:GamutMask){
  if(!mask.enabled)return true;
  const difference=Math.abs(angle(color.hue-mask.hue+180)-180);
  return color.lightness>=mask.minLight&&color.lightness<=mask.maxLight&&color.chroma<=mask.maxChroma&&
    (color.chroma<1e-6||difference<=mask.spread/2);
}
