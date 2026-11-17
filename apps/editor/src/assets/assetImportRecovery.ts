/** Durable checkpoint for importing a user-selected asset pack.
 * A batch is retained until every item is known to be stored or the user
 * explicitly discards it. The manifest is never sent to a server.
 */
import type {PackManifest} from './packs';

export type ImportRecovery=Readonly<{
  version:1;
  manifest:PackManifest;
  remainingIds:readonly string[];
  resolvedIds:Readonly<Record<string,string>>;
  updatedAt:number;
}>;

const DATABASE='illustro-c05-import-recovery-v1',STORE='pending';
const MANIFEST_KEY='manifest',PROGRESS_KEY='progress';
// The large base64 image payload is written ONCE. Every later checkpoint
// stores only a few IDs to avoid cloning up to 48MB for every asset.
let connection:Promise<IDBDatabase>|null=null;

function openDb():Promise<IDBDatabase>{
  if(connection)return connection;
  connection=new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open(DATABASE,1);
    request.onupgradeneeded=()=>{
      if(!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE);
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>{connection=null;reject(request.error??Error('素材の再開記録を開けませんでした。'));};
  });
  return connection;
}
async function transaction<T>(mode:IDBTransactionMode,operate:(store:IDBObjectStore,done:(value:T)=>void)=>void):Promise<T>{
  const db=await openDb();
  return new Promise<T>((resolve,reject)=>{
    const tx=db.transaction(STORE,mode);
    let result:T|undefined,hasResult=false;
    try{
      operate(tx.objectStore(STORE),value=>{result=value;hasResult=true;});
    }catch(reason){tx.abort();reject(reason);return;}
    tx.oncomplete=()=>hasResult?resolve(result as T):reject(Error('素材の再開記録を確認できません。'));
    tx.onabort=()=>reject(tx.error??Error('素材の再開記録を保存できません。'));
  });
}
export function validateImportRecovery(input:unknown):ImportRecovery{
  if(!input||typeof input!=='object'||Array.isArray(input))
    throw Error('素材の再開記録が壊れています。勝手に上書きしません。');
  const raw=input as Record<string,unknown>,manifest=raw.manifest as PackManifest|undefined;
  if(raw.version!==1||!manifest||manifest.schema!=='illustro.asset-pack'||
    manifest.version!==1||!Array.isArray(manifest.items)||manifest.items.length>80||
    !Array.isArray(raw.remainingIds)||!raw.remainingIds.every(id=>typeof id==='string')||
    !raw.resolvedIds||typeof raw.resolvedIds!=='object'||Array.isArray(raw.resolvedIds))
    throw Error('素材の再開記録が壊れています。勝手に上書きしません。');
  const ids=manifest.items.map(item=>item.id);
  if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length||
    new Set(raw.remainingIds).size!==raw.remainingIds.length||
    (raw.remainingIds as string[]).some(id=>!ids.includes(id)))
    throw Error('素材の再開対象が正しくありません。');
  const mappings=raw.resolvedIds as Record<string,unknown>;
  if(Object.keys(mappings).some(id=>!ids.includes(id)||typeof mappings[id]!=='string'||!mappings[id])||
    new Set(Object.values(mappings)).size!==Object.keys(mappings).length)
    throw Error('素材の識別情報が正しくありません。');
  return {
    version:1,manifest,remainingIds:[...(raw.remainingIds as string[])],
    resolvedIds:Object.assign(Object.create(null),mappings) as Record<string,string>,
    updatedAt:typeof raw.updatedAt==='number'&&Number.isFinite(raw.updatedAt)?raw.updatedAt:0,
  };
}
export function initialImportRecovery(manifest:PackManifest):ImportRecovery{
  return validateImportRecovery({
    version:1,manifest,remainingIds:manifest.items.map(item=>item.id),
    resolvedIds:Object.create(null),updatedAt:Date.now(),
  });
}
export function updateImportRecovery(
  recovery:ImportRecovery,
  change:Readonly<{resolvedIds?:Readonly<Record<string,string>>;importedId?:string}>
):ImportRecovery{
  const mappings=Object.assign(Object.create(null),recovery.resolvedIds,change.resolvedIds) as Record<string,string>;
  return validateImportRecovery({
    ...recovery,resolvedIds:mappings,
    remainingIds:change.importedId?recovery.remainingIds.filter(id=>id!==change.importedId):recovery.remainingIds,
    updatedAt:Date.now(),
  });
}
export async function readImportRecovery():Promise<ImportRecovery|null>{
  const value=await transaction<Readonly<{manifest:unknown;progress:unknown}>>('readonly',(store,done)=>{
    const file=store.get(MANIFEST_KEY),progress=store.get(PROGRESS_KEY);
    let fileDone=false,progressDone=false;
    const settle=()=>{if(fileDone&&progressDone)done({manifest:file.result,progress:progress.result});};
    file.onsuccess=()=>{fileDone=true;settle();};
    progress.onsuccess=()=>{progressDone=true;settle();};
  });
  if(value.manifest===undefined&&value.progress===undefined)return null;
  if(!value.progress||typeof value.progress!=='object'||!value.manifest)
    throw Error('素材の再開記録が不完全です。上書きしません。');
  return validateImportRecovery({
    ...(value.progress as object),manifest:value.manifest
  });
}
/** On first import includeManifest=true. During progress only write small IDs. */
export async function writeImportRecovery(recovery:ImportRecovery,includeManifest=false):Promise<void>{
  const clean=validateImportRecovery(recovery);
  await transaction<void>('readwrite',(store,done)=>{
    if(includeManifest)store.put(clean.manifest,MANIFEST_KEY);
    store.put({
      version:1,remainingIds:clean.remainingIds,resolvedIds:clean.resolvedIds,
      updatedAt:clean.updatedAt
    },PROGRESS_KEY);
    done();
  });
}
export async function clearImportRecovery():Promise<void>{
  await transaction<void>('readwrite',(store,done)=>{
    store.delete(MANIFEST_KEY);store.delete(PROGRESS_KEY);done();
  });
}
