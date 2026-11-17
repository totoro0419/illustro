import {describe,expect,it} from 'vitest';
import type {ArtworkGuide} from '@illustro/core';
import {DEFAULT_GUIDE_SETTINGS} from '../strokeGuide';
import {snapArtworkPathToGuide} from './guidedPath';

const perspective:ArtworkGuide={id:'two',name:'2点透視',kind:'perspective2',origin:{x:0,y:25},
  vanishing:[{x:100,y:0},{x:150,y:150}],activeAxis:0,angle:0,rx:120,ry:72,
  spacing:32,strength:1,range:24,enabled:true,locked:false,applyEraser:false};
describe('C09-003/016 unified ruler snapping for line and gradient tools',()=>{
  it('snaps multiple points along the same horizontal ruler without discarding drawing attributes',()=>{
    const input=[{x:10,y:12,pressure:.4},{x:30,y:25,pressure:.7},{x:60,y:50,pressure:1}];
    const output=snapArtworkPathToGuide(input,[],{...DEFAULT_GUIDE_SETTINGS,enabled:true},null);
    expect(output.map(p=>p.y)).toEqual([12,12,12]);
    expect(output.map(p=>p.pressure)).toEqual([.4,.7,1]);
    expect(input[1]!.y).toBe(25);
  });
  it('keeps all points unchanged when no guide is enabled',()=>{
    const points=[{x:0,y:1},{x:8,y:14}];
    expect(snapArtworkPathToGuide(points,[],DEFAULT_GUIDE_SETTINGS,null)).toEqual(points);
  });
  it('chooses one perspective direction from the gesture and applies it consistently',()=>{
    const points=[{x:50,y:50},{x:60,y:60},{x:80,y:20}];
    const snapped=snapArtworkPathToGuide(points,[perspective],DEFAULT_GUIDE_SETTINGS,null);
    expect(snapped[0]).toEqual({x:50,y:50});
    expect(snapped[1]!.x+snapped[1]!.y).toBeCloseTo(100);
    expect(snapped[2]!.x+snapped[2]!.y).toBeCloseTo(100);
  });
});
