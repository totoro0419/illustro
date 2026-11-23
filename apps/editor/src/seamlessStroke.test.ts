import {describe,it,expect} from 'vitest';
import {CanonicalBuilder,referenceBrushes,validateRecord} from '@illustro/brush-rt';
import {wrappedCopies} from './seamlessStroke';
function makeStroke(points:{x:number;y:number}[]){
 const b=new CanonicalBuilder(referenceBrushes[0]!,[12,34]);
 for(let i=0;i<points.length;i++)b.accept({...points[i]!,t:i*10,pressure:.7,pointerType:'pen',origin:'raw',tilt:0,azimuth:0,twist:0});
 b.finish();return b.record();
}
describe('M08 seamless canonical seam copies',()=>{
 it('emits no copies when a stroke stays away from the edges',()=>{
  expect(wrappedCopies(makeStroke([{x:200,y:200},{x:250,y:200}]),512,384)).toHaveLength(0);
 });
 it('reconstructs valid symmetric copies where a stroke crosses the right edge',()=>{
  const base=makeStroke([{x:499,y:160},{x:519,y:160}]),copies=wrappedCopies(base,512,384);
  expect(copies.some(v=>v.dx===-512&&v.dy===0)).toBe(true);
  for(const c of copies){expect(()=>validateRecord(c.record)).not.toThrow();expect(c.record.raw[0]!.x).toBeCloseTo(base.raw[0]!.x+c.dx);}
  expect(base.raw[0]!.x).toBe(499);
 });
 it('creates corner copies for strokes crossing both edges',()=>{
  const copies=wrappedCopies(makeStroke([{x:506,y:380},{x:518,y:400}]),512,384);
  expect(copies.some(v=>v.dx===-512&&v.dy===-384)).toBe(true);
 });
});

it.each([
 [{x:12,y:192},{x:-12,y:192},512,0],
 [{x:256,y:12},{x:256,y:-12},0,384],
 [{x:256,y:372},{x:256,y:396},0,-384],
] as const)('wraps an edge crossing once at %j', (from,to,dx,dy)=>{
 const copies=wrappedCopies(makeStroke([from,to]),512,384);
 expect(copies.map(copy=>[copy.dx,copy.dy])).toEqual([[dx,dy]]);
});
