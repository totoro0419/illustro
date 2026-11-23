import {describe,expect,it} from 'vitest';
import {buildRegions,fillBoundaries,fillMask,needsLeakingFillReview,paintColorHints,suggestLocalGaps,type FillSettings} from './pixels';

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
  it('rejects 45-degree false repairs between perpendicular line tips',()=>{
    const w=15,h=15,data=image(w,h);
    for(const x of [1,2,3,9,10,11])setPixel(data,w,x,7,[0,0,0,255]);
    for(const y of [2,3,4,10,11,12])setPixel(data,w,6,y,[0,0,0,255]);
    const result=fillBoundaries(data,w,h,15,6);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates.every(g=>g.from.x===g.to.x||g.from.y===g.to.y)).toBe(true);
    expect(suggestLocalGaps(buildRegions(data,w,h,15,0,[]),{x:6,y:7},6,[])
      .every(g=>g.from.x===g.to.x||g.from.y===g.to.y)).toBe(true);
  });
  it('repairs a one-pixel horizontal gap without unnecessary diagonal scanning',()=>{
    const w=9,h=9,horizontal=image(w,h),diagonal=image(w,h);
    for(const x of [1,2,4,5])setPixel(horizontal,w,x,4,[0,0,0,255]);
    for(const [x,y] of [[1,1],[2,2],[4,4],[5,5]] as const)
      setPixel(diagonal,w,x,y,[0,0,0,255]);
    expect(fillBoundaries(horizontal,w,h,15,1).bridges[4*w+3]).toBe(1);
    expect(fillBoundaries(diagonal,w,h,15,1).bridges.some(Boolean)).toBe(false);
  });
  it('preserves a genuine diagonal repair between aligned diagonal tips',()=>{
    const w=11,h=11,data=image(w,h);
    for(const [x,y] of [[1,1],[2,2],[3,3],[6,6],[7,7],[8,8]] as const)
      setPixel(data,w,x,y,[0,0,0,255]);
    const result=fillBoundaries(data,w,h,15,4);
    expect(result.bridges[4*w+4]).toBe(1);
    expect(result.bridges[5*w+5]).toBe(1);
  });
  it('does not auto-connect two gaps that cross an already proposed bridge',()=>{
    const w=21,h=21,data=image(w,h);
    for(const x of [2,3,4,16,17,18])setPixel(data,w,x,10,[0,0,0,255]);
    for(const y of [4,5,6,14,15,16])setPixel(data,w,10,y,[0,0,0,255]);
    const result=fillBoundaries(data,w,h,15,12);
    const horizontal=Array.from({length:11},(_,i)=>i+5).every(x=>result.bridges[10*w+x]===1);
    const vertical=Array.from({length:7},(_,i)=>i+7).every(y=>result.bridges[y*w+10]===1);
    expect(Number(horizontal)+Number(vertical)).toBe(1);
    expect(result.candidates).toHaveLength(1);
  });
  it('does not suggest two competing repairs crossing the same empty corridor',()=>{
    const w=21,h=21,data=image(w,h);
    for(const x of [2,3,4,16,17,18])setPixel(data,w,x,10,[0,0,0,255]);
    for(const y of [4,5,6,14,15,16])setPixel(data,w,10,y,[0,0,0,255]);
    const gaps=suggestLocalGaps(buildRegions(data,w,h,15,0,[]),{x:10,y:10},12,[]);
    const horizontal=gaps.filter(g=>g.from.y===10&&g.to.y===10);
    const vertical=gaps.filter(g=>g.from.x===10&&g.to.x===10);
    expect(horizontal.length+vertical.length).toBe(1);
  });
  it('does not suggest a second gap through an already repaired bridge',()=>{
    const w=21,h=21,data=image(w,h);
    for(const x of [2,3,4,16,17,18])setPixel(data,w,x,10,[0,0,0,255]);
    for(const y of [4,5,6,14,15,16])setPixel(data,w,10,y,[0,0,0,255]);
    const graph=buildRegions(data,w,h,15,12,[]);
    const suggestions=suggestLocalGaps(graph,{x:10,y:10},12,[]);
    for(const gap of suggestions){
      const dx=gap.to.x-gap.from.x,dy=gap.to.y-gap.from.y;
      const steps=Math.max(Math.abs(dx),Math.abs(dy));
      for(let step=1;step<steps;step++){
        const x=Math.round(gap.from.x+dx*step/steps);
        const y=Math.round(gap.from.y+dy*step/steps);
        expect(graph.bridges[y*w+x]).toBe(0);
      }
    }
  });
  it('never applies untracked bridges after the 4096-candidate review limit',()=>{
    const w=12,lines=4100,h=lines*4+3,data=image(w,h);
    for(let line=0;line<lines;line++){
      const y=2+line*4;
      for(const x of [1,2,3,6,7,8])setPixel(data,w,x,y,[0,0,0,255]);
    }
    const result=fillBoundaries(data,w,h,15,2);
    expect(result.candidates).toHaveLength(4096);
    expect(result.bridges[(2+4095*4)*w+4]).toBe(1);
    expect(result.bridges[(2+4099*4)*w+4]).toBe(0);
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

describe('R2 D-007 gap repair and exterior leak protection',()=>{
  it('honors an 18 source-pixel gap instead of silently clamping it to 12',()=>{
    const width=36,height=9,data=image(width,height);
    for(const x of [1,2,3,21,22,23])setPixel(data,width,x,4,[0,0,0,255]);
    expect(fillBoundaries(data,width,height,15,12).bridges[4*width+10]).toBe(0);
    const result=fillBoundaries(data,width,height,15,18);
    expect(result.bridges[4*width+10]).toBe(1);
    expect(result.candidates).toHaveLength(1);
  });
  it('requires review for a center-seeded gap-assisted fill touching two outside edges',()=>{
    const width=30,height=30,alpha=new Uint8Array(width*height);
    alpha.fill(255,0,width);
    for(let y=0;y<height;y++)alpha[y*width]=255;
    const mask={width,height,alpha};
    expect(needsLeakingFillReview(mask,{x:15,y:15},2)).toBe(true);
    expect(needsLeakingFillReview(mask,{x:1,y:1},2)).toBe(false);
    expect(needsLeakingFillReview(mask,{x:15,y:15},0)).toBe(false);
  });
});

describe('R2 D-008 drag only enclosed regions',()=>{
  it('fills two disjoint closed regions without touching the intervening outside',()=>{
    const width=23,height=13,source=image(width,height);
    rectangle(source,width,2,2,8,10,[0,0,0,255]);
    rectangle(source,width,14,2,20,10,[0,0,0,255]);
    const graph=buildRegions(source,width,height,15,0,[]);
    const result=fillMask(source,width,height,{...settings,method:'line',closedOnly:true},
      [{x:5,y:6},{x:11,y:6},{x:17,y:6}],graph,null);
    expect(result.alpha[6*width+5]).toBe(255);
    expect(result.alpha[6*width+17]).toBe(255);
    expect(result.alpha[6*width+11]).toBe(0);
    expect(result.alpha[0]).toBe(0);
  });
});
