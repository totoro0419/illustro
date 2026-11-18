import {describe,it,expect,vi,afterEach} from 'vitest';
import {CoreDocument} from '@illustro/core';
import {EditorController} from '../controller';
import {ArtworkClipboard} from './clipboard';
import type {BrushSurface} from '../brushSurface';
import {createDeterministicIdFactory} from '../../../../packages/core/src/ids';

afterEach(()=>vi.unstubAllGlobals());
describe('C06-015 editable group copy uses sparse painted tiles',()=>{
 it('copies a small selection without a full-layer GPU readback',async()=>{
  const doc=new CoreDocument({width:256,height:256,ids:createDeterministicIdFactory()});
  const layer=doc.defaultRasterLayerId;
  const controller=EditorController.restored(doc,layer);
  const full=vi.fn(async()=>{throw Error('unexpected full-image readback');});
  const region=vi.fn(async()=>new Uint8ClampedArray([
   12,34,56,255,0,0,0,0,0,0,0,0,0,0,0,0
  ]));
  const drawing={
   selectedRectangle:{x:20,y:30,width:2,height:2},
   captureDocumentLayers:full,captureDocumentLayerRegion:region
  } as unknown as BrushSurface;
  const clipboard=new ArtworkClipboard();
  await clipboard.copy(controller,drawing,{merged:false,selectionOnly:true});
  expect(region).toHaveBeenCalledOnce();
  expect(region.mock.calls[0]?.[1]).toEqual({x:20,y:30,width:2,height:2});
  expect(full).not.toHaveBeenCalled();
  expect(clipboard.preview()?.pixels?.slice(0,4)).toEqual(
   new Uint8ClampedArray([12,34,56,255]));
 });

 it('copies a 4000px group without any per-layer full-raster readback; paste and Undo/Redo preserve contents',async()=>{
  const doc=new CoreDocument({width:4000,height:4000,ids:createDeterministicIdFactory()});
  const base=doc.defaultRasterLayerId;
  const tx=doc.begin('prepare layers');
  const a=tx.addRasterLayerAbove(base);
  const b=tx.addRasterLayerAbove(a);
  tx.setPixel(a,30,12,[40,70,110,255]);
  tx.setPixel(b,130,130,[140,70,30,255]);
  tx.commit();
  const group=doc.begin('group');
  group.createLayerGroup(new Set([a,b]),'test');
  group.commit();
  const controller=EditorController.restored(doc,a);
  const full=vi.fn(async()=>new Map());
  const sparse=vi.fn(async (ids:ReadonlySet<string>)=>{
   const result=new Map();
   for(const id of ids){
    const pixels=new Uint8Array(128*128*4);
    if(id===a)pixels.set([40,70,110,255],(12*128+30)*4);
    if(id===b)pixels.set([140,70,30,255],(2*128+2)*4);
    result.set(id,{x:0,y:0,width:4000,height:4000,tileSize:128,tiles:[{key:id===a?'0,0':'1,1',pixels}]});
   }
   return result;
  });
  const drawing={selectedRectangle:null,captureDocumentLayers:full,captureDocumentLayerTiles:sparse} as unknown as BrushSurface;
  const clipboard=new ArtworkClipboard();
  await clipboard.copy(controller,drawing,{merged:false,selectionOnly:false,group:true});
  expect(sparse).toHaveBeenCalledOnce();
  expect(full).not.toHaveBeenCalled();
  const preview=clipboard.preview();
  expect(preview?.pixels).toBeNull();
  vi.stubGlobal('window',{confirm:()=>true});
  const pasted=await clipboard.paste(controller,'original');
  expect(doc.root.rootLayerIds).toHaveLength(5);
  // The new group uses the same source positions, without a 64 MiB buffer.
  const recent=doc.root.rootLayerIds.filter(id=>id!==base&&id!==a&&id!==b);
  expect(recent).toHaveLength(2);
  expect(doc.readPixel(recent[0]!,30,12)).toEqual([40,70,110,255]);
  expect(doc.readPixel(recent[1]!,130,130)).toEqual([140,70,30,255]);
  doc.undo();
  expect(doc.root.rootLayerIds).toHaveLength(3);
  doc.redo();
  expect(doc.readPixel(recent[1]!,130,130)).toEqual([140,70,30,255]);
 });
});
