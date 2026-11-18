import {afterEach,expect,it,vi} from 'vitest';
import {MaskRasterWorker} from './maskWorker';
afterEach(()=>vi.unstubAllGlobals());
it('sends the original mask once, routes preview replies separately, and releases on gesture end',async()=>{
 let worker:{postMessage:ReturnType<typeof vi.fn>;onmessage:((event:{data:unknown})=>void)|null;onerror:null;terminate:ReturnType<typeof vi.fn>};
 vi.stubGlobal('Worker',class{
  postMessage=vi.fn();onmessage=null;onerror=null;terminate=vi.fn();
  constructor(){worker=this;}
 });
 const runner=new MaskRasterWorker(),prior={width:2,height:2,alpha:new Uint8Array([30,60,90,120])};
 const settings={size:4,opacity:.4,hardness:.5,mode:'add' as const},points=[{x:1,y:1,pressure:.5}];
 const preview={x:0,y:0,width:2,height:2,alpha:new Uint8Array([4,8,16,32]),scaleX:1,scaleY:1};
 const first=runner.brushPreview('stroke',prior,2,2,points,settings);
 const message=worker!.postMessage.mock.calls[0]![0];
 expect(message.initialize).toBe(true);expect(message.previous).toBe(prior.alpha);
 worker!.onmessage!({data:{id:message.id,ok:true,preview}});
 expect(await first).toEqual(preview);
 const second=runner.brushPreview('stroke',prior,2,2,points,settings);
 const following=worker!.postMessage.mock.calls[1]![0];
 expect(following.previous).toBeUndefined();expect(following.initialize).toBe(false);
 worker!.onmessage!({data:{id:following.id,ok:true,preview}});
 expect(await second).toEqual(preview);
 runner.endBrushPreview('older');expect(worker!.postMessage).toHaveBeenCalledTimes(2);
 runner.endBrushPreview('stroke');
 expect(worker!.postMessage.mock.calls[2]![0]).toEqual({action:'brush-preview-end',liveKey:'stroke'});
 const pending=runner.brushPreview('next',prior,2,2,points,settings);
 expect(worker!.postMessage.mock.calls[3]![0].initialize).toBe(true);
 runner.destroy();await expect(pending).rejects.toThrow('終了');
});
