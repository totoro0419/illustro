import {describe,expect,it} from 'vitest';
import {artworkQueuePosition} from './workerQueuePolicy';
describe('C09-011 save-priority artwork queue',()=>{
 it('keeps full-resolution jobs in FIFO order ahead of preview requests',()=>{
  const queue=['interactive','preview','preview'] as const;
  expect(artworkQueuePosition(queue,'interactive')).toBe(1);
  expect(artworkQueuePosition(queue,'preview')).toBe(3);
  expect(artworkQueuePosition(['interactive','interactive'],'interactive')).toBe(2);
 });
 it('starts full resolution immediately if only thumbnails are queued',()=>{
  expect(artworkQueuePosition(['preview','preview'],'interactive')).toBe(0);
  expect(artworkQueuePosition([],'interactive')).toBe(0);
 });
});
