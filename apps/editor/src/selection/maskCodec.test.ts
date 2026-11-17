import {describe,it,expect} from 'vitest';
import {packSelectionMask,unpackSelectionMask} from './maskCodec';

/** Avoid building a multi-gigabyte pretty-print diff for 16 million pixels. */
function equalBytes(a:Uint8Array,b:Uint8Array):boolean{
  if(a.length!==b.length)return false;
  for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;
  return true;
}

describe('C06-006 portable selection compression',()=>{
  it('compresses large sparse and solid selections without alpha loss',()=>{
    for(const length of [1,2,3,127,128,129,1000,4000*4000]){
      const data=new Uint8Array(length);
      data.fill(255,Math.floor(length/2),Math.min(length,Math.floor(length/2)+3));
      const packed=packSelectionMask(data);
      const unpacked=packed.compressed?unpackSelectionMask(packed.bytes,length):packed.bytes;
      expect(equalBytes(unpacked,data)).toBe(true);
      if(length>=1000)expect(packed.bytes.byteLength).toBeLessThan(length/20);
    }
  });
  it('retains random alpha and literal runs across 128-byte boundaries',()=>{
    const data=new Uint8Array(10001);
    for(let i=0;i<data.length;i++)data[i]=(i*71+i*i)%256;
    const packed=packSelectionMask(data);
    expect(equalBytes(packed.compressed?unpackSelectionMask(packed.bytes,data.length):packed.bytes,data)).toBe(true);
  });
  it('does not accept truncated, extra, or overexpanded packets',()=>{
    expect(()=>unpackSelectionMask(Uint8Array.of(127,12),1)).toThrow();
    expect(()=>unpackSelectionMask(Uint8Array.of(255),128)).toThrow();
    expect(()=>unpackSelectionMask(Uint8Array.of(0,4),2)).toThrow();
    expect(()=>unpackSelectionMask(Uint8Array.of(128,7),2)).toThrow();
    expect(unpackSelectionMask(Uint8Array.of(255,0),128)).toEqual(new Uint8Array(128));
  });
});
