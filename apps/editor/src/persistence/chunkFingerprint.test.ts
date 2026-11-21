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
  it('bounds readback memory for a synthetic 4000×4000 RGBA-size file',async()=>{
    const size=4000*4000*4;
    let reads=0,largest=0;
    // Virtual Blob: no 64 MB file is allocated, and every slice is observed.
    const file={
      size,
      slice(start:number,stop:number){
        const length=stop-start;
        reads++;largest=Math.max(largest,length);
        return new Blob([new Uint8Array(length)]);
      },
    } as Blob;
    const digest=await fingerprintFileChunks(file);
    expect(digest).toMatch(/^sha256-chunks-v1:[a-f0-9]{64}$/);
    expect(largest).toBeLessThanOrEqual(4*1024*1024);
    expect(reads).toBe(Math.ceil(size/(4*1024*1024)));
  });
  it('cannot accept a mismatch in byte count or missing bytes',async()=>{
    const input=Uint8Array.from([1,2,3]);
    expect(await fingerprintFileChunks(new Blob([input]))).not.toBe(await fingerprintOwnedBytes(input.subarray(0,2)));
  });
});
