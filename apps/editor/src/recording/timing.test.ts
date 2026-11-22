import {expect,it} from 'vitest';
import {frameDurations} from './timing';

it('maintains constant playback while providing capped recorded and compressed intervals',()=>{
  expect(frameDurations([100,600,61000],4,'even',2)).toEqual([250,250,2250]);
  expect(frameDurations([100,600,61000],4,'recorded',2)).toEqual([500,6000,2250]);
  const compressed=frameDurations([100,600,61000],4,'compress',2);
  expect(compressed[0]).toBe(500);expect(compressed[1]).toBeLessThan(3000);expect(compressed[2]).toBe(2250);
  expect(frameDurations([100,50],4,'recorded',0)).toEqual([250,250]);
});
