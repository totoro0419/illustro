import {describe,expect,it} from 'vitest';
import {correctionGeometry,correctionSuggestedShape} from './strokeCorrection';

describe('C09-006 held-pen correction guide',()=>{
  it('chooses the same open-curve shape as the committed correction dialog',()=>{
    const loop=[{x:10,y:10},{x:50,y:0},{x:70,y:30},{x:40,y:60},{x:12,y:12}];
    expect(correctionSuggestedShape(loop)).toBe('ellipse');
    expect(correctionGeometry(loop,'ellipse')).toHaveLength(64);
    const line=[{x:0,y:0},{x:30,y:3},{x:80,y:10}];
    expect(correctionSuggestedShape(line)).toBe('polyline');
    expect(correctionGeometry(line,'polyline')).toEqual([{x:0,y:0},{x:80,y:10}]);
  });
  it('uses the same rectangle and ellipse bounds as final correction geometry',()=>{
    const points=[{x:5,y:20},{x:30,y:45},{x:10,y:15}];
    expect(correctionGeometry(points,'rectangle')).toEqual([
      {x:5,y:15},{x:30,y:15},{x:30,y:45},{x:5,y:45}
    ]);
    const ellipse=correctionGeometry(points,'ellipse');
    expect(ellipse[0]).toMatchObject({x:30,y:30});
    expect(ellipse[16]!.y).toBeCloseTo(45,10);
    expect(ellipse[32]!.x).toBeCloseTo(5,10);
    expect(points[0]).toEqual({x:5,y:20});
  });
  it('does not generate a guide for incomplete input',()=>{
    expect(correctionGeometry([],'ellipse')).toEqual([]);
    expect(correctionGeometry([{x:0,y:0}],'polyline')).toEqual([]);
    expect(correctionSuggestedShape([{x:0,y:0},{x:1,y:1}])).toBe('polyline');
  });
});
