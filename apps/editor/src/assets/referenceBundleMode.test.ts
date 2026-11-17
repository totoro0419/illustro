import {describe,it,expect} from 'vitest';
import {canReuseExternalReference,parseExternalReferences} from './referenceBundleMode';
const image={id:'asset-1',kind:'reference' as const,name:'sample.png',bytes:100,mime:'image/png',deleted:false};
describe('C05-013 local-only reference compatibility',()=>{
  it('accepts only the same immutable reference asset, not another same-sized file',()=>{
    const record={assetId:image.id,name:image.name,bytes:image.bytes,mime:image.mime};
    expect(canReuseExternalReference(record,image)).toBe(true);
    expect(canReuseExternalReference(record,{...image,id:'other'})).toBe(false);
    expect(canReuseExternalReference(record,{...image,name:'different.png'})).toBe(false);
    expect(canReuseExternalReference(record,{...image,deleted:true})).toBe(false);
    expect(canReuseExternalReference(record,{...image,kind:'paper'})).toBe(false);
  });
  it('rejects ambiguous, duplicate, malformed and oversize reference manifests',()=>{
    const record={assetId:image.id,name:image.name,bytes:image.bytes,mime:image.mime};
    expect(parseExternalReferences([record])).toEqual([record]);
    expect(()=>parseExternalReferences([record,record])).toThrow();
    expect(()=>parseExternalReferences([{...record,bytes:-2}])).toThrow();
    expect(()=>parseExternalReferences([{...record,mime:'text/html'}])).toThrow();
  });
});
