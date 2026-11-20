import {describe,it,expect} from 'vitest';
import {CanonicalBuilder,createPreset,cpuReference} from '@illustro/brush-rt';
import type {StrokeRecord} from '@illustro/brush-rt';
import {renderPostPaintPreview} from './postPaintPreview';

function brush(points:readonly [number,number,number][]):StrokeRecord{
 const preset=createPreset('post-paint-preview','post paint preview',{
  size:12,opacity:1,stabilization:{constant:0,fast:0,post:0},
  forceFade:{enabled:false}
 });
 const builder=new CanonicalBuilder(preset,[5,6]);
 for(const [x,y,t] of points)builder.accept({
  x,y,t,pressure:.8,pointerType:'pen',tilt:0,azimuth:0,twist:0
 });
 builder.finish();
 return builder.record();
}
describe('C07-004 post-transform painted strokes in preview',()=>{
 it('is pixel-identical to final CPU paint replay at original resolution',()=>{
  const w=72,h=64,base=new Uint8ClampedArray(w*h*4);
  base.set([25,45,65,255],(30*w+18)*4);
  const record=brush([[15,20,0],[18,24,10],[30,34,20]]);
  const expected=cpuReference(record,w,h,base);
  const actual=renderPostPaintPreview(base,w,h,w,h,[{selection:null,records:[record]}]);
  expect(actual).toEqual(expected);
  expect(actual[(24*w+18)*4+3]??0).toBeGreaterThan(0);
  expect(base[(24*w+18)*4+3]??0).toBe(0);
 });
 it('keeps post-transform ink in destination coordinates when preview is downscaled',()=>{
  const w=128,h=128,record=brush([[100,100,0],[105,106,10]]);
  const display=renderPostPaintPreview(new Uint8ClampedArray(32*32*4),w,h,32,32,
    [{selection:null,records:[record]}]);
  const expected=cpuReference({
    ...record,
    commands:record.commands.map(c=>{
      const v=[...c];for(const i of [0,1,16,17])v[i]=(v[i]??0)*.25;
      for(const i of [2,18,23])v[i]=(v[i]??0)*.25;return v;
    })
  },32,32);
  expect(display).toEqual(expected);
  expect(display[(25*32+25)*4+3]??0).toBeGreaterThan(0);
 });
 it('keeps later strokes on top of earlier ones',()=>{
  const w=48,h=48,one=brush([[20,20,0]]),two=brush([[28,28,0]]);
  const expected=cpuReference(two,w,h,cpuReference(one,w,h));
  const actual=renderPostPaintPreview(new Uint8ClampedArray(w*h*4),w,h,w,h,
    [{selection:null,records:[one,two]}]);
  expect(actual).toEqual(expected);
 });
});
