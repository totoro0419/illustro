import {describe,it,expect} from 'vitest';
import {shouldShowPixelGrid} from './pixelGridVisibility';
describe('R2 D-001 high-zoom pixel grid',()=>{
  it('never shows the grid when switched OFF, even at 1200% zoom',()=>{
    expect(shouldShowPixelGrid(false,12,800,true)).toBe(false);
  });
  it('hides below the threshold and after switching to Fit',()=>{
    expect(shouldShowPixelGrid(true,4,800,true)).toBe(false);
    expect(shouldShowPixelGrid(true,12,800,true)).toBe(true);
    expect(shouldShowPixelGrid(true,1,800,true)).toBe(false);
  });
  it('cannot carry a visible grid across an unmounted document',()=>{
    expect(shouldShowPixelGrid(true,12,800,false)).toBe(false);
    expect(shouldShowPixelGrid(true,12,800,true)).toBe(true);
    expect(shouldShowPixelGrid(false,12,800,true)).toBe(false);
  });
});
