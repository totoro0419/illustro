import {describe,it,expect} from 'vitest';
import {progressiveTransformPreviewSize} from './previewQuality';
import {initialTransform,transformRaster} from './geometry';

describe('C07-001 progressive viewport preview quality',()=>{
 it('uses a sharper preview for large artworks without allocating a 4000px screen-sized buffer',()=>{
  const target=progressiveTransformPreviewSize(4000,4000,950,700,2);
  expect(target).toEqual({width:768,height:768});
  expect(target.width*target.height*4).toBeLessThan(3*1024*1024);
  expect(target.width).toBeGreaterThan(280);
 });
 it('preserves the aspect ratio for tall and wide artwork',()=>{
  expect(progressiveTransformPreviewSize(4000,2000,480,300,1)).toEqual({width:480,height:240});
  expect(progressiveTransformPreviewSize(2000,4000,480,300,1)).toEqual({width:240,height:480});
 });
 it('does not enlarge small images or force a large preview on tiny screens',()=>{
  expect(progressiveTransformPreviewSize(120,80,1000,1000,3)).toEqual({width:120,height:80});
  expect(progressiveTransformPreviewSize(4000,4000,200,130,1)).toEqual({width:280,height:280});
 });
 it('rejects impossible artwork dimensions',()=>{
  expect(()=>progressiveTransformPreviewSize(0,4000,500,500)).toThrow('大きさ');
  expect(()=>progressiveTransformPreviewSize(4000,NaN,500,500)).toThrow('大きさ');
 });
});


describe('C07-014 exact area shrink on sparse artwork',()=>{
 it('preserves a single opaque ink pixel without leaking hidden transparent RGB',()=>{
  const source=new Uint8Array(8*8*4);
  source.set([255,0,0,255],0);
  source.set([0,255,0,0],(1*8+1)*4);
  const result=transformRaster(source,8,8,{...initialTransform,interpolation:'area'},null,2,2);
  expect([...result.slice(0,4)]).toEqual([255,0,0,16]);
  expect([...result.slice(4)]).toEqual(Array.from({length:12},()=>0));
 });
});
