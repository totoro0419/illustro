import {describe,it,expect} from 'vitest';
import {averageSampledPixels} from './sampleAverage';

describe('C04-005 batched GPU eyedropper averages',()=>{
  it('averages 3x3 colors using one flat RGBA buffer',()=>{
    const bytes=new Uint8Array(9*4);
    for(let n=0;n<9;n++)bytes.set([10+n*5,100,200,255],n*4);
    expect(averageSampledPixels(bytes,'keep')).toEqual([30,100,200,255]);
  });
  it('skips fully transparent pixels without adding hidden colors',()=>{
    const bytes=Uint8Array.of(255,0,0,255,0,255,0,0,0,0,255,255,0,0,0,0);
    expect(averageSampledPixels(bytes,'skip')).toEqual([128,0,128,255]);
    expect(averageSampledPixels(new Uint8Array(4),'skip')).toBeNull();
  });
  it('composites semitransparent straight-alpha ink against white correctly',()=>{
    expect(averageSampledPixels(Uint8Array.of(200,0,0,128),'white'))
      .toEqual([227,127,127,255]);
  });
  it('uses a logical white canvas backing only for composite sampling',()=>{
    const pixels=Uint8Array.of(255,0,0,128);
    expect(averageSampledPixels(pixels,'keep',1)).toEqual([255,127,127,255]);
    expect(averageSampledPixels(pixels,'keep',null)).toEqual([255,0,0,128]);
  });
  it('rejects malformed and oversized transfers',()=>{
    expect(()=>averageSampledPixels(Uint8Array.of(1,2,3),'keep')).toThrow();
    expect(()=>averageSampledPixels(new Uint8Array(104),'keep')).toThrow();
  });
});
