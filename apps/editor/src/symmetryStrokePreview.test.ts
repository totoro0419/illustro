import {describe,expect,it} from 'vitest';
import {DEFAULT_SYMMETRY} from './strokeSymmetry';
import {symmetryStrokePreview} from './symmetryStrokePreview';

describe('C09-010 live symmetry guides',()=>{
 it('mirrors the stroke in document coordinates without changing the source',()=>{
   const points=[{x:11,y:8},{x:22,y:15}];
   const transformed=symmetryStrokePreview(points,{...DEFAULT_SYMMETRY,mode:'mirror',x:0,y:0,angle:0});
   expect(transformed).toEqual([[{x:11,y:-8},{x:22,y:-15}]]);
   expect(points[0]).toEqual({x:11,y:8});
 });
 it('uses radial copy count and does not draw if symmetry is disabled',()=>{
   const points=[{x:10,y:0},{x:0,y:10}];
   const rotated=symmetryStrokePreview(points,{...DEFAULT_SYMMETRY,mode:'radial',count:4});
   expect(rotated.length).toBe(3);
   expect(rotated[0]![0]!.x).toBeCloseTo(0);
   expect(rotated[0]![0]!.y).toBeCloseTo(10);
   expect(symmetryStrokePreview(points,DEFAULT_SYMMETRY)).toEqual([]);
 });
 it('limits preview geometry to avoid expensive work on long strokes',()=>{
   const points=Array.from({length:4000},(_,i)=>({x:i,y:i/2}));
   const mirrored=symmetryStrokePreview(points,{...DEFAULT_SYMMETRY,mode:'mirror'},128);
   expect(mirrored.length).toBe(1);
   expect(mirrored[0]!.length).toBeLessThanOrEqual(129);
   expect(mirrored[0]!.at(-1)!.x).toBe(3999);
 });
});
