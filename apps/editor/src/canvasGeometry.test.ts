import {describe,it,expect} from 'vitest';
import {changeCanvasBounds,cropCanvas,shiftedForAnchor,resizeImagePixels} from './canvasGeometry';
describe('M08 raster geometry filters',()=>{
 it('canvas size adds transparent bounds and preserves unaffected pixels byte-for-byte',()=>{
  const src=new Uint8Array([255,0,0,255,0,255,0,255,0,0,255,100,0,0,0,0]);
  const output=changeCanvasBounds(src,2,2,4,4,1,1);
  const pixel=(x:number,y:number)=>[...output.slice((y*4+x)*4,(y*4+x+1)*4)];
  expect(pixel(1,1)).toEqual([255,0,0,255]);expect(pixel(2,1)).toEqual([0,255,0,255]);
  expect(pixel(1,2)).toEqual([0,0,255,100]);expect(pixel(0,0)).toEqual([0,0,0,0]);
  expect(shiftedForAnchor(2,2,4,4,'center')).toEqual({x:1,y:1});
 });
 it('crop removes document outer pixels without resampling',()=>{
  const b=new Uint8Array(3*3*4);b.set([33,44,55,255],(1*3+2)*4);const c=cropCanvas(b,3,3,1,1,2,2);
  expect([...c.slice(4,8)]).toEqual([33,44,55,255]);expect(c.length).toBe(16);
  expect(()=>cropCanvas(b,3,3,2,2,2,2)).toThrow();
 });
 it('nearest preserves pixel art exact values',()=>{
  const src=Uint8Array.from([200,0,0,255,0,0,200,255]);
  const out=resizeImagePixels(src,2,1,4,2,'nearest');expect([...out.slice(0,4)]).toEqual([200,0,0,255]);expect([...out.slice(12,16)]).toEqual([0,0,200,255]);
 });
 it('bilinear weights use premultiplied-alpha to avoid transparent color halo',()=>{
  const src=Uint8Array.from([255,0,0,255,0,0,255,0]),out=resizeImagePixels(src,2,1,3,1,'bilinear');
  const p=[...out.slice(4,8)];expect(p[0]).toBe(255);expect(p[1]).toBe(0);expect(p[2]).toBe(0);expect(p[3]).toBeGreaterThan(100);expect(p[3]).toBeLessThan(150);
 });
 it('area averages high-frequency pixel checks correctly',()=>{
  const src=Uint8Array.from([0,0,0,255,255,255,255,255,255,255,255,255,0,0,0,255]);
  const out=resizeImagePixels(src,2,2,1,1,'area');expect(out[0]).toBeGreaterThanOrEqual(127);expect(out[0]).toBeLessThanOrEqual(128);expect(out[3]).toBe(255);
 });
 it('auto reduction anti-aliasing avoids extreme checker Moire',()=>{
  const src=new Uint8Array(12*12*4);for(let y=0;y<12;y++)for(let x=0;x<12;x++){const p=(y*12+x)*4,v=(x+y)%2?255:0;src.fill(v,p,p+3);src[p+3]=255;}
  const out=resizeImagePixels(src,12,12,2,2);expect(out[0]).toBeGreaterThan(100);expect(out[0]).toBeLessThan(155);
 });
});
