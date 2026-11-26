import {describe,expect,it} from 'vitest';
import {buildRegions,cropGapNeighborhood,inspectLocalGaps,suggestLocalGaps} from './pixels';

function lines(width:number,height:number,points:readonly (readonly [number,number])[]){
  const data=new Uint8Array(width*height*4);
  for(const [x,y] of points)data[(y*width+x)*4+3]=255;
  return data;
}
describe('LIN-006 local review of real gaps',()=>{
  it('surfaces existing automatic repairs without changing the graph',()=>{
    const w=15,h=9,data=lines(w,h,[1,2,3,9,10,11].map(x=>[x,4] as const));
    const graph=buildRegions(data,w,h,15,6,[]);
    const before=graph.walls.slice(),original=data.slice();
    expect(suggestLocalGaps(graph,{x:6,y:4},6,[])).toHaveLength(0);
    const candidates=inspectLocalGaps(graph,{x:6,y:4},6,[]);
    expect(candidates.some(g=>g.review==='automatic'&&g.from.y===4&&g.to.y===4)).toBe(true);
    expect(graph.walls).toEqual(before);expect(data).toEqual(original);
    const rejected=[{remove:true,preserveInk:true,points:[{x:4,y:4},{x:8,y:4}]}];
    const reopened=buildRegions(data,w,h,15,6,rejected);
    expect(reopened.bridges.some(Boolean)).toBe(false);
    expect(inspectLocalGaps(reopened,{x:6,y:4},6,rejected)).toHaveLength(0);
  });
  it('offers thick caps for explicit review without creating automatic walls',()=>{
    const w=40,h=30,points:Array<[number,number]>=[];
    for(let y=13;y<=15;y++)for(let x=3;x<=34;x++)if(x<=15||x>=22)points.push([x,y]);
    const data=lines(w,h,points),graph=buildRegions(data,w,h,15,0,[]);
    const candidates=inspectLocalGaps(graph,{x:18,y:14},8,[]);
    expect(candidates.some(g=>g.review==='confirm'&&g.from.x<=15&&g.to.x>=22||g.review==='confirm'&&g.to.x<=15&&g.from.x>=22)).toBe(true);
    expect(graph.bridges.some(Boolean)).toBe(false);
  });
  it('does not suggest parallel sides or a crossing',()=>{
    const w=30,h=30,points:Array<[number,number]>=[];
    for(let y=1;y<h-1;y++)for(const x of [10,11,17,18])points.push([x,y]);
    const graph=buildRegions(lines(w,h,points),w,h,15,0,[]);
    expect(inspectLocalGaps(graph,{x:14,y:15},8,[])).toHaveLength(0);
  });
  it('limits worker data to a neighborhood while retaining candidate positions',()=>{
    const w=320,h=240,data=lines(w,h,[100,101,102,108,109,110].map(x=>[x,80] as const));
    const graph=buildRegions(data,w,h,15,6,[]);
    const at={x:105,y:80},patch=cropGapNeighborhood(graph,at,6,[]);
    expect(patch.graph.walls.length).toBeLessThan(graph.walls.length/10);
    const local=inspectLocalGaps(patch.graph,patch.point,6,patch.manual);
    expect(local.some(g=>g.review==='automatic'&&g.from.y+patch.y===80&&g.to.y+patch.y===80)).toBe(true);
  });
});
