import {describe,expect,it} from 'vitest';
import type {ColorHint} from '@illustro/core';
import {colorHintCenter,moveColorHint} from './colorHintPlacement';
const hint:ColorHint={color:'#ff4400',width:5,points:[{x:2,y:2},{x:4,y:2},{x:4,y:4}]};
describe('C08-010 canvas-direct saved color hint positioning',()=>{
 it('moves all trace points by the same distance and keeps original data unchanged',()=>{
  const originalCenter=colorHintCenter(hint);
  const moved=moveColorHint(hint,{x:10,y:10},100,100);
  const targetCenter=colorHintCenter(moved);
  expect(targetCenter.x).toBeCloseTo(10);
  expect(targetCenter.y).toBeCloseTo(10);
  expect(moved.points[1]!.x-moved.points[0]!.x).toBe(2);
  expect(moved.color).toBe('#ff4400');
  expect(hint.points[0]!.x).toBe(2);
  expect(originalCenter.x).toBeCloseTo(10/3);
 });
 it('clamps a whole stroke at the image edge without flattening its geometry',()=>{
  const moved=moveColorHint(hint,{x:999,y:999},20,20);
  const first=moved.points[0]!,second=moved.points[1]!,third=moved.points[2]!;
  expect(third.x).toBe(19);expect(third.y).toBe(19);
  expect(second.x-first.x).toBe(2);
  expect(third.y-second.y).toBe(2);
 });
 it('rejects missing geometry or nonfinite pointer coordinates',()=>{
  expect(()=>moveColorHint(hint,{x:NaN,y:2},100,100)).toThrow('位置');
  expect(()=>moveColorHint({...hint,points:[]},{x:1,y:2},100,100)).toThrow('位置');
  expect(()=>colorHintCenter({...hint,points:[]})).toThrow('線');
 });
});
