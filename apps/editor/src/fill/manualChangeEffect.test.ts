import {describe,expect,it} from 'vitest';
import {buildRegions} from './pixels';
import {isManualBoundaryNoop} from './manualChangeEffect';

const image=(w:number,h:number)=>{
 const source=new Uint8Array(w*h*4);
 for(let i=0;i<w*h;i++)source.set([0,0,0,0],i*4);
 return source;
};
describe('C08-015 change-aware boundary analysis shortcuts',()=>{
 it('does not spend another full-resolution analysis on an unchanged manual wall',()=>{
  const pixels=image(8,8);
  for(let x=2;x<=5;x++)pixels.set([0,0,0,255],(3*8+x)*4);
  const graph=buildRegions(pixels,8,8,15,0,[]);
  expect(isManualBoundaryNoop(graph,[{x:2,y:3},{x:5,y:3}],false)).toBe(true);
  expect(isManualBoundaryNoop(graph,[{x:2,y:4},{x:5,y:4}],false)).toBe(false);
 });
 it('does not relabel regions when erasing an already empty area',()=>{
  const graph=buildRegions(image(8,8),8,8,15,0,[]);
  expect(isManualBoundaryNoop(graph,[{x:2,y:3},{x:5,y:3}],true)).toBe(true);
  expect(isManualBoundaryNoop(graph,[{x:2,y:3},{x:5,y:3}],false)).toBe(false);
 });
 it('never skips an edit that contains an automatic bridge or preserves ink',()=>{
  const graph=buildRegions(image(8,8),8,8,15,0,[]);
  const bridged={...graph,bridges:graph.bridges.slice()};
  bridged.bridges[3*8+3]=1;
  expect(isManualBoundaryNoop(bridged,[{x:3,y:3}],true)).toBe(false);
  expect(isManualBoundaryNoop(graph,[{x:3,y:3}],true,true)).toBe(false);
  expect(isManualBoundaryNoop(graph,[{x:NaN,y:3}],true)).toBe(false);
 });
 it('checks only the edited path, not a 4000x4000 background buffer',()=>{
  const width=4000,height=4000;
  const walls=new Uint8Array(width*height);
  const bridges=new Uint8Array(width*height);
  const graph={width,height,walls,bridges};
  expect(isManualBoundaryNoop(graph as ReturnType<typeof buildRegions>,
    [{x:2000,y:2000},{x:2010,y:2000}],true)).toBe(true);
 });
});
