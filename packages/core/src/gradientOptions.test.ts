import {describe,expect,it} from 'vitest';
import {CoreDocument} from './coreDocument';
import {validateEditableArtwork,type EditableGradient} from './editableArtwork';
import {createDeterministicIdFactory} from './ids';

const legacy:EditableGradient={kind:'gradient',mode:'radial',start:{x:10,y:10},end:{x:20,y:10},
 stops:[{at:0,color:'#123456',opacity:1,midpoint:.5},{at:1,color:'#abcdef',opacity:.5,midpoint:.5}]};
describe('C09-008 backward-compatible gradient settings',()=>{
 it('does not add new fields to legacy data and rejects invalid options',()=>{
   expect(validateEditableArtwork(JSON.parse(JSON.stringify(legacy)))).toEqual(legacy);
   for(const spread of ['bad',null,1])expect(()=>validateEditableArtwork({...legacy,spread})).toThrow();
   for(const radialRatio of [0,-1,101,NaN,null])expect(()=>validateEditableArtwork({...legacy,radialRatio})).toThrow();
 });
 it('retains repetition and ellipse ratio through Undo/Redo and persistent restore',()=>{
   const doc=new CoreDocument({width:64,height:64,ids:createDeterministicIdFactory()});
   const id=doc.defaultRasterLayerId,before=doc.head;
   const content={...legacy,spread:'reflect' as const,radialRatio:2.5};
   const tx=doc.begin('elliptical repeated gradient');tx.setEditableArtwork(id,content);tx.commit();
   expect(doc.root.getLayer(id).editable).toEqual(content);
   doc.undo();expect(doc.head).toBe(before);expect(doc.root.getLayer(id).editable).toBeUndefined();
   doc.redo();
   const snapshot=doc.capturePersistenceSnapshot();
   const restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(snapshot)),blockPayloads:doc.persistenceBlockPayloads(snapshot)});
   expect(restored.root.getLayer(id).editable).toEqual(content);
 });
});
