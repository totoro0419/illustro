import {describe,it,expect} from 'vitest';
import {BrushSurface} from './brushSurface';

describe('history admission with pending versus completed strokes',()=>{
  for(const pending of [true,false])it(pending?'stops formal submissions before waiting for the canonical record':'keeps PR35 preparation order when all strokes are complete',async()=>{
    const events:string[]=[],surface=Object.create(BrushSurface.prototype) as BrushSurface;
    Object.assign(surface,{handoff:{pending:pending?1:0},gpuFinishes:new Map(),renderer:{async prepareHistory(){events.push('freeze');}},async settleLogicalStrokes(){events.push('logical');}});
    await surface.prepareHistory();expect(events).toEqual(pending?['freeze','logical']:['logical','freeze']);
  });
});
