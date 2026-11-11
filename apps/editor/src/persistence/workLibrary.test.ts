import {describe,it,expect} from 'vitest';
import {CoreDocument} from '@illustro/core';
import {namedSnapshot} from './workLibrary';
describe('Work library document identity',()=>{
  it('rename persists in portable roots without changing artwork or its identity',()=>{
    const source=new CoreDocument({width:640,height:480,name:'original'}),layer=source.defaultRasterLayerId,tx=source.begin('pixel');tx.setPixel(layer,20,30,[40,50,60,255]);tx.commit();
    const snapshot=source.capturePersistenceSnapshot(),restored=CoreDocument.restore({snapshot:namedSnapshot(snapshot,'夕焼け'),blockPayloads:source.persistenceBlockPayloads(snapshot)});
    expect(restored.root.name).toBe('夕焼け');expect(restored.root.documentId).toBe(source.root.documentId);expect(restored.readPixel(layer,20,30)).toEqual([40,50,60,255]);expect(source.root.name).toBe('original');
  });
  it('copy has its own identity and edits never change the source',()=>{
    const source=new CoreDocument({width:512,height:384,name:'source'}),snapshot=source.capturePersistenceSnapshot(),copy=CoreDocument.restore({snapshot:namedSnapshot(snapshot,'copy',crypto.randomUUID()),blockPayloads:source.persistenceBlockPayloads(snapshot)});
    const tx=copy.begin('copy pixel');tx.setPixel(copy.defaultRasterLayerId,1,2,[255,0,0,255]);tx.commit();
    expect(copy.root.documentId).not.toBe(source.root.documentId);expect(copy.readPixel(copy.defaultRasterLayerId,1,2)).toEqual([255,0,0,255]);expect(source.readPixel(source.defaultRasterLayerId,1,2)).toEqual([0,0,0,0]);
  });
});
