import {describe,expect,it} from 'vitest';
import type {EditableGradient} from '@illustro/core';
import {renderArtwork} from './render';

const base:EditableGradient={kind:'gradient',mode:'linear',start:{x:.5,y:.5},end:{x:2.5,y:.5},
 stops:[{at:0,color:'#000000',opacity:1,midpoint:.5},{at:1,color:'#ffffff',opacity:1,midpoint:.5}]};
const paint=(content:EditableGradient,width=8,height=1)=>renderArtwork(content,
 {width,height,outputWidth:width,outputHeight:height},null as unknown as HTMLCanvasElement);
const redRow=(pixels:Uint8ClampedArray)=>Array.from({length:pixels.length/4},(_,i)=>pixels[i*4]);
describe('C09-008 gradient repetition and elliptical radial output',()=>{
 it('preserves the legacy clamped gradient when no new option is saved',()=>{
   expect(redRow(paint(base))).toEqual([0,128,255,255,255,255,255,255]);
 });
 it('repeats the actual interpolated colors and wraps negative coordinates',()=>{
   expect(redRow(paint({...base,spread:'repeat'}))).toEqual([0,128,0,128,0,128,0,128]);
   expect(redRow(paint({...base,start:{x:2.5,y:.5},end:{x:4.5,y:.5},spread:'repeat'})))
     .toEqual([0,128,0,128,0,128,0,128]);
 });
 it('reflects repeated colors continuously in both directions',()=>{
   expect(redRow(paint({...base,start:{x:2.5,y:.5},end:{x:4.5,y:.5},spread:'reflect'})))
     .toEqual([255,128,0,128,255,128,0,128]);
 });
 it('uses the radial axis direction to orient a true ellipse',()=>{
   const radial={...base,mode:'radial' as const,start:{x:4.5,y:4.5},end:{x:6.5,y:4.5},radialRatio:2};
   const pixels=paint(radial,9,9),red=(x:number,y:number)=>pixels[(y*9+x)*4];
   expect(red(5,4)).toBe(128);expect(red(4,6)).toBe(128);expect(red(4,4)).toBe(0);
   const rotated=paint({...radial,end:{x:4.5,y:6.5}},9,9);
   expect(rotated[(5*9+4)*4]).toBe(128);expect(rotated[(4*9+6)*4]).toBe(128);
 });
 it('keeps explicit circular ratio identical to old radial gradients',()=>{
   const radial={...base,mode:'radial' as const};
   expect(paint({...radial,radialRatio:1})).toEqual(paint(radial));
 });
});
