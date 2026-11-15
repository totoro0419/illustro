/** Composite one straight-alpha GPU sample over a virtual white base.
 * The virtual layer is never uploaded as a GPU raster; sampling must still
 * match an exported image, including partially transparent colored ink. */
export function compositeWhiteBackdrop(sample:readonly number[],whiteOpacity:number):readonly [number,number,number,number]{
  if(sample.length<4||!Number.isFinite(whiteOpacity)||whiteOpacity<0||whiteOpacity>1)throw new Error('invalid white backdrop sample');
  const frontAlpha=Math.max(0,Math.min(1,(sample[3]??0)/255));
  const backAlpha=(1-frontAlpha)*whiteOpacity;
  const outAlpha=frontAlpha+backAlpha;
  if(outAlpha===0)return [0,0,0,0];
  const component=(i:number)=>Math.round(Math.max(0,Math.min(255,((sample[i]??0)*frontAlpha+255*backAlpha)/outAlpha)));
  return [component(0),component(1),component(2),Math.round(outAlpha*255)];
}
