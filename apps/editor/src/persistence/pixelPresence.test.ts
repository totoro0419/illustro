import {describe,it,expect} from 'vitest';
import {hasPixelData} from './pixelPresence';
describe('lossless sparse pixel presence',()=>{
 it('retains hidden RGB after a complete erasure',()=>{expect(hasPixelData(new Uint8Array([72,30,11,0]))).toBe(true);});
 it('omits only an entirely zero tile',()=>{expect(hasPixelData(new Uint8Array(128*128*4))).toBe(false);});
 it('handles subarrays with unaligned byte offsets',()=>{const bytes=new Uint8Array([0,0,50,0,0]);expect(hasPixelData(bytes.subarray(1))).toBe(true);});
});
