import {describe,expect,it} from 'vitest';
import {hex,rgb} from './model';
import {inGamutMask,oklchToSrgb,toOklch} from './oklch';

describe('OKLCH gamut picker',()=>{
  it('round-trips sRGB primaries and black without clipping out-of-gamut colors',()=>{
    for(const color of [rgb(1,0,0),rgb(0,1,0),rgb(0,0,1),rgb(0,0,0),rgb(1,1,1)]){
      const restored=oklchToSrgb(toOklch(color));
      expect(restored&&hex(restored)).toBe(hex(color));
    }
    expect(oklchToSrgb({lightness:.6,chroma:.4,hue:180})).toBeNull();
  });
  it('treats 359 degrees as adjacent to zero on a restricted hue mask',()=>{
    const mask={enabled:true,hue:0,spread:20,minLight:.2,maxLight:.8,maxChroma:.2};
    expect(inGamutMask({lightness:.5,chroma:.1,hue:359},mask)).toBe(true);
    expect(inGamutMask({lightness:.5,chroma:.1,hue:180},mask)).toBe(false);
  });
});
