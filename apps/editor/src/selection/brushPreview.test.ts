import {describe,it,expect} from 'vitest';
import {selectionBrushPreviewDabs} from './brushPreview';

describe('C06-007 live selection-brush footprint',()=>{
  it('shows a visible dab for a single tap rather than an empty SVG move',()=>{
    expect(selectionBrushPreviewDabs([{x:5,y:8,pressure:1}],20))
      .toEqual([{x:5,y:8,radius:10}]);
  });
  it('varies the diameter along the line as pressure changes',()=>{
    const dots=selectionBrushPreviewDabs([
      {x:0,y:0,pressure:0},
      {x:20,y:0,pressure:1}
    ],20);
    expect(dots[0]?.radius).toBeCloseTo(2.5);
    expect(dots.at(-1)?.radius).toBeCloseTo(10);
    expect(dots.at(-1)?.x).toBe(20);
    expect(dots.every(dot=>dot.radius>=2.5&&dot.radius<=10)).toBe(true);
  });
  it('bounds preview allocations for long strokes and rejects invalid settings',()=>{
    const points=Array.from({length:10_000},(_,i)=>({x:i,y:1,pressure:.5}));
    const dots=selectionBrushPreviewDabs(points,28,64);
    expect(dots.length).toBeLessThanOrEqual(64);
    expect(dots.at(-1)?.x).toBe(9_999);
    expect(selectionBrushPreviewDabs(points,0)).toEqual([]);
    expect(selectionBrushPreviewDabs(points,28,0)).toEqual([]);
  });
});
