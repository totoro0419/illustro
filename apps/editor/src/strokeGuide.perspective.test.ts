import {describe,expect,it} from 'vitest';
import type {ArtworkGuide} from '@illustro/core';
import {lockArtworkGuide,perspectiveAxisForHeading,snapToStraightGuide} from './strokeGuide';

const guide:ArtworkGuide={id:'p',name:'透視',kind:'perspective2',origin:{x:0,y:25},
  vanishing:[{x:100,y:0},{x:150,y:150}],activeAxis:0,angle:0,rx:120,ry:72,
  spacing:32,strength:1,range:24,enabled:true,locked:false,applyEraser:false};
const start={x:50,y:50};
describe('C09-001 first-motion perspective axis selection',()=>{
  it('chooses the nearest line direction even if the opposite sign is drawn',()=>{
    expect(perspectiveAxisForHeading(start,guide,{x:10,y:-10})).toBe(1);
    expect(perspectiveAxisForHeading(start,guide,{x:-10,y:10})).toBe(1);
    expect(perspectiveAxisForHeading(start,guide,{x:-10,y:-10})).toBe(0);
  });
  it('keeps the configured axis until at least two document pixels of motion',()=>{
    expect(perspectiveAxisForHeading(start,guide,{x:1,y:0})).toBe(0);
    expect(lockArtworkGuide(start,[guide],false,null)?.guide.origin).toEqual(guide.origin);
  });
  it('uses the selected vanishing point and preserves the eraser opt-in rule',()=>{
    const selected=lockArtworkGuide(start,[guide],false,null,{x:10,y:-10});
    expect(selected?.guide.origin).toEqual(guide.vanishing[0]);
    const snapped=snapToStraightGuide({x:75,y:60},selected!.guide);
    expect(snapped.x).toBeCloseTo(57.5);
    expect(snapped.y).toBeCloseTo(42.5);
    expect(lockArtworkGuide(start,[guide],true,null,{x:10,y:-10})).toBeNull();
  });
});
