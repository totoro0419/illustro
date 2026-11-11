import {describe,it,expect} from 'vitest';
import {cloneProjectionTiles} from './projectionTransfer';

const tiles=(count:number)=>Array.from({length:count},(_,i)=>({surfaceId:'layer',key:i+',0',pixels:new Uint8Array(128*128*4).fill(i+1)}));
describe('checkpoint transfer ownership and scheduling',()=>{
 it('transfers preserve the editor cache and give input a turn between MiB copies',async()=>{
  const source=tiles(33);let opportunities=0;
  const copied=await cloneProjectionTiles(source,()=>true,async()=>{opportunities++;});
  expect(opportunities).toBe(2);expect(copied?.map(t=>t.key)).toEqual(source.map(t=>t.key));
  const received=structuredClone(copied!,{transfer:copied!.map(t=>t.pixels.buffer as ArrayBuffer)});
  expect(received[32]!.pixels[0]).toBe(33);expect(source[0]!.pixels.byteLength).toBe(65536);expect(source[32]!.pixels[0]).toBe(33);
 });
 it('cancels when input changes the revision or switches works during a yield',async()=>{
  let valid=true;const copied=await cloneProjectionTiles(tiles(17),()=>valid,async()=>{valid=false;});expect(copied).toBeNull();
 });
});
