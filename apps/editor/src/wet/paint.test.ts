import {describe,expect,it} from 'vitest';
import {defaultWet,paintWet,tileAlignedArea,type WetJob} from './paint';
const area={x:0,y:0,width:12,height:8};
const patch=()=>({area,pixels:new Uint8ClampedArray(area.width*area.height*4)});
const at=(x:number,y:number)=>(y*area.width+x)*4;
const job=():WetJob=>({destination:patch(),reference:null,selection:null,
  points:[{x:5.5,y:4.5}],offset:{x:0,y:0},alphaLocked:false,settings:{...defaultWet,size:5,strength:1,color:[255,0,0]}});
describe('wet and repair brushes',()=>{
  it('blurs a translucent edge in premultiplied color',()=>{
    const run=job();run.destination.pixels.set([255,120,10,255],at(6,4));
    const {pixels}=paintWet({...run,settings:{...run.settings,mode:'blur'}});
    expect([...pixels.slice(at(5,4),at(5,4)+3)]).toEqual([255,120,10]);
    expect(pixels[at(5,4)+3]).toBeGreaterThan(0);
  });
  it('clones from an immutable snapshot and honors the selection',()=>{
    const run=job(),source=patch(),selection=new Uint8Array(area.width*area.height);
    source.pixels.set([45,75,195,255],at(2,2));selection[at(5,4)/4]=255;
    const result=paintWet({...run,reference:source,selection,offset:{x:-3,y:-2},settings:{...run.settings,mode:'clone'}});
    expect([...result.pixels.slice(at(5,4),at(5,4)+4)]).toEqual([45,75,195,255]);
    expect(run.destination.pixels.some(Boolean)).toBe(false);expect(source.pixels[at(2,2)]).toBe(45);
  });
  it('produces deterministic paper and pigment texture for a saved stroke',()=>{
    const run=job(),settings={...run.settings,mode:'water' as const};
    const a=paintWet({...run,settings}),b=paintWet({...run,settings});
    expect(a.changed).toBe(true);expect(a).toEqual(b);
    expect(tileAlignedArea({x:290,y:10,width:60,height:2},400,700,256)).toEqual({x:256,y:0,width:144,height:256});
  });
});

it('copies a shaped patch with the original feathered coverage and no rectangular fringe',()=>{
  const run=job(),reference=patch(),selection=new Uint8Array(area.width*area.height);
  reference.pixels.set([30,60,90,255],at(2,2));
  reference.pixels.set([170,90,20,255],at(3,2));
  selection[at(5,4)/4]=128;
  const result=paintWet({...run,reference,selection,shapePatch:true,offset:{x:-3,y:-2},
    points:[{x:5,y:4},{x:7,y:5}],settings:{...run.settings,mode:'patch',strength:1}});
  expect([...result.pixels.slice(at(5,4),at(5,4)+4)]).toEqual([30,60,90,128]);
  expect(result.pixels[at(6,4)+3]).toBe(0);
});

it('uses independent water and pigment settings to soften and mix a watercolor stroke',()=>{
  const run=job();
  for(let y=0;y<area.height;y++) for(let x=0;x<6;x++)run.destination.pixels.set([30,65,235,180],at(x,y));
  const settings={...run.settings,mode:'water' as const,pigment:.8,diffusion:.75};
  const dry=paintWet({...run,settings:{...settings,water:0}}).pixels;
  const wet=paintWet({...run,settings:{...settings,water:1}}).pixels;
  const noPigment=paintWet({...run,settings:{...settings,water:1,pigment:0}}).pixels;
  expect(wet).not.toEqual(dry);
  expect(wet).not.toEqual(noPigment);
  expect(wet[at(6,4)]).toBeGreaterThan(30);
  expect(wet[at(6,4)+2]).toBeGreaterThan(0);
  expect(noPigment[at(6,4)+2]).toBeGreaterThan(200);
});

 it('copies straight RGBA exactly at full clone coverage, including transparency',()=>{
   const run=job(),reference=patch();run.destination.pixels.set([200,20,80,255],at(5,4));
   reference.pixels.set([30,80,190,128],at(2,2));
   const result=paintWet({...run,reference,offset:{x:-3,y:-2},settings:{...run.settings,mode:'clone'}});
   expect([...result.pixels.slice(at(5,4),at(5,4)+4)]).toEqual([30,80,190,128]);
   expect([...run.destination.pixels.slice(at(5,4),at(5,4)+4)]).toEqual([200,20,80,255]);
 });

it('changes repair brush boundary hardness without changing the full-coverage center',()=>{
 const run=job(),reference=patch();
 for(let y=0;y<area.height;y++)for(let x=0;x<area.width;x++)reference.pixels.set([30,80,190,255],at(x,y));
 for(const mode of ['clone','heal'] as const){
   const settings={...run.settings,mode,size:10,strength:1};
   const soft=paintWet({...run,reference,settings:{...settings,edge:0}}).pixels;
   const hard=paintWet({...run,reference,settings:{...settings,edge:100/100}}).pixels;
   expect([...soft.slice(at(5,4),at(5,4)+4)]).toEqual([30,80,190,255]);
   expect([...hard.slice(at(5,4),at(5,4)+4)]).toEqual([30,80,190,255]);
   expect(hard[at(9,4)+3]).toBe(255);
   expect(soft[at(9,4)+3]).toBeGreaterThan(0);
   expect(soft[at(9,4)+3]).toBeLessThan(255);
 }
});
