import {describe,expect,it} from 'vitest';
import {compositeWhiteBackdrop} from './logicalWhitePixel';

describe('virtual white eyedropper compositing',()=>{
  it('returns solid white on untouched paper',()=>{
    expect(compositeWhiteBackdrop([0,0,0,0],1)).toEqual([255,255,255,255]);
  });
  it('uses correct straight-alpha weighting for colored translucent ink',()=>{
    expect(compositeWhiteBackdrop([128,64,32,128],1)).toEqual([191,159,143,255]);
  });
  it('preserves a fully opaque ink pixel',()=>{
    expect(compositeWhiteBackdrop([21,89,233,255],1)).toEqual([21,89,233,255]);
  });
  it('respects the editable white layer opacity',()=>{
    expect(compositeWhiteBackdrop([0,0,0,128],.5)).toEqual([85,85,85,192]);
    expect(compositeWhiteBackdrop([0,0,0,0],0)).toEqual([0,0,0,0]);
  });
});
