/** Distances to the gradient mask boundary in *document* pixels.
 * Preview output can have a different X/Y reduction factor; measuring in
 * physical document units keeps radial color stops stable across aspect ratios.
 * Two chamfer passes require O(width*height) time and a single float buffer. */
export function gradientBoundaryDistance(
  alpha:Uint8Array,width:number,height:number,stepX=1,stepY=1
):Float32Array<ArrayBuffer>{
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<=0||height<=0||
     alpha.length!==width*height||!Number.isFinite(stepX)||!Number.isFinite(stepY)||
     stepX<=0||stepY<=0)throw Error('形状追従グラデーションの画像サイズが正しくありません。');
  const distances=new Float32Array(alpha.length);
  const diagonal=Math.hypot(stepX,stepY);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x;
    if(!alpha[i])continue;
    distances[i]=Math.min(
      x?distances[i-1]!+stepX:stepX,
      y?distances[i-width]!+stepY:stepY,
      x&&y?distances[i-width-1]!+diagonal:Infinity,
      x+1<width&&y?distances[i-width+1]!+diagonal:Infinity
    );
  }
  for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){
    const i=y*width+x;
    if(!alpha[i])continue;
    distances[i]=Math.min(distances[i]!,
      x+1<width?distances[i+1]!+stepX:stepX,
      y+1<height?distances[i+width]!+stepY:stepY,
      x+1<width&&y+1<height?distances[i+width+1]!+diagonal:Infinity,
      x&&y+1<height?distances[i+width-1]!+diagonal:Infinity
    );
  }
  return distances;
}
