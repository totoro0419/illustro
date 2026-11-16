import {decodeMaskTile} from '@illustro/brush-rt';
import {MASK_TILE_SIZE} from '@illustro/core';
import {paintPixelMask,type MaskStrokePoint} from './layerMaskEditing';
import type {SelectionRect} from './strokeSelection';
import type {MaskData} from './selection/mask';

export function restoreHistoryPixels(target:Uint8Array,source:Uint8ClampedArray,points:readonly MaskStrokePoint[],options:{
  width:number;height:number;sourceWidth:number;sourceHeight:number;
  size:number;opacity:number;selection:SelectionRect|null;selectionMask?:MaskData|null;lockAlpha:boolean;
}){
  const {width,height,sourceWidth,sourceHeight}=options;
  const overlay=paintPixelMask({
    shape:'pixels',x:0,y:0,scaleX:1,scaleY:1,enabled:true,inverted:false,density:1,tiles:{},
  },points,{...options,reveal:false,width,height});
  const size=MASK_TILE_SIZE;
  let changed=false;
  for(const key of Object.keys(overlay.tiles)){
    const [tx,ty]=key.split(',').map(Number) as [number,number],left=tx*size,top=ty*size;
    const coverage=decodeMaskTile(overlay.tiles,key)!;
    for(let y=top;y<Math.min(top+size,height,sourceHeight);y++){
      for(let x=left;x<Math.min(left+size,width,sourceWidth);x++){
        const weight=1-coverage[(y-top)*size+x-left]!/255;
        if(!weight)continue;
        const incoming=(y*sourceWidth+x)*4,offset=(y*width+x)*4;
        const oldAlpha=target[offset+3]!,newAlpha=source[incoming+3]!;
        const before=oldAlpha*(1-weight),after=newAlpha*weight,alpha=before+after;
        if(options.lockAlpha&&(!oldAlpha||!newAlpha))continue;
        const outputAlpha=options.lockAlpha?oldAlpha:Math.round(alpha);
        for(let channel=0;channel<3;channel++){
          const old=target[offset+channel]!,next=outputAlpha
            ?Math.round(options.lockAlpha?old*(1-weight)+source[incoming+channel]!*weight:
              (old*before+source[incoming+channel]!*after)/alpha)
            :0;
          if(next!==old){target[offset+channel]=next;changed=true;}
        }
        if(outputAlpha!==oldAlpha){target[offset+3]=outputAlpha;changed=true;}
      }
    }
  }
  return changed;
}
