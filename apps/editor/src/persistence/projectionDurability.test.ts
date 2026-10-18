import {beforeAll,describe,it,expect,vi} from 'vitest';
let worker:typeof import('./persistence.worker');
beforeAll(async()=>{vi.stubGlobal('self',{postMessage(){}});worker=await import('./persistence.worker');});
const surfaceId='00000000-0000-4000-8000-000000000001',oldRevision='00000000-0000-4000-8000-000000000002',newRevision='00000000-0000-4000-8000-000000000003';
const session={documentId:surfaceId,writerEpochId:oldRevision,path:'session'};
class MemoryStore{
 files=new Map<string,Uint8Array>();writes=0;failAt=Infinity;
 async get(path:string){return this.files.get(path)?.slice()??null;}
 async put(path:string,bytes:Uint8Array){if(++this.writes===this.failAt)throw Error('injected interrupted write');this.files.set(path,bytes.slice());}
 async remove(path:string){this.files.delete(path);}
}
const tile=(key:string,value:number)=>({surfaceId,key,pixels:new Uint8Array(128*128*4).fill(value)});
const save=(store:MemoryStore,revision:string,tiles:ReturnType<typeof tile>[])=>worker.storeProjectionDelta(store as any,session,revision,256,128,128,[surfaceId],tiles);
const load=(store:MemoryStore)=>worker.loadProjectionDeltaRaw(store as any,session,new Set([oldRevision,newRevision]));
// A missing tile is exactly zero; V2 does not allocate a full RGBA buffer.
const firstPixel=(image:Awaited<ReturnType<typeof load>>,key:string)=>{
 if(!image)return undefined;
 if(image.version===2)return image.layers[0]?.tiles.find(tile=>tile.key===key)?.pixels[0]??0;
 const [x,y]=key.split(',').map(Number);return image.layers[0]?.pixels[(y*128*256+x*128)*4];
};
describe('sparse checkpoint publication durability',()=>{
 it('an interrupted tile update leaves the previously published image exact',async()=>{
  const store=new MemoryStore();await save(store,oldRevision,[tile('0,0',10),tile('1,0',20)]);store.failAt=store.writes+2;
  await expect(save(store,newRevision,[tile('0,0',30),tile('1,0',40)])).rejects.toThrow('interrupted');
  const image=await load(store);expect(image?.revisionId).toBe(oldRevision);expect(firstPixel(image,'0,0')).toBe(10);expect(firstPixel(image,'1,0')).toBe(20);expect(store.files.size).toBe(3);
 });
 it('erasure is published before old tile files are removed',async()=>{
  const store=new MemoryStore();await save(store,oldRevision,[tile('0,0',10)]);store.failAt=store.writes+1;
  await expect(save(store,newRevision,[tile('0,0',0)])).rejects.toThrow('interrupted');expect(firstPixel(await load(store),'0,0')).toBe(10);
  store.failAt=Infinity;await save(store,newRevision,[tile('0,0',0)]);expect(firstPixel(await load(store),'0,0')).toBe(0);expect(store.files.size).toBe(1);
 });
 it('successful replacements reuse equal content and remove obsolete files',async()=>{
  const store=new MemoryStore();await save(store,oldRevision,[tile('0,0',10),tile('1,0',20)]);
  const writes=store.writes;await save(store,newRevision,[tile('0,0',10)]);expect(store.writes-writes).toBe(1);
  for(let i=30;i<40;i++)await save(store,newRevision,[tile('0,0',i)]);
  expect(store.files.size).toBe(3);expect(firstPixel(await load(store),'0,0')).toBe(39);
  const file=[...store.files.keys()].find(path=>path.includes('/0:0.'))!,bytes=store.files.get(file)!;bytes[0]=bytes[0]!^1;expect(await load(store)).toBeNull();
 });
 it('M09 indexes without a content digest still restore',async()=>{
  const store=new MemoryStore();await save(store,oldRevision,[tile('0,0',10)]);
  const original=store.files.get('session/projection-v2.frame')!,length=new DataView(original.buffer).getUint32(8,true),index=JSON.parse(new TextDecoder().decode(original.subarray(12,12+length)));
  const descriptor=index.tiles[0],from='session/projection-v2/'+surfaceId+'/0:0.'+descriptor.digest+'.bin';store.files.set('session/projection-v2/'+surfaceId+'/0:0.bin',store.files.get(from)!);delete descriptor.digest;index.version=2;
  const bytes=new TextEncoder().encode(JSON.stringify(index)),hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),frame=new Uint8Array(12+bytes.length+32);
  frame.set(new TextEncoder().encode('ILJRNL01'));new DataView(frame.buffer).setUint32(8,bytes.length,true);frame.set(bytes,12);frame.set(hash,12+bytes.length);store.files.set('session/projection-v2.frame',frame);
  expect(firstPixel(await load(store),'0,0')).toBe(10);
 });
});
