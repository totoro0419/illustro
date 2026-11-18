import {describe,it,expect,vi} from 'vitest';
import {referenceBrushes,compilePreset,exportPresets,importPresets} from '@illustro/brush-rt';
import {materialResource,withBrushMaterial,readBrushMaterial} from './brushMaterial';

describe('C05-020 dedicated brush materials',()=>{
 it('uses transparent silhouettes and dark-on-white opaque stamps',()=>{
   expect(materialResource('tip',2,1,new Uint8ClampedArray([255,255,255,255,0,0,0,0]),'stamp').alpha).toEqual([1,0,0,0]);
   expect(materialResource('tip',2,1,new Uint8ClampedArray([255,255,255,255,0,0,0,255]),'ink').alpha).toEqual([0,1,0,0]);
   expect(()=>materialResource('tip',1,1,new Uint8ClampedArray([255,255,255,255]),'empty')).toThrow();
 });
 it('composites texture transparency onto paper white',()=>{
   expect(materialResource('paper',3,1,new Uint8ClampedArray([0,0,0,255,255,255,255,255,0,0,0,0]),'paper').alpha).toEqual([0,1,1]);
 });
 it('keeps source brushes unchanged and makes self-contained serializable stamp brushes',()=>{
   const source=structuredClone(referenceBrushes[0]!),before=structuredClone(source);
   const resource=materialResource('tip',2,1,new Uint8ClampedArray([0,0,0,255,255,255,255,255]),'stamp');
   const result=withBrushMaterial(source,'tip',resource);
   expect(source).toEqual(before);
   expect(result.tip.shape).toBe('mask');
   const compiled=compilePreset(result,{forceFadeGeometry:'adaptive-v1'});
   expect(compiled.mask?.alpha).toEqual([1,0,0,0]);
   const restored=importPresets(exportPresets([result]))[0]!;
   expect(restored.resources[restored.tip.resource!]).toEqual(resource);
   resource.alpha[0]=0;
   expect(result.resources[result.tip.resource!]!.alpha[0]).toBe(1);
 });
 it('replaces the active texture with a renderable repeating image',()=>{
   const source=structuredClone(referenceBrushes[0]!);
   source.texture.tip.strength=.4;source.resources['library-texture']={kind:'mask',width:1,height:1,alpha:[1]};
   source.tip.shape='mask';source.tip.resource='library-texture';
   const resource=materialResource('pattern',2,1,new Uint8ClampedArray([0,0,0,255,255,255,255,255]),'pattern');
   const result=withBrushMaterial(source,'pattern',resource);
   expect(result.resources['library-texture']!.kind).toBe('mask');
   expect(result.texture.tip.strength).toBe(0);
   expect(compilePreset(result,{forceFadeGeometry:'adaptive-v1'}).texture?.alpha).toEqual([0,1]);
 });
 it('rejects oversized resources before allocating a preset',()=>{
   expect(()=>materialResource('tip',257,1,new Uint8ClampedArray(1028),'bad')).toThrow();
 });
 it('preserves rectangular stamp proportions and releases replaced library resources',()=>{
   const source=structuredClone(referenceBrushes[0]!);
   const resource=materialResource('tip',4,2,new Uint8ClampedArray(4*2*4).fill(0).map((_v,i)=>i%4===3?255:0),'wide');
   expect(resource).toMatchObject({width:4,height:4});
   expect(resource.alpha.slice(0,4)).toEqual([0,0,0,0]);
   expect(resource.alpha.slice(4,12)).toEqual(new Array(8).fill(1));
   const first=withBrushMaterial(source,'tip',resource),second=withBrushMaterial(first,'tip',resource);
   expect(Object.keys(second.resources)).toHaveLength(1);
   expect(compilePreset(second,{forceFadeGeometry:'adaptive-v1'}).mask?.height).toBe(4);
 });
 it('closes decoded images if drawing fails',async()=>{
   const close=vi.fn();vi.stubGlobal('createImageBitmap',async()=>({width:5,height:5,close}));
   vi.stubGlobal('document',{createElement:()=>({getContext:()=>null})});
   try{await expect(readBrushMaterial(new Blob(),'tip','bad')).rejects.toThrow();expect(close).toHaveBeenCalledOnce();}
   finally{vi.unstubAllGlobals();}
 });
});
