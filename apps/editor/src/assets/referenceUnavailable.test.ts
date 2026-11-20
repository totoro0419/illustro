import {describe,it,expect} from 'vitest';
import {CoreDocument} from '@illustro/core';
import {createPortableDocument,openPortableDocument} from '../persistence/portable';
import {referenceUnavailableSection} from './referenceBoard';

describe('C05-001 reference export failure does not lose artwork',()=>{
  it('writes an explicit missing-reference marker alongside valid artwork',async()=>{
    const document=new CoreDocument({width:24,height:24,name:'保護した作品'});
    const marker=referenceUnavailableSection(document.root.documentId);
    expect(marker.required).toBe(false);
    expect(marker.id).toBe('c05.reference-board');
    const file=await createPortableDocument({
      document,selectedLayerId:document.defaultRasterLayerId,
      preserved:{manifestExtras:{},optionalSections:[marker]}
    });
    const reopened=await openPortableDocument(file.bytes);
    expect(reopened.document.root.width).toBe(24);
    expect(reopened.document.root.name).toBe('保護した作品');
    const section=reopened.preserved.optionalSections.find(item=>item.id===marker.id);
    expect(section?.type).toBe(marker.type);
    expect(JSON.parse(new TextDecoder().decode(section?.bytes))).toMatchObject({
      schema:'illustro.reference-unavailable',documentId:document.root.documentId
    });
  });
  it('refuses to attach an unnamed unavailable marker',()=>{
    expect(()=>referenceUnavailableSection('')).toThrow();
  });
});
