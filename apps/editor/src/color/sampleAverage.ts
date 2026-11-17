import {compositeWhiteBackdrop} from '../logicalWhitePixel';

export type SampleTransparency='skip'|'keep'|'white';
/** Aggregate one small GPU readback. Inputs are straight-alpha RGBA bytes. */
export function averageSampledPixels(bytes:Uint8Array,mode:SampleTransparency,whiteOpacity:number|null=null):readonly number[]|null{
  if(bytes.length%4!==0||bytes.length>5*5*4)throw Error('採色する画像の画素数が正しくありません。');
  const sum=[0,0,0,0];let count=0;
  for(let offset=0;offset<bytes.length;offset+=4){
    let pixel:readonly number[]=[bytes[offset]!,bytes[offset+1]!,bytes[offset+2]!,bytes[offset+3]!];
    if(whiteOpacity!==null)pixel=compositeWhiteBackdrop(pixel,whiteOpacity);
    if(mode==='skip'&&pixel[3]===0)continue;
    if(mode==='white')pixel=compositeWhiteBackdrop(pixel,1);
    for(let channel=0;channel<4;channel++)sum[channel]+=pixel[channel]!;
    count++;
  }
  if(!count)return null;
  return sum.map(value=>Math.max(0,Math.min(255,Math.round(value/count))));
}
