import {describe,expect,it} from 'vitest';
import type {ArtPoint,EditablePath} from '@illustro/core';
import {appendPathStroke,combineShapes,eraseWholeStroke,joinPaths,sampledPath} from './pathOperations';

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
  it('rejects distant endpoints instead of silently creating a bridge',()=>{
    expect(()=>joinPaths(line(0,20),line(150,170))).toThrow();
    expect(joinPaths(line(0,20),line(21,50)).points).toHaveLength(4);
    expect(()=>joinPaths(line(0,20),line(30,50),0)).toThrow();
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
  });
  it('preserves the original operands when two closed shapes are combined',async()=>{
    const first=rectangle(0,40),second=rectangle(20,60);
    const combined=await combineShapes(first,second,'union');
    expect(combined.booleanOperands).toEqual({mode:'union',a:first,b:second});
    expect(combined.points.length).toBeGreaterThan(2);
  });
});
