import {afterEach,describe,expect,it,vi} from 'vitest';
import {GpuRenderer,TILE} from '@illustro/brush-rt';
import type {RevisionId} from '@illustro/core';
import {compositeLayer,renderFrozenArtworkTiledPreview,type FrozenExport} from './basicExport';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('C07-001/014 exact in-stack refinement',()=>{
 function setup(){
  const upper=new Uint8Array(TILE*TILE*4);upper.set([0,255,0,128]);upper.set([0,255,0,128],4);
  const readTile=vi.fn(async()=>upper),destroy=vi.fn(),append=vi.fn();
  const renderer={setSurfaceStack:vi.fn(),document:{append,end:vi.fn()},drain:async()=>{},readTile,destroy};
  vi.spyOn(GpuRenderer,'create').mockResolvedValue(renderer as unknown as GpuRenderer);
  vi.stubGlobal('document',{createElement:()=>({width:0,height:0})});
  vi.stubGlobal('requestAnimationFrame',(callback:()=>void)=>{queueMicrotask(callback);return 1;});
  const frozen:FrozenExport={revision:'r' as RevisionId,width:2,height:1,name:'test',colorProfileId:'srgb',
   layers:[{surfaceId:'base',visible:true,opacity:.8},
    {surfaceId:'upper',visible:true,opacity:.6,clipSurfaceId:'base',blend:{mode:'multiply',space:'encoded',seed:1}}],
   // A replacement must skip old source replay as well as old raster tiles.
   strokes:[{surfaceId:'base',record:null as never}]};
  return {frozen,readTile,destroy,append,upper};
 }
 it('replaces a lower layer before upper blending and uses its new alpha for clipping',async()=>{
  const {frozen,readTile,destroy,append,upper}=setup();
  const pixels=new Uint8ClampedArray([255,0,0,255,0,0,0,0]);
  const result=await renderFrozenArtworkTiledPreview(frozen,2,1,
   {replacement:{surfaceId:'base',pixels},signal:new AbortController().signal});
  const expected=new Uint8ClampedArray(8);
  compositeLayer(expected,pixels,.8);
  compositeLayer(expected,upper.subarray(0,8),.6,{pixels,opacity:.8},{width:2,blend:frozen.layers[1]!.blend!});
  expect(result).toEqual(expected);expect(result?.[7]).toBe(0);
  expect(readTile).toHaveBeenCalledTimes(1);expect(append).not.toHaveBeenCalled();expect(destroy).toHaveBeenCalledOnce();
 });
 it('uses the transformed mask and restores resources on cancellation',async()=>{
  const {frozen,destroy}=setup();
  const pixels=new Uint8ClampedArray([255,0,0,255,255,0,0,255]);
  const mask={enabled:true,inverted:false,density:1,shape:'pixels' as const,x:1,y:0,scaleX:1,scaleY:1,tiles:{'-1,0':'00'}};
  const isolated={...frozen,layers:[{...frozen.layers[0]!,isolation:['g'],mask},{...frozen.layers[1]!,isolation:['g']}]};
  const result=await renderFrozenArtworkTiledPreview(isolated,2,1,
   {replacement:{surfaceId:'base',pixels},signal:new AbortController().signal});
  expect(result?.[3]).toBe(0);expect(result?.[7]).toBeGreaterThan(0);
  const abort=new AbortController();
  vi.stubGlobal('requestAnimationFrame',(callback:()=>void)=>{abort.abort();queueMicrotask(callback);return 1;});
  await expect(renderFrozenArtworkTiledPreview(frozen,2,1,{replacement:{surfaceId:'base',pixels},signal:abort.signal})).rejects.toMatchObject({name:'AbortError'});
  expect(destroy).toHaveBeenCalledTimes(2);
 });
});
