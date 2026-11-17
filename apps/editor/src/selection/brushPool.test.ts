import {afterEach,describe,it,expect,vi} from 'vitest';
import type {DeformationBrushPass} from '@illustro/core';

afterEach(()=>{
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe('C06-002 selected brush Worker reuse',()=>{
  it('runs multiple stroke jobs with one Worker instance',async()=>{
    let created=0,posted=0;
    class FakeWorker{
      onmessage:((e:MessageEvent<{pixels:Uint8Array|null}>)=>void)|null=null;
      onerror:((e:ErrorEvent)=>void)|null=null;
      constructor(){created++;}
      postMessage(job:{pixels:Uint8Array}){
        posted++;
        queueMicrotask(()=>this.onmessage?.({data:{pixels:job.pixels}} as MessageEvent));
      }
      terminate(){}
    }
    vi.stubGlobal('Worker',FakeWorker);
    const {replayBrushPasses}=await import('./brush');
    const passes=[{selection:null,records:[]}] as DeformationBrushPass[];
    const first=await replayBrushPasses(passes,2,2,new Uint8Array(16));
    const second=await replayBrushPasses(passes,2,2,new Uint8Array(16));
    expect(first).toHaveLength(16);
    expect(second).toHaveLength(16);
    expect(created).toBe(1);
    expect(posted).toBe(2);
  });
});
