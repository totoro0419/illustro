import {describe,it,expect} from 'vitest';
import {referenceBrushes,validateFoundation} from '@illustro/brush-rt';
import {BRUSH_LIBRARY_KEY,BrushPresetLibrary} from './brushPresets';

class MemoryStorage implements Storage {
 private map=new Map<string,string>();
 get length(){return this.map.size;}
 clear(){this.map.clear();}
 key(i:number){return [...this.map.keys()][i]??null;}
 getItem(k:string){return this.map.get(k)??null;}
 removeItem(k:string){this.map.delete(k);}
 setItem(k:string,v:string){this.map.set(k,v);}
}
describe('M10 user brush library',()=>{
 it('keeps shipped brushes immutable and stable across reloads',()=>{
  const storage=new MemoryStorage(),lib=new BrushPresetLibrary(storage);
  const original=structuredClone(referenceBrushes[0]!);
  const builtins=lib.all(referenceBrushes);
  const duplicate=lib.duplicate(builtins[0]!,'My G Pen');
  expect(duplicate.id).toMatch(/^user-brush-/);
  expect(duplicate.id).not.toBe(original.id);
  duplicate.size=39;lib.save(duplicate);
  const reloaded=new BrushPresetLibrary(storage),all=reloaded.all(referenceBrushes);
  expect(all.find(p=>p.id===duplicate.id)?.size).toBe(39);
  expect(all.find(p=>p.id===original.id)).toEqual(original);
  expect(all.length).toBe(referenceBrushes.length+1);
  reloaded.remove(duplicate.id);
  expect(new BrushPresetLibrary(storage).all(referenceBrushes)).toHaveLength(referenceBrushes.length);
 });
 it('uses Foundation brush packs without changing IDs, refuses collisions',()=>{
  const storage=new MemoryStorage(),lib=new BrushPresetLibrary(storage);
  lib.all(referenceBrushes);
  const a=lib.duplicate(referenceBrushes[2]!,'Precise');
  const data=lib.exportPack();
  expect(new BrushPresetLibrary(new MemoryStorage()).importPack).toBeDefined();
  const other=new BrushPresetLibrary(new MemoryStorage());other.all(referenceBrushes);
  expect(other.importPack(data)).toBe(1);
  expect(other.all(referenceBrushes).find(p=>p.id===a.id)?.name).toBe('Precise');
  const bad=JSON.stringify({format:'illustro-brush-pack',version:1,presets:[referenceBrushes[0]]});
  expect(()=>other.importPack(bad)).toThrow(/標準ブラシ/);
  expect(()=>other.importPack('not json')).toThrow();
  expect(()=>validateFoundation(a)).not.toThrow();
 });
 it('rejects unsupported versions and never overwrites valid saved brushes on failure',()=>{
  const storage=new MemoryStorage(),lib=new BrushPresetLibrary(storage);lib.all(referenceBrushes);
  const p=lib.duplicate(referenceBrushes[1]!,'Saved');
  const before=storage.getItem(BRUSH_LIBRARY_KEY);
  expect(()=>lib.importPack('{"format":"invalid"}')).toThrow();
  expect(storage.getItem(BRUSH_LIBRARY_KEY)).toBe(before);
  expect(lib.userPresets[0]?.id).toBe(p.id);
 });
 it('reports corrupted saved packs rather than treating them as trusted data',()=>{
  const storage=new MemoryStorage();storage.setItem(BRUSH_LIBRARY_KEY,'{broken');
  const lib=new BrushPresetLibrary(storage);
  expect(lib.loadError).toBeTruthy();
  expect(lib.all(referenceBrushes)).toHaveLength(referenceBrushes.length);
 });
});
