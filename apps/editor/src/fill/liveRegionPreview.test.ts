import {describe,it,expect} from 'vitest';
import {buildRegions} from './pixels';
import {LiveRegionTrace} from './liveRegionPreview';

function dividedGraph(){
 const width=120,height=100,source=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)source[(y*width+50)*4+3]=255;
 return buildRegions(source,width,height,15,0,[]);
}

describe('C08-003 live fill trace invalidation',()=>{
 it('replays a corrected coalesced sample 45 positions behind the newest',()=>{
  const graph=dividedGraph(),trace=new LiveRegionTrace();
  const points=Array.from({length:100},()=>({x:80,y:50}));
  trace.update(graph,points,1,false);
  const right=graph.labels[50*graph.width+80]!,left=graph.labels[50*graph.width+20]!;
  expect(left).not.toBe(right);
  expect(trace.selected.has(right)).toBe(true);
  expect(trace.selected.has(left)).toBe(false);
  const revised=points.map(p=>({...p}));
  revised[55]={x:20,y:50};
  expect(trace.update(graph,revised,1,false)).toBe(true);
  expect(trace.selected.has(right)).toBe(true);
  expect(trace.selected.has(left)).toBe(true);
 });
 it('invalidates a reused graph wrapper when boundary or anchor metadata is replaced',()=>{
  const graph=dividedGraph(),trace=new LiveRegionTrace(),points=[{x:80,y:50}];
  expect(trace.update(graph,points,1,false)).toBe(true);
  expect(trace.update(graph,points,1,false)).toBe(false);
  const mutable=graph as unknown as {anchors:Uint32Array;walls:Uint8Array;bridges:Uint8Array};
  mutable.anchors=graph.anchors.slice();
  expect(trace.update(graph,points,1,false)).toBe(true);
  mutable.walls=graph.walls.slice();
  expect(trace.update(graph,points,1,false)).toBe(true);
  mutable.bridges=graph.bridges.slice();
  expect(trace.update(graph,points,1,false)).toBe(true);
 });
});
