import {describe,it,expect} from 'vitest';
import {fingerprintRenderedPixels,sameRenderedPixels} from './visualIntegrity';

describe('C03-010 migrated visual integrity',()=>{
  it('confirms exact RGBA pixel equality across different buffers',async()=>{
    const source=Uint8ClampedArray.from([255,90,10,128,0,0,0,0,30,70,130,255,40,50,60,200]);
    const before=await fingerprintRenderedPixels(source,2,2);
    const after=await fingerprintRenderedPixels(Uint8ClampedArray.from(source),2,2);
    expect(sameRenderedPixels(before,after)).toBe(true);
    expect(before.sha256).toHaveLength(64);
  });
  it('detects lost alpha, changed color and different canvas dimensions',async()=>{
    const original=Uint8ClampedArray.from([255,90,10,128,0,0,0,0]);
    const before=await fingerprintRenderedPixels(original,2,1);
    const alpha=Uint8ClampedArray.from(original);alpha[3]=127;
    const color=Uint8ClampedArray.from(original);color[0]=254;
    expect(sameRenderedPixels(before,await fingerprintRenderedPixels(alpha,2,1))).toBe(false);
    expect(sameRenderedPixels(before,await fingerprintRenderedPixels(color,2,1))).toBe(false);
    expect(sameRenderedPixels(before,{...before,width:1,height:2})).toBe(false);
  });
  it('never includes bytes outside a typed-array view in the hash',async()=>{
    const padded=Uint8Array.from([99,4,3,2,1,9]);
    const a=await fingerprintRenderedPixels(padded.subarray(1,5),1,1);
    const b=await fingerprintRenderedPixels(Uint8Array.from([4,3,2,1]),1,1);
    expect(sameRenderedPixels(a,b)).toBe(true);
    await expect(fingerprintRenderedPixels(padded,1,1)).rejects.toThrow('画素数');
  });
});
