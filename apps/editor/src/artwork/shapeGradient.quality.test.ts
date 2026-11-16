import {describe,expect,it} from 'vitest';
import {roundedRectanglePoints,regularPolygonPoints} from './shapeGradient';

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
});
