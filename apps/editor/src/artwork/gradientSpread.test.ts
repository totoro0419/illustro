import {describe,expect,it} from 'vitest';
import type {EditableGradient} from '@illustro/core';
import {gradientPositionSampler,gradientStopUpperIndex,renderArtwork} from './render';

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

describe('C09-011 bounded gradient calculations',()=>{
 it('finds the same interval as the original linear scan for 64 stops and duplicate positions',()=>{
   const stops=Array.from({length:64},(_,i)=>({at:Math.floor(i/3)/21}));
   for(const t of [-2,-.1,0,.01,.25,.5,.9,1,2]){
     let expected=1;
     while(expected<stops.length-1&&stops[expected]!.at<t)expected++;
     expect(gradientStopUpperIndex(stops,t)).toBe(expected);
   }
   expect(gradientStopUpperIndex([{at:0},{at:1}],.5)).toBe(1);
 });
 it('precomputes linear, reflected, radial, elliptical and angular positions without changing values',()=>{
   const modes=['linear','reflected','radial','angular'] as const;
   const points=[[-4,7],[0,0],[1.2,-3.4],[15,11]];
   const wrap=(t:number)=>((t%1)+1)%1;
   for(const mode of modes)for(const ratio of [undefined,.5,1,2]){
     const gradient:EditableGradient={...base,mode,start:{x:2,y:3},end:{x:6,y:7},
       ...(ratio===undefined?{}:{radialRatio:ratio})};
     const sample=gradientPositionSampler(gradient),dx=4,dy=4,den=32;
     for(const [x,y] of points){
       const u=x!-2,v=y!-3;
       let expected:number;
       if(mode==='radial'){
         if(ratio===undefined||ratio===1)expected=Math.hypot(u,v)/Math.sqrt(den);
         else expected=Math.hypot((u*dx+v*dy)/den,(-u*dy+v*dx)/den/ratio);
       }else if(mode==='angular')expected=wrap((Math.atan2(v,u)-Math.atan2(dy,dx))/(2*Math.PI));
       else{
         const t=(u*dx+v*dy)/den;
         expected=mode==='reflected'?Math.abs(t):t;
       }
       expect(sample(x!,y!)).toBeCloseTo(expected,12);
     }
   }
 });
 it('keeps a zero-length gradient fixed at the first color position',()=>{
   expect(gradientPositionSampler({...base,end:base.start})(4000,4000)).toBe(0);
 });
});
