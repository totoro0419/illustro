import {describe,expect,it} from 'vitest';
import {recommendInterpolation} from './interpolationAdvice';
import {initialTransform} from './geometry';

describe('C07-015 understandable, optional interpolation suggestions',()=>{
 it('recommends hard edges for pixel art, without editing stored settings',()=>{
  const settings={...initialTransform,sx:.1,sy:.1},before=structuredClone(settings);
  const recommendation=recommendInterpolation('pixel-art',settings);
  expect(recommendation.value).toBe('nearest');
  expect(settings).toEqual(before);
 });
 it('prefers accurate area average for axis-aligned shrinking of art and photos',()=>{
  expect(recommendInterpolation('line-art',{...initialTransform,sx:.25,sy:.5}).value).toBe('area');
  expect(recommendInterpolation('photo',{...initialTransform,sx:-.4,sy:.6}).value).toBe('area');
 });
 it('does not recommend exact area filtering for rotate, shear or mesh that still use bounded sampling',()=>{
  expect(recommendInterpolation('photo',{...initialTransform,sx:.1,angle:25}).value).toBe('bilinear');
  expect(recommendInterpolation('illustration',{...initialTransform,sx:.1,shear:.4}).value).toBe('bilinear');
  expect(recommendInterpolation('photo',{...initialTransform,mode:'mesh-grid',sx:.1}).value).toBe('bilinear');
 });
 it('keeps the normal default for simple movement and enlarging',()=>{
  expect(recommendInterpolation('illustration',initialTransform).value).toBe('bilinear');
  expect(recommendInterpolation('photo',{...initialTransform,sx:2,sy:2}).value).toBe('bilinear');
 });
});
