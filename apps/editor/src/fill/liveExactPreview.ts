import {fillBoundaries,fillMask,type FillSettings} from './pixels';
import type {MaskData} from '../selection/mask';
import type {Point} from '../transform/geometry';

export type LiveFillContext=Readonly<{
 source:Uint8Array;target:Uint8Array|null;width:number;height:number;
 selection:MaskData|null;alphaLocked:boolean;asSelection:boolean;
}>;
export type FillRangePreview={pixels:Uint8ClampedArray<ArrayBuffer>;width:number;height:number};

/** Runs only in the fill worker. Geometry uses the final fill algorithm at the
 * original resolution; only the blue display image is reduced afterwards. */
export class ExactColorFillPreview{
 private bridgeKey='';
 private bridges:Uint8Array|undefined;
 constructor(private readonly context:LiveFillContext){}
 render(settings:FillSettings,points:readonly Point[],maxDimension=512){
  const {source,target,width,height,selection,alphaLocked,asSelection}=this.context;
  const key=settings.contiguous&&settings.gap?settings.tolerance+':'+settings.gap:'';
  if(key!==this.bridgeKey){
   this.bridges=key?fillBoundaries(source,width,height,settings.tolerance,settings.gap).bridges:undefined;
   this.bridgeKey=key;
  }
  const mask=fillMask(source,width,height,settings,points,null,asSelection?null:selection,this.bridges,target);
  const scale=Math.min(1,maxDimension/Math.max(width,height));
  const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
  const pixels=new Uint8ClampedArray(w*h*4);
  // Average coverage includes thin regions even when no thumbnail sample
  // would land on them. Never flood a reduced source image.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const x0=Math.floor(x*width/w),x1=Math.floor((x+1)*width/w);
   const y0=Math.floor(y*height/h),y1=Math.floor((y+1)*height/h);
   let coverage=0;
   for(let sy=y0;sy<y1;sy++)for(let sx=x0;sx<x1;sx++){
    const i=sy*width+sx,alpha=target?.[i*4+3]??0;
    if(!asSelection&&(settings.erase?(alphaLocked||!alpha):(alphaLocked&&!alpha)))continue;
    coverage+=mask.alpha[i]!;
   }
   const at=(y*w+x)*4;
   pixels[at]=43;pixels[at+1]=161;pixels[at+2]=238;
   pixels[at+3]=Math.round(coverage/((x1-x0)*(y1-y0))*112/255*(asSelection?1:settings.opacity));
  }
  return {mask,preview:{pixels,width:w,height:h} satisfies FillRangePreview};
 }
}
