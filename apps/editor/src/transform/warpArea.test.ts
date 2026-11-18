import {describe,expect,it} from 'vitest';
import {initialTransform,transformRaster,type Transform} from './geometry';

describe('C07-014 area filtering of four-corner and curved transforms',()=>{
 it('includes narrow repeating stripes during 64x four-corner reduction',()=>{
  const width=2048,height=4,source=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const value=x%64<2?255:0;source.set([value,value,value,255],(y*width+x)*4);
  }
  for(const mode of ['free','projective','skew'] as const){
   const settings:Transform={...initialTransform,mode,interpolation:'area',quadrilateral:{
    bounds:{x:0,y:0,width,height},corners:[{x:0,y:0},{x:32,y:0},{x:32,y:height},{x:0,y:height}]}};
   const result=transformRaster(source,width,height,settings);
   for(let x=1;x<31;x++){
    expect(result[(width+x)*4]).toBe(8);expect(result[(width+x)*4+3]).toBe(255);
   }
  }
 });
 it('keeps partial selected alpha and transparent colors during perspective reduction',()=>{
  const width=128,height=16,source=new Uint8Array(width*height*4),alpha=new Uint8Array(width*height).fill(128);
  for(let i=0;i<width*height;i++)source.set(i%2?[0,0,255,0]:[255,0,0,255],i*4);
  const settings={...initialTransform,mode:'perspective' as const,interpolation:'area' as const,
   sx:.125,sy:.5,perspective:.3,cx:0,cy:0};
  const result=transformRaster(source,width,height,settings,{width,height,alpha});
  const at=(4*width+5)*4;
  expect(result[at]).toBeGreaterThan(240);expect(result[at+2]).toBe(0);
  expect(result[at+3]).toBeGreaterThan(0);expect(result[at+3]).toBeLessThan(180);
 });
});
