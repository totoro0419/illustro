import {describe,expect,it} from 'vitest';
import {buildRegions,fillBoundaries,fillMask,paintColorHints,type FillSettings} from './pixels';

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
  it('allows alpha and RGB tolerances to be independently controlled',()=>{
    const w=3,h=1,source=image(w,h,[70,80,90,255]);
    setPixel(source,w,1,0,[70,80,90,100]);
    const narrow=fillMask(source,w,h,{...settings,tolerance:0,alphaTolerance:0},[{x:0,y:0}],null,null);
    const permissive=fillMask(source,w,h,{...settings,tolerance:0,alphaTolerance:100},[{x:0,y:0}],null,null);
    expect(narrow.alpha[1]).toBe(0);
    expect(permissive.alpha[1]).toBe(255);
  });
});
