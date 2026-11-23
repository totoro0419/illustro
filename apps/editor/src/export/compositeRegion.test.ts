import {describe,expect,it} from 'vitest';
import {compositeArtworkRegion} from './basicExport';

describe('live artwork region',()=>{
  it('uses visible layers, absolute mask coordinates and cached clip sources',async()=>{
    const data=new Map([
      ['hidden',Uint8Array.of(9,9,9,255,9,9,9,255)],
      ['base',Uint8Array.of(255,0,0,255,255,0,0,0)],
      ['top',Uint8Array.of(0,0,255,255,0,0,255,255)]
    ]);
    const reads:string[]=[];
    const result=await compositeArtworkRegion([
      {surfaceId:'white',visible:true,opacity:1,baseColor:'white'},
      {surfaceId:'hidden',visible:false,opacity:1},
      {surfaceId:'base',visible:true,opacity:1},
      {surfaceId:'top',visible:true,opacity:.5,clipSurfaceId:'base'}
    ],{x:127,y:40,width:2,height:1},async id=>{reads.push(id);return data.get(id)??null;});
    expect(Array.from(result!)).toEqual([128,0,128,255,255,255,255,255]);
    expect(reads).toEqual(['base','top']);
  });

  it('propagates cancellation and refuses missing pixels',async()=>{
    const stack=[{surfaceId:'a',visible:true,opacity:1}],area={x:0,y:0,width:1,height:1};
    const cancelled=new AbortController();cancelled.abort(new Error('cancelled'));
    await expect(compositeArtworkRegion(stack,area,async()=>null,cancelled.signal)).rejects.toThrow('cancelled');
    await expect(compositeArtworkRegion(stack,area,async()=>null)).resolves.toBeNull();
  });
});
