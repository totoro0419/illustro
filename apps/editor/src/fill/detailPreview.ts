/** Produce an exact one-document-pixel-per-sample inspection window.
 * It is intentionally small even when the work is 4000×4000 or larger.
 * Checkerboard is used only for display of transparent pixels. */
export function sampleFillDetail(
 pixels:Uint8Array|Uint8ClampedArray,width:number,height:number,
 centerX:number,centerY:number,size=64
):Uint8ClampedArray<ArrayBuffer>{
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
   !Number.isSafeInteger(size)||size<1||size>128||pixels.length!==width*height*4||
   !Number.isFinite(centerX)||!Number.isFinite(centerY))
   throw Error('細部を確認する画像の大きさが正しくありません。');
 const result=new Uint8ClampedArray(size*size*4),startX=Math.floor(centerX-size/2),startY=Math.floor(centerY-size/2);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const sx=startX+x,sy=startY+y,at=(y*size+x)*4;
   const board=(Math.floor(sx/8)+Math.floor(sy/8))%2===0?240:205;
   if(sx<0||sy<0||sx>=width||sy>=height){
     result[at]=result[at+1]=result[at+2]=board;result[at+3]=255;continue;
   }
   const src=(sy*width+sx)*4,alpha=pixels[src+3]!/255;
   for(let channel=0;channel<3;channel++)
     result[at+channel]=pixels[src+channel]!*alpha+board*(1-alpha);
   result[at+3]=255;
 }
 return result;
}
