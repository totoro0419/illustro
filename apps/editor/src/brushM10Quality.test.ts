import {describe,it,expect} from 'vitest';
import {CanonicalBuilder,compilePreset,referenceBrushes} from '@illustro/brush-rt';
import {additionalBrushes} from './brushStarterPresets';
import {addSimpleMapping,changeSimpleMapping,removeSimpleMapping,isSimpleMapping} from './brushDynamics';

describe('M10 protected quality baseline and new controls',()=>{
 it('preserves the seven original Foundation brushes while adding three ready-to-use presets',()=>{
  const before=structuredClone(referenceBrushes),extra=additionalBrushes(referenceBrushes);
  expect(extra.map(p=>p.id)).toEqual(['illustro-fine-liner-v1','illustro-soft-pencil-v1','illustro-opaque-marker-v1']);
  expect(new Set([...referenceBrushes,...extra].map(p=>p.id)).size).toBe(10);
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
  const commands=b.record().commands,thickness=commands.map(c=>c[2]);
  expect(commands.length).toBeGreaterThan(samples.length);
  expect(Math.max(...thickness)).toBeGreaterThan(thickness[0]??0);
  expect(Math.max(...thickness)).toBeGreaterThan(thickness.at(-1)??0);
  expect(thickness.every(n=>Number.isFinite(n)&&(n??0)>0)).toBe(true);
 });
});
