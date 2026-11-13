import {expect,it} from 'vitest';
import {CoreDocument} from './coreDocument';
import {createDeterministicIdFactory} from './ids';
it('coalesces raster and layer metadata in one revision',()=>{const d=new CoreDocument({width:512,height:512,ids:createDeterministicIdFactory()});const l=d.defaultRasterLayerId,t=d.begin('combo');t.setPixel(l,5,5,[8,9,10,255]);t.renameLayer(l,'Ink');t.setLayerVisibility(l,false);const r=t.commit();const layer=d.root.getLayer(l);expect(layer.name).toBe('Ink');expect(layer.visible).toBe(false);expect(r.revision.command?.operations.length).toBe(2);expect(d.revisionCount).toBe(2);});

it('persists optional DPI and attribution across revisions and portable core restoration',()=>{
 const d=new CoreDocument({width:2480,height:3508,name:'A4',dpi:300,author:'Artist',description:'Print test',ids:createDeterministicIdFactory()});
 const layer=d.defaultRasterLayerId;
 d.addRasterLayerAbove(layer);
 expect(d.root.metadata).toMatchObject({dpi:300,author:'Artist',description:'Print test'});
 d.undo();d.redo();
 expect(d.root.metadata.dpi).toBe(300);
 const snapshot=d.capturePersistenceSnapshot(),blocks=d.persistenceBlockPayloads(snapshot);
 const restored=CoreDocument.restore({snapshot,blockPayloads:blocks,ids:createDeterministicIdFactory()});
 expect(restored.root.metadata).toMatchObject({dpi:300,author:'Artist',description:'Print test'});
 expect(restored.root.width).toBe(2480);
 expect(restored.root.height).toBe(3508);
});
it('rejects illegal DPI and accepts legacy documents without new fields',()=>{
 expect(()=>new CoreDocument({width:12,height:16,dpi:0})).toThrow();
 const doc=new CoreDocument({width:12,height:16,ids:createDeterministicIdFactory()});
 const snapshot=doc.capturePersistenceSnapshot();
 const opened=CoreDocument.restore({snapshot,blockPayloads:doc.persistenceBlockPayloads(snapshot),ids:createDeterministicIdFactory()});
 expect(opened.root.metadata.dpi).toBeUndefined();
});
