import {describe,it,expect} from 'vitest';
import {referenceBrushes} from '@illustro/brush-rt';
import {sameEditableBrush,curveAt,addCurvePoint,moveCurvePoint,removeCurvePoint} from './brushEditorModel';

describe('M10 brush editing isolation and response curve',()=>{
 it('ignores transient foreground color but detects setting edits',()=>{
  const a=structuredClone(referenceBrushes[0]!);
  const b=structuredClone(a);b.color=[.5,.6,.7];
  expect(sameEditableBrush(a,b)).toBe(true);
  b.forceFade!.start+=.1;
  expect(sameEditableBrush(a,b)).toBe(false);
  expect(referenceBrushes[0]!.forceFade!.start).not.toBe(b.forceFade!.start);
 });
 it('adds, numerically moves and removes a curve point without mutating source',()=>{
  const base=[[0,0],[1,1]] as const;
  const added=addCurvePoint(base,.4);
  expect(added).toEqual([[0,0],[.4,.4],[1,1]]);
  const moved=moveCurvePoint(added,1,.45,.75);
  expect(moved).toEqual([[0,0],[.45,.75],[1,1]]);
  expect(curveAt(moved,.45)).toBe(.75);
  expect(removeCurvePoint(moved,1)).toEqual(base);
  expect(base).toEqual([[0,0],[1,1]]);
 });
 it('rejects invalid or overlapping points and preserves end positions',()=>{
  const c=[[0,0],[.5,.4],[1,1]] as const;
  expect(()=>addCurvePoint(c,.5005,.8)).toThrow();
  expect(()=>moveCurvePoint(c,1,1,.5)).toThrow();
  expect(()=>removeCurvePoint(c,0)).toThrow();
  expect(moveCurvePoint(c,0,.4,.1)[0]).toEqual([0,.1]);
  expect(moveCurvePoint(c,2,.4,.9)[2]).toEqual([1,.9]);
 });
});
