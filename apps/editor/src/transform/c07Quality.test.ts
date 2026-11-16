import {describe,expect,it} from 'vitest';
import type {LayerMask} from '@illustro/core';
import {gridMesh,changeGrid} from './mesh';
import {transformLinkedMask} from './mask';
import {initialTransform,type Transform} from './geometry';

describe('C07 mesh safety regression',()=>{
  const bounds={x:0,y:0,width:90,height:90};
  it('keeps a pinned point when a new grid still contains its source coordinate',()=>{
    const original=gridMesh(bounds,3,3);
    const controls={...original,points:original.points.map((point,index)=>
      index===4?{...point,y:point.y+10,fixed:true}:point)};
    const resized=changeGrid(bounds,controls,5,5);
    const center=resized.points[12]!;
    expect(center.fixed).toBe(true);
    expect(center.x).toBeCloseTo(45);
    expect(center.y).toBeCloseTo(55);
  });
  it('rejects a grid change that would silently discard a pinned point',()=>{
    const original=gridMesh(bounds,3,3);
    const controls={...original,points:original.points.map((point,index)=>
      index===4?{...point,fixed:true}:point)};
    expect(()=>changeGrid(bounds,controls,4,4)).toThrow('固定した点が消える');
  });
  it('rejects invalid grid dimensions',()=>{
    expect(()=>changeGrid(bounds,gridMesh(bounds),1,4)).toThrow('分割数');
  });
  it('refuses to pretend an out-of-grid mask point was transformed',()=>{
    const mask={
      shape:'path',points:[{x:-10,y:10},{x:30,y:10},{x:30,y:30}],
      enabled:true,inverted:false,density:1,linked:true
    } as unknown as LayerMask;
    const settings:Transform={...initialTransform,mode:'mesh-grid',
      mesh:{bounds,controls:gridMesh(bounds)}};
    expect(()=>transformLinkedMask(mask,settings,90,90)).toThrow('変形範囲外');
  });
});
