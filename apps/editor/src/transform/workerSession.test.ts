import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialTransform} from './geometry';
import {createTransformPreviewRunner} from './run';
import {createPreset} from '@illustro/brush-rt';

type PreviewMessage={kind:string;pixels?:Uint8Array;settings:{dx:number}};
class FakeWorker{
  static instances:FakeWorker[]=[];
  messages:PreviewMessage[]=[];
  stopped=false;
  onmessage:((event:MessageEvent)=>void)|null=null;
  onerror:((event:ErrorEvent)=>void)|null=null;
  constructor(){FakeWorker.instances.push(this);}
  postMessage(message:PreviewMessage){
    this.messages.push(message);
    queueMicrotask(()=>{if(!this.stopped)this.onmessage?.({data:{pixels:new Uint8ClampedArray(4)}} as MessageEvent);});
  }
  terminate(){this.stopped=true;}
}
afterEach(()=>{vi.unstubAllGlobals();FakeWorker.instances.length=0;});

describe('C07 preview worker image caching',()=>{
  it('sends original-edit brush resources once while streaming successive pressure samples',async()=>{
    vi.stubGlobal('Worker',FakeWorker);
    const runner=createTransformPreviewRunner(),preset=createPreset('original','original');
    const job={pixels:new Uint8Array(16),width:2,height:2,settings:initialTransform,selection:null,outputWidth:2,outputHeight:2,
      originalStroke:{preset,samples:[{x:1,y:1,t:1,pressure:.5,pointerType:'pen'}],seed:[1,2] as [number,number],alphaLocked:false}};
    await runner.run(job);await runner.run({...job,originalStroke:{...job.originalStroke,samples:[...job.originalStroke.samples,{x:2,y:1,t:2,pressure:1,pointerType:'pen'}]}});
    const sent=FakeWorker.instances[0]!.messages as Array<PreviewMessage&{originalStroke:{preset?:unknown;samples:unknown[]}}>;
    expect(sent[0]!.originalStroke.preset).toBe(preset);expect(sent[1]!.originalStroke.preset).toBeUndefined();
    expect(sent[1]!.originalStroke.samples).toHaveLength(2);runner.dispose();
  });
  it('reuses a worker and sends source pixels only if the source changes',async()=>{
    vi.stubGlobal('Worker',FakeWorker);
    const runner=createTransformPreviewRunner(),pixels=new Uint8Array(4);
    const job={pixels,width:1,height:1,settings:initialTransform,selection:null,outputWidth:1,outputHeight:1};
    await runner.run(job);
    await runner.run({...job,settings:{...initialTransform,dx:3}});
    await runner.run({...job,pixels:new Uint8Array(4)});
    const worker=FakeWorker.instances[0]!;
    expect(FakeWorker.instances).toHaveLength(1);
    expect(worker.messages.map(message=>message.kind)).toEqual(['cached','cached','cached']);
    expect(worker.messages[0]!.pixels).toBe(pixels);
    expect(worker.messages[1]!.pixels).toBeUndefined();
    expect(worker.messages[2]!.pixels).toBeDefined();
    runner.dispose();expect(worker.stopped).toBe(true);
  });
  it('rejects a canceled preview without posting pixels',async()=>{
    vi.stubGlobal('Worker',FakeWorker);
    const runner=createTransformPreviewRunner(),signal=new AbortController();
    signal.abort();
    const job={pixels:new Uint8Array(4),width:1,height:1,settings:initialTransform,selection:null,outputWidth:1,outputHeight:1};
    await expect(runner.run(job,signal.signal)).rejects.toBeDefined();
    expect(FakeWorker.instances[0]!.messages).toHaveLength(0);
    runner.dispose();
  });
});

describe('C07-004 transform preview caches later strokes',()=>{
  it('sends post-transform strokes exactly once until the saved pass list changes',async()=>{
    vi.stubGlobal('Worker',FakeWorker);
    const runner=createTransformPreviewRunner();
    const pixels=new Uint8Array(16),postPaint=[{selection:null,records:[{version:2}]}];
    const job={pixels,width:2,height:2,settings:initialTransform,selection:null,postPaint,
      outputWidth:2,outputHeight:2};
    await runner.run(job);
    await runner.run({...job,settings:{...initialTransform,dx:2}});
    await runner.run({...job,postPaint:[]});
    const sent=FakeWorker.instances[0]!.messages as Array<PreviewMessage&{postPaint?:unknown[]}>;
    expect(sent[0]!.postPaint).toBe(postPaint);
    expect(Object.hasOwn(sent[1]!, 'postPaint')).toBe(false);
    expect(sent[2]!.postPaint).toEqual([]);
    runner.dispose();
  });
});

class ControlledWorker{
  static instances:ControlledWorker[]=[];
  messages:PreviewMessage[]=[];
  onmessage:((event:MessageEvent)=>void)|null=null;
  onerror:((event:ErrorEvent)=>void)|null=null;
  stopped=false;
  constructor(){ControlledWorker.instances.push(this);}
  postMessage(message:PreviewMessage){this.messages.push(message);}
  respond(){
    this.onmessage?.({data:{pixels:new Uint8ClampedArray(4)}} as MessageEvent);
  }
  terminate(){this.stopped=true;}
}
describe('C07-011 superseded preview responsiveness',()=>{
  afterEach(()=>{ControlledWorker.instances.length=0;});
  it('rejects an aborted queued preview before the busy worker finishes and does not dispatch it',async()=>{
    vi.stubGlobal('Worker',ControlledWorker);
    const runner=createTransformPreviewRunner();
    const job={pixels:new Uint8Array(4),width:1,height:1,settings:initialTransform,selection:null,
      outputWidth:1,outputHeight:1};
    const first=runner.run(job);
    await Promise.resolve();
    const worker=ControlledWorker.instances[0]!;
    expect(worker.messages).toHaveLength(1);
    const controller=new AbortController();
    const canceled=runner.run({...job,settings:{...initialTransform,dx:2}},controller.signal);
    controller.abort(new Error('古い変形を取り消しました'));
    await expect(canceled).rejects.toThrow('古い変形を取り消しました');
    expect(worker.messages).toHaveLength(1);
    worker.respond();
    await first;
    // Drain the queued continuation before checking that no stale job ran.
    await Promise.resolve();
    await Promise.resolve();
    expect(worker.messages).toHaveLength(1);
    runner.dispose();
  });
  it('unblocks an aborted in-flight caller but keeps the next worker reply paired with its request',async()=>{
    vi.stubGlobal('Worker',ControlledWorker);
    const runner=createTransformPreviewRunner();
    const job={pixels:new Uint8Array(4),width:1,height:1,settings:initialTransform,selection:null,
      outputWidth:1,outputHeight:1};
    const controller=new AbortController();
    const first=runner.run(job,controller.signal);
    await Promise.resolve();
    const worker=ControlledWorker.instances[0]!;
    expect(worker.messages).toHaveLength(1);
    controller.abort(new Error('この表示は不要です'));
    await expect(first).rejects.toThrow('この表示は不要です');
    const second=runner.run({...job,settings:{...initialTransform,dx:4}});
    expect(worker.messages).toHaveLength(1);
    worker.respond();
    await vi.waitFor(()=>expect(worker.messages).toHaveLength(2));
    expect(worker.messages[1]!.settings.dx).toBe(4);
    worker.respond();
    await expect(second).resolves.toBeInstanceOf(Uint8ClampedArray);
    runner.dispose();
  });
});
