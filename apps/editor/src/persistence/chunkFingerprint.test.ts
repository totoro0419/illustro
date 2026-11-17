import {describe,it,expect} from 'vitest';
import {fingerprintOwnedBytes,fingerprintFileChunks} from './chunkFingerprint';

describe('C03-009 bounded exact file readback',()=>{
  it('matches expected contents against browser Blob including partially filled final chunk',async()=>{
    const bytes=new Uint8Array(4*1024*1024+19);
    bytes[0]=1;bytes[4*1024*1024]=55;bytes[bytes.length-1]=200;
    const expected=await fingerprintOwnedBytes(bytes);
    expect(await fingerprintFileChunks(new Blob([bytes]))).toBe(expected);
    const altered=bytes.slice();altered[4*1024*1024+2]=4;
    expect(await fingerprintFileChunks(new Blob([altered]))).not.toBe(expected);
  });
  it('supports exact empty files and offset views',async()=>{
    expect(await fingerprintOwnedBytes(new Uint8Array())).toBe(await fingerprintFileChunks(new Blob([])));
    const source=Uint8Array.from([9,5,6,7,9]);
    const expected=await fingerprintOwnedBytes(source.subarray(1,4));
    expect(await fingerprintFileChunks(new Blob([Uint8Array.from([5,6,7])]))).toBe(expected);
  });
  it('cannot accept a mismatch in byte count or missing bytes',async()=>{
    const input=Uint8Array.from([1,2,3]);
    expect(await fingerprintFileChunks(new Blob([input]))).not.toBe(await fingerprintOwnedBytes(input.subarray(0,2)));
  });
});
