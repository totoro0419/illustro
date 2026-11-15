/** C06 named, versioned masks. Artwork history and raster tiles stay separate. */
import {type MaskData} from './mask';
export type SavedSelection=Readonly<{id:string;documentId:string;name:string;width:number;height:number;createdAt:number;modifiedAt:number;alpha:Blob}>;
const DB='illustro-c06-selections-v1',STORE='selections',MAX_PER_WORK=32;
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
  return values.sort((a,b)=>b.modifiedAt-a.modifiedAt);
}
export async function saveNamedSelection(documentId:string,name:string,mask:MaskData,currentId?:string):Promise<SavedSelection>{
  const title=name.trim().slice(0,80);
  if(!title)throw Error('選択範囲の名前を入力してください。');
  if(mask.width*mask.height!==mask.alpha.length)throw Error('選択範囲の画像サイズが正しくありません。');
  const existing=await listSavedSelections(documentId);
  const prior=currentId?existing.find(x=>x.id===currentId):null;
  if(!prior&&existing.length>=MAX_PER_WORK)throw Error('保存できる範囲は32件までです。');
  if(existing.some(x=>x.name===title&&x.id!==currentId))throw Error('同じ名前の選択範囲があります。');
  const now=Date.now();
  const entry:SavedSelection={
    id:prior?.id??crypto.randomUUID(),documentId,name:title,width:mask.width,height:mask.height,
    createdAt:prior?.createdAt??now,modifiedAt:now,
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
