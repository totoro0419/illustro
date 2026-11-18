import type {FrozenExport} from './basicExport';

/** Strict eligibility: advanced blending, clip masks, groups, and saved raster
 * bases retain the original fully accurate rendering path. */
export function canUseTiledHistoryPreview(
  frozen:Pick<FrozenExport,'width'|'height'|'layers'|'basePixels'>,
  targetWidth:number,targetHeight:number,
):boolean{
  if(!Number.isSafeInteger(frozen.width)||!Number.isSafeInteger(frozen.height)||
     !Number.isSafeInteger(targetWidth)||!Number.isSafeInteger(targetHeight)||
     frozen.width<1||frozen.height<1||targetWidth<1||targetHeight<1||
     targetWidth>frozen.width||targetHeight>frozen.height||!frozen.layers.length)return false;
  const targetPixels=targetWidth*targetHeight;
  // Comparison images can be 1600x1200. Keep their pixel accumulator bounded,
  // and use tiled replay only when it avoids a substantially larger full image.
  return targetPixels<=2_000_000&&
    (targetPixels<=128_000||frozen.width*frozen.height>=targetPixels*2);
}

/** Yield between costly history tiles even when the tab is hidden.
 * requestAnimationFrame can be suspended in background tabs indefinitely. */
export function yieldHistoryRender():Promise<void>{
  return new Promise(resolve=>{
    if(typeof document!=='undefined'&&document.visibilityState==='hidden'||
       typeof requestAnimationFrame!=='function')setTimeout(resolve,0);
    else requestAnimationFrame(()=>resolve());
  });
}

export function createTiledPreviewAccumulator(
  sourceWidth:number,sourceHeight:number,targetWidth:number,targetHeight:number,
){
  if(!Number.isSafeInteger(sourceWidth)||!Number.isSafeInteger(sourceHeight)||
     sourceWidth<1||sourceHeight<1||targetWidth<1||targetHeight<1||
     targetWidth>sourceWidth||targetHeight>sourceHeight)
    throw Error('縮小画像の大きさが正しくありません。');
  // Only thumbnail-resolution accumulators are held, not a 4000px RGBA image.
  if(!Number.isSafeInteger(targetWidth)||!Number.isSafeInteger(targetHeight)||
     targetWidth*targetHeight>2_000_000)throw Error('縮小画像が大きすぎます。');
  // Four float32 accumulators hold premultiplied RGB and alpha. Each target
  // pixel receives at most unit area, so float32 avoids the 61 MB float64
  // accumulator for 1600x1200 comparisons without changing source precision.
  const sum=new Float32Array(targetWidth*targetHeight*4);
  const scaleX=targetWidth/sourceWidth,scaleY=targetHeight/sourceHeight;
  function addTile(tile:Uint8Array|Uint8ClampedArray,originX:number,originY:number,tileSize:number){
    if(tile.byteLength!==tileSize*tileSize*4||!Number.isSafeInteger(originX)||!Number.isSafeInteger(originY))
      throw Error('縮小元のタイルが正しくありません。');
    for(let ly=0;ly<tileSize&&originY+ly<sourceHeight;ly++){
      const sourceY=originY+ly;
      if(sourceY<0)continue;
      const ay=sourceY*scaleY,by=(sourceY+1)*scaleY;
      const firstY=Math.floor(ay),lastY=Math.min(targetHeight-1,Math.floor(by));
      for(let lx=0;lx<tileSize&&originX+lx<sourceWidth;lx++){
        const sourceX=originX+lx;
        if(sourceX<0)continue;
        const offset=(ly*tileSize+lx)*4,alpha=tile[offset+3]!/255;
        if(alpha<=0)continue;
        const ax=sourceX*scaleX,bx=(sourceX+1)*scaleX;
        for(let oy=firstY;oy<=lastY;oy++){
          const dy=Math.min(by,oy+1)-Math.max(ay,oy);
          if(dy<=0)continue;
          for(let ox=Math.floor(ax);ox<=Math.min(targetWidth-1,Math.floor(bx));ox++){
            const dx=Math.min(bx,ox+1)-Math.max(ax,ox);
            if(dx<=0)continue;
            const area=dx*dy*alpha,dst=(oy*targetWidth+ox)*4;
            sum[dst]=(sum[dst]??0)+tile[offset]!*area;
            sum[dst+1]=(sum[dst+1]??0)+tile[offset+1]!*area;
            sum[dst+2]=(sum[dst+2]??0)+tile[offset+2]!*area;
            sum[dst+3]=(sum[dst+3]??0)+area;
          }
        }
      }
    }
  }
  function finish():Uint8ClampedArray{
    const result=new Uint8ClampedArray(targetWidth*targetHeight*4);
    for(let p=0;p<result.length;p+=4){
      const alpha=sum[p+3]!;
      if(alpha>0){
        result[p]=Math.round(sum[p]!/alpha);
        result[p+1]=Math.round(sum[p+1]!/alpha);
        result[p+2]=Math.round(sum[p+2]!/alpha);
        result[p+3]=Math.round(alpha*255);
      }
    }
    return result;
  }
  return {addTile,finish};
}
