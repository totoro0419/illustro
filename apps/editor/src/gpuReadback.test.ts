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
