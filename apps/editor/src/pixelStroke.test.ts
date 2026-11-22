import {describe,expect,it} from 'vitest';
import {applyPixelCell,pixelStroke} from './pixelStroke';

describe('one pixel drawing',()=>{
  it('visits each integer cell once on a diagonal stroke with fractional input',()=>{
    const cells=pixelStroke([{x:.2,y:.8},{x:3.7,y:3.4},{x:.2,y:.8}],4,4);
    expect([...cells]).toEqual([0,5,10,15]);
  });
  it('uses opaque color for a full pixel and respects the alpha lock',()=>{
    const pixel=Uint8Array.of(1,2,3,128);
    applyPixelCell(pixel,0,[50,60,70],1,false,true);
    expect([...pixel]).toEqual([50,60,70,128]);
    expect(applyPixelCell(pixel,0,[50,60,70],1,true,true)).toBe(false);
    applyPixelCell(pixel,0,[50,60,70],1,true,false);
    expect([...pixel]).toEqual([0,0,0,0]);
  });
});
