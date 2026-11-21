/** Extract a rendered shape's alpha channel a few rows at a time.
 * A 4000×4000 canvas already owns its GPU/2D pixels: requesting an additional
 * full-frame ImageData can temporarily add ~64MB of memory. Keeping each
 * readback under 2MiB preserves the exact rendered coverage without that copy. */
export function readCanvasAlphaBands(
 width:number,height:number,
 read:(startRow:number,rowCount:number)=>Uint8ClampedArray,
 maxBandBytes=2*1024*1024
):Uint8Array<ArrayBuffer>{
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
    !Number.isSafeInteger(width*height)||!Number.isSafeInteger(maxBandBytes)||maxBandBytes<4)
   throw Error('図形の画素サイズが正しくありません。');
 const alpha=new Uint8Array(width*height);
 const rowsPerBand=Math.max(1,Math.min(height,Math.floor(maxBandBytes/(width*4))));
 for(let start=0;start<height;start+=rowsPerBand){
   const rows=Math.min(rowsPerBand,height-start);
   const data=read(start,rows);
   if(data.length!==width*rows*4)throw Error('図形の画素を正しく読み取れませんでした。');
   for(let i=0;i<width*rows;i++)alpha[start*width+i]=data[i*4+3]!;
 }
 return alpha;
}
