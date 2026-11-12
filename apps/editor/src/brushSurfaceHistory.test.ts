import {describe,it,expect} from 'vitest';
import {BrushSurface} from './brushSurface';

describe('history preparation without canonical barriers',()=>{
  for(const pending of [true,false])it(`waits only for submitted GPU ownership (pending=${pending})`,async()=>{
    const events:string[]=[],surface=Object.create(BrushSurface.prototype) as BrushSurface;
    Object.assign(surface,{handoff:{pending:pending?1:0,barrier(){throw Error('Undo must not wait for the worker');}},gpuFinishes:new Map(),renderer:{async prepareHistory(){events.push('gpu');}},settleLogicalStrokes(){throw Error('Undo must not wait for logical registration');}});
    await surface.prepareHistory();expect(events).toEqual(['gpu']);
  });
});
