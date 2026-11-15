import {describe,it,expect} from 'vitest';
import {referenceBrushes} from '@illustro/brush-rt';
import {brushCatalogGroup,filterBrushCatalog} from './brushCatalog';

const isUser=(id:string)=>id.startsWith('user-brush-');
describe('M10 brush discovery (presentation only)',()=>{
 it('keeps seven fixed Foundation brushes organized',()=>{
  expect(filterBrushCatalog(referenceBrushes,{group:'ink',isUser}).map(p=>p.id))
   .toEqual(['foundation-g-pen','foundation-round-pen','foundation-technical']);
  expect(filterBrushCatalog(referenceBrushes,{group:'sketch',isUser}).map(p=>p.id)).toEqual(['foundation-pencil']);
  expect(filterBrushCatalog(referenceBrushes,{group:'paint',isUser}).map(p=>p.id)).toEqual(['foundation-marker']);
  expect(filterBrushCatalog(referenceBrushes,{group:'eraser',isUser})).toHaveLength(2);
 });
 it('searches name and purpose with full-width normalization without mutating presets',()=>{
  const before=structuredClone(referenceBrushes);
  expect(filterBrushCatalog(referenceBrushes,{query:'Ｇペン',isUser}).map(p=>p.id)).toEqual(['foundation-g-pen']);
  expect(filterBrushCatalog(referenceBrushes,{query:'黒鉛',isUser}).map(p=>p.id)).toEqual(['foundation-pencil']);
  expect(filterBrushCatalog(referenceBrushes,{query:'not-a-brush',isUser})).toEqual([]);
  expect(referenceBrushes).toEqual(before);
 });
 it('keeps user duplicates in custom, regardless of original type',()=>{
  const custom={...structuredClone(referenceBrushes[0]!),id:'user-brush-123',name:'マイブラシ'};
  expect(brushCatalogGroup(custom,isUser)).toBe('user');
  expect(filterBrushCatalog([...referenceBrushes,custom],{group:'user',isUser})).toEqual([custom]);
  expect(filterBrushCatalog([...referenceBrushes,custom],{query:'マイ',group:'ink',isUser})).toEqual([]);
 });
 it('classifies unknown built-ins as other, not as a guessed tool type',()=>{
  const future={...structuredClone(referenceBrushes[0]!),id:'future-unknown'};
  expect(brushCatalogGroup(future,isUser)).toBe('other');
 });
});
