import {describe,expect,it} from 'vitest';
import {decodeIllustroFile,encodeIllustroFile} from './format';

const base=()=>({generationId:'gen-1',documentId:'00000000-0000-4000-8000-000000000001',snapshotRevisionId:'00000000-0000-4000-8000-000000000002',createdAt:1,
  sections:[
    {id:'document',type:'document.v1',required:true,bytes:new TextEncoder().encode('{"ok":true}')},
    {id:'future',type:'future.preview.v9',required:false,bytes:new Uint8Array([3,1,4]),descriptorExtras:{vendor:'future'}},
  ],manifestExtras:{futureTop:{keep:true}}});

describe('.illustro v1 container',()=>{
  it('round-trips required and unknown optional sections without changing payload bytes',async()=>{
    const bytes=await encodeIllustroFile(base()),decoded=await decodeIllustroFile(bytes,{knownRequiredTypes:new Set(['document.v1'])});
    expect(decoded.manifest.documentId).toBe(base().documentId);expect(decoded.manifest.extras).toEqual({futureTop:{keep:true}});
    expect([...decoded.sections.get('future')!.bytes]).toEqual([3,1,4]);expect(decoded.sections.get('future')!.descriptor.extras).toEqual({vendor:'future'});
  });
  it('rejects truncation, manifest corruption, payload corruption and unknown required semantics',async()=>{
    const bytes=await encodeIllustroFile(base());
    await expect(decodeIllustroFile(bytes.slice(0,-1))).rejects.toThrow();
    const manifestBroken=bytes.slice();manifestBroken[30]^=1;await expect(decodeIllustroFile(manifestBroken)).rejects.toThrow(/manifest integrity/);
    const payloadBroken=bytes.slice();const decoded=await decodeIllustroFile(bytes);const doc=decoded.sections.get('document')!;const payloadStart=24+new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(16,true);payloadBroken[payloadStart+doc.descriptor.offset]^=1;
    await expect(decodeIllustroFile(payloadBroken)).rejects.toThrow(/section integrity/);
    const unknownRequired={...base(),sections:[{id:'x',type:'future.required.v99',required:true,bytes:new Uint8Array([1])}]};
    await expect(decodeIllustroFile(await encodeIllustroFile(unknownRequired),{knownRequiredTypes:new Set(['document.v1'])})).rejects.toThrow(/unknown required/);
  });
  it('rejects duplicate IDs and malformed layout claims before exposing a document',async()=>{
    const duplicate={...base(),sections:[{id:'same',type:'a',required:false,bytes:new Uint8Array([1])},{id:'same',type:'b',required:false,bytes:new Uint8Array([2])}]};
    await expect(encodeIllustroFile(duplicate)).rejects.toThrow(/duplicate section/);
  });
});
