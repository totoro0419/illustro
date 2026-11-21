/** Preview original pixels directly on the artwork viewport without
 * allocating a full 4000×4000 ImageData for every brush stroke.
 * The native drawing viewport still supplies original document coordinates
 * and complete pen-pressure samples to the canonical brush replay. */
export function originalPreviewSize(
 width:number,height:number,viewportWidth:number,viewportHeight:number,dpr=1
){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)
  throw Error('元画像の大きさが正しくありません。');
 const ratio=Math.min(3,Math.max(1,Number.isFinite(dpr)?dpr:1));
 const viewport=Math.max(540,Math.min(1024,Math.ceil(Math.max(0,viewportWidth,viewportHeight)*ratio)));
 const scale=Math.min(1,viewport/Math.max(width,height));
 return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
