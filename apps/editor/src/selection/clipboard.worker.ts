/** C06 large pixel operations on a dedicated worker, never the pen input thread. */
import {maskImage,eraseMaskedPixels,type MaskData} from './mask';
type Req=Readonly<{id:number;type:'move'|'cut'|'copy';width:number;height:number;
  image:Uint8ClampedArray;mask:Uint8Array;dx?:number;dy?:number}>;
self.onmessage=(event:MessageEvent<Req>)=>{
  const {id,type,width,height,image,mask,dx=0,dy=0}=event.data;
  try{
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
      width*height>64_000_000||image.length!==width*height*4||mask.length!==width*height)
      throw Error('画素処理に必要なデータが不足しています。');
    const selected:MaskData={width,height,alpha:mask};
    let result:Uint8ClampedArray;
    if(type==='copy')result=maskImage(image,selected);
    else if(type==='cut')result=eraseMaskedPixels(image,selected);
    else{
      if(!Number.isSafeInteger(dx)||!Number.isSafeInteger(dy))throw Error('移動距離が不正です。');
      // Never irreversibly crop painted pixels when a move leaves the canvas.
      // Check alpha before any new raster is committed; an empty transparent
      // border may move outside without being mistaken for artwork loss.
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        if(x+dx>=0&&x+dx<width&&y+dy>=0&&y+dy<height)continue;
        const position=y*width+x;
        if(mask[position]&&image[position*4+3])
          throw Error('絵の一部がキャンバスの外に出ます。元の絵を守るため移動を中止しました。移動距離を短くしてください。');
      }
      result=eraseMaskedPixels(image,selected);
      const selectedPixels=maskImage(image,selected);
      if(!Number.isSafeInteger(dx)||!Number.isSafeInteger(dy))throw Error('移動距離が不正です。');
      for(let y=Math.max(0,-dy);y<Math.min(height,height-dy);y++){
        const destY=y+dy;
        for(let x=Math.max(0,-dx);x<Math.min(width,width-dx);x++){
          const src=(y*width+x)*4,sa=selectedPixels[src+3]!/255;
          if(!sa)continue;
          const dest=(destY*width+x+dx)*4,da=result[dest+3]!/255,outA=sa+da*(1-sa);
          for(let c=0;c<3;c++){
            result[dest+c]=outA?Math.round(
              (selectedPixels[src+c]!*sa+result[dest+c]!*da*(1-sa))/outA
            ):0;
          }
          result[dest+3]=Math.round(outA*255);
        }
      }
    }
    (self as unknown as Worker).postMessage({id,ok:true,pixels:result},[result.buffer]);
  }catch(error){
    (self as unknown as Worker).postMessage({id,ok:false,error:error instanceof Error?error.message:String(error)});
  }
};
