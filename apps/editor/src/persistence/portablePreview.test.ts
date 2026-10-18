import {describe,it,expect} from 'vitest';
import {CoreDocument} from '@illustro/core';
import {createPortableDocument,openPortableDocument,isPngPreview} from './portable';

const preview=()=>new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1]);

describe('optional portable preview',()=>{
  it('keeps a version-1 editable artwork and a bounded optional PNG',async()=>{
    const document=new CoreDocument({width:512,height:384,name:'portable-preview'});
    const data=preview(),save=await createPortableDocument({document,selectedLayerId:document.defaultRasterLayerId,previewImage:data});
    const opened=await openPortableDocument(save.bytes);
    expect(opened.previewImage).toEqual(data);
    expect(opened.document.root.documentId).toBe(document.root.documentId);
    expect(opened.document.head).toBe(document.head);
    expect(opened.preserved.optionalSections.find(x=>x.id==='render-preview')).toBeUndefined();
    const resave=await createPortableDocument({document:opened.document,selectedLayerId:opened.selectedLayerId,preserved:opened.preserved});
    expect((await openPortableDocument(resave.bytes)).previewImage).toBeUndefined();
  });
  it('rejects non-PNG or oversized previews without affecting the actual document',async()=>{
    expect(isPngPreview(new Uint8Array([1,2,3]))).toBe(false);
    expect(isPngPreview(new Uint8Array(9*1024*1024))).toBe(false);
  });
});
