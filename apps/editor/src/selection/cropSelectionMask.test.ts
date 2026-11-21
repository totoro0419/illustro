import {describe,it,expect} from 'vitest';
import {cropSelectionMask,maskImage,type MaskData} from './mask';

const crop=(source:Uint8Array|Uint8ClampedArray,width:number,
 area:{x:number;y:number;width:number;height:number})=>{
 const out=new Uint8ClampedArray(area.width*area.height*4);
 for(let y=0;y<area.height;y++)
  out.set(source.subarray(((area.y+y)*width+area.x)*4,
    ((area.y+y)*width+area.x+area.width)*4),y*area.width*4);
 return out;
};
describe('C06-015 small selected clipboard masks',()=>{
 it('produces exactly the same pixels as full-image masking then cropping',()=>{
  const width=7,height=5,area={x:2,y:1,width:3,height:2};
  const source=new Uint8Array(width*height*4);
  const alpha=new Uint8Array(width*height);
  for(let i=0;i<width*height;i++){
   source.set([i*3,i*2,100,255],i*4);
   alpha[i]=[0,64,128,255][i%4]!;
  }
  const mask:MaskData={width,height,alpha};
  const small=cropSelectionMask(mask,area);
  expect(small.width).toBe(3);
  expect(small.height).toBe(2);
  expect(small.alpha).toEqual(Uint8Array.from([alpha[9]!,alpha[10]!,alpha[11]!,alpha[16]!,alpha[17]!,alpha[18]!]));
  expect(maskImage(crop(source,width,area),small))
    .toEqual(crop(maskImage(source,mask),width,area));
  expect(mask.alpha).toEqual(alpha);
 });
 it('rejects invalid coordinates or mask lengths rather than copying incorrect pixels',()=>{
  const mask:MaskData={width:4,height:4,alpha:new Uint8Array(16)};
  expect(()=>cropSelectionMask(mask,{x:-1,y:0,width:2,height:2})).toThrow();
  expect(()=>cropSelectionMask(mask,{x:3,y:0,width:2,height:2})).toThrow();
  expect(()=>cropSelectionMask({...mask,alpha:new Uint8Array(3)},
    {x:0,y:0,width:1,height:1})).toThrow();
 });
});
