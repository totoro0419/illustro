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

/** Transparent margins cannot affect boundary distances. Keep the field only
 * inside the occupied rectangle, retaining document coordinates and scale. */
export function gradientBoundaryField(alpha:Uint8Array,width:number,height:number,stepX=1,stepY=1){
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||alpha.length!==width*height)
    throw Error('形状追従グラデーションの画像サイズが正しくありません。');
  let left=width,top=height,right=0,bottom=0;
  for(let y=0;y<height;y++){
    const start=y*width;
    for(let x=0;x<width;x++)if(alpha[start+x]){
      left=Math.min(left,x);right=Math.max(right,x+1);
      top=Math.min(top,y);bottom=y+1;
    }
  }
  if(left>=right)return {left:0,top:0,width:0,height:0,values:new Float32Array(0)};
  const fieldWidth=right-left,fieldHeight=bottom-top;
  const coverage=fieldWidth===width&&fieldHeight===height?alpha:new Uint8Array(fieldWidth*fieldHeight);
  if(coverage!==alpha)for(let y=0;y<fieldHeight;y++)
    coverage.set(alpha.subarray((y+top)*width+left,(y+top)*width+right),y*fieldWidth);
  return {left,top,width:fieldWidth,height:fieldHeight,
    values:gradientBoundaryDistance(coverage,fieldWidth,fieldHeight,stepX,stepY)};
}
