import {describe,it,expect} from 'vitest';
import {referenceBrushes} from '@illustro/brush-rt';
import {BrushUsage} from './brushUsage';
import {filterBrushCatalog} from './brushCatalog';
const memory=()=>{
 let value:string|null=null;
 return {getItem:()=>value,setItem:(_key:string,next:string)=>{value=next;}};
};
const isUser=()=>false;
describe('C02 BRU-004 brush favorites and recently used',()=>{
 it('persists favorites and recent order without changing any preset',()=>{
  const store=memory(),before=structuredClone(referenceBrushes),usage=new BrushUsage(store);
  usage.markUsed('foundation-g-pen');usage.markUsed('foundation-pencil');usage.markUsed('foundation-g-pen');
  expect(usage.recentIds).toEqual(['foundation-g-pen','foundation-pencil']);
  expect(usage.toggleFavorite('foundation-pencil')).toBe(true);
  const restored=new BrushUsage(store);
  expect(restored.favoriteIds).toEqual(['foundation-pencil']);
  expect(filterBrushCatalog(referenceBrushes,{group:'favorites',isUser,favoriteIds:restored.favoriteIds}).map(p=>p.id)).toEqual(['foundation-pencil']);
  expect(filterBrushCatalog(referenceBrushes,{group:'recent',isUser,recentIds:restored.recentIds}).map(p=>p.id)).toEqual(['foundation-g-pen','foundation-pencil']);
  expect(referenceBrushes).toEqual(before);
 });
 it('removes deleted brushes from both sets and preserves search behavior',()=>{
  const usage=new BrushUsage(memory());usage.markUsed('foundation-g-pen');usage.toggleFavorite('foundation-g-pen');
  usage.remove('foundation-g-pen');
  expect(usage.favoriteIds).toEqual([]);expect(usage.recentIds).toEqual([]);
  expect(filterBrushCatalog(referenceBrushes,{group:'recent',isUser,recentIds:usage.recentIds})).toEqual([]);
  expect(filterBrushCatalog(referenceBrushes,{group:'all',query:'Ｇペン',isUser}).map(p=>p.id)).toEqual(['foundation-g-pen']);
 });
 it('handles corrupt or read-only preferences without interrupting drawing',()=>{
  const bad={getItem:()=>'{not json',setItem:()=>{throw new Error('read only');}};
  const usage=new BrushUsage(bad);
  expect(usage.favoriteIds).toEqual([]);
  expect(()=>usage.markUsed('foundation-g-pen')).not.toThrow();
  expect(usage.recentIds).toEqual(['foundation-g-pen']);
 });
 it('bounds recent history and ignores invalid ids',()=>{
  const usage=new BrushUsage(memory());
  for(let i=0;i<100;i++)usage.markUsed('brush-'+i);
  usage.markUsed('');
  expect(usage.recentIds).toHaveLength(30);
  expect(usage.recentIds[0]).toBe('brush-99');
  expect(usage.recentIds[29]).toBe('brush-70');
 });
});
