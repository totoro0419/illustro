import {describe,expect,it} from 'vitest';
import {applyRasterEffects} from './rasterFilters';
import {newEffect} from './rasterSettings';

describe('raster filters',()=>{
  it('removes an isolated dot and leaves a connected one-pixel line',()=>{
    const image=new Uint8Array(7*7*4);
    for(const [x,y] of [[1,1],[2,1],[3,1],[5,5]] as const)image.set([20,40,80,255],(y*7+x)*4);
    const output=applyRasterEffects(image,7,7,[newEffect('median')],null);
    expect([...output.slice((5*7+5)*4,(5*7+6)*4)]).toEqual([0,0,0,0]);
    expect([...output.slice((7+1)*4,(7+4)*4)]).toEqual([20,40,80,255,20,40,80,255,20,40,80,255]);
    expect(image[(5*7+5)*4+3]).toBe(255);
  });
  it('softens the boundary in premultiplied color and keeps an unselected pixel',()=>{
    const image=Uint8Array.of(0,0,0,0,240,0,0,255,0,0,0,0);
    const radius={...newEffect('box'),values:[1,0,0,0]};
    const pixels=applyRasterEffects(image,3,1,[radius],Uint8Array.of(255,255,0));
    expect([...pixels]).toEqual([240,0,0,85,240,0,0,85,0,0,0,0]);
  });
  it('colors the exterior pixels of an outline while preserving the opaque original',()=>{
    const image=new Uint8Array(3*3*4);
    image.set([255,250,240,255],16);
    const step={...newEffect('outline'),values:[1,0x0033ff,0,100]};
    const result=applyRasterEffects(image,3,3,[step],null);
    expect([...result.slice(0,4)]).toEqual([0,51,255,255]);
    expect([...result.slice(16,20)]).toEqual([255,250,240,255]);
  });
  it('applies curves in order and preserves the focus band in lens blur',()=>{
    const pixel=Uint8Array.of(0,0,0,0,64,128,192,255,0,0,0,0);
    const changed=applyRasterEffects(pixel,1,3,[{...newEffect('curves'),values:[0,64,20,128,60,192,160]},newEffect('invert')],null);
    expect([...changed.slice(4,8)]).toEqual([235,195,95,255]);
    const lens=applyRasterEffects(pixel,1,3,[newEffect('lens')],null);
    expect([...lens.slice(4,8)]).toEqual([64,128,192,255]);
  });
  it('keeps the alpha channel when the layer transparency is locked',()=>{
    const image=Uint8Array.of(220,150,80,66,0,0,0,0);
    const pixels=applyRasterEffects(image,2,1,[{...newEffect('invert'),values:[0,1]}],null,true);
    expect(pixels[3]).toBe(66);
    expect([...pixels.subarray(4)]).toEqual([0,0,0,0]);
  });
});
