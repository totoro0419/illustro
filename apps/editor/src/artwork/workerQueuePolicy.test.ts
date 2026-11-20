import {describe,expect,it} from 'vitest';
import {artworkQueuePosition,artworkWorkerFallbackAllowed} from './workerQueuePolicy';
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

describe('C09-011 Worker failure fallback for editable artwork',()=>{
  it('uses the existing main-thread renderer when a path or gradient Worker fails',()=>{
    expect(artworkWorkerFallbackAllowed('path',false,false)).toBe(true);
    expect(artworkWorkerFallbackAllowed('gradient',false,false)).toBe(true);
  });
  it('keeps text font compatibility and never restarts canceled jobs',()=>{
    expect(artworkWorkerFallbackAllowed('text',true,false)).toBe(true);
    expect(artworkWorkerFallbackAllowed('text',false,false)).toBe(false);
    expect(artworkWorkerFallbackAllowed('path',false,true)).toBe(false);
    expect(artworkWorkerFallbackAllowed('text',true,true)).toBe(false);
  });
});
