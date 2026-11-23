import {getAsset,addAssetsAtomically,type AssetEntry} from '../assets/library';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {CoreDocument} from '@illustro/core';
import {EditorController} from '../controller';
import {ArtworkClipboard} from './clipboard';
import type {BrushSurface} from '../brushSurface';
import {createDeterministicIdFactory} from '../../../../packages/core/src/ids';

// In headless tests, explicitly accept the app's async confirmation UI.
vi.mock('../ui/appDialogs',()=>({appConfirm:vi.fn(async()=>true)}));
vi.mock('../assets/library',()=>({getAsset:vi.fn(async()=>null),addAssetsAtomically:vi.fn(async()=>[])}));

afterEach(()=>vi.unstubAllGlobals());
describe('C06-015 editable group copy uses sparse painted tiles',()=>{
 it('copies a small selection without a full-layer GPU readback',async()=>{
  const doc=new CoreDocument({width:256,height:256,ids:createDeterministicIdFactory()});
  const tx=doc.begin('create drawing layer');
  const layer=tx.addRasterLayerAbove(doc.defaultRasterLayerId);
  tx.commit();
  const controller=EditorController.restored(doc,layer);
  const full=vi.fn(async()=>{throw Error('unexpected full-image readback');});
  const region=vi.fn(async (_id:string,_area:{x:number;y:number;width:number;height:number})=>new Uint8ClampedArray([
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

describe('C06-015 invalid clipboard selection fails before any pixel readback',()=>{
 it('rejects non-finite selection coordinates without changing clipboard content',async()=>{
  const doc=new CoreDocument({width:128,height:128,ids:createDeterministicIdFactory()});
  const controller=EditorController.restored(doc,doc.defaultRasterLayerId);
  const full=vi.fn(async()=>{throw Error('GPU readback must not run');});
  const drawing={selectedRectangle:{x:NaN,y:0,width:5,height:5},captureDocumentLayers:full} as unknown as BrushSurface;
  const clipboard=new ArtworkClipboard();
  await expect(clipboard.copy(controller,drawing,{merged:false,selectionOnly:true})).rejects.toThrow('範囲');
  expect(full).not.toHaveBeenCalled();
  expect(clipboard.hasContent).toBe(false);
 });
 it('rejects a truncated selection mask rather than copying an unmasked rectangle',async()=>{
  const doc=new CoreDocument({width:128,height:128,ids:createDeterministicIdFactory()});
  const controller=EditorController.restored(doc,doc.defaultRasterLayerId);
  const region=vi.fn(async()=>new Uint8ClampedArray(16));
  const drawing={selectedRectangle:{x:1,y:1,width:2,height:2},captureDocumentLayerRegion:region} as unknown as BrushSurface;
  const clipboard=new ArtworkClipboard();
  clipboard.setSelectionMask({width:128,height:128,alpha:new Uint8Array(12)});
  await expect(clipboard.copy(controller,drawing,{merged:false,selectionOnly:true})).rejects.toThrow('選択マスク');
  expect(region).not.toHaveBeenCalled();
  expect(clipboard.hasContent).toBe(false);
 });
});


it('keeps a copied font available for editable text even after its source disappears',async()=>{
 const source=new CoreDocument({width:64,height:64});
 const target=new CoreDocument({width:64,height:64});
 const original=source.defaultRasterLayerId,fontId='11111111-1111-4111-8111-111111111111';
 const tx=source.begin('prepare text');
 tx.setEditableArtwork(original,{kind:'text',text:'AB',origin:{x:1,y:1},size:12,family:'sans-serif',
   color:'#000000',vertical:false,align:'left',spacing:0,lineHeight:1.2,
   styleRanges:[{start:0,end:1,fontAsset:fontId}]});
 tx.commit();
 const item={id:fontId,kind:'font',name:'試験フォント',version:1,bytes:4,data:new Blob(['font'])} as AssetEntry;
 vi.mocked(getAsset).mockResolvedValueOnce(item).mockResolvedValue(null);
 const drawing={selectedRectangle:null,captureDocumentLayers:async()=>new Map([[original,new Uint8Array(64*64*4)]])} as unknown as BrushSurface;
 const clipboard=new ArtworkClipboard(),destination=EditorController.restored(target,target.defaultRasterLayerId);
 await clipboard.copy(EditorController.restored(source,original),drawing,{merged:false,selectionOnly:false,embedFonts:true});
 const pasted=await clipboard.paste(destination,'original');
 expect(addAssetsAtomically).toHaveBeenCalledWith([item]);
 expect(target.root.getLayer(pasted.layerId).editable).toMatchObject({kind:'text',embedFont:true,styleRanges:[{fontAsset:fontId}]});
 target.undo();expect(target.root.hasLayer(pasted.layerId)).toBe(false);
 target.redo();expect(target.root.getLayer(pasted.layerId).editable).toMatchObject({kind:'text'});
});
