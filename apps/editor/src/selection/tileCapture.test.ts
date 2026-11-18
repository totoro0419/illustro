import {describe,it,expect,vi} from 'vitest';
import {captureSelectedLayerTiles,tileHasPixelData,type InspectableDrawingRenderer} from './tileCapture';

function fakeRenderer(tiles:readonly [string,string,number][]=[],bad=false){
 const inventory=new Map(tiles.map(([surfaceKey,key])=>[surfaceKey+'\\0'+key,{surfaceKey,key}]));
 const readTiles=vi.fn(async (requests:readonly {surfaceId:string;key:string}[])=>
  requests.map(request=>{
   const pixels=new Uint8Array(128*128*4);
   const found=tiles.find(([surface,key])=>surface===request.surfaceId&&key===request.key);
   if(found)pixels[0]=found[2];
   return {...request,pixels};
  }));
 const renderer={
  drain:vi.fn(async()=>{}),
  inspect:vi.fn(async()=>{}),
  backend:{tiles:inventory,readTiles}
 };
 return {renderer:renderer as InspectableDrawingRenderer,readTiles};
}
describe('C06-002 bounded GPU inventory capture',()=>{
 it('collects only actual nonzero layer tiles and never allocates a full-frame buffer',async()=>{
  const {renderer,readTiles}=fakeRenderer([['L','0,0',255],['OTHER','1,2',110],['L','2,1',0]]);
  const result=await captureSelectedLayerTiles(renderer,'L',4000,4000,()=>true);
  expect(result.map(t=>t.key)).toEqual(['0,0']);
  expect(result[0]?.pixels.length).toBe(128*128*4);
  expect(readTiles).toHaveBeenCalledTimes(1);
  expect(readTiles.mock.calls[0]?.[0]?.length).toBe(2);
  expect(renderer.inspect).toHaveBeenCalledTimes(1);
 });
 it('detects transparent RGB and unaligned tile buffers without changing pixel data',()=>{
  const empty=new Uint8Array(128*128*4);
  expect(tileHasPixelData(empty)).toBe(false);
  empty[3]=0;empty[2]=7;
  expect(tileHasPixelData(empty)).toBe(true);
  expect(empty[2]).toBe(7);
  const unaligned=new Uint8Array(new ArrayBuffer(empty.length+1),1,empty.length);
  expect(tileHasPixelData(unaligned)).toBe(false);
  unaligned[unaligned.length-1]=1;
  expect(tileHasPixelData(unaligned)).toBe(true);
 });
 it('stops without reading if the document changes after inventory refresh',async()=>{
  const {renderer,readTiles}=fakeRenderer([['L','0,0',255]]);
  let valid=true;renderer.inspect=vi.fn(async()=>{valid=false;});
  await expect(captureSelectedLayerTiles(renderer,'L',4000,4000,()=>valid)).rejects.toThrow(/切り替わりました/);
  expect(readTiles).not.toHaveBeenCalled();
 });
 it('keeps 4K captures in 1 MiB batches while preserving occupied tiles',async()=>{
  const tiles:Array<[string,string,number]>=Array.from({length:80},(_,i)=>
   ['L',(i%32)+','+Math.floor(i/32),i%3===0?255:0]);
  const {renderer,readTiles}=fakeRenderer(tiles);
  const result=await captureSelectedLayerTiles(renderer,'L',4000,4000,()=>true);
  expect(readTiles).toHaveBeenCalledTimes(5);
  expect(readTiles.mock.calls.every(([requests])=>requests.length<=16)).toBe(true);
  expect(result.map(tile=>tile.key)).toEqual(
   tiles.filter(([, ,value])=>value!==0).map(([,key])=>key));
 });
 it('rejects invalid dimensions before touching the renderer',async()=>{
  const {renderer,readTiles}=fakeRenderer([['L','0,0',255]]);
  await expect(captureSelectedLayerTiles(renderer,'L',NaN,4000,()=>true)).rejects.toThrow('サイズ');
  expect(renderer.drain).not.toHaveBeenCalled();
  expect(readTiles).not.toHaveBeenCalled();
 });
 it('safely rejects a broken tile inventory',async()=>{
  const {renderer}=fakeRenderer([['L','32,0',255]]);
  await expect(captureSelectedLayerTiles(renderer,'L',4000,4000,()=>true)).rejects.toThrow(/作品の外/);
 });
});
