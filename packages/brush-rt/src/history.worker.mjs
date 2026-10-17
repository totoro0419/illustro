// Lossless compression, content deduplication and spill I/O never run on the UI
// thread. OPFS shares the origin with the document store, in a separate namespace.
const TILE_BYTES=128*128*4,MiB=1024*1024;
let directory,root,db,session,mode='memory',memoryBudget=8*MiB,diskBudget=128*MiB,memoryBytes=0,diskBytes=0;
const aliases=new Map,blocks=new Map;
let hits=0,diskHits=0,memoryHits=0,misses=0,spills=0,evictions=0,storageErrors=0,hashDeduplications=0;
const stats=()=>({mode,memoryBudget,memoryBytes,diskBudget,diskBytes,blocks:blocks.size,aliases:aliases.size,hits,diskHits,memoryHits,misses,spills,evictions,storageErrors,hashDeduplications});
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
function transaction(write){const tx=db.transaction('blocks',write?'readwrite':'readonly');const done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('History IDB transaction failed'));});return {store:tx.objectStore('blocks'),done};}
async function init(m){
 memoryBudget=Math.max(TILE_BYTES,Math.min(32*MiB,m.memoryBudget??8*MiB));diskBudget=Math.max(0,Math.min(512*MiB,m.diskBudget??128*MiB));
 session=crypto.randomUUID();if(m.storageDisabled)return;
 try{const estimate=await navigator.storage?.estimate?.();if(estimate?.quota)diskBudget=Math.min(diskBudget,Math.max(0,Math.floor((estimate.quota-(estimate.usage??0))*.1)));}catch{}
 try{root=await navigator.storage.getDirectory();const parent=await root.getDirectoryHandle('illustro-tile-history',{create:true});directory=await parent.getDirectoryHandle(session,{create:true});root=parent;mode='opfs';return;}catch{}
 try{const open=indexedDB.open('illustro-tile-history',1);open.onupgradeneeded=()=>open.result.createObjectStore('blocks');db=await request(open);mode='indexeddb';}catch{mode='memory';}
}
async function writeBlock(key,data){
 if(directory){const file=await directory.getFileHandle(key,{create:true});const stream=await file.createWritable();try{await stream.write(data);await stream.close();}catch(error){await stream.abort().catch(()=>{});throw error;}}
 else if(db){const {store,done}=transaction(true);store.put(data,session+'/'+key);await done;}
 else throw Error('History storage unavailable');
}
async function readBlock(key){if(directory)return new Uint8Array(await(await(await directory.getFileHandle(key)).getFile()).arrayBuffer());if(db){const {store,done}=transaction(false),data=await request(store.get(session+'/'+key));await done;if(!data)throw Error('History block missing');return data;}throw Error('History storage unavailable');}
async function removeBlock(key){try{if(directory)await directory.removeEntry(key);else if(db){const {store,done}=transaction(true);store.delete(session+'/'+key);await done;}}catch{storageErrors++;}}
async function erase(key,b){if(b.data)memoryBytes-=b.data.byteLength;if(b.disk){diskBytes-=b.size;await removeBlock(key);}for(const id of b.ids)aliases.delete(id);blocks.delete(key);}
async function trim(target=memoryBudget){
 for(const [key,b]of blocks){if(memoryBytes<=target)break;if(!b.data)continue;
  if(!b.disk&&mode!=='memory'&&diskBytes+b.size<=diskBudget){try{await writeBlock(key,b.data);b.disk=true;diskBytes+=b.size;spills++;}catch{storageErrors++;}}
  if(b.disk){memoryBytes-=b.data.byteLength;b.data=null;}else{await erase(key,b);evictions++;}
 }
}
async function encode(pixels){if(typeof CompressionStream==='undefined')return {data:pixels,compressed:false};const data=new Uint8Array(await new Response(new Blob([pixels]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());return data.byteLength<pixels.byteLength?{data,compressed:true}:{data:pixels,compressed:false};}
async function decode(b,data){const pixels=b.compressed?new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()):data.slice();if(pixels.byteLength!==TILE_BYTES)throw Error('History block length mismatch');return pixels;}
async function put(id,pixels){
 if(pixels.byteLength!==TILE_BYTES)throw Error('History tile length mismatch');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pixels)),x=>x.toString(16).padStart(2,'0')).join('');
 let b=blocks.get(hash);if(b)hashDeduplications++;else{const encoded=await encode(pixels);b={...encoded,size:encoded.data.byteLength,disk:false,ids:new Set};blocks.set(hash,b);memoryBytes+=b.size;}
 b.ids.add(id);aliases.set(id,hash);await trim();return {available:aliases.has(id)};
}
async function get(id){const key=aliases.get(id),b=blocks.get(key);if(!b){misses++;return {missing:true};}
 try{if(b.data)memoryHits++;else diskHits++;const pixels=await decode(b,b.data??await readBlock(key));
  // Verify disk data before it may reach the GPU. SHA matches the raw tile.
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pixels)),x=>x.toString(16).padStart(2,'0')).join('');if(hash!==key)throw Error('History block checksum mismatch');
  blocks.delete(key);blocks.set(key,b);hits++;return {pixels};
 }catch{storageErrors++;misses++;await erase(key,b);return {missing:true};}
}
async function drop(ids){for(const id of ids){const key=aliases.get(id),b=blocks.get(key);aliases.delete(id);if(!b)continue;b.ids.delete(id);if(!b.ids.size)await erase(key,b);}}
async function close(){for(const [key,b]of [...blocks])await erase(key,b);if(root&&session)await root.removeEntry(session,{recursive:true}).catch(()=>{});db?.close();}
let tail=Promise.resolve();
self.onmessage=({data:m})=>{tail=tail.then(async()=>{try{let value={};if(m.type==='init')await init(m);else if(m.type==='put')value=await put(m.id,m.pixels);else if(m.type==='get')value=await get(m.id);else if(m.type==='get-many'){if(m.ids.length>8)throw Error('History read batch too large');value={tiles:await Promise.all(m.ids.map(get))};}else if(m.type==='drop')await drop(m.ids);else if(m.type==='flush')await trim(0);else if(m.type==='close')await close();else throw Error('Unknown history request');self.postMessage({request:m.request,...value,metrics:stats()},value.pixels?[value.pixels.buffer]:value.tiles?value.tiles.filter(t=>t.pixels).map(t=>t.pixels.buffer):[]);}catch(error){self.postMessage({request:m.request,error:String(error),metrics:stats()});}});};
