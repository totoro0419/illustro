import {describe,expect,it} from 'vitest';
import {roundedRectanglePoints,regularPolygonPoints,reverseGradientStops,shapeGradientInitialMask} from './shapeGradient';

describe('C09-004 shape selection snapshot',()=>{
  it('commits the mask used for a new shape preview even if the active selection changes',()=>{
    const original={shape:'rectangle',x:12,y:20,width:100,height:60,enabled:true,inverted:false,density:1} as const;
    const changed={...original,x:300};
    const snapshot=original;
    expect(shapeGradientInitialMask(undefined,snapshot)).toBe(original);
    expect(shapeGradientInitialMask(undefined,snapshot)).not.toBe(changed);
  });
  it('preserves an explicitly empty selection and existing editable-layer masks',()=>{
    const mask={shape:'ellipse',x:0,y:0,width:20,height:20,enabled:true,inverted:false,density:.5} as const;
    expect(shapeGradientInitialMask(undefined,null)).toBeNull();
    expect(shapeGradientInitialMask('existing-layer',mask)).toBeUndefined();
  });
});

describe('C09 editable shape geometry',()=>{
  it('generates a closed eight-anchor rounded rectangle with tangent handles',()=>{
    const points=roundedRectanglePoints({x:0,y:0},{x:100,y:60},15);
    expect(points).toHaveLength(8);
    expect(points[0]).toMatchObject({x:15,y:0});
    expect(points[1]!.outX).toBeGreaterThan(85);
    expect(points[2]!.inY).toBeLessThan(15);
    expect(points[7]!.outY).toBeGreaterThan(0);
  });
  it('limits the corner radius to half the shorter side',()=>{
    const points=roundedRectanglePoints({x:80,y:40},{x:0,y:0},1000);
    expect(points[0]!.x).toBe(20);
    expect(points[2]!.y).toBe(20);
  });
  it('supports sharp corners when radius is zero',()=>{
    const points=roundedRectanglePoints({x:0,y:0},{x:12,y:8},0);
    expect(points).toHaveLength(4);
    expect(points[2]).toEqual({x:12,y:8});
  });
  it('creates evenly spaced editable vertices for regular polygons',()=>{
    const points=regularPolygonPoints({x:0,y:0},{x:100,y:100},6);
    expect(points).toHaveLength(6);
    expect(points[0]!.x).toBeCloseTo(50);
    expect(points[0]!.y).toBeCloseTo(0);
    for(const point of points)expect(Math.hypot(point.x-50,point.y-50)).toBeCloseTo(50,8);
  });
  it('clamps the number of vertices to the supported editing limit',()=>{
    expect(regularPolygonPoints({x:0,y:0},{x:100,y:100},2)).toHaveLength(3);
    expect(regularPolygonPoints({x:0,y:0},{x:100,y:100},500)).toHaveLength(64);
  });
  it('reverses color-stop positions and interval midpoints without changing original data',()=>{
    const original=[
      {at:0,color:'#112233',opacity:0.25,midpoint:0.2},
      {at:0.3,color:'#223344',opacity:0.7,midpoint:0.8},
      {at:1,color:'#334455',opacity:1,midpoint:0.5}
    ];
    const reverse=reverseGradientStops(original);
    expect(reverse.map(stop=>stop.at)).toEqual([0,0.7,1]);
    expect(reverse.map(stop=>stop.color)).toEqual(['#334455','#223344','#112233']);
    const midpoint=reverse.map(stop=>stop.midpoint);
    expect(midpoint[0]).toBeCloseTo(0.2,12);
    expect(midpoint.slice(1)).toEqual([0.8,0.2]);
    const restored=reverseGradientStops(reverse);
    expect(restored[0]!.midpoint).toBeCloseTo(0.2,12);
    expect(restored[1]!.midpoint).toBeCloseTo(0.8,12);
    expect(original[0]!.at).toBe(0);
  });
});
