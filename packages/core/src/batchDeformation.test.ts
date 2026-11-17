import {describe,it,expect} from 'vitest';
import {CoreDocument} from './coreDocument';
import {createDeterministicIdFactory} from './ids';

describe('C07-003 multi-layer non-destructive one-step transform',()=>{
 it('preserves independent original pixels through one transaction, Undo/Redo and save/restore',()=>{
  const doc=new CoreDocument({width:64,height:64,ids:createDeterministicIdFactory()});
  const a=doc.defaultRasterLayerId;
  let tx=doc.begin('initial');
  const b=tx.addRasterLayerAbove(a);
  tx.setPixel(a,8,8,[200,20,30,255]);
  tx.setPixel(b,20,20,[20,100,220,255]);
  tx.commit();
  const sourceRevision=doc.head,root=doc.root;
  const rgbaA=doc.readBaseRasterPixels(a),rgbaB=doc.readBaseRasterPixels(b);
  const shift=(pixels:Uint8Array,dx:number)=>{
    const out=new Uint8Array(pixels.length);
    for(let y=0;y<64;y++)for(let x=0;x<64-dx;x++)
      out.set(pixels.subarray((y*64+x)*4,(y*64+x)*4+4),(y*64+x+dx)*4);
    return out;
  };
  tx=doc.begin('batch transform');
  for(const [id,pixels] of [[a,rgbaA],[b,rgbaB]] as const){
    tx.replaceLayerDeformation(id,shift(pixels,5),{
      version:1,sourceRevision,bounds:{x:0,y:0,width:64,height:64},
      interpolation:'nearest',selection:null,linkedMask:false,mode:'affine',
      affine:{dx:5,dy:0,sx:1,sy:1,angle:0,shear:0,cx:32,cy:32}
    });
  }
  tx.commit();
  expect(doc.readPixel(a,13,8)).toEqual([200,20,30,255]);
  expect(doc.readPixel(b,25,20)).toEqual([20,100,220,255]);
  expect(doc.root.getLayer(a).deformation?.sourceRevision).toBe(sourceRevision);
  expect(doc.root.getLayer(b).deformation?.sourceRevision).toBe(sourceRevision);
  doc.undo();
  expect(doc.readPixel(a,8,8)).toEqual([200,20,30,255]);
  expect(doc.readPixel(b,20,20)).toEqual([20,100,220,255]);
  doc.redo();
  expect(doc.readPixel(a,13,8)).toEqual([200,20,30,255]);
  const state=doc.capturePersistenceSnapshot();
  const restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(state)),blockPayloads:doc.persistenceBlockPayloads(state)});
  expect(restored.readPixel(b,25,20)).toEqual([20,100,220,255]);
  expect(restored.root.getLayer(a).deformation?.sourceRevision).toBe(sourceRevision);
  expect(root.getLayer(a).deformation).toBeNull();
 });
});
