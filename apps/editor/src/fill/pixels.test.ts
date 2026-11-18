import {describe,expect,it} from 'vitest';
import {buildRegions,fillBoundaries,fillMask,paintColorHints,suggestLocalGaps,type FillSettings} from './pixels';

const settings:FillSettings={
  method:'color',tolerance:15,gap:0,opacity:1,color:'#ff0000',erase:false,
  contiguous:true,closedOnly:false,condition:'all'
};
function image(width:number,height:number,color:[number,number,number,number]=[0,0,0,0]){
  const data=new Uint8Array(width*height*4);
  for(let i=0;i<width*height;i++)data.set(color,i*4);
  return data;
}
function setPixel(data:Uint8Array,width:number,x:number,y:number,color:[number,number,number,number]){
  data.set(color,(y*width+x)*4);
}
function rectangle(data:Uint8Array,width:number,x0:number,y0:number,x1:number,y1:number,color:[number,number,number,number]){
  for(let x=x0;x<=x1;x++){setPixel(data,width,x,y0,color);setPixel(data,width,x,y1,color);}
  for(let y=y0;y<=y1;y++){setPixel(data,width,x0,y,color);setPixel(data,width,x1,y,color);}
}
describe('C08 fill boundaries and destination gating',()=>{
  it('keeps canonical region topology for a blank large canvas without flood analysis',()=>{
    const w=257,h=129,graph=buildRegions(image(w,h),w,h,15,0,[]);
    expect(graph.count).toBe(1);
    expect(graph.hasInk).toBe(false);
    expect(Array.from(graph.external)).toEqual([0,1]);
    expect(Array.from(graph.anchors)).toEqual([0,0]);
    expect(Array.from(graph.neighborOffsets)).toEqual([0,1,2]);
    expect(Array.from(graph.neighbors)).toEqual([1,0]);
    expect(Array.from(graph.depth)).toEqual([0,0]);
    expect(graph.labels.every(label=>label===1)).toBe(true);
  });
  it('recognizes bright white line art on an opaque dark background',()=>{
    const data=image(9,9,[12,12,12,255]);
    rectangle(data,9,2,2,6,6,[255,255,255,255]);
    const graph=buildRegions(data,9,9,15,0,[]);
    expect(graph.hasInk).toBe(true);
    const inner=graph.labels[4*9+4]!,outer=graph.labels[0]!;
    expect(inner).toBeGreaterThan(0);
    expect(inner).not.toBe(outer);
    expect(graph.external[inner]).toBe(0);
    expect(graph.external[outer]).toBe(1);
  });
  it('recognizes opaque white strokes on a transparent background',()=>{
    const data=image(9,9);
    rectangle(data,9,2,2,6,6,[255,255,255,255]);
    const graph=buildRegions(data,9,9,15,0,[]);
    expect(graph.hasInk).toBe(true);
    expect(graph.external[graph.labels[4*9+4]!]).toBe(0);
  });
  it('uses the majority background when a stroke touches one image corner',()=>{
    const data=image(9,9,[12,12,12,255]);
    rectangle(data,9,0,0,6,6,[255,255,255,255]);
    const result=fillBoundaries(data,9,9,15,0);
    expect(result.walls[0]).toBe(1);
    expect(result.walls[8*9+8]).toBe(0);
  });
  it('applies a transparent-only color hint only to transparent destination pixels',()=>{
    const data=image(9,9);
    rectangle(data,9,2,2,6,6,[0,0,0,255]);
    const graph=buildRegions(data,9,9,15,0,[]);
    const target=image(9,9);
    setPixel(target,9,4,4,[255,0,0,255]);
    const result=paintColorHints(graph,[{color:'#00ff00',width:1,points:[{x:4,y:4}]}],
      target,null,{...settings,condition:'transparent'},false);
    expect(Array.from(result.pixels.slice((4*9+4)*4,(4*9+4)*4+4))).toEqual([255,0,0,255]);
    expect(Array.from(result.pixels.slice((3*9+4)*4,(3*9+4)*4+4))).toEqual([0,255,0,255]);
  });
  it('never auto-connects neighboring parallel strokes without tips',()=>{
    const data=image(10,9);
    for(let y=0;y<9;y++){
      setPixel(data,10,3,y,[0,0,0,255]);
      setPixel(data,10,6,y,[0,0,0,255]);
    }
    const result=fillBoundaries(data,10,9,15,3);
    expect(result.bridges.some(Boolean)).toBe(false);
  });
  it('connects only two collinear opposing thin-line tips',()=>{
    const data=image(11,7);
    for(const x of [1,2,3,6,7,8])setPixel(data,11,x,3,[0,0,0,255]);
    const result=fillBoundaries(data,11,7,15,2);
    expect(result.bridges[3*11+4]).toBe(1);
    expect(result.bridges[3*11+5]).toBe(1);
  });
  it('does not seal a long line-art gap when a separate stroke passes close to its interior',()=>{
    const w=15,h=9,data=image(w,h);
    for(const x of [1,2,3,9,10,11])setPixel(data,w,x,4,[0,0,0,255]);
    setPixel(data,w,6,3,[0,0,0,255]); // not adjacent to either end
    const result=fillBoundaries(data,w,h,15,6);
    for(let x=4;x<=8;x++)expect(result.bridges[4*w+x]).toBe(0);
    expect(result.walls[3*w+6]).toBe(1);
  });
  it('still connects two isolated opposite tips with no third line beside the gap',()=>{
    const w=15,h=9,data=image(w,h);
    for(const x of [1,2,3,9,10,11])setPixel(data,w,x,4,[0,0,0,255]);
    const result=fillBoundaries(data,w,h,15,6);
    for(let x=4;x<=8;x++)expect(result.bridges[4*w+x]).toBe(1);
  });
  it('filters misleading gap suggestions that run alongside another stroke',()=>{
    const w=15,h=9,clean=image(w,h);
    for(const x of [1,2,3,9,10,11])setPixel(clean,w,x,4,[0,0,0,255]);
    const fromTo=(c:{from:{x:number;y:number};to:{x:number;y:number}})=>
      c.from.y===4&&c.to.y===4&&
      (c.from.x===3&&c.to.x===9||c.from.x===9&&c.to.x===3);
    const safe=suggestLocalGaps(buildRegions(clean,w,h,15,0,[]),{x:6,y:4},6,[]);
    expect(safe.some(fromTo)).toBe(true);
    setPixel(clean,w,6,3,[0,0,0,255]);
    const risky=suggestLocalGaps(buildRegions(clean,w,h,15,0,[]),{x:6,y:4},6,[]);
    expect(risky.some(fromTo)).toBe(false);
  });
  it('rejects perpendicular hairs even when both endpoints look like tips',()=>{
    const w=15,h=11,data=image(w,h);
    for(const x of [1,2,3])setPixel(data,w,x,4,[0,0,0,255]);
    for(const y of [4,5,6])setPixel(data,w,9,y,[0,0,0,255]);
    const gaps=suggestLocalGaps(buildRegions(data,w,h,15,0,[]),{x:6,y:4},6,[]);
    expect(gaps.some(g=>g.from.x===3&&g.from.y===4&&g.to.x===9&&g.to.y===4)).toBe(false);
  });
  it('does not suggest bridging a genuine crossing as if it were a line tip',()=>{
    const w=15,h=11,data=image(w,h);
    for(const x of [1,2,3,9,10,11])setPixel(data,w,x,5,[0,0,0,255]);
    for(let y=2;y<=8;y++)setPixel(data,w,9,y,[0,0,0,255]);
    const gaps=suggestLocalGaps(buildRegions(data,w,h,15,0,[]),{x:6,y:5},6,[]);
    expect(gaps.some(g=>g.from.x===3&&g.to.x===9&&g.from.y===5&&g.to.y===5)).toBe(false);
    expect(gaps.every(g=>g.kind==='tips')).toBe(true);
  });
  it('preserves existing ink when a manual erase requests preserveInk without automatic gap repair',()=>{
    const w=9,h=9,data=image(w,h);
    for(const x of [2,3,4,5])setPixel(data,w,x,4,[0,0,0,255]);
    const kept=fillBoundaries(data,w,h,15,0,[{remove:true,preserveInk:true,points:[{x:3,y:4}]}]);
    const erased=fillBoundaries(data,w,h,15,0,[{remove:true,preserveInk:false,points:[{x:3,y:4}]}]);
    expect(kept.walls[4*w+3]).toBe(1);
    expect(erased.walls[4*w+3]).toBe(0);
  });
  it('does not falsely connect an inner hole to the canvas outside',()=>{
    const data=image(13,13);
    rectangle(data,13,2,2,10,10,[0,0,0,255]);
    rectangle(data,13,4,4,8,8,[0,0,0,255]);
    const graph=buildRegions(data,13,13,15,0,[]);
    const outside=graph.labels[0]!,between=graph.labels[3*13+3]!,center=graph.labels[6*13+6]!;
    expect(graph.external[outside]).toBe(1);
    expect(graph.external[between]).toBe(0);
    expect(graph.external[center]).toBe(0);
    expect(graph.depth[between]).toBe(1);
    expect(graph.depth[center]).toBe(2);
    const innerNeighbors=Array.from(graph.neighbors.subarray(
      graph.neighborOffsets[center],graph.neighborOffsets[center+1]));
    expect(innerNeighbors).not.toContain(0);
  });
  it('classifies three nested boundaries as alternating closed areas and enclosed holes',()=>{
    const w=19,h=19,data=image(w,h);
    rectangle(data,w,2,2,16,16,[0,0,0,255]);
    rectangle(data,w,5,5,13,13,[0,0,0,255]);
    rectangle(data,w,8,8,10,10,[0,0,0,255]);
    const graph=buildRegions(data,w,h,15,0,[]);
    const outside=graph.labels[0]!,first=graph.labels[3*w+3]!,
      hole=graph.labels[6*w+6]!,center=graph.labels[9*w+9]!;
    expect(new Set([outside,first,hole,center]).size).toBe(4);
    expect([graph.depth[first],graph.depth[hole],graph.depth[center]]).toEqual([1,2,3]);
    expect([graph.external[first],graph.external[hole],graph.external[center]]).toEqual([0,0,0]);
    for(const id of [first,hole,center]){
      const neighbors=Array.from(graph.neighbors.subarray(graph.neighborOffsets[id],graph.neighborOffsets[id+1]));
      expect(neighbors).not.toContain(0);
    }
  });
  it('keeps disconnected enclosed regions distinct even if they share a background',()=>{
    const w=23,h=13,data=image(w,h);
    rectangle(data,w,2,2,8,10,[255,255,255,255]);
    rectangle(data,w,13,2,20,10,[255,255,255,255]);
    const graph=buildRegions(data,w,h,15,0,[]);
    const first=graph.labels[5*w+5]!,second=graph.labels[5*w+16]!;
    expect(first).toBeGreaterThan(0);
    expect(second).toBeGreaterThan(0);
    expect(first).not.toBe(second);
    expect(graph.depth[first]).toBe(1);
    expect(graph.depth[second]).toBe(1);
  });
  it('adds a soft border only when the optional smooth-boundary mode is requested',()=>{
    const w=9,h=9,source=image(w,h,[255,255,255,255]);
    const points=[{x:2,y:2},{x:6,y:2},{x:6,y:6},{x:2,y:6}];
    const base=fillMask(source,w,h,{...settings,method:'lasso'},points,null,null);
    const smooth=fillMask(source,w,h,{...settings,method:'lasso',antialias:true},points,null,null);
    const fades=Array.from(base.alpha).filter((value,i)=>value===0&&
      smooth.alpha[i]!>0&&smooth.alpha[i]!<255);
    expect(fades.length).toBeGreaterThan(0);
    expect(smooth.alpha[4*w+4]).toBe(255);
  });
  it('checks transparent-only against the destination, not the opaque reference',()=>{
    const w=7,h=7,source=image(w,h,[255,255,255,255]),target=image(w,h);
    setPixel(target,w,3,3,[40,40,40,255]);
    const points=[{x:1,y:1},{x:5,y:1},{x:5,y:5},{x:1,y:5}];
    const mask=fillMask(source,w,h,{...settings,method:'lasso',condition:'transparent'},points,null,null,undefined,target);
    expect(mask.alpha[2*w+2]).toBeGreaterThan(0);
    expect(mask.alpha[3*w+3]).toBe(0);
  });
  it('matches an original target color independently of the output color',()=>{
    const w=7,h=7,source=image(w,h,[255,255,255,255]),target=image(w,h,[0,0,255,255]);
    setPixel(target,w,3,3,[255,0,0,255]);
    const points=[{x:1,y:1},{x:5,y:1},{x:5,y:5},{x:1,y:5}];
    const mask=fillMask(source,w,h,{...settings,method:'lasso',color:'#00ff00',matchColor:'#0000ff',
      condition:'color',tolerance:1},points,null,null,undefined,target);
    expect(mask.alpha[2*w+2]).toBeGreaterThan(0);
    expect(mask.alpha[3*w+3]).toBe(0);
  });
  it('uses the original match color for color hints while painting a different output color',()=>{
    const w=9,h=9,source=image(w,h);
    rectangle(source,w,2,2,6,6,[0,0,0,255]);
    const graph=buildRegions(source,w,h,15,0,[]),target=image(w,h,[0,0,255,255]);
    setPixel(target,w,4,4,[255,0,0,255]);
    const result=paintColorHints(graph,[{color:'#00ff00',width:1,points:[{x:4,y:4}]}],
      target,null,{...settings,condition:'color',matchColor:'#0000ff',tolerance:1},false);
    expect(Array.from(result.pixels.slice((4*w+4)*4,(4*w+4)*4+4))).toEqual([255,0,0,255]);
    expect(Array.from(result.pixels.slice((3*w+4)*4,(3*w+4)*4+4))).toEqual([0,255,0,255]);
  });
  it('allows alpha and RGB tolerances to be independently controlled',()=>{
    const w=3,h=1,source=image(w,h,[70,80,90,255]);
    setPixel(source,w,1,0,[70,80,90,100]);
    const narrow=fillMask(source,w,h,{...settings,tolerance:0,alphaTolerance:0},[{x:0,y:0}],null,null);
    const permissive=fillMask(source,w,h,{...settings,tolerance:0,alphaTolerance:100},[{x:0,y:0}],null,null);
    expect(narrow.alpha[1]).toBe(0);
    expect(permissive.alpha[1]).toBe(255);
  });
});
