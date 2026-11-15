import {describe,it,expect} from 'vitest';
import {CanonicalBuilder,compilePreset,cpuReference,referenceBrushes} from '@illustro/brush-rt';
import {additionalBrushes} from './brushStarterPresets';
import {addSimpleMapping,changeSimpleMapping,removeSimpleMapping,isSimpleMapping} from './brushDynamics';

describe('M10 protected quality baseline and new controls',()=>{
 it('preserves the seven original Foundation brushes while adding additional ready-to-use presets',()=>{
  const before=structuredClone(referenceBrushes),extra=additionalBrushes(referenceBrushes);
  expect(extra.map(p=>p.id)).toEqual(['illustro-fine-liner-v1','illustro-soft-pencil-v1','illustro-opaque-marker-v1','illustro-airbrush-v1']);
  expect(new Set([...referenceBrushes,...extra].map(p=>p.id)).size).toBe(11);
  for(const p of extra)expect(()=>compilePreset(p,{forceFadeGeometry:'adaptive-v1'})).not.toThrow();
  expect(referenceBrushes).toEqual(before);
 });
 it('adds and edits dynamics without changing the existing G-pen pressure or built-in data',()=>{
  const base=structuredClone(referenceBrushes[0]!);
  const b=addSimpleMapping(base,'velocity','flow');
  expect(b.dynamics).toHaveLength(base.dynamics.length+1);
  expect(b.dynamics[0]).toEqual(base.dynamics[0]);
  const c=changeSimpleMapping(b,1,{min:.5,max:.9,target:'opacity'});
  expect(c.dynamics[1]?.source).toBe('velocity');expect(c.dynamics[1]?.target).toBe('opacity');
  expect(c.dynamics[1]?.min).toBe(.5);
  expect(isSimpleMapping(c.dynamics[1]!)).toBe(true);
  expect(removeSimpleMapping(c,1).dynamics).toEqual(base.dynamics);
  expect(referenceBrushes[0]).toEqual(base);
  expect(()=>changeSimpleMapping(b,1,{min:.99,max:.5})).toThrow();
 });
 it('new marker stays at 90% and remains translucent in the canonical record',()=>{
  const base=referenceBrushes.find(p=>p.id==='foundation-marker')!;
  const p=additionalBrushes(referenceBrushes).find(p=>p.id==='illustro-opaque-marker-v1')!;
  expect(base.opacity).toBe(.45);
  expect(p.opacity).toBe(.9); // Do not disguise a transition problem by forcing opacity=1.
  expect(p.size).toBe(72);
  const compiled=compilePreset(p,{forceFadeGeometry:'adaptive-v1'});
  expect((compiled as unknown as {__foundation?:{solid:boolean}}).__foundation?.solid).toBe(true);
  const b=new CanonicalBuilder(p,[371,552],0,{forceFadeGeometry:'adaptive-v1'});
  b.accept({x:50,y:60,t:0,pressure:.8,pointerType:'pen'});
  b.accept({x:130,y:60,t:16,pressure:.8,pointerType:'pen'});
  b.finish();
  const pixels=cpuReference(b.record(),180,120);
  const alpha=pixels[(60*180+90)*4+3]??0;
  expect(alpha).toBeGreaterThan(200);
  expect(alpha).toBeLessThan(255);
 });
 it('records identical fine-pen paths for identical raw input and seed (no timing-dependent result)',()=>{
  const preset=additionalBrushes(referenceBrushes)[0]!;
  const samples=Array.from({length:20},(_,i)=>({x:20+i*3,y:20+Math.sin(i*.27)*9,t:i*9,pressure:.1+.8*i/19,pointerType:'pen'}));
  const run=()=>{const b=new CanonicalBuilder(preset,[123,789],0,{forceFadeGeometry:'adaptive-v1'});for(const s of samples)b.accept(s);b.finish();return b.record();};
  const a=run(),b=run();
  expect(JSON.stringify(a.commands)).toEqual(JSON.stringify(b.commands));
  expect(a.commands.length).toBeGreaterThan(5);
  expect(a.commands.every(c=>[...c].every(Number.isFinite))).toBe(true);
 });
 it('preserves G-pen taper geometry deterministically for varied pressure',()=>{
  const preset=structuredClone(referenceBrushes[0]!);
  const samples=Array.from({length:30},(_,i)=>({x:25+i*6,y:25+Math.sin(i*.12)*12,t:i*8,pressure:.15+.75*Math.sin(Math.PI*i/29),pointerType:'pen'}));
  const b=new CanonicalBuilder(preset,[1234,5678],0,{forceFadeGeometry:'adaptive-v1'});
  for(const s of samples)b.accept(s);b.finish();
  const commands=b.record().commands,thickness=commands.map(c=>c[2]??0);
  expect(commands.length).toBeGreaterThan(samples.length);
  expect(Math.max(...thickness)).toBeGreaterThan(thickness[0]??0);
  expect(Math.max(...thickness)).toBeGreaterThan(thickness.at(-1)??0);
  expect(thickness.every(n=>Number.isFinite(n)&&(n??0)>0)).toBe(true);
 });
});

it('uses the renderer for distance-controlled size and reversible color dynamics',()=>{
 const base=structuredClone(referenceBrushes.find(brush=>brush.id==='foundation-round-pen')!);
 const sized=addSimpleMapping(base,'distance','size'),colored=addSimpleMapping(sized,'direction','hue');
 const index=colored.dynamics.length-1;
 const reversed=changeSimpleMapping(colored,index,{curve:[[0,1],[1,0]]});
 const draw=(preset:typeof base)=>{
  const builder=new CanonicalBuilder(preset,[19,42],0,{forceFadeGeometry:'adaptive-v1'});
  for(let i=0;i<9;i++)builder.accept({x:20+i*12,y:20+i*3,t:i*8,pointerType:'pen',pressure:.8});
  builder.finish();
  return cpuReference(builder.record(),160,80);
 };
 expect(draw(colored)).not.toEqual(draw(reversed));
 expect(draw(sized)).not.toEqual(draw(base));
});

it('renders the airbrush with a soft edge and stronger coverage after overlapping dabs',()=>{
 const preset=additionalBrushes(referenceBrushes).find(brush=>brush.id==='illustro-airbrush-v1')!;
 const draw=(samples:number)=>{
  const builder=new CanonicalBuilder(preset,[1,2],0);
  for(let i=0;i<samples;i++)builder.accept({x:44+i*8,y:72,t:i*9,pointerType:'mouse'});
  builder.finish();
  return cpuReference(builder.record(),150,150);
 };
 const dab=draw(1),line=draw(8),alpha=(pixels:Uint8Array|Uint8ClampedArray,x:number,y:number)=>pixels[(y*150+x)*4+3]!;
 expect(alpha(dab,44,72)).toBeGreaterThan(alpha(dab,44,100));
 expect(alpha(dab,44,100)).toBeGreaterThan(0);
 expect(alpha(line,68,72)).toBeGreaterThan(alpha(dab,44,72));
});
