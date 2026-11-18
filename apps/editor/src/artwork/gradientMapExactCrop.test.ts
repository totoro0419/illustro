import {describe,expect,it} from 'vitest';
import {extractGradientMapCrop} from './gradientMap';

describe('C09-014 original-resolution gradient-map inspection',()=>{
  it('preserves the exact source RGBA and document coordinates in a central crop',()=>{
    const width=5,height=4,source=new Uint8ClampedArray(width*height*4);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4;
      source.set([x*30,y*40,111,(x+y)*20],i);
    }
    const crop=extractGradientMapCrop(source,width,height,(x,y)=>x<3?1:.5,3);
    expect([crop.x,crop.y,crop.width,crop.height]).toEqual([1,0,3,3]);
    for(let y=0;y<crop.height;y++)for(let x=0;x<crop.width;x++){
      const at=(y*crop.width+x)*4,from=((crop.y+y)*width+crop.x+x)*4;
      expect(crop.rgba.subarray(at,at+4)).toEqual(source.subarray(from,from+4));
      expect(crop.coverage[y*crop.width+x]).toBe(crop.x+x<3?255:128);
    }
    expect(source[0]).toBe(0);
  });
  it('keeps 1:1 pixels for a 4K-sized document without allocating another full-size image',()=>{
    const width=4000,height=4000,source=new Uint8ClampedArray(width*height*4);
    const center=(2000*width+2000)*4;source.set([19,73,201,255],center);
    const crop=extractGradientMapCrop(source,width,height,()=>1);
    expect([crop.width,crop.height,crop.rgba.length]).toEqual([128,128,128*128*4]);
    const at=((2000-crop.y)*128+2000-crop.x)*4;
    expect(Array.from(crop.rgba.subarray(at,at+4))).toEqual([19,73,201,255]);
  });
  it('clamps mask coverage and rejects invalid dimensions before indexing',()=>{
    const source=new Uint8ClampedArray(4*4*4);
    const crop=extractGradientMapCrop(source,4,4,(x)=>x===0?-.5:x===1?1.5:NaN);
    expect(Array.from(crop.coverage.subarray(0,4))).toEqual([0,255,0,0]);
    expect(()=>extractGradientMapCrop(source,5,4,()=>1)).toThrow('サイズ');
    expect(()=>extractGradientMapCrop(source,4,4,()=>1,257)).toThrow('サイズ');
  });
});
