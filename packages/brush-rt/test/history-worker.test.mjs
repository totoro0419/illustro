import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const source=await fs.readFile(new URL('../src/history.worker.mjs',import.meta.url),'utf8');
function worker({storage=true,quota=false}={}){
 const files=new Map,pending=new Map;let sequence=0;
 const directory={async getDirectoryHandle(){return this;},async getFileHandle(key,{create=false}={}){if(!create&&!files.has(key))throw Error('missing');return {async createWritable(){return {async write(bytes){if(quota)throw Error('quota exceeded');files.set(key,Uint8Array.from(bytes));},async close(){},async abort(){}};},async getFile(){const bytes=files.get(key);return {async arrayBuffer(){return bytes.slice().buffer;}};}};},async removeEntry(key){files.delete(key);}};
 const self={postMessage(message){pending.get(message.request)(message);pending.delete(message.request);}};
 const context=vm.createContext({self,crypto:webcrypto,Blob,Response,CompressionStream,DecompressionStream,Uint8Array,Map,Set,Promise,Error,Math,Array,navigator:{storage:{async getDirectory(){if(!storage)throw Error('denied');return directory;},async estimate(){return {quota:1024**3,usage:0};}}}});
 vm.runInContext(source,context);
 const send=(type,values={})=>new Promise(resolve=>{const request=++sequence;pending.set(request,resolve);self.onmessage({data:{request,type,...values}});});
 return {send,files};
}
test('worker compresses losslessly, deduplicates content and spills verified images to OPFS',async()=>{
 const {send,files}=worker();await send('init',{memoryBudget:65536});const pixels=new Uint8Array(65536);pixels.fill(123);pixels[100]=12;
 await send('put',{id:1,pixels});const two=await send('put',{id:2,pixels});assert.equal(two.metrics.blocks,1);assert.equal(two.metrics.aliases,2);assert.ok(two.metrics.memoryBytes<65536);assert.equal(two.metrics.hashDeduplications,1);
 const flushed=await send('flush');assert.equal(flushed.metrics.memoryBytes,0);assert.equal(flushed.metrics.mode,'opfs');assert.ok(flushed.metrics.diskBytes>0);
 const read=await send('get',{id:1});assert.deepEqual(read.pixels,pixels);assert.equal(read.metrics.diskHits,1);
 await send('drop',{ids:[1]});assert.deepEqual((await send('get',{id:2})).pixels,pixels);
 await send('drop',{ids:[2]});assert.equal(files.size,0);assert.equal((await send('get',{id:1})).missing,true);
});
test('quota failure preserves bounded memory and returns an explicit cache miss',async()=>{
 const {send}=worker({quota:true});await send('init',{memoryBudget:65536});await send('put',{id:1,pixels:new Uint8Array(65536).fill(9)});const flushed=await send('flush');assert.ok(flushed.metrics.storageErrors>0);assert.equal(flushed.metrics.memoryBytes,0);assert.equal((await send('get',{id:1})).missing,true);
});
test('storage denial keeps lossless images in bounded memory and allows safe eviction',async()=>{
 const {send}=worker({storage:false});await send('init',{memoryBudget:65536});const pixels=new Uint8Array(65536);webcrypto.getRandomValues(pixels);await send('put',{id:1,pixels});webcrypto.getRandomValues(pixels);const second=await send('put',{id:2,pixels});assert.equal(second.metrics.mode,'memory');assert.ok(second.metrics.memoryBytes<=65536);assert.equal((await send('get',{id:1})).missing,true);assert.deepEqual((await send('get',{id:2})).pixels,pixels);
});
test('corrupt disk blocks never return pixels and are reclaimed',async()=>{
 const {send,files}=worker();await send('init');await send('put',{id:1,pixels:new Uint8Array(65536).fill(10)});await send('flush');for(const [key]of files)files.set(key,new Uint8Array([1,2,3]));const read=await send('get',{id:1});assert.equal(read.missing,true);assert.ok(read.metrics.storageErrors>0);assert.equal(files.size,0);
});
