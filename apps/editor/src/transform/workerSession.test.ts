import {afterEach,describe,expect,it,vi} from 'vitest';
import {initialTransform} from './geometry';
import {createTransformPreviewRunner} from './run';

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
