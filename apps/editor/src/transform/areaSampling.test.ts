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
