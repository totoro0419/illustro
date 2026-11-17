import {describe,it,expect} from 'vitest';
import {originalPreviewSize} from './originalPreview';

describe('C07-002 main-canvas original editing preview',()=>{
 it('uses viewport-scale pixels without 64MB full canvas readback',()=>{
  const p=originalPreviewSize(4000,4000,800,520,2);
  expect(p).toEqual({width:1024,height:1024});
  expect(p.width*p.height*4).toBeLessThan(5*1024*1024);
 });
 it('retains original shape and never enlarges small images',()=>{
  expect(originalPreviewSize(4000,2000,700,500,1)).toEqual({width:700,height:350});
  expect(originalPreviewSize(200,100,1000,1000,2)).toEqual({width:200,height:100});
 });
 it('rejects invalid artwork sizes',()=>{
  expect(()=>originalPreviewSize(0,200,600,400)).toThrow('大きさ');
 });
});
