import {describe,expect,it} from 'vitest';
import {readCanvasAlphaBands} from './alphaBands';

describe('C09-011 bounded shape alpha readback',()=>{
 it('reads alpha exactly without allocating or requesting the full-frame RGBA image',()=>{
   const width=37,height=31,requests:Array<[number,number]>=[];
   const original=Uint8ClampedArray.from({length:width*height*4},(_,i)=>
     i%4===3?(Math.floor(i/4)*7)%256:120);
   const output=readCanvasAlphaBands(width,height,(start,rows)=>{
     requests.push([start,rows]);
     return original.slice(start*width*4,(start+rows)*width*4);
   },width*4*3);
   expect(requests.length).toBeGreaterThan(9);
   expect(requests.every(([,rows])=>rows<=3)).toBe(true);
   expect(Array.from(output)).toEqual(Array.from({length:width*height},(_,i)=>original[i*4+3]!));
 });
 it('never requests a second 4000x4000 ImageData at full size',()=>{
   const width=4000,height=4000;
   let maxRequested=0,calls=0;
   const alpha=readCanvasAlphaBands(width,height,(_start,rows)=>{
     maxRequested=Math.max(maxRequested,width*rows*4);calls++;
     return new Uint8ClampedArray(width*rows*4);
   });
   expect(alpha.length).toBe(16_000_000);
   expect(maxRequested).toBeLessThanOrEqual(2*1024*1024);
   expect(calls).toBeGreaterThan(10);
 });
 it('rejects malformed row data and invalid sizes',()=>{
   expect(()=>readCanvasAlphaBands(4,4,()=>new Uint8ClampedArray(3))).toThrow('読み取れ');
   expect(()=>readCanvasAlphaBands(-1,4,()=>new Uint8ClampedArray(3))).toThrow('サイズ');
   expect(()=>readCanvasAlphaBands(4,4,()=>new Uint8ClampedArray(3),3)).toThrow('サイズ');
 });
});
