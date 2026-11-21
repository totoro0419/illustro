import {describe,expect,it} from 'vitest';
import type {ArtPoint,EditablePath} from '@illustro/core';
import {appendPathStroke,combineShapes,eraseSegment,eraseWholeStroke,joinPaths,sampledPath} from './pathOperations';

const line=(start:number,end:number):EditablePath=>({
  kind:'path',shape:'polyline',points:[{x:start,y:0},{x:end,y:0}],
  closed:false,stroke:'#000000',fill:null,width:3
});
const rectangle=(left:number,right:number):EditablePath=>({
  kind:'path',shape:'rectangle',points:[{x:left,y:0},{x:right,y:40}],
  closed:true,stroke:'#000000',fill:'#000000',width:2
});
const distance=(p:ArtPoint,a:ArtPoint,b:ArtPoint)=>{
  const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;
  const t=d?Math.min(1,Math.max(0,((p.x-a.x)*dx+(p.y-a.y)*dy)/d)):0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
};

describe('C10 vector editing geometry',()=>{
  it('groups two separate strokes without bridging them and erases only the touched stroke',()=>{
    const combined=appendPathStroke(line(0,30),line(200,240));
    expect(combined.points[2]?.move).toBe(true);
    expect(combined.points).toHaveLength(4);
    const remaining=eraseWholeStroke(combined,{x:220,y:0});
    expect(remaining?.points).toHaveLength(2);
    expect(remaining?.points[0]?.x).toBe(0);
    expect(eraseWholeStroke(line(0,30),{x:10,y:0})).toBeNull();
    expect(()=>appendPathStroke(line(0,30),{...line(35,40),stroke:'#ffffff'})).toThrow();
  });
  it('appends legacy solid paths with the same color written in a different hex case',()=>{
    const original={...line(0,30),stroke:'#abcdef'};
    const appended=appendPathStroke(original,{...line(40,60),stroke:'#ABCDEF',lineStyle:'solid'});
    expect(appended.points[2]?.move).toBe(true);expect(appended.stroke).toBe(original.stroke);
    expect(appended.points).toHaveLength(4);
  });
  it('rejects distant endpoints instead of silently creating a bridge',()=>{
    expect(()=>joinPaths(line(0,20),line(150,170))).toThrow();
    expect(joinPaths(line(0,20),line(21,50)).points).toHaveLength(4);
    expect(()=>joinPaths(line(0,20),line(30,50),0)).toThrow();
  });
  it('joins nearby curves with a straight bridge and merges coincident endpoints without losing original handles',()=>{
    const first:EditablePath={...line(0,20),shape:'bezier',points:[
      {x:0,y:0,outX:10,outY:0},{x:20,y:0,inX:10,inY:0,outX:20,outY:100}
    ]};
    const second:EditablePath={...line(21,40),shape:'bezier',points:[
      {x:21,y:0,inX:21,inY:-100,outX:30,outY:0},{x:40,y:0,inX:30,inY:0}
    ]};
    const joined=joinPaths(first,second);
    expect(joined.points).toHaveLength(4);
    expect(joined.points[1]?.outX).toBeUndefined();
    expect(joined.points[2]?.inX).toBeUndefined();
    expect(sampledPath(joined)[0]!.every(p=>Math.abs(p.y)<.001)).toBe(true);
    expect(first.points[1]?.outY).toBe(100);
    const exact=joinPaths(first,{...second,points:[{...second.points[0]!,x:20},second.points[1]!]});
    expect(exact.points).toHaveLength(3);
    expect(exact.points[1]?.inX).toBe(10);
    expect(exact.points[1]?.outX).toBe(30);
  });
  it('hits a strongly curved 4K stroke that a fixed 16-segment approximation misses',()=>{
    const path:EditablePath={...line(0,4100),shape:'bezier',points:[
      {x:0,y:0,outX:0,outY:4000},{x:4000,y:0,inX:4000,inY:4000},{x:4100,y:0}
    ]};
    const t=.46875,u=1-t;
    const target={x:3*u*t*t*4000+t*t*t*4000,y:3*u*u*t*4000+3*u*t*t*4000};
    const result=eraseSegment(path,target);
    expect(result.points).toHaveLength(2);
    expect(result.points[0]?.x).toBe(4000);
    expect(result.points[1]?.x).toBe(4100);
  });
  it('samples high-curvature Bézier paths with sub-pixel error',()=>{
    const bezier:EditablePath={...line(0,200),shape:'bezier',
      points:[{x:0,y:0,outX:0,outY:120},{x:200,y:0,inX:200,inY:120}]};
    const sampled=sampledPath(bezier,.5)[0]!;
    expect(sampled.length).toBeGreaterThan(10);
    const actual=(t:number):ArtPoint=>{const u=1-t;return {
      x:3*u*t*t*200+t*t*t*200,
      y:3*u*u*t*120+3*u*t*t*120
    };};
    let error=0;
    for(let i=0;i<=1000;i++){
      const p=actual(i/1000);
      error=Math.max(error,Math.min(...sampled.slice(1).map((q,j)=>distance(p,sampled[j]!,q))));
    }
    expect(error).toBeLessThan(.6);
    expect(()=>sampledPath(bezier,.1,3)).toThrow();
  });
  it('can refine a long high-curvature 4K Bézier beyond the former 255-point cap',()=>{
    const longCurve:EditablePath={...line(0,4000),shape:'bezier',
      points:[{x:0,y:0,outX:0,outY:4000},{x:4000,y:0,inX:4000,inY:4000}]};
    const fine=sampledPath(longCurve,.002,8192)[0]!;
    expect(fine.length).toBeGreaterThan(256);
    expect(fine.length).toBeLessThanOrEqual(2050);
    expect(fine[0]!.x).toBe(0);
    expect(fine.at(-1)!.x).toBe(4000);
    expect(fine.at(-1)!.y).toBe(0);
    // An excessively strict tolerance must fail clearly instead of
    // returning a visibly inaccurate last segment.
    expect(()=>sampledPath(longCurve,.00001,8192)).toThrow(/精度/);
  });
  it('honors the requested error and point budget for large ellipses and rectangles',()=>{
    const ellipse:EditablePath={...rectangle(0,4000),shape:'ellipse',
      points:[{x:0,y:0},{x:4000,y:4000}]};
    expect(sampledPath(ellipse,.5,2049)[0]!.length).toBeGreaterThan(40);
    expect(()=>sampledPath(ellipse,.000001,8192)).toThrow(/精度/);
    expect(()=>sampledPath(ellipse,.5,8)).toThrow(/点数/);
    expect(()=>sampledPath(rectangle(0,40),.5,4)).toThrow(/点数/);
  });
  it('preserves the original operands when two closed shapes are combined',async()=>{
    const first=rectangle(0,40),second=rectangle(20,60);
    const combined=await combineShapes(first,second,'union');
    expect(combined.booleanOperands).toEqual({mode:'union',a:first,b:second});
    expect(combined.points.length).toBeGreaterThan(2);
  });
});
