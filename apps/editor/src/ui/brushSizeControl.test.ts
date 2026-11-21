import {describe,expect,it} from 'vitest';
import {referenceBrushes} from '@illustro/brush-rt';
import {additionalBrushes} from '../brushStarterPresets';
import {sizeRange,sliderSize} from './brushSizeControl';

describe('brush size controls',()=>{
 it('keeps a narrow drawing range for fine pens and allows existing larger sizes',()=>{
  const gPen=referenceBrushes.find(brush=>brush.id==='foundation-g-pen')!;
  expect(sizeRange({...gPen,size:240})).toEqual({min:.75,max:30,minimum:.75,maximum:4096});
  const airbrush=additionalBrushes(referenceBrushes).find(brush=>brush.id==='illustro-airbrush-v1')!;
  expect(sizeRange(airbrush).max).toBe(1400);
 });
 it('gives small eraser diameters more travel with exact endpoints',()=>{
  const eraser=referenceBrushes.find(brush=>brush.id==='foundation-hard-eraser')!;
  const sizes=Array.from({length:1001},(_,i)=>sliderSize(eraser,i));
  expect(sizes[0]).toBe(1);
  expect(sizes[1000]).toBe(1000);
  expect(sizes[500]).toBeCloseTo(31.6);
  expect(sizes.every((value,i)=>i===0||value>=sizes[i-1]!)).toBe(true);
  expect(sizes[10]! - sizes[0]!).toBeLessThan(.1);
 });
});
