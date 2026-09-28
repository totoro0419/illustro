import {expect,it} from 'vitest';
import {DabStreamBuilder} from './dabStream';

it('streams long dab sequences across bounded chunks',()=>{
  const b=new DabStreamBuilder();
  for(let i=0;i<600;i++)b.append(i+0.5,10.5,4);
  const s=b.seal();
  expect(s.count).toBe(600);
  expect(s.x(0)).toBe(0.5);
  expect(s.x(255)).toBe(255.5);
  expect(s.x(256)).toBe(256.5);
  expect(s.x(599)).toBe(599.5);
  expect(s.toFloat64Array()).toHaveLength(1800);
});
