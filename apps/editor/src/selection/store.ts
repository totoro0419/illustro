/** C06 named, versioned masks. Artwork history and raster tiles stay separate. */
import {type MaskData} from './mask';
import {packSelectionMask} from './maskCodec';
export type SavedSelection=Readonly<{id:string;documentId:string;name:string;width:number;height:number;createdAt:number;modifiedAt:number;alpha:Blob;portableBytes?:number}>;
const DB='illustro-c06-selections-v1',STORE='selections',MAX_PER_WORK=32;
// Portable artwork stores all named masks plus the current selection (160 MiB max).
const MAX_PORTABLE_MASK_BYTES=160*1024*1024;
let task:Promise<IDBDatabase>|null=null;
const db=()=>task??=new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>{task=null;reject(request.error??Error('保存した選択範囲を開けませんでした。'));};
});
async function transaction<T>(mode:IDBTransactionMode,operation:(store:IDBObjectStore,done:(v:T)=>void)=>void){
  const database=await db();
  return new Promise<T>((resolve,reject)=>{
    const tx=database.transaction(STORE,mode);let result:T|undefined,ok=false;
    const done=(v:T)=>{ok=true;result=v;};
    operation(tx.objectStore(STORE),done);
    tx.oncomplete=()=>ok?resolve(result as T):reject(Error('選択範囲の保存が完了しませんでした。'));
    tx.onabort=()=>reject(tx.error??Error('選択範囲の保存に失敗しました。'));
  });
}
export async function listSavedSelections(documentId:string):Promise<SavedSelection[]>{
  const values=await transaction<SavedSelection[]>('readonly',(store,done)=>{
    const items:SavedSelection[]=[],req=store.openCursor();
    req.onsuccess=()=>{const c=req.result;if(c){const item=c.value as SavedSelection;if(item.documentId===documentId)items.push(item);c.continue();}else done(items);};
  });
  return values.filter(item=>!item.id.startsWith('current:')).sort((a,b)=>b.modifiedAt-a.modifiedAt);
}
export async function saveNamedSelection(documentId:string,name:string,mask:MaskData,currentId?:string):Promise<SavedSelection>{
  const title=name.trim().slice(0,80);
  if(!title)throw Error('選択範囲の名前を入力してください。');
  if(mask.width*mask.height!==mask.alpha.length)throw Error('選択範囲の画像サイズが正しくありません。');
  const existing=await listSavedSelections(documentId);
  const prior=currentId?existing.find(x=>x.id===currentId):null;
  if(currentId&&!prior)throw Error('上書き先の選択範囲が見つかりません。');
  if(!prior&&existing.length>=MAX_PER_WORK)throw Error('保存できる範囲は32件までです。');
  // Size is based on the lossless native encoding, not the in-memory alpha
  // arrays. A mostly empty 4000x4000 selection should not consume 16MB
  // of portable budget simply because its bitmap has that many coordinates.
  const newPortableBytes=packSelectionMask(mask.alpha).bytes.byteLength;
  let usedBytes=0;
  for(const entry of existing){
    if(entry.id===prior?.id)continue;
    // Earlier device records stored raw alpha only. Estimate their native
    // size lazily rather than assuming every pixel takes one file byte.
    const stored=entry.portableBytes??packSelectionMask(
      new Uint8Array(await entry.alpha.arrayBuffer())
    ).bytes.byteLength;
    usedBytes+=stored;
  }
  // Leave room for the active mask in addition to named selections.
  // Future edits can enlarge that active mask, so export still rechecks.
  if(usedBytes+newPortableBytes*2>MAX_PORTABLE_MASK_BYTES)
    throw Error('この作品の選択範囲が保存容量の上限です。不要な範囲を削除してください。');
  if(existing.some(x=>x.name===title&&x.id!==currentId))throw Error('同じ名前の選択範囲があります。');
  const now=Date.now();
  const entry:SavedSelection={
    id:prior?.id??crypto.randomUUID(),documentId,name:title,width:mask.width,height:mask.height,
    createdAt:prior?.createdAt??now,modifiedAt:now,portableBytes:newPortableBytes,
    alpha:new Blob([mask.alpha.slice().buffer as ArrayBuffer],{type:'application/octet-stream'})
  };
  await transaction<void>('readwrite',(store,done)=>{store.put(entry);done(undefined);});
  return entry;
}
export async function loadNamedSelection(entry:SavedSelection):Promise<MaskData>{
  const bytes=new Uint8Array(await entry.alpha.arrayBuffer());
  if(bytes.length!==entry.width*entry.height||entry.width<=0||entry.height<=0)
    throw Error('選択範囲の保存データが壊れています。');
  return {width:entry.width,height:entry.height,alpha:bytes};
}
export async function deleteNamedSelection(id:string):Promise<void>{
  await transaction<void>('readwrite',(store,done)=>{store.delete(id);done(undefined);});
}

/** The current selection is separate from named masks and never appears in menus. */
const activeId=(documentId:string)=>'current:'+documentId;
export async function storeCurrentSelection(documentId:string,mask:MaskData|null):Promise<void>{
  if(!documentId)throw Error('作品IDがありません。');
  if(!mask){
    await transaction<void>('readwrite',(store,done)=>{
      store.delete(activeId(documentId));done(undefined);
    });return;
  }
  if(mask.width<=0||mask.height<=0||mask.alpha.length!==mask.width*mask.height)
    throw Error('現在の選択の大きさが不正です。');
  const entry:SavedSelection={
    id:activeId(documentId),documentId,name:'現在の選択',width:mask.width,height:mask.height,
    createdAt:Date.now(),modifiedAt:Date.now(),
    alpha:new Blob([mask.alpha.slice().buffer as ArrayBuffer],{type:'application/octet-stream'})
  };
  await transaction<void>('readwrite',(store,done)=>{store.put(entry);done(undefined);});
}
export async function loadCurrentSelection(documentId:string):Promise<MaskData|null>{
  const record=await transaction<SavedSelection|null>('readonly',(store,done)=>{
    const request=store.get(activeId(documentId));
    request.onsuccess=()=>done((request.result as SavedSelection|undefined)??null);
  });
  if(!record)return null;
  return loadNamedSelection(record);
}
