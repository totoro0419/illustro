import {describe,it,expect} from 'vitest';
import {nativeBrushSensors} from './brushInput';
const event=(pointerType:string,values:Record<string,number>={})=>
  ({pointerType,pressure:.5,tiltX:0,tiltY:0,twist:0,...values}) as PointerEvent;
describe('M10 pen sensor normalization',()=>{
 it('does not claim touch/mouse pressure or stylus tilt from default pointer values',()=>{
  expect(nativeBrushSensors(event('touch',{pressure:.5,twist:180}))).toEqual({pointerType:'touch'});
  expect(nativeBrushSensors(event('mouse',{pressure:.5,twist:180}))).toEqual({pointerType:'mouse'});
 });
 it('converts barrel rotation from platform degrees into Foundation radians',()=>{
  const sample=nativeBrushSensors(event('pen',{pressure:.25,tiltX:45,tiltY:0,twist:180,azimuthAngle:Math.PI/3}));
  expect(sample.pointerType).toBe('pen');
  expect(sample.pressure).toBe(.25);
  expect(sample.tilt).toBe(.5);
  expect(sample.twist).toBeCloseTo(Math.PI);
  expect(sample.azimuth).toBeCloseTo(Math.PI/3);
 });
 it('does not invent unsupported azimuth values from tilt axes',()=>{
  const sample=nativeBrushSensors(event('pen',{tiltX:30,tiltY:20,twist:0}));
  expect(sample.azimuth).toBeUndefined();
  expect(sample.twist).toBe(0);
 });
 it('rejects non-finite sensor readings without replacing them with fake data',()=>{
  const sample=nativeBrushSensors(event('pen',{pressure:NaN,tiltX:NaN,twist:NaN,azimuthAngle:NaN}));
  expect(sample.pressure).toBeUndefined();expect(sample.tilt).toBeUndefined();
  expect(sample.twist).toBeUndefined();expect(sample.azimuth).toBeUndefined();
 });
});
