import {describe,it,expect} from 'vitest';
import {readGpuTiles} from './gpuReadback';
describe('sparse readback safety',()=>{
 it('returns zero removal payloads without allocating missing GPU tiles',async()=>{
  const backend={tiles:new Map(),tile:()=>{throw Error('must never allocate');}};
  const result=await readGpuTiles(backend,[{surfaceId:'layer',key:'0,0'}],()=>true);
  expect(result[0]!.pixels).toHaveLength(128*128*4);expect(result[0]!.pixels.every(x=>x===0)).toBe(true);expect(backend.tiles.size).toBe(0);
 });
 it('rejects stale revision captures before submission',async()=>{await expect(readGpuTiles({tiles:new Map()},[],()=>false)).rejects.toThrow('stale');});
 it('enforces the one MiB transfer bound',async()=>{await expect(readGpuTiles({tiles:new Map()},Array.from({length:17},(_,x)=>({surfaceId:'layer',key:x+',0'})),()=>true)).rejects.toThrow('1 MiB');});
});


it('reads bounded changed tiles through the worker port and rejects stale or malformed replies',async()=>{
 const request=[{surfaceId:'surface',key:'0,0'}];
 const pixels=new Uint8Array(128*128*4);pixels[9]=71;
 const backend={readTiles:async()=>[{...request[0],pixels}]};
 expect((await readGpuTiles(backend,request,()=>true))[0]!.pixels[9]).toBe(71);
 let calls=0;await expect(readGpuTiles(backend,request,()=>++calls===1)).rejects.toThrow('stale');
 await expect(readGpuTiles({readTiles:async()=>[]},request,()=>true)).rejects.toThrow('Invalid remote tile batch');
 await expect(readGpuTiles({readTiles:async()=>[{...request[0],pixels:new Uint8Array(4)}]},request,()=>true)).rejects.toThrow('Invalid remote tile image');
});
