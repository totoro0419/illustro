import {MASK_TILE_SIZE,type PixelLayerMask} from '@illustro/core';
import type {MaskData} from '../selection/mask';

export function selectionAsLayerMask(mask:MaskData):PixelLayerMask{
  const tiles:Record<string,string>={},size=MASK_TILE_SIZE;
  for(let y=0;y<mask.height;y+=size)for(let x=0;x<mask.width;x+=size){
    const tile=new Uint8Array(size*size).fill(255);
    const width=Math.min(size,mask.width-x),height=Math.min(size,mask.height-y);
    for(let row=0;row<height;row++){
      const at=(y+row)*mask.width+x;
      tile.set(mask.alpha.subarray(at,at+width),row*size);
    }
    const first=tile[0]!;
    if(tile.every(value=>value===first)){
      if(first!==255)tiles[x/size+','+y/size]=first.toString(16).padStart(2,'0');
    }else tiles[x/size+','+y/size]=btoa(String.fromCharCode(...tile));
  }
  return {shape:'pixels',x:0,y:0,scaleX:1,scaleY:1,tiles,enabled:true,density:1,inverted:false,linked:true};
}
