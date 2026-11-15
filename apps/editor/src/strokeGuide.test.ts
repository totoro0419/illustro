import {describe,expect,it} from 'vitest';
import {DEFAULT_GUIDE_SETTINGS,lockStraightGuide,normalizeGuideSettings,snapToStraightGuide} from './strokeGuide';

describe('BRU-010 straight ruler',()=>{
 it('snaps to a horizontal document-space line through the pen-down point',()=>{
  const guide=lockStraightGuide({x:50,y:70},{...DEFAULT_GUIDE_SETTINGS,enabled:true},false)!;
  expect(snapToStraightGuide({x:90,y:110},guide)).toEqual({x:90,y:70});
 });
 it('uses a fixed angle independently of view zoom',()=>{
  const guide=lockStraightGuide({x:10,y:10},{enabled:true,angle:90,strength:1,applyEraser:true},true)!;
  const result=snapToStraightGuide({x:30,y:50},guide);
  expect(result.x).toBeCloseTo(10,9);expect(result.y).toBeCloseTo(50,9);
 });
 it('supports partial snapping and keeps frozen settings for an active stroke',()=>{
  const settings={enabled:true,angle:0,strength:0.5,applyEraser:false};
  const guide=lockStraightGuide({x:0,y:0},settings,false)!;
  settings.strength=0;
  expect(snapToStraightGuide({x:8,y:8},guide)).toEqual({x:8,y:4});
 });
 it('does not change normal drawing, bypassed strokes or unselected eraser strokes',()=>{
  const settings={...DEFAULT_GUIDE_SETTINGS,enabled:true};
  expect(lockStraightGuide({x:0,y:0},settings,true)).toBeNull();
  expect(lockStraightGuide({x:0,y:0},settings,false,true)).toBeNull();
  expect(lockStraightGuide({x:0,y:0},DEFAULT_GUIDE_SETTINGS,false)).toBeNull();
 });
 it('normalizes angle and invalid controls',()=>{
  expect(normalizeGuideSettings({enabled:true,angle:-90,strength:2,applyEraser:true})).toEqual({enabled:true,angle:270,strength:1,applyEraser:true});
 });
});
