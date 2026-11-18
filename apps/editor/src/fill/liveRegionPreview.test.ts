import {describe,expect,it} from 'vitest';
import type {RegionGraph} from './pixels';
import {addTraceRegions,LiveRegionTrace,renderLiveRegionPreview} from './liveRegionPreview';

const graph:RegionGraph={
 width:6,height:4,
 labels:new Uint32Array([
  1,1,0,2,2,2,
  1,1,0,2,2,2,
  1,1,0,2,2,2,
  1,1,0,2,2,2
 ]),
 external:new Uint8Array([1,0,1]),
 walls:new Uint8Array(24),bridges:new Uint8Array(24),candidates:[],count:2,
 neighborOffsets:new Uint32Array(4),neighbors:new Uint32Array(),depth:new Int32Array(3),
 anchors:new Uint32Array(3),hasInk:true
};
describe('C08-003 incremental region preview',()=>{
 it('highlights only touched regions without changing the source graph',()=>{
  const picked=new Set<number>();
  addTraceRegions(graph,{x:1,y:1},{x:1,y:2},1,true,picked);
  expect([...picked]).toEqual([1]);
  const preview=renderLiveRegionPreview(graph,picked,512);
  expect([preview.width,preview.height]).toEqual([6,4]);
  expect(preview.pixels.slice(4,8).every(Boolean)).toBe(true);
  expect(preview.pixels[4*3+3]).toBe(0);
  expect(graph.labels[0]).toBe(1);
 });
 it('ignores outside regions when the closed-only option is active',()=>{
  const picked=new Set<number>();
  addTraceRegions(graph,{x:4,y:1},{x:4,y:3},1,true,picked);
  expect(picked.size).toBe(0);
  addTraceRegions(graph,{x:4,y:1},{x:4,y:3},1,false,picked);
  expect([...picked]).toEqual([2]);
 });
 it('keeps images bounded even for a 4000-pixel document',()=>{
  const big={...graph,width:4000,height:4000,labels:new Uint32Array(16_000_000).fill(1)};
  const preview=renderLiveRegionPreview(big,new Set([1]),512);
  expect(preview.width).toBe(512);
  expect(preview.height).toBe(512);
  expect(preview.pixels.length).toBe(512*512*4);
 });
 it('reuses and clears its small pixel buffer as region highlights change',()=>{
   const original=renderLiveRegionPreview(graph,new Set([1]),512);
   const buffer=original.pixels;
   expect(buffer[3]).toBeGreaterThan(0);
   const cleared=renderLiveRegionPreview(graph,new Set([2]),512,buffer);
   expect(cleared.pixels).toBe(buffer);
   expect(cleared.pixels[3]).toBe(0);
   expect(cleared.pixels[(3*6+5)*4+3]).toBeGreaterThan(0);
 });
 it('samples the same narrow diagonal trace pixels as the final line fill',()=>{
  const labels=new Uint32Array(4*4);
  labels[4]=1; // (0,1) is crossed only by the final two-samples-per-pixel path.
  const narrow={...graph,width:4,height:4,labels,anchors:Uint32Array.of(0,4),count:1};
  const picked=new Set<number>();
  addTraceRegions(narrow,{x:0,y:0},{x:1,y:1.5},1,false,picked);
  expect([...picked]).toEqual([1]);
 });
 it('keeps a one-pixel region visible when 4K thumbnail samples miss it',()=>{
  const labels=new Uint32Array(64);
  labels[0]=1;
  const narrow={...graph,width:8,height:8,labels,anchors:Uint32Array.of(0,0),count:1};
  const preview=renderLiveRegionPreview(narrow,new Set([1]),1);
  expect([preview.width,preview.height]).toEqual([1,1]);
  expect(preview.pixels[3]).toBe(32);
 });
 it('removes stale highlights when the latest endpoint changes or points shrink',()=>{
  const trace=new LiveRegionTrace();
  expect(trace.update(graph,[{x:1,y:1}],1,false)).toBe(true);
  expect([...trace.selected]).toEqual([1]);
  expect(trace.update(graph,[{x:1,y:1},{x:4,y:1}],1,false)).toBe(true);
  expect([...trace.selected].sort()).toEqual([1,2]);
  expect(trace.update(graph,[{x:1,y:1},{x:1,y:2}],1,false)).toBe(true);
  expect([...trace.selected]).toEqual([1]);
  expect(trace.update(graph,[],1,false)).toBe(true);
  expect(trace.selected.size).toBe(0);
 });
 it('replaces the previous tail even if the same update appends another point',()=>{
  const trace=new LiveRegionTrace();
  trace.update(graph,[{x:1,y:1},{x:4,y:1}],1,false);
  expect([...trace.selected].sort()).toEqual([1,2]);
  trace.update(graph,[{x:1,y:1},{x:1,y:2},{x:1,y:3}],1,false);
  expect([...trace.selected]).toEqual([1]);
  expect(trace.update(graph,[{x:1,y:1},{x:1,y:2},{x:1,y:3}],1,false)).toBe(false);
 });
 it('replays revised middle segments and removes regions touched only by old geometry',()=>{
  const trace=new LiveRegionTrace();
  const points=[{x:1,y:1},{x:4,y:1},{x:1,y:2},{x:1,y:3}];
  trace.update(graph,points,1,false);
  expect([...trace.selected].sort()).toEqual([1,2]);
  // A stabilizer can revise an earlier endpoint, not just the final one.
  points[1]={x:1,y:2};
  expect(trace.update(graph,points,1,false)).toBe(true);
  expect([...trace.selected]).toEqual([1]);
  expect(trace.update(graph,points,1,false)).toBe(false);
 });
 it('retains segment counts when a recent middle point changes during append',()=>{
  const trace=new LiveRegionTrace();
  const points=Array.from({length:12},(_,i)=>({x:1,y:i%3}));
  points[6]={x:4,y:1};
  trace.update(graph,points,1,false);
  expect([...trace.selected].sort()).toEqual([1,2]);
  points[6]={x:1,y:1};
  points.push({x:1,y:2});
  expect(trace.update(graph,points,1,false)).toBe(true);
  expect([...trace.selected]).toEqual([1]);
  expect(trace.update(graph,points,1,false)).toBe(false);
 });
 it('bounds its revision window during a long stable gesture',()=>{
  const trace=new LiveRegionTrace();
  const points=Array.from({length:1500},()=>({x:1,y:1}));
  expect(trace.update(graph,points,1,false)).toBe(true);
  expect([...trace.selected]).toEqual([1]);
  points[points.length-8]={x:4,y:1};
  expect(trace.update(graph,points,1,false)).toBe(true);
  expect([...trace.selected].sort()).toEqual([1,2]);
  points[points.length-8]={x:1,y:1};
  expect(trace.update(graph,points,1,false)).toBe(true);
  expect([...trace.selected]).toEqual([1]);
 });
 it('recomputes touched regions after analysis replaces the graph with reused IDs',()=>{
  const trace=new LiveRegionTrace(),points=[{x:1,y:1}];
  expect(trace.update(graph,points,1,false)).toBe(true);
  expect([...trace.selected]).toEqual([1]);
  const changedLabels=new Uint32Array(graph.labels);
  changedLabels[1*graph.width+1]=2;
  const changedGraph={...graph,labels:changedLabels};
  expect(trace.update(changedGraph,points,1,false)).toBe(true);
  expect([...trace.selected]).toEqual([2]);
  expect(trace.update(changedGraph,points,1,false)).toBe(false);
  expect(trace.update(graph,points,1,false)).toBe(true);
  expect([...trace.selected]).toEqual([1]);
 });
 it('does not include absent or non-finite pointer seeds',()=>{
  const picked=new Set<number>();
  addTraceRegions(graph,{x:NaN,y:0},{x:Infinity,y:0},1,false,picked);
  expect(picked.size).toBe(0);
  expect(()=>renderLiveRegionPreview(graph,picked,1025)).toThrow('仮表示');
 });
});
