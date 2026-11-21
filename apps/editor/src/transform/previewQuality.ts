/** The artwork overlay never needs 4000×4000 RGBA during adjustment.
 * Compute a second preview only after a brief idle period. It is displayed
 * over the original canvas, so the UI must still label it approximate. */
export function progressiveTransformPreviewSize(
 width:number,height:number,viewportWidth:number,viewportHeight:number,devicePixelRatio=1
):{width:number;height:number}{
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)
  throw Error('作品の大きさが正しくありません。');
 const dimension=Math.max(
  Number.isFinite(viewportWidth)?Math.max(0,viewportWidth):0,
  Number.isFinite(viewportHeight)?Math.max(0,viewportHeight):0
 );
 const ratio=Number.isFinite(devicePixelRatio)?Math.max(1,Math.min(3,devicePixelRatio)):1;
 const side=Math.min(768,Math.max(280,Math.ceil(dimension*ratio)));
 const scale=Math.min(1,side/Math.max(width,height));
 return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
