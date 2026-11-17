import {describe,it,expect} from 'vitest';
import {canReuseExternalReference,parseExternalReferences,verifyExternalReference} from './referenceBundleMode';
import {fingerprintFileChunks} from '../persistence/chunkFingerprint';
import type {AssetEntry} from './library';
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
  it('requires exact image bytes even when ID, name, type and length match',async()=>{
    const bytes=new Blob([Uint8Array.of(1,2,3,4)],{type:'image/png'});
    const altered=new Blob([Uint8Array.of(1,2,3,5)],{type:'image/png'});
    const fingerprint=await fingerprintFileChunks(bytes);
    const descriptor={assetId:image.id,name:image.name,bytes:4,mime:image.mime,fingerprint};
    const local={...image,bytes:4,data:bytes} as AssetEntry;
    expect(await verifyExternalReference(descriptor,local)).toBe(true);
    expect(await verifyExternalReference(descriptor,{...local,data:altered})).toBe(false);
    expect(await verifyExternalReference({...descriptor,fingerprint:undefined},local)).toBe(false);
    expect(parseExternalReferences([descriptor])).toEqual([descriptor]);
    expect(()=>parseExternalReferences([{...descriptor,fingerprint:'invalid'}])).toThrow();
  });
  it('rejects ambiguous, duplicate, malformed and oversize reference manifests',()=>{
    const record={assetId:image.id,name:image.name,bytes:image.bytes,mime:image.mime};
    expect(parseExternalReferences([record])).toEqual([record]);
    expect(()=>parseExternalReferences([record,record])).toThrow();
    expect(()=>parseExternalReferences([{...record,bytes:-2}])).toThrow();
    expect(()=>parseExternalReferences([{...record,mime:'text/html'}])).toThrow();
  });
});
