import {describe,expect,it} from 'vitest';
import {buildRegions,type RegionGraph} from './pixels';
import {updateChangedRegions} from './changedRegions';
import type {Point} from '../transform/geometry';
const keys=['walls','bridges','labels','count','anchors','external','neighborOffsets','neighbors','depth','hasInk'] as const;
function image(w:number,h:number,ink:(x:number,y:number)=>boolean){
 const source=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(ink(x,y))source[(y*w+x)*4+3]=255;
 return source;
}
function compare(graph:RegionGraph,full:RegionGraph){for(const key of keys)expect(graph[key],key).toEqual(full[key]);}
describe('C08-015 changed-component region relabeling',()=>{
 it('splits an area with a closed ring and keeps canonical labels for saved exclusions',()=>{
  const w=15,h=15,source=image(w,h,()=>false),before=buildRegions(source,w,h,15,0,[]);
  const points=[{x:4,y:4},{x:10,y:4},{x:10,y:10},{x:4,y:10},{x:4,y:4}];
  const result=updateChangedRegions(before,points,false)!;
  compare(result,buildRegions(source,w,h,15,0,[{points,remove:false}]));
  expect(result.count).toBe(2);expect(before.count).toBe(1);
  expect(before.walls.some(Boolean)).toBe(false);
 });
 it('merges separated regions when a boundary is opened',()=>{
  const w=15,h=15,source=image(w,h,x=>x===7),before=buildRegions(source,w,h,15,0,[]);
  const points=[{x:7,y:7}],result=updateChangedRegions(before,points,true)!;
  compare(result,buildRegions(source,w,h,15,0,[{points,remove:true}]));
  expect(before.count).toBe(2);expect(result.count).toBe(1);
 });
 it('updates anchors at canvas edges and creates a region inside solid ink',()=>{
  for(const filled of [false,true]){
   const source=image(9,9,()=>false);
   const initial=filled?Array.from({length:9},(_,y)=>({points:[{x:0,y},{x:8,y}],remove:false})):[];
   const before=buildRegions(source,9,9,15,0,initial);
   const points=[filled?{x:4,y:4}:{x:0,y:0}];
   const result=updateChangedRegions(before,points,filled)!;
   expect(result).not.toBeNull();
   compare(result,buildRegions(source,9,9,15,0,[...initial,{points,remove:filled}]));
  }
 });
 it('matches complete analysis across deterministic intersecting edits and disconnected regions',()=>{
  let seed=0x12345678;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  const w=17,h=13;
  for(let test=0;test<100;test++){
   const source=image(w,h,()=>random()<.28),before=buildRegions(source,w,h,15,0,[]);
   const points:Point[]=Array.from({length:3},()=>({x:Math.floor(random()*w),y:Math.floor(random()*h)}));
   const remove=random()<.5,result=updateChangedRegions(before,points,remove);
   const full=buildRegions(source,w,h,15,0,[{points,remove}]);
   if(result)compare(result,full);else expect(full.walls).toEqual(before.walls);
  }
 });
 it('reuses owned worker buffers and rejects bridge edits or invalid points',()=>{
  const before=buildRegions(image(9,9,()=>false),9,9,15,0,[]);
  const result=updateChangedRegions(before,[{x:4,y:4}],false,true)!;
  expect(result.labels).toBe(before.labels);expect(result.walls).toBe(before.walls);
  before.bridges[4*9+4]=1;
  expect(updateChangedRegions(before,[{x:4,y:4}],true)).toBeNull();
  expect(updateChangedRegions(before,[{x:NaN,y:4}],true)).toBeNull();
 });
});
