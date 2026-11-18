import {describe,expect,it} from 'vitest';
import {buildRegions} from './pixels';
import {tryIncrementalBoundaryAddition} from './incrementalBoundary';

function inkImage(w:number,h:number,coordinates:readonly (readonly [number,number])[]=[]){
  const source=new Uint8Array(w*h*4);
  for(const [x,y] of coordinates)source.set([0,0,0,255],(y*w+x)*4);
  return source;
}
const region=(source:Uint8Array,w:number,h:number)=>buildRegions(source,w,h,15,0,[]);
describe('C08-015 safe incremental region walls',()=>{
  it('adds interior non-splitting walls without touching old graph data',()=>{
    const width=11,height=11,source=inkImage(width,height);
    const before=region(source,width,height);
    const points=[{x:3,y:5},{x:6,y:5}];
    const result=tryIncrementalBoundaryAddition(before,points);
    expect(result).not.toBeNull();
    const full=buildRegions(source,width,height,15,0,[{points,remove:false}]);
    expect(result?.walls).toEqual(full.walls);
    expect(result?.labels).toEqual(full.labels);
    expect(result?.count).toBe(full.count);
    expect(result?.external).toEqual(full.external);
    expect(result?.depth).toEqual(full.depth);
    expect(before.walls[5*width+4]).toBe(0);
    expect(before.labels[5*width+4]).toBeGreaterThan(0);
    expect(result?.neighbors).toBe(before.neighbors);
  });
  it('refuses to guess when an added closed ring splits a region',()=>{
    const w=13,h=13,source=inkImage(w,h),before=region(source,w,h);
    const points=[{x:4,y:4},{x:8,y:4},{x:8,y:8},{x:4,y:8},{x:4,y:4}];
    const full=buildRegions(source,w,h,15,0,[{points,remove:false}]);
    expect(full.count).toBeGreaterThan(before.count);
    expect(tryIncrementalBoundaryAddition(before,points)).toBeNull();
    expect(before.count).toBe(1);
  });
  it('uses full analysis for a one-pixel corridor that would be cut in two',()=>{
    const w=11,h=11;
    const ink:Array<[number,number]>=[];
    for(let y=0;y<h;y++){ink.push([4,y],[6,y]);}
    const before=region(inkImage(w,h,ink),w,h);
    expect(tryIncrementalBoundaryAddition(before,[{x:5,y:5}])).toBeNull();
  });
  it('falls back for edits near edges and invalid coordinates',()=>{
    const before=region(inkImage(11,11),11,11);
    expect(tryIncrementalBoundaryAddition(before,[{x:1,y:5}])).toBeNull();
    expect(tryIncrementalBoundaryAddition(before,[{x:NaN,y:5}])).toBeNull();
    expect(tryIncrementalBoundaryAddition(before,[])).toBeNull();
  });
  it('does not mislabel other regions near a prior stroke',()=>{
    const w=13,h=13,ink:Array<[number,number]>=[];
    for(let y=1;y<12;y++)ink.push([6,y]);
    const before=region(inkImage(w,h,ink),w,h);
    const points=[{x:3,y:5}];
    const result=tryIncrementalBoundaryAddition(before,points);
    expect(result).not.toBeNull();
    expect(result?.labels[5*w+9]).toBe(before.labels[5*w+9]);
  });
});
