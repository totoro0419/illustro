import {describe,expect,it} from 'vitest';
import {sampleFillDetail} from './detailPreview';

describe('C08-004 pixel-perfect local inspection',()=>{
  it('shows a 64×64 original-pixel crop without allocating a full-size image',()=>{
    const pixels=new Uint8Array(100*100*4);
    pixels.set([40,120,220,255],(50*100+50)*4);
    const crop=sampleFillDetail(pixels,100,100,50,50);
    const center=(32*64+32)*4;
    expect(Array.from(crop.slice(center,center+4))).toEqual([40,120,220,255]);
    expect(crop.length).toBe(64*64*4);
    expect(Array.from(crop.slice(center-4,center))).toEqual([240,240,240,255]);
  });
  it('keeps edges safe and rejects invalid source dimensions',()=>{
    const pixels=new Uint8Array(2*2*4);
    const result=sampleFillDetail(pixels,2,2,0,0);
    expect(result.length).toBe(64*64*4);
    expect(result[3]).toBe(255);
    expect(()=>sampleFillDetail(pixels,3,3,0,0)).toThrow('大きさ');
    expect(()=>sampleFillDetail(pixels,2,2,NaN,0)).toThrow('大きさ');
    expect(()=>sampleFillDetail(pixels,2,2,0,0,129)).toThrow('大きさ');
  });
});
