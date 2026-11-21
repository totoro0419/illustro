import {describe,expect,it} from 'vitest';
import type {ArtworkGuide} from '@illustro/core';
import {lockArtworkGuide,perspectiveAxisForHeading,snapToStraightGuide} from './strokeGuide';

const base:ArtworkGuide={
  id:'ordinary',name:'水平定規',kind:'straight',origin:{x:0,y:4},
  vanishing:[{x:0,y:100},{x:-100,y:0}],activeAxis:0,
  angle:0,rx:120,ry:72,spacing:32,strength:1,range:24,enabled:true,locked:false,applyEraser:false
};
const perspective:ArtworkGuide={...base,id:'perspective',name:'透視定規',kind:'perspective2',
  origin:{x:100,y:0},vanishing:[{x:0,y:100},{x:-100,y:0}]};

describe('C09 guide priority and perspective axes',()=>{
 it('uses a nearby ordinary guide instead of the zero-distance perspective candidate',()=>{
   const chosen=lockArtworkGuide({x:0,y:0},[perspective,base],false,null);
   expect(chosen?.name).toBe('水平定規');
   expect(snapToStraightGuide({x:20,y:20},chosen!.guide).y).toBeCloseTo(4);
 });
 it('honours an explicitly selected perspective guide',()=>{
   const chosen=lockArtworkGuide({x:0,y:0},[perspective,base],false,'perspective');
   expect(chosen?.name).toBe('透視定規');
 });
 it('uses the perspective guide when ordinary rulers are outside the configured range',()=>{
   const distant={...base,origin:{x:0,y:40}};
   expect(lockArtworkGuide({x:0,y:0},[perspective,distant],false,null)?.name).toBe('透視定規');
 });
 it('selects a vanishing point by the first significant motion when a heading is provided',()=>{
   expect(perspectiveAxisForHeading({x:0,y:0},perspective,{x:0,y:20})).toBe(1);
   expect(perspectiveAxisForHeading({x:0,y:0},perspective,{x:0,y:0})).toBe(0);
   const guide=lockArtworkGuide({x:0,y:0},[perspective],false,null,{x:0,y:20});
   expect(guide?.guide.angle).toBeCloseTo(-Math.PI/2);
 });
 it('does not select disabled guides, and respects eraser restrictions',()=>{
   expect(lockArtworkGuide({x:0,y:0},[{...base,enabled:false}],false,null)).toBeNull();
   expect(lockArtworkGuide({x:0,y:0},[perspective],true,null)).toBeNull();
 });
});
