import {afterEach,describe,expect,it,vi} from 'vitest';
import {ArtworkWorkerFonts} from './workerFonts';

afterEach(()=>vi.unstubAllGlobals());
function environment(failFirst=false){
 let created=0;
 const faces=new Set<unknown>();
 vi.stubGlobal('FontFace',class {
   constructor(readonly family:string,readonly bytes:ArrayBuffer){created++;}
   async load(){if(failFirst){failFirst=false;throw Error('font load failed');}return this;}
 });
 const fonts={add:(face:unknown)=>faces.add(face),delete:(face:unknown)=>faces.delete(face)} as unknown as FontFaceSet;
 return {fonts,faces,created:()=>created};
}
const source=(name:string)=>({family:'IllustroFont-'+name,data:new Blob(['font data'])});
describe('C10-011 imported fonts in artwork workers',()=>{
 it('awaits font loading once and reuses the prepared face',async()=>{
   const env=environment(),cache=new ArtworkWorkerFonts();
   await cache.ensure(source('A'),env.fonts);await cache.ensure(source('A'),env.fonts);
   expect(env.created()).toBe(1);expect(env.faces.size).toBe(1);
 });
 it('evicts the least recently used face to bound worker memory',async()=>{
   const env=environment(),cache=new ArtworkWorkerFonts();
   for(const id of ['A','B','C','D','A','E'])await cache.ensure(source(id),env.fonts);
   expect(env.created()).toBe(5);expect(env.faces.size).toBe(4);
   await cache.ensure(source('B'),env.fonts);
   expect(env.created()).toBe(6);expect(env.faces.size).toBe(4);
 });
 it('does not cache failed loads, allowing the next operation to retry',async()=>{
   const env=environment(true),cache=new ArtworkWorkerFonts();
   await expect(cache.ensure(source('A'),env.fonts)).rejects.toThrow('font load failed');
   expect(env.faces.size).toBe(0);
   await cache.ensure(source('A'),env.fonts);
   expect(env.created()).toBe(2);expect(env.faces.size).toBe(1);
 });
 it('refuses arbitrary family names and invalid font sizes',async()=>{
   const env=environment(),cache=new ArtworkWorkerFonts();
   await expect(cache.ensure({...source('A'),family:'serif'},env.fonts)).rejects.toThrow();
   await expect(cache.ensure({...source('A'),data:new Blob()},env.fonts)).rejects.toThrow();
   expect(env.created()).toBe(0);
 });
});
