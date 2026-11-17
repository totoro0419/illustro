import {describe,it,expect} from 'vitest';
import {groupTransformPlan} from './groupTransform';
import {inverseTransform} from './geometry';
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
});
