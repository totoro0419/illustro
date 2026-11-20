import {describe,expect,it} from 'vitest';
import {initialTransform,transformRaster} from './geometry';

describe('C07 adaptive area interpolation',()=>{
  it('averages every parity of an 8×8 checkerboard reduced to one pixel',()=>{
    const width=8,height=8,source=new Uint8Array(width*height*4);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const index=(y*width+x)*4,level=(x+y)%2?255:0;
      source[index]=source[index+1]=source[index+2]=level;
      source[index+3]=255;
    }
    const output=transformRaster(source,width,height,
      {...initialTransform,interpolation:'area'},null,1,1);
    expect(output[0]).toBeGreaterThanOrEqual(125);
    expect(output[0]).toBeLessThanOrEqual(130);
    expect(output[1]).toBe(output[0]);
    expect(output[3]).toBe(255);
  });
});

describe('C07-014: exact area sampling for strong axis-aligned reduction',()=>{
 it('preserves thin columns missed by the legacy fixed 8x8 sampling grid at 32x reduction',()=>{
  const width=32,height=32,source=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=(y*width+x)*4;
   const level=x%4===3?255:0;
   source[i]=source[i+1]=source[i+2]=level;source[i+3]=255;
  }
  const area=transformRaster(source,width,height,
    {...initialTransform,interpolation:'area'},null,1,1);
  expect(area[0]).toBeGreaterThanOrEqual(63);
  expect(area[0]).toBeLessThanOrEqual(65);
  expect(area[3]).toBe(255);
 });
 it('preserves mixed transparency and premultiplied color when downsampling',()=>{
  const width=32,height=32,source=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=(y*width+x)*4;
   source[i]=200;source[i+1]=50;source[i+2]=20;
   source[i+3]=x<16?128:0;
  }
  const result=transformRaster(source,width,height,
    {...initialTransform,interpolation:'area'},null,1,1);
  expect(result[3]).toBeGreaterThanOrEqual(63);
  expect(result[3]).toBeLessThanOrEqual(65);
  expect(result[0]).toBe(200);
  expect(result[1]).toBe(50);
  expect(result[2]).toBe(20);
 });
 it('supports subpixel translation without dropping the alpha contribution outside the image',()=>{
  const source=new Uint8Array(4*4*4).fill(255);
  const result=transformRaster(source,4,4,
   {...initialTransform,dx:2,interpolation:'area'},null,1,1);
  expect(result[3]).toBe(128);
  expect(result[0]).toBe(255);
 });
});

describe('C07-014 exact affine coverage with rotation and shear',()=>{
 it('keeps transparent and sparse rotated footprints stable',()=>{
  const source=new Uint8Array(8*8*4);
  const transform={...initialTransform,interpolation:'area' as const,
   angle:27,sx:.65,sy:.8,cx:4,cy:4,shear:.12};
  const empty=transformRaster(source,8,8,transform);
  expect(empty.every(v=>v===0)).toBe(true);
  source.set([120,80,240,255],(4*8+4)*4);
  const ink=transformRaster(source,8,8,transform);
  expect(ink.some((value,index)=>index%4===3&&value>0)).toBe(true);
  for(let i=0;i<ink.length;i+=4)if(ink[i+3]){
   expect(ink[i]).toBe(120);
   expect(ink[i+1]).toBe(80);
   expect(ink[i+2]).toBe(240);
  }
 });
 it('keeps all thin stripes at 32x reduction with a quarter-turn',()=>{
   const width=64,height=64,source=new Uint8Array(width*height*4);
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){
     const i=(y*width+x)*4,level=x%4===3?255:0;
     source.set([level,level,level,255],i);
   }
   const result=transformRaster(source,width,height,{
     ...initialTransform,interpolation:'area',angle:90,sx:1/32,sy:1/32,cx:32,cy:32
   });
   expect(result[(31*width+31)*4]).toBe(64);
   expect(result[(31*width+31)*4+3]).toBe(255);
 });
 it('matches the analytic intersection of equal squares rotated by 45 degrees',()=>{
   const source=new Uint8Array(4*4*4);
   for(let i=0;i<16;i++)source.set([200,50,20,255],i*4);
   const result=transformRaster(source,4,4,{
     ...initialTransform,interpolation:'area',angle:45,sx:.25,sy:.25,cx:2,cy:2,dx:.5,dy:.5
   });
   const at=(2*4+2)*4;
   expect(result[at+3]).toBe(Math.round((2*Math.SQRT2-2)*255));
   expect(Array.from(result.subarray(at,at+3))).toEqual([200,50,20]);
 });
 it('conserves the covered area for mirrored/sheared rotated images',()=>{
   const source=new Uint8Array(32*32*4).fill(255);
   for(const sx of [.25,-.25]){
     const result=transformRaster(source,32,32,{
       ...initialTransform,interpolation:'area',sx,sy:.25,angle:27,shear:.15,cx:16,cy:16
     });
     let area=0;
     for(let i=3;i<result.length;i+=4)area+=result[i]!/255;
     expect(Math.abs(area-64)).toBeLessThan(.08);
   }
 });
});
