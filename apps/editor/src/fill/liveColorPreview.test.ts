import {describe,expect,it} from 'vitest';
import {LiveColorFillPreview} from './liveColorPreview';

const image=()=>{
 const input=new Uint8Array(5*3*4);
 for(let y=0;y<3;y++)for(let x=0;x<5;x++){
  const p=(y*5+x)*4;
  input.set(x===2?[0,0,240,255]:[250,12,12,255],p);
 }
 return input;
};
const settings={tolerance:2,alphaTolerance:2,contiguous:true};
describe('C08-003 ordinary fill stroke live preview',()=>{
 it('highlights the connected region while preserving a differently colored divider',()=>{
  const input=image(),preview=new LiveColorFillPreview(input,5,3);
  expect(preview.add({x:0,y:1},{x:1,y:1},settings)).toBe(true);
  const coverage=preview.coverage();
  expect(Array.from(coverage.slice(5,10))).toEqual([1,1,0,0,0]);
  expect(input[2*4]).toBe(0);
  expect(preview.renderPixels()[(1*5+0)*4+3]).toBe(112);
  expect(preview.renderPixels()[(1*5+4)*4+3]).toBe(0);
  expect(preview.add({x:0,y:1},{x:1,y:1},settings)).toBe(false);
 });
 it('allows a later part of the same stroke to select another disconnected region of the original color',()=>{
  const preview=new LiveColorFillPreview(image(),5,3);
  preview.add({x:0,y:1},{x:0,y:1},settings);
  expect(preview.add({x:4,y:1},{x:4,y:1},settings)).toBe(true);
  expect(Array.from(preview.coverage().slice(5,10))).toEqual([1,1,0,1,1]);
 });
 it('global color matching chooses all equal regions in one pass',()=>{
  const preview=new LiveColorFillPreview(image(),5,3);
  expect(preview.add({x:0,y:1},{x:0,y:1},{...settings,contiguous:false})).toBe(true);
  expect(Array.from(preview.coverage().slice(5,10))).toEqual([1,1,0,1,1]);
 });
 it('uses alpha tolerance independently from color difference',()=>{
  const source=new Uint8Array([20,20,20,255,20,20,20,30]);
  const preview=new LiveColorFillPreview(source,2,1,8);
  preview.add({x:0,y:0},{x:0,y:0},{...settings,alphaTolerance:0});
  expect(Array.from(preview.coverage())).toEqual([1,0]);
  const permissive=new LiveColorFillPreview(source,2,1,8);
  permissive.add({x:0,y:0},{x:0,y:0},{...settings,alphaTolerance:100});
  expect(Array.from(permissive.coverage())).toEqual([1,1]);
 });
 it('bounds output to a 512px side on a 4000px document',()=>{
  const input=new Uint8Array(4000*4000*4);
  const preview=new LiveColorFillPreview(input,4000,4000);
  expect([preview.width,preview.height]).toEqual([512,512]);
  expect(preview.pixels.length).toBe(512*512*4);
 });
 it('rejects malformed buffers and ignores non-finite coordinates',()=>{
  expect(()=>new LiveColorFillPreview(new Uint8Array(2),3,3)).toThrow('サイズ');
  const preview=new LiveColorFillPreview(image(),5,3);
  expect(preview.add({x:NaN,y:1},{x:Infinity,y:1},settings)).toBe(false);
  expect(preview.coverage().some(Boolean)).toBe(false);
 });
});
