import {afterEach,expect,it,vi} from 'vitest';
import type {FillJob} from './worker';
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
it('reuses the full source, releases it silently, and requests it again after release',async()=>{
 const replies:unknown[]=[];
 const scope={onmessage:null as ((event:{data:FillJob|{type:'live-end';id:string}})=>void)|null,
  postMessage:(value:unknown)=>{replies.push(value);}};
 vi.stubGlobal('self',scope);
 await import('./worker');
 const settings={method:'color' as const,tolerance:0,gap:0,opacity:1,color:'#ff0000',erase:false,contiguous:true,closedOnly:false};
 const context={width:2,height:1,source:new Uint8Array(8).fill(255),target:null,selection:null,alphaLocked:false,asSelection:false};
 const send=(data:FillJob|{type:'live-end';id:string})=>scope.onmessage!({data});
 send({type:'live-fill',id:'gesture',context,settings,points:[{x:0,y:0}]});
 expect(replies[0]).toMatchObject({preview:{width:2,height:1}});
 send({type:'live-fill',id:'gesture',settings,points:[{x:1,y:0}]});
 expect(replies[1]).toEqual(replies[0]);
 send({type:'live-end',id:'older'});expect(replies).toHaveLength(2);
 send({type:'live-fill',id:'gesture',settings,points:[{x:1,y:0}]});
 expect(replies[2]).toEqual(replies[0]);
 send({type:'live-end',id:'gesture'});expect(replies).toHaveLength(3);
 send({type:'live-fill',id:'gesture',settings,points:[{x:1,y:0}]});
 expect(replies[3]).toEqual({previewMissing:true});
});
