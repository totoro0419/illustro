import {describe,it,expect,vi} from 'vitest';
import {captureSelectedLayerTiles,captureLayerRegion,tileHasPixelData,type InspectableDrawingRenderer} from './tileCapture';

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
 it('copies a tiny selected rectangle without reading unrelated 4K tiles',async()=>{
  const {renderer,readTiles}=fakeRenderer([
   ['L','0,0',75],['L','1,1',180],['L','31,31',255]]);
  const pixels=await captureLayerRegion(renderer,'L',4000,4000,
   {x:128,y:128,width:3,height:2},()=>true);
  expect(pixels).toHaveLength(3*2*4);
  expect(pixels[0]).toBe(180);
  expect(pixels.subarray(1).every(value=>value===0)).toBe(true);
  expect(readTiles).toHaveBeenCalledTimes(1);
  expect(readTiles.mock.calls[0]?.[0]).toEqual([{surfaceId:'L',key:'1,1'}]);
 });
 it('rejects out-of-canvas region requests before GPU access',async()=>{
  const {renderer,readTiles}=fakeRenderer([['L','0,0',255]]);
  await expect(captureLayerRegion(renderer,'L',4000,4000,
   {x:3999,y:3999,width:2,height:2},()=>true)).rejects.toThrow('範囲');
  expect(renderer.drain).not.toHaveBeenCalled();
  expect(readTiles).not.toHaveBeenCalled();
 });
 it('rejects invalid dimensions before touching the renderer',async()=>{
  const {renderer,readTiles}=fakeRenderer([['L','0,0',255]]);
  await expect(captureSelectedLayerTiles(renderer,'L',NaN,4000,()=>true)).rejects.toThrow('サイズ');
  expect(renderer.drain).not.toHaveBeenCalled();
  expect(readTiles).not.toHaveBeenCalled();
 });
 it('rejects noncanonical coordinates rather than accepting duplicate physical tiles',async()=>{
  const {renderer,readTiles}=fakeRenderer([['L','00,0',255]]);
  await expect(captureSelectedLayerTiles(renderer,'L',4000,4000,()=>true)).rejects.toThrow(/一覧が壊れています/);
  expect(readTiles).not.toHaveBeenCalled();
 });
 it('safely rejects a broken tile inventory',async()=>{
  const {renderer}=fakeRenderer([['L','32,0',255]]);
  await expect(captureSelectedLayerTiles(renderer,'L',4000,4000,()=>true)).rejects.toThrow(/作品の外/);
 });
});

describe('C06-002 empty selected eraser capture safeguards',()=>{
 it('returns no occupied tiles and does not read GPU pixels for an empty layer',async()=>{
  const {renderer,readTiles}=fakeRenderer([]);
  expect(await captureSelectedLayerTiles(renderer,'L',4000,4000,()=>true)).toEqual([]);
  expect(renderer.inspect).toHaveBeenCalledTimes(1);
  expect(readTiles).not.toHaveBeenCalled();
 });
 it('preserves a hidden nonzero RGB channel as an occupied tile',async()=>{
  const {renderer}=fakeRenderer([['L','0,0',175]]);
  const tiles=await captureSelectedLayerTiles(renderer,'L',4000,4000,()=>true);
  expect(tiles).toHaveLength(1);
  expect(tiles[0]!.pixels[0]).toBe(175);
  expect(tiles[0]!.pixels[3]).toBe(0);
 });
});

describe('C06-002 selected eraser GPU no-op preflight',()=>{
 it('skips every GPU read when selection is disjoint from allocated layer tiles',async()=>{
  const {renderer,readTiles}=fakeRenderer([['L','0,0',255],['L','1,1',190],['OTHER','30,30',240]]);
  const alpha=new Uint8Array(4000*4000);
  alpha[3900*4000+3900]=255;
  const result=await captureSelectedLayerTiles(renderer,'L',4000,4000,()=>true,
    undefined,{width:4000,height:4000,alpha});
  expect(result).toEqual([]);
  expect(renderer.inspect).toHaveBeenCalledTimes(1);
  expect(readTiles).not.toHaveBeenCalled();
 });
 it('preserves the full occupied snapshot when any allocated tile touches the selection',async()=>{
  const {renderer,readTiles}=fakeRenderer([['L','0,0',255],['L','1,1',190]]);
  const alpha=new Uint8Array(4000*4000);
  alpha[129*4000+129]=128;
  const result=await captureSelectedLayerTiles(renderer,'L',4000,4000,()=>true,
    undefined,{width:4000,height:4000,alpha});
  expect(result.map(tile=>tile.key)).toEqual(['0,0','1,1']);
  expect(readTiles.mock.calls[0]?.[0]).toHaveLength(2);
 });
 it('rejects invalid eraser masks before inspecting or reading GPU data',async()=>{
  const {renderer,readTiles}=fakeRenderer([['L','0,0',255]]);
  await expect(captureSelectedLayerTiles(renderer,'L',300,300,()=>true,
    undefined,{width:300,height:300,alpha:new Uint8Array(3)}))
    .rejects.toThrow(/選択マスク/);
  expect(renderer.drain).not.toHaveBeenCalled();
  expect(readTiles).not.toHaveBeenCalled();
 });
});

describe('C06-015 clipboard sub-tile occupancy',()=>{
 it('ignores paint outside the copied rectangle even within the same GPU tile',async()=>{
  const {renderer}=fakeRenderer([['L','0,0',255]]);
  const tiles=await captureSelectedLayerTiles(renderer,'L',4000,4000,()=>true,
    {x:127,y:127,width:1,height:1});
  expect(tiles).toEqual([]);
  const pixels=await captureLayerRegion(renderer,'L',4000,4000,
    {x:127,y:127,width:1,height:1},()=>true);
  expect(Array.from(pixels)).toEqual([0,0,0,0]);
 });
 it('retains selected nonzero RGB even when the alpha channel is transparent',async()=>{
  const {renderer}=fakeRenderer([['L','1,1',42]]);
  const pixels=await captureLayerRegion(renderer,'L',4000,4000,
    {x:128,y:128,width:1,height:1},()=>true);
  expect(Array.from(pixels)).toEqual([42,0,0,0]);
 });
});
