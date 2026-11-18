import {describe,expect,it} from 'vitest';
import {gradientBoundaryDistance,gradientBoundaryField} from './gradientDistance';

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
 it('matches the full field exactly across holes, disconnected shapes and nonuniform scales',()=>{
   const w=23,h=19,alpha=new Uint8Array(w*h);
   for(let y=3;y<15;y++)for(let x=4;x<17;x++)
     if(!(x>7&&x<12&&y>6&&y<10))alpha[y*w+x]=127;
   alpha[16*w+19]=255;
   for(const [sx,sy] of [[1,1],[2,5],[.75,3.2]]){
     const expected=gradientBoundaryDistance(alpha,w,h,sx,sy),field=gradientBoundaryField(alpha,w,h,sx,sy);
     expect(field.left).toBe(4);expect(field.top).toBe(3);
     for(let y=0;y<field.height;y++)for(let x=0;x<field.width;x++)
       expect(field.values[y*field.width+x]).toBe(expected[(y+field.top)*w+x+field.left]);
   }
 });
 it('allocates a small distance field for a local shape in a 4K artwork',()=>{
   const alpha=new Uint8Array(4000*4000);
   for(let y=1800;y<1810;y++)alpha.fill(255,y*4000+2000,y*4000+2020);
   const field=gradientBoundaryField(alpha,4000,4000);
   expect(field.values.byteLength).toBe(20*10*4);
   expect(field).toMatchObject({left:2000,top:1800,width:20,height:10});
   const empty=gradientBoundaryField(new Uint8Array(25),5,5);
   expect(empty.width*empty.height).toBe(0);expect(empty.values).toHaveLength(0);
 });
});
