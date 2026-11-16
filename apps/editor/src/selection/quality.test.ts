import {afterEach,describe,expect,it,vi} from 'vitest';
import {combineSelection,brushSelection,boundsOfSelection,rasterizeSelection,type MaskData} from './mask';

const mask=(width:number,height:number,values:number[]):MaskData=>({
  width,height,alpha:Uint8Array.from(values)
});

describe('C06 empty-selection combination safety',()=>{
  it('does not create selected pixels when subtracting from no selection (C06-003)',()=>{
    const proposed=mask(3,2,[0,255,0,255,128,0]);
    const result=combineSelection(null,proposed,'subtract');
    expect(Array.from(result.alpha)).toEqual([0,0,0,0,0,0]);
    expect(Array.from(proposed.alpha)).toEqual([0,255,0,255,128,0]);
  });
  it('does not select an intersection with no prior mask',()=>{
    const result=combineSelection(null,mask(2,2,[255,0,128,0]),'intersect');
    expect(boundsOfSelection(result)).toBeNull();
  });
  it('preserves adding and replacing without a prior mask',()=>{
    const proposed=mask(2,2,[255,0,128,0]);
    expect(combineSelection(null,proposed,'add')).toBe(proposed);
    expect(combineSelection(null,proposed,'replace')).toBe(proposed);
  });
  it('subtracts correctly when a mask exists',()=>{
    const result=combineSelection(mask(2,1,[255,128]),mask(2,1,[128,255]),'subtract');
    expect(Array.from(result.alpha)).toEqual([127,0]);
  });
  it('keeps the exact alpha mask while calculating geometrical bounds (C06-004)',()=>{
    const polygon=rasterizeSelection({type:'polygon',points:[
      {x:0,y:0},{x:4,y:0},{x:0,y:4}
    ]},4,4);
    expect(polygon.alpha[0]).toBeGreaterThan(0);
    expect(polygon.alpha[3*4+3]).toBe(0);
    expect(boundsOfSelection(polygon)).not.toBeNull();
  });
});

describe('C06 selection brush quality',()=>{
  it('does not alter the source selection during a stroke',()=>{
    const original=mask(20,20,Array(400).fill(0));
    const result=brushSelection(original,[{x:10,y:10,pressure:1}],{
      size:9,opacity:1,hardness:1,mode:'add'
    });
    expect(original.alpha.every(value=>value===0)).toBe(true);
    expect(result.alpha[10*20+10]).toBeGreaterThan(0);
  });
});

describe('C06 off-canvas move is non-destructive',()=>{
  afterEach(()=>vi.unstubAllGlobals());
  it('rejects an off-canvas selected opaque pixel before deleting source (C06-008)',async()=>{
    const replies: Array<{ok:boolean;error?:string;pixels?:Uint8ClampedArray}>=[];
    const worker={onmessage:null as null|((event:{data:unknown})=>void),
      postMessage:(data:{ok:boolean;error?:string;pixels?:Uint8ClampedArray})=>{replies.push(data);}};
    vi.stubGlobal('self',worker);
    await import('./clipboard.worker');
    const source=new Uint8ClampedArray(4*4*4);
    source.set([80,40,20,255],0);
    const selection=new Uint8Array(16);
    selection[0]=255;
    worker.onmessage?.({data:{id:1,type:'move',width:4,height:4,image:source,mask:selection,dx:-1,dy:0}});
    expect(replies[0]?.ok).toBe(false);
    expect(replies[0]?.error).toMatch(/キャンバスの外/);
    expect(Array.from(source.slice(0,4))).toEqual([80,40,20,255]);
  });
  it('allows transparent selected pixels to cross canvas bounds',async()=>{
    const replies: Array<{ok:boolean;pixels?:Uint8ClampedArray}>=[];
    const worker={onmessage:null as null|((event:{data:unknown})=>void),
      postMessage:(data:{ok:boolean;pixels?:Uint8ClampedArray})=>{replies.push(data);}};
    vi.stubGlobal('self',worker);
    vi.resetModules();
    await import('./clipboard.worker');
    const source=new Uint8ClampedArray(4*4*4);
    source.set([12,34,56,255],(1*4+1)*4);
    const selection=new Uint8Array(16);
    selection[0]=255;
    worker.onmessage?.({data:{id:2,type:'move',width:4,height:4,image:source,mask:selection,dx:-1,dy:0}});
    expect(replies[0]?.ok).toBe(true);
  });
});
