import type {CorePersistenceSnapshotV1} from '@illustro/core';
import type {SelectionRect} from '../strokeSelection';

/** Catalog publication is one IndexedDB transaction. Its journal dependencies are
 * written and read-verified first by the M05 worker. The catalog is not a scan
 * of recovery candidates: membership and the chosen revision are explicit. */
export type WorkEntry=Readonly<{
  documentId:string;writerEpochId:string;revisionId:string;protectedThrough:string;
  name:string;width:number;height:number;createdAt:number;updatedAt:number;openedAt:number;
  selectedLayerId:string;selection?:SelectionRect|null;thumbnail:Blob|null;thumbnailRevision:string|null;
  /** Layer order and styles are small metadata for regenerating thumbnails without opening an editor. */
  previewLayers?:readonly Readonly<{surfaceId:string;visible:boolean;opacity:number;baseColor?:'white'}>[];
  previous:Readonly<{writerEpochId:string;revisionId:string;protectedThrough:string}>|null;
  preserved?:unknown;
  /** C05 personal catalog state. These fields do not belong to raster history. */
  catalogFolder?:string;catalogTags?:readonly string[];favorite?:boolean;trashedAt?:number|null;
}>;
// Keep the v1 database compatible with previously published QA and app builds.
// Only the gallery result is metadata-only; individual preview Blobs load on demand.
let dbPromise:Promise<IDBDatabase>|null=null;
function db(){return dbPromise??=new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open('illustro-work-library-v1',1);
  request.onupgradeneeded=()=>{request.result.createObjectStore('works',{keyPath:'documentId'});request.result.createObjectStore('settings');};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>{dbPromise=null;reject(request.error);};
});}
export async function listWorks(includeDeleted=false):Promise<WorkEntry[]>{const database=await db();return new Promise((resolve,reject)=>{
  const result:WorkEntry[]=[],tx=database.transaction('works','readonly'),request=tx.objectStore('works').openCursor();
  request.onsuccess=()=>{
    const cursor=request.result;if(!cursor)return;
    const work=cursor.value as WorkEntry;
    // Blobs remain durable for old clients, but never cross to the gallery UI.
    if(!work.trashedAt||includeDeleted)result.push({...work,thumbnail:null,thumbnailRevision:work.thumbnail instanceof Blob?work.thumbnailRevision:null});cursor.continue();
  };
  tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error);
});}
export async function getWork(id:string):Promise<WorkEntry|null>{const database=await db();return new Promise((resolve,reject)=>{
  const tx=database.transaction('works','readonly'),request=tx.objectStore('works').get(id);
  tx.oncomplete=()=>resolve(request.result??null);tx.onabort=()=>reject(tx.error);
});}
export async function getWorkThumbnail(documentId:string,revisionId:string):Promise<Blob|null>{
  const entry=await getWork(documentId);
  return entry?.thumbnailRevision===revisionId?entry.thumbnail:null;
}
export async function storeWorkThumbnail(documentId:string,revisionId:string,image:Blob):Promise<boolean>{
  const database=await db();return new Promise((resolve,reject)=>{
    const tx=database.transaction('works','readwrite'),works=tx.objectStore('works'),request=works.get(documentId);let stored=false;
    request.onsuccess=()=>{
      const work=request.result as WorkEntry|undefined;
      if(!work||work.revisionId!==revisionId)return;
      works.put({...work,thumbnail:image,thumbnailRevision:revisionId});stored=true;
    };
    tx.oncomplete=()=>resolve(stored);tx.onabort=()=>reject(tx.error);
  });
}
export async function publishWork(entry:WorkEntry,expectedEpoch:string|null){const database=await db();await new Promise<void>((resolve,reject)=>{
  const tx=database.transaction(['works','settings'],'readwrite'),works=tx.objectStore('works'),request=works.get(entry.documentId);let reason:Error|null=null;
  request.onsuccess=()=>{const current=request.result as WorkEntry|undefined;
    if((current?.writerEpochId??null)!==expectedEpoch){reason=new Error('この作品は別の画面で更新されています。マイ作品から開き直すか、作品ファイルを保存してください。');tx.abort();return;}
    const merged:WorkEntry={
      ...entry,catalogFolder:current?.catalogFolder??entry.catalogFolder??'',
      catalogTags:current?.catalogTags??entry.catalogTags??[],
      favorite:current?.favorite??entry.favorite??false,
      trashedAt:current?.trashedAt??entry.trashedAt??null
    };
    works.put(merged);
    if(!merged.trashedAt){
      tx.objectStore('settings').delete('deleted:'+entry.documentId);
      tx.objectStore('settings').put(entry.documentId,'last-work');
    }
  };
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(reason??tx.error??new Error('作品の保存に失敗しました。'));
});const read=await getWork(entry.documentId);if(!read||read.revisionId!==entry.revisionId||read.writerEpochId!==entry.writerEpochId)throw new Error('作品の保存結果を確認できませんでした。');}
export async function updateWork(id:string,change:(entry:WorkEntry)=>WorkEntry){const database=await db();await new Promise<void>((resolve,reject)=>{
  const tx=database.transaction('works','readwrite'),store=tx.objectStore('works'),request=store.get(id);let reason:Error|null=null;
  request.onsuccess=()=>{if(!request.result){reason=new Error('作品が見つかりません。');tx.abort();return;}store.put(change(request.result));};
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(reason??tx.error);
});}
/** Ordinary deletion is reversible. Recovery bytes are kept until explicit purge. */
export async function deleteWork(id:string){
  const database=await db();
  await new Promise<void>((resolve,reject)=>{
    const tx=database.transaction(['works','settings'],'readwrite'),works=tx.objectStore('works'),
      settings=tx.objectStore('settings'),lookup=works.get(id),last=settings.get('last-work');
    let reason:Error|null=null;
    lookup.onsuccess=()=>{
      const entry=lookup.result as WorkEntry|undefined;
      if(!entry){reason=Error('作品が見つかりません。');tx.abort();return;}
      works.put({...entry,trashedAt:Date.now()});
      settings.put(true,'deleted:'+id);
    };
    last.onsuccess=()=>{if(last.result===id)settings.delete('last-work');};
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(reason??tx.error??Error('作品をゴミ箱へ移せませんでした。'));
  });
  if(!(await getWork(id))?.trashedAt)throw Error('ゴミ箱への移動を確認できませんでした。');
}
export async function restoreWork(id:string){
  const database=await db();
  await new Promise<void>((resolve,reject)=>{
    const tx=database.transaction(['works','settings'],'readwrite'),
      works=tx.objectStore('works'),settings=tx.objectStore('settings'),req=works.get(id);
    let reason:Error|null=null;
    req.onsuccess=()=>{
      const work=req.result as WorkEntry|undefined;
      if(!work){reason=Error('ゴミ箱に作品がありません。');tx.abort();return;}
      works.put({...work,trashedAt:null});
      settings.delete('deleted:'+id);
    };
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(reason??tx.error??Error('作品を復元できませんでした。'));
  });
  if((await getWork(id))?.trashedAt)throw Error('作品の復元結果を確認できませんでした。');
}
/** Permanent removal is separate and must be explicitly confirmed by the UI. */
export async function purgeWork(id:string){
  const database=await db();
  await new Promise<void>((resolve,reject)=>{
    const tx=database.transaction(['works','settings'],'readwrite'),settings=tx.objectStore('settings');
    tx.objectStore('works').delete(id);settings.put(true,'deleted:'+id);
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??Error('作品を完全に削除できませんでした。'));
  });
  if(await getWork(id))throw Error('作品を完全に削除できませんでした。');
}
export async function updateWorkCatalog(id:string,changes:Readonly<{
  folder?:string;tags?:readonly string[];favorite?:boolean;
}>){
  await updateWork(id,work=>({
    ...work,
    ...(changes.folder!==undefined?{catalogFolder:changes.folder.trim().slice(0,80)}:{}),
    ...(changes.tags!==undefined?{catalogTags:[...new Set(changes.tags.map(v=>v.trim().slice(0,32)).filter(Boolean))].slice(0,16)}:{}),
    ...(changes.favorite!==undefined?{favorite:changes.favorite}:{}),
  }));
}
/** Clear the My Works catalog without changing the database version. */
export async function resetWorkLibrary(){const database=await db();await new Promise<void>((resolve,reject)=>{
  const tx=database.transaction(['works','settings'],'readwrite');
  tx.objectStore('works').clear();tx.objectStore('settings').clear();
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);
});}
export async function lastWorkId():Promise<string|null>{const database=await db();return new Promise((resolve,reject)=>{
  const tx=database.transaction('settings','readonly'),request=tx.objectStore('settings').get('last-work');tx.oncomplete=()=>resolve(request.result??null);tx.onabort=()=>reject(tx.error);
});}
export function namedSnapshot(snapshot:CorePersistenceSnapshotV1,name:string,documentId?:string):CorePersistenceSnapshotV1{
  const clean=name.trim().slice(0,120);if(!clean)throw new Error('作品名を入力してください。');
  const now=Date.now();return {...snapshot,revisions:snapshot.revisions.map(revision=>({...revision,root:{...revision.root,name:clean,...(documentId?{documentId,createdAt:now,modifiedAt:now}:{})}}))};
}

export async function isWorkDeleted(id:string):Promise<boolean>{const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('settings'),request=tx.objectStore('settings').get('deleted:'+id);tx.oncomplete=()=>resolve(request.result===true);tx.onabort=()=>reject(tx.error);});}
