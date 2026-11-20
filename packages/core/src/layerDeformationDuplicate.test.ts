import {expect,it} from 'vitest';
import {CoreDocument} from './coreDocument';
import {createDeterministicIdFactory} from './ids';
import type {LayerDeformation} from './layerDeformation';

it('C03-001: duplicates a transformed layer with a stable original, independent edits and save/undo/redo',()=>{
  const doc=new CoreDocument({width:8,height:8,ids:createDeterministicIdFactory()});
  const original=doc.defaultRasterLayerId;
  const start=doc.begin('draw original');
  start.setPixel(original,0,0,[10,20,30,255]);start.commit();
  const sourceRevision=doc.head;
  const parameters:LayerDeformation={
    version:1,sourceRevision,mode:'affine',bounds:{x:0,y:0,width:8,height:8},
    affine:{dx:1,dy:0,sx:1,sy:1,angle:0,shear:0,cx:4,cy:4},
    selection:null,linkedMask:false,interpolation:'nearest',
  };
  const transformed=new Uint8Array(8*8*4);
  transformed.set([10,20,30,255],4);
  const tx=doc.begin('transform original');
  tx.replaceLayerDeformation(original,transformed,parameters);tx.commit();
  const duplicate=doc.begin('duplicate transformed layer');
  const clone=duplicate.addRasterSnapshotAbove(original,transformed,'複製',true);
  duplicate.commit();
  const copied=doc.root.getLayer(clone).deformation;
  expect(copied).toMatchObject({sourceRevision,sourceLayerId:original,mode:'affine'});
  expect(doc.root.getLayer(original).deformation).toEqual(parameters);
  expect(doc.readBaseRasterPixels(clone).slice(4,8)).toEqual(Uint8Array.of(10,20,30,255));
  const saved=doc.capturePersistenceSnapshot();
  const restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(saved)),blockPayloads:doc.persistenceBlockPayloads(saved)});
  expect(restored.root.getLayer(clone).deformation).toEqual(copied);
  expect(restored.readBaseRasterPixels(original,sourceRevision).slice(0,4)).toEqual(Uint8Array.of(10,20,30,255));
  const edited=restored.begin('adjust duplicated transform');
  edited.replaceLayerDeformation(clone,transformed,{
    ...copied!,mode:'affine',affine:{...parameters.affine,dx:3},
  } as LayerDeformation);
  edited.commit();
  expect(restored.root.getLayer(clone).deformation?.mode).toBe('affine');
  expect(restored.root.getLayer(original).deformation).toEqual(parameters);
  const snapshot=restored.capturePersistenceSnapshot();
  const reopened=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(snapshot)),blockPayloads:restored.persistenceBlockPayloads(snapshot)});
  expect(reopened.root.getLayer(clone).deformation).toMatchObject({sourceRevision,sourceLayerId:original});
  expect(reopened.root.getLayer(original).deformation).toEqual(parameters);
  reopened.undo();
  expect(reopened.root.getLayer(clone).deformation).toEqual(copied);
  reopened.redo();
  expect((reopened.root.getLayer(clone).deformation as LayerDeformation&{affine:{dx:number}}).affine.dx).toBe(3);
});
