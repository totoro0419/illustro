/** Durable local records: IDB transaction completion and SHA-256 verification
 * are prerequisites to a successful protection indicator. Named snapshots are
 * pinned; autosave rotation never deletes user-created snapshots.
 */
const DB_NAME='illustro.c03.recovery.v1',STORE='records';
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
export const RECOVERY_VERSION=1;
function openDB(){
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined'){reject(Error('IndexedDB unavailable'));return}
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{
   const db=req.result;
   if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'key'});
  };
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('IndexedDB open failed'));
  req.onblocked=()=>reject(Error('IndexedDB is blocked by another tab'));
 });
}
async function transact(mode,perform){
 const db=await openDB();
 try{
  return await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
   let result,failed=false;
   const fail=error=>{failed=true;try{tx.abort()}catch{}reject(error)};
   try{result=perform(store,tx,fail)}catch(e){fail(e);return}
   tx.oncomplete=()=>{if(!failed)resolve(typeof result==='function'?result():result)};
   tx.onerror=()=>reject(tx.error||Error('IndexedDB transaction failed'));
   tx.onabort=()=>reject(tx.error||Error('IndexedDB transaction aborted'));
  });
 }finally{db.close()}
}
const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('IndexedDB request failed'))});
function hex(buffer){return [...new Uint8Array(buffer)].map(n=>n.toString(16).padStart(2,'0')).join('')}
export async function digestBytes(bytes){
 if(!globalThis.crypto?.subtle)throw Error('SHA-256 unavailable');
 return hex(await crypto.subtle.digest('SHA-256',bytes));
}
function asBytes(content){
 if(typeof content==='string')return encoder.encode(content);
 if(content instanceof Uint8Array)return new Uint8Array(content);
 if(content instanceof ArrayBuffer)return new Uint8Array(content);
 throw TypeError('Native content must be UTF-8 or bytes');
}
export async function protectDocument({sessionId,revision,content,name='無題',kind='auto',snapshotName='',note=''}) {
 if(typeof sessionId!=='string'||!sessionId||!Number.isSafeInteger(revision)||revision<0)throw Error('Invalid recovery identity');
 if(!['auto','snapshot'].includes(kind))throw Error('Unknown protection kind');
 const bytes=asBytes(content),digest=await digestBytes(bytes),writtenAt=Date.now();
 const record={key:kind==='auto'?'auto:'+sessionId+':latest':'snapshot:'+sessionId+':'+writtenAt+':'+crypto.randomUUID(),
  kind,sessionId,revision,name,snapshotName,note,digest,writtenAt,bytes,version:RECOVERY_VERSION};
 if(kind==='auto'){
  // Never let a half-written replacement destroy the last valid revision.
  // Rotation and admission of the new record occur in one IDB transaction.
  await transact('readwrite',(store,tx,fail)=>{
   const last=store.get('auto:'+sessionId+':latest');
   last.onsuccess=()=>{
    if(last.result)store.put({...last.result,key:'auto:'+sessionId+':previous'});
    store.put(record);
   };
   last.onerror=()=>fail(last.error||Error('Recovery rotation failed'));
  });
 }else await transact('readwrite',store=>{store.put(record)});
 const admitted=await readProtected(record.key);
 if(admitted.digest!==record.digest||admitted.revision!==revision)throw Error('Protection verification mismatch');
 return {key:record.key,kind:record.kind,revision:record.revision,name:record.name,writtenAt:record.writtenAt,size:bytes.byteLength,digest};
}
export async function listProtected(){
 const records=await transact('readonly',store=>request(store.getAll()));
 return records.map(({key,kind,revision,name,snapshotName,note,digest,writtenAt,bytes,sessionId})=>({
  key,kind,revision,name,snapshotName,note,digest,writtenAt,sessionId,size:bytes?.byteLength||0
 })).sort((a,b)=>b.writtenAt-a.writtenAt);
}
export async function readProtected(key){
 const record=await transact('readonly',store=>request(store.get(key)));
 if(!record)throw Error('Protected revision not found');
 if(record.version!==RECOVERY_VERSION||!(record.bytes instanceof Uint8Array))throw Error('Invalid protected revision');
 const digest=await digestBytes(record.bytes);
 if(digest!==record.digest)throw Error('Protected revision checksum mismatch');
 const content=decoder.decode(record.bytes);
 const raw=JSON.parse(content);
 if(!raw||raw.formatVersion!==3&&raw.formatVersion!==2&&raw.formatVersion!==1)throw Error('Unexpected Native manifest version');
 return {...record,content};
}
export async function deleteProtected(key,{allowSnapshot=false}={}){
 if(!allowSnapshot&&key.startsWith('snapshot:'))throw Error('Snapshot deletion must be explicit');
 await transact('readwrite',store=>store.delete(key));
}
