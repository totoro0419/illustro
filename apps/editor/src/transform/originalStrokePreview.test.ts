import {describe,expect,it} from 'vitest';
import {CanonicalBuilder,createPreset,cpuReference,type Sample} from '@illustro/brush-rt';
import {renderOriginalStrokePreview,type OriginalPreviewStroke} from './originalStrokePreview';
const samples:Sample[]=[{x:14,y:24,t:0,pressure:.4,pointerType:'pen'},
 {x:28,y:24,t:20,pressure:.8,pointerType:'pen'},{x:38,y:24,t:40,pressure:1,pointerType:'pen'}];
const preset=()=>createPreset('original-preview','original preview',{size:12,color:[.8,.1,.2],
 stabilization:{constant:0,fast:0,post:0},forceFade:{enabled:false}});
describe('C07-002 live original-image brush preview',()=>{
 it('matches final brush replay at 1:1 with the same input, pressure and seed',()=>{
  const stroke:OriginalPreviewStroke={preset:preset(),samples,seed:[5,6],alphaLocked:false};
  const base=new Uint8ClampedArray(64*48*4);
  const final=new CanonicalBuilder(stroke.preset,[5,6],0,{});
  for(const sample of samples)final.accept(sample);
  final.release({...samples.at(-1)!,phase:'release'});final.finish();
  const expected=cpuReference(final.record(),64,48,base);
  const actual=renderOriginalStrokePreview(base,64,48,64,48,stroke);
  expect(actual).toEqual(expected);expect(actual.some(Boolean)).toBe(true);expect(base.some(Boolean)).toBe(false);
 });
 it('shows the real eraser result while keeping pixels outside the stroke',()=>{
  const p=preset();p.blend='erase';
  const base=new Uint8ClampedArray(64*48*4).fill(255);
  const result=renderOriginalStrokePreview(base,64,48,64,48,{preset:p,samples,seed:[1,2],alphaLocked:false});
  expect(result[(24*64+28)*4+3]).toBeLessThan(255);expect(result[3]).toBe(255);
  expect(base[(24*64+28)*4+3]).toBe(255);
 });
 it('renders original 4K coordinates into a bounded small preview',()=>{
  const p=preset();p.size=80;
  const result=renderOriginalStrokePreview(new Uint8ClampedArray(128*128*4),4000,4000,128,128,
   {preset:p,samples:[{x:2000,y:2000,t:1,pressure:1,pointerType:'pen'}],seed:[1,2],alphaLocked:false});
  expect(result.length).toBe(128*128*4);expect(result[(64*128+64)*4+3]).toBeGreaterThan(0);
 });
});
