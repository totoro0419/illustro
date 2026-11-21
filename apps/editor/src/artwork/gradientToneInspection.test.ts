import {describe,expect,it} from 'vitest';
import {validateGradientMap} from '@illustro/core';
import {gradientToneInspection} from './gradientToneInspection';

const map=(levels:number)=>validateGradientMap({
 stops:[
  {at:0,color:'#000000',opacity:1,midpoint:.5},
  {at:1,color:'#ffffff',opacity:1,midpoint:.5}
 ],
 levels,dither:false
});
describe('C09-014 exact gradient-map tonal inspection',()=>{
 it('reports original 0–255 tone lookup endpoints even when artwork preview is downscaled',()=>{
  const m=map(256),low=gradientToneInspection(m,0),high=gradientToneInspection(m,255);
  expect(low.tone).toBe(0);expect(high.tone).toBe(255);
  expect(low.rgba).toHaveLength(4);
  expect(high.rgba).toHaveLength(4);
  expect(high.rgba[0]!).toBeGreaterThan(low.rgba[0]!);
  expect(low.nextDifference).toBeGreaterThanOrEqual(0);
 });
 it('shows fewer color transitions when posterized to only two levels',()=>{
  const full=gradientToneInspection(map(256),128);
  const coarse=gradientToneInspection(map(2),128);
  expect(coarse.transitions).toBeLessThan(full.transitions);
  expect(coarse.transitions).toBeGreaterThan(0);
 });
 it('clamps inspected brightness to the valid scale',()=>{
  const m=map(256);
  expect(gradientToneInspection(m,-30).tone).toBe(0);
  expect(gradientToneInspection(m,300).tone).toBe(255);
 });
});
