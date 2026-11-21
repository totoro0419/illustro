import {describe,it,expect} from 'vitest';
import {exactBlobBuffer} from './blobBuffer';

describe('C03-009 native file Blob input',()=>{
  it('reuses a full dedicated ArrayBuffer instead of duplicating it',async()=>{
    const original=Uint8Array.from([1,2,3,4,5]);
    const bytes=exactBlobBuffer(original);
    expect(bytes).toBe(original.buffer);
    expect(new Uint8Array(await new Blob([bytes]).arrayBuffer())).toEqual(original);
  });
  it('copies only the selected view when the Uint8Array is a subarray',async()=>{
    const base=Uint8Array.from([9,9,1,2,3,9,9]);
    const sub=base.subarray(2,5);
    const bytes=exactBlobBuffer(sub);
    expect(bytes).not.toBe(base.buffer);
    expect(new Uint8Array(await new Blob([bytes]).arrayBuffer())).toEqual(Uint8Array.from([1,2,3]));
  });
});
