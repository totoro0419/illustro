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

describe('C06-002 repeated strokes share one mask snapshot',()=>{
  it('sends the mask once per identity, then reuses the Worker copy',async()=>{
    const sent:boolean[]=[];
    let starts=0;
    class FakeWorker{
      onmessage:((event:MessageEvent<{pixels:Uint8Array|null}>)=>void)|null=null;
      onerror:((event:ErrorEvent)=>void)|null=null;
      constructor(){starts++;}
      postMessage(job:{pixels:Uint8Array;alpha?:Uint8Array}){
        sent.push(job.alpha instanceof Uint8Array);
        queueMicrotask(()=>this.onmessage?.({data:{pixels:job.pixels}} as MessageEvent));
      }
      terminate(){}
    }
    vi.stubGlobal('Worker',FakeWorker);
    const {applySelectedStroke}=await import('./brush');
    const first={width:2,height:2,alpha:new Uint8Array(4).fill(255)};
    const second={width:2,height:2,alpha:new Uint8Array(4).fill(64)};
    await applySelectedStroke(first,new Uint8Array(16),[]);
    await applySelectedStroke(first,new Uint8Array(16),[]);
    await applySelectedStroke(second,new Uint8Array(16),[]);
    await applySelectedStroke(first,new Uint8Array(16),[]);
    expect(starts).toBe(1);
    expect(sent).toEqual([true,false,true,true]);
  });
  it('rejects stale cache dimensions inside the Worker rather than using a wrong mask',async()=>{
    const replies:Array<{pixels?:Uint8Array|null;error?:string}>=[];
    const fake={onmessage:null as ((event:{data:unknown})=>void)|null,
      postMessage:(reply:{pixels?:Uint8Array|null;error?:string})=>{replies.push(reply);}};
    vi.stubGlobal('self',fake);
    await import('./stroke.worker');
    fake.onmessage?.({data:{width:2,height:2,pixels:new Uint8Array(16),alpha:new Uint8Array([255,0,0,0]),records:[]}});
    fake.onmessage?.({data:{width:2,height:2,pixels:new Uint8Array(16),records:[]}});
    fake.onmessage?.({data:{width:3,height:2,pixels:new Uint8Array(24),records:[]}});
    expect(replies[0]?.error).toBeUndefined();
    expect(replies[1]?.error).toBeUndefined();
    expect(replies[2]?.error).toMatch(/再利用情報/);
  });
});

describe('C06-002 selected stroke GPU readback memory',()=>{
  it('reuses the transferred pixel buffer without allocating a second full image',async()=>{
    const {writableRasterView}=await import('./brush');
    const entire=new Uint8ClampedArray(80);
    const cropped=entire.subarray(12,52);
    const result=writableRasterView(cropped);
    expect(result.buffer).toBe(entire.buffer);
    expect(result.byteOffset).toBe(12);
    expect(result.byteLength).toBe(40);
    result[3]=240;
    expect(cropped[3]).toBe(240);
  });
});

describe('C06-002 sparse Worker transfer contract',()=>{
  it('transfers only occupied 128px tiles, not a full 4000px image',async()=>{
    const sent:Array<{hasPixels:boolean;tiles:number;transferred:number;mask:boolean}>=[];
    class FakeWorker{
      onmessage:((event:MessageEvent<{tiles:unknown}>)=>void)|null=null;
      onerror:((event:ErrorEvent)=>void)|null=null;
      postMessage(job:{tiles?:Array<{key:string;pixels:Uint8Array}>;pixels?:Uint8Array;alpha?:Uint8Array},transfer:ArrayBuffer[]){
        sent.push({hasPixels:!!job.pixels,tiles:job.tiles?.length??0,transferred:transfer.length,mask:!!job.alpha});
        queueMicrotask(()=>this.onmessage?.({data:{tiles:job.tiles}} as MessageEvent));
      }
      terminate(){}
    }
    vi.stubGlobal('Worker',FakeWorker);
    const {applySelectedStrokeTiles}=await import('./brush');
    const mask={width:4000,height:4000,alpha:new Uint8Array(4000*4000).fill(255)};
    const tile={key:'0,0',pixels:new Uint8Array(128*128*4)};
    const first=await applySelectedStrokeTiles(mask,[tile],[]);
    const second=await applySelectedStrokeTiles(mask,[{key:'0,0',pixels:new Uint8Array(128*128*4)}],[]);
    expect(first?.length).toBe(1);
    expect(second?.length).toBe(1);
    expect(sent).toEqual([
      {hasPixels:false,tiles:1,transferred:1,mask:true},
      {hasPixels:false,tiles:1,transferred:1,mask:false}
    ]);
  });
});
