import {describe,it,expect} from 'vitest';
import {groupTransformPlan,composeGroupAffine} from './groupTransform';
import {inverseTransform,initialTransform} from './geometry';
const items=[
 {id:'first',bounds:{x:20,y:30,width:40,height:30}},
 {id:'second',bounds:{x:100,y:40,width:50,height:60}}
];
describe('C07-003 group transformation geometry',()=>{
 it('uses one common center and preserves relative positions for multiple layers',()=>{
  const plan=groupTransformPlan(items,400,300,{
   dx:20,dy:-10,sx:1.5,sy:1.5,angle:90,interpolation:'bilinear'
  });
  expect(plan.outlines).toHaveLength(2);
  expect(plan.settings.cx).toBe(85);
  expect(plan.settings.cy).toBe(65);
  const inverse=inverseTransform(plan.settings,400,300);
  for(const line of plan.outlines){
   const point=inverse(line.after[0]!.x,line.after[0]!.y);
   expect(point.x).toBeCloseTo(line.before.x,8);
   expect(point.y).toBeCloseTo(line.before.y,8);
  }
 });
 it('rejects invalid bounds and duplicate layers before a grouped edit',()=>{
  const valid={dx:0,dy:0,sx:1,sy:1,angle:0,interpolation:'bilinear' as const};
  expect(()=>groupTransformPlan([items[0]!,items[0]!],400,300,valid)).toThrow('重複');
  expect(()=>groupTransformPlan([
    {...items[0]!,bounds:{...items[0]!.bounds,x:NaN}},items[1]!
  ],400,300,valid)).toThrow('範囲');
  expect(()=>groupTransformPlan([
    items[0]!,{...items[1]!,bounds:{...items[1]!.bounds,width:Infinity}}
  ],400,300,valid)).toThrow('範囲');
  expect(()=>groupTransformPlan([
    items[0]!,{...items[1]!,bounds:{...items[1]!.bounds,width:-2}}
  ],400,300,valid)).toThrow('範囲');
 });
 it('rejects impossible scales and missing layer selection',()=>{
  const valid={dx:0,dy:0,sx:1,sy:1,angle:0,interpolation:'bilinear' as const};
  expect(()=>groupTransformPlan([items[0]!],400,300,valid)).toThrow('2枚以上');
  expect(()=>groupTransformPlan(items,400,300,{...valid,sx:0})).toThrow('値');
  expect(()=>groupTransformPlan(items,400,300,{...valid,dy:NaN})).toThrow('値');
 });
 it('rejects finite but unrepresentable transformed bounds before publishing a group edit',()=>{
  const valid={dx:0,dy:0,sx:16,sy:16,angle:0,interpolation:'bilinear' as const};
  const extreme=[
   {id:'left',bounds:{x:-1e308,y:0,width:1e300,height:10}},
   {id:'right',bounds:{x:1e308,y:0,width:1e300,height:10}}
  ];
  expect(()=>groupTransformPlan(extreme,4000,4000,valid)).toThrow('座標');
 });
 it('plans many grouped layers without spreading their bounds as function arguments',()=>{
  const many=Array.from({length:12000},(_,i)=>({
   id:'layer-'+i,bounds:{x:i%4000,y:Math.floor(i/4000),width:1,height:1}
  }));
  const plan=groupTransformPlan(many,4000,4000,{
   dx:2,dy:3,sx:1,sy:1,angle:0,interpolation:'nearest'
  });
  expect(plan.outlines).toHaveLength(12000);
  expect(plan.settings.cx).toBe(2000);
  expect(plan.settings.cy).toBe(1.5);
 });
 it('composes repeated rotations, mirroring, nonuniform scales and shear from the same original',()=>{
  const next={...initialTransform,dx:19,dy:-7,sx:.6,sy:1.4,angle:37,cx:85,cy:65};
  for(const sx of [-1.2,1.2]){
    const previous={...initialTransform,dx:-3,dy:12,sx,sy:.8,shear:.25,angle:-18,cx:20,cy:30};
    const combined=composeGroupAffine(previous,next);
    const before=inverseTransform(previous,400,300),after=inverseTransform(next,400,300);
    const all=inverseTransform(combined,400,300);
    for(const point of [{x:0,y:0},{x:120,y:70},{x:399,y:299}]){
      const second=after(point.x,point.y),expected=before(second.x,second.y),actual=all(point.x,point.y);
      expect(actual.x).toBeCloseTo(expected.x,8);expect(actual.y).toBeCloseTo(expected.y,8);
    }
  }
  expect(()=>composeGroupAffine(initialTransform,{...next,sx:0})).toThrow();
  // Each individual edit is allowed, but the composed scale must not
  // silently become too small for stable inverse mapping.
  expect(()=>composeGroupAffine(
    {...initialTransform,sx:.01},{...initialTransform,sx:.01}
  )).toThrow('倍率');
  expect(()=>composeGroupAffine(
    {...initialTransform,sy:.01},{...initialTransform,sy:.01}
  )).toThrow('倍率');
  expect(()=>composeGroupAffine({...initialTransform,sx:16},{...next,sx:16})).toThrow('上限');
 });
});
