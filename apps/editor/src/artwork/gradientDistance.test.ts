import {describe,expect,it} from 'vitest';
import {gradientBoundaryDistance} from './gradientDistance';

describe('C09-013 preview and final shape-following gradient distance',()=>{
 it('preserves the same document-space distance after uniform reduction',()=>{
   const alpha=new Uint8Array(7*7).fill(255);
   const one=gradientBoundaryDistance(alpha,7,7,1,1);
   const scaled=gradientBoundaryDistance(alpha,7,7,4,4);
   for(let i=0;i<one.length;i++)expect(scaled[i]).toBeCloseTo(one[i]!*4,5);
 });
 it('respects different horizontal and vertical scale factors',()=>{
   const alpha=new Uint8Array(9*9).fill(255);
   const distances=gradientBoundaryDistance(alpha,9,9,2,5);
   expect(distances[4*9+4]).toBeCloseTo(10,5);
   expect(distances[0]).toBeCloseTo(2,5);
   const vertical=gradientBoundaryDistance(alpha,9,9,5,2);
   expect(vertical[0]).toBeCloseTo(2,5);
 });
 it('does not color outside the mask and rejects invalid buffers',()=>{
   const alpha=new Uint8Array(25);
   alpha[2*5+2]=255;
   const distances=gradientBoundaryDistance(alpha,5,5,1,1);
   expect(distances[0]).toBe(0);
   expect(distances[2*5+2]).toBe(1);
   expect(()=>gradientBoundaryDistance(alpha,6,5)).toThrow('画像サイズ');
   expect(()=>gradientBoundaryDistance(alpha,5,5,0,2)).toThrow('画像サイズ');
 });
});
