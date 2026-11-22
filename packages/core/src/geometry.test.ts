import {describe,it,expect} from 'vitest';
import {CoreDocument} from './coreDocument';
describe('M08 atomic geometry and preservation',()=>{
 it('rebases all raster layers in one revision and Undo/Redo retains exact old pixels',()=>{
  const d=new CoreDocument({width:3,height:2}),id=d.defaultRasterLayerId;
  const t=d.begin('seed');t.setPixel(id,0,0,[255,0,30,255]);t.setPixel(id,2,1,[1,2,3,255]);t.commit();
  const initial=d.head,p=new Uint8Array(2*3*4);p.set([7,8,9,255],(1*2+1)*4);
  const resize=d.begin('Canvas Resize');resize.resizeDocument(2,3,'document.canvas-resize',new Map([[id,p]]),{anchor:'center'});resize.commit();
  expect(d.root.width).toBe(2);expect(d.root.height).toBe(3);
  expect(d.readPixel(id,1,1)).toEqual([7,8,9,255]);expect(d.readBaseRasterPixels(id)).toEqual(p);
  expect(d.currentRevision.command?.operations.at(-1)?.kind).toBe('document.canvas-resize');
  d.undo();expect(d.head).toBe(initial);expect(d.root.width).toBe(3);expect(d.readPixel(id,2,1)).toEqual([1,2,3,255]);
  d.redo();expect(d.root.width).toBe(2);expect(d.readPixel(id,1,1)).toEqual([7,8,9,255]);
  const snap=d.capturePersistenceSnapshot();const restored=CoreDocument.restore({snapshot:snap,blockPayloads:d.persistenceBlockPayloads(snap)});
  expect(restored.root.width).toBe(2);expect(restored.readBaseRasterPixels(id)).toEqual(p);
 });
 it('retains the original crop source and filter parameters through native restore',()=>{
  const d=new CoreDocument({width:3,height:1}),id=d.defaultRasterLayerId;
  const seed=d.begin('seed');seed.setPixel(id,0,0,[30,50,70,255]);seed.commit();
  const original=d.head,crop=d.begin('keep outside');
  crop.resizeDocument(2,1,'document.crop',new Map([[id,new Uint8Array(8)]]),{x:1,y:0,keepOutside:true});
  crop.commit();
  const cropped=d.head,filtered=d.begin('filter');
  const pixels=Uint8Array.of(220,200,180,255,0,0,0,0),recipe={version:1,steps:[{kind:'invert',values:[0,0],strength:100,enabled:true}],mask:null};
  filtered.replaceLayerRaster(id,pixels,cropped,undefined,undefined,recipe);filtered.commit();
  const snapshot=d.capturePersistenceSnapshot(),opened=CoreDocument.restore({snapshot,blockPayloads:d.persistenceBlockPayloads(snapshot)});
  const operations=opened.operationsTo();
  expect(operations.find(op=>op.kind==='document.crop')?.sourceRevisionIds[0]).toBe(original);
  expect(operations.at(-1)?.parameters.rasterFilter).toEqual(recipe);
  expect(opened.readBaseRasterPixels(id)).toEqual(pixels);
  expect(opened.readBaseRasterPixels(id,original).slice(0,4)).toEqual(Uint8Array.of(30,50,70,255));
  opened.undo();expect(opened.nextRedoLabel).toBe('filter');
  opened.redo();expect(opened.readPixel(id,0,0)).toEqual([220,200,180,255]);
 });
 it('rejects missing layer pixels and invalid dimensions without publishing a revision',()=>{
  const d=new CoreDocument({width:4,height:3}),initial=d.head;
  const t=d.begin('bad');
  expect(()=>t.resizeDocument(9000,2,'document.crop',new Map())).toThrow();
  expect(()=>t.resizeDocument(2,2,'document.crop',new Map())).toThrow();
  expect(d.head).toBe(initial);
 });
 it('supports clearing every pixel while leaving one undoable geometry operation',()=>{
  const d=new CoreDocument({width:2,height:2}),id=d.defaultRasterLayerId,t=d.begin('empty crop');
  t.resizeDocument(1,1,'document.crop',new Map([[id,new Uint8Array(4)]]),{x:0,y:0});t.commit();
  expect(d.root.width).toBe(1);expect(d.operationsTo().at(-1)?.kind).toBe('document.crop');
  d.undo();expect(d.root.width).toBe(2);
 });
});
