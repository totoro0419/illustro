/**
 * C05 personal offline asset store. It never writes raster artwork or history.
 * Data are content blobs in IndexedDB; metadata edits preserve immutable identity.
 */
export const ASSET_KINDS=['brush','tip','paper','texture','pattern','gradient','palette','macro','workspace','reference','shape'] as const;
export type AssetKind=(typeof ASSET_KINDS)[number];
export const ASSET_LABELS:Readonly<Record<AssetKind,string>>={
  brush:'ブラシ',tip:'ブラシ先端',paper:'紙',texture:'質感',pattern:'模様',
  gradient:'グラデーション',palette:'色セット',macro:'自動操作',workspace:'作業場',
  reference:'参考画像',shape:'図形'
};
export type AssetEntry=Readonly<{
  id:string;kind:AssetKind;name:string;folder:string;tags:readonly string[];
  favorite:boolean;hidden:boolean;deleted:boolean;
  version:number;parentId?:string;createdAt:number;updatedAt:number;lastUsedAt:number|null;
  mime:string;bytes:number;license:string;origin:string;notes:string;
  data:Blob;
}>;
export type AssetInfo=Omit<AssetEntry,'data'>;
const STORE='assets',DB='illustro-c05-assets-v1',MAX_SINGLE=32*1024*1024;
let databasePromise:Promise<IDBDatabase>|null=null;
function database():Promise<IDBDatabase>{
  if(databasePromise)return databasePromise;
  databasePromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>{databasePromise=null;reject(request.error??Error('素材庫を開けませんでした。'));};
  });
  return databasePromise;
}
async function transact<T>(mode:IDBTransactionMode,operate:(store:IDBObjectStore,done:(v:T)=>void)=>void):Promise<T>{
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
    let result:T|undefined,done=false,reason:Error|null=null;
    const finish=(v:T)=>{result=v;done=true;};
    try{operate(store,finish);}catch(error){reason=error instanceof Error?error:Error(String(error));tx.abort();}
    tx.oncomplete=()=>{if(done)resolve(result as T);else reject(Error('素材庫の処理が完了しませんでした。'));};
    tx.onabort=()=>reject(reason??tx.error??Error('素材庫への保存が中断されました。'));
    tx.onerror=()=>{ /* onabort receives the final failure */ };
  });
}
const id=()=>crypto.randomUUID();
const clean=(v:string,max=100)=>v.trim().slice(0,max);
const normalTags=(values:readonly string[])=>[...new Set(values.map(x=>clean(x,32)).filter(Boolean))].slice(0,16);
export function assetMetadata(entry:AssetEntry):AssetInfo{
  const {data,...metadata}=entry;return metadata;
}
export async function listAssets(includeDeleted=false):Promise<AssetInfo[]>{
  const results=await transact<AssetEntry[]>('readonly',(store,done)=>{
    const values:AssetEntry[]=[];const req=store.openCursor();
    req.onsuccess=()=>{const cursor=req.result;if(cursor){values.push(cursor.value as AssetEntry);cursor.continue();}else done(values);};
  });
  return results.filter(entry=>includeDeleted||!entry.deleted).map(assetMetadata);
}
export async function getAsset(assetId:string):Promise<AssetEntry|null>{
  return transact<AssetEntry|null>('readonly',(store,done)=>{
    const req=store.get(assetId);
    req.onsuccess=()=>done((req.result as AssetEntry|undefined)??null);
  });
}
export async function addAsset(spec:Readonly<{
  kind:AssetKind;name:string;data:Blob;folder?:string;tags?:readonly string[];
  license?:string;origin?:string;notes?:string;id?:string;parentId?:string;version?:number;
}>):Promise<AssetInfo>{
  if(!ASSET_KINDS.includes(spec.kind)||!spec.name.trim())throw Error('素材の種類と名前が必要です。');
  if(spec.data.size<1||spec.data.size>MAX_SINGLE)throw Error('素材は1件32MB以下にしてください。');
  const name=clean(spec.name);if(!name)throw Error('素材名が空です。');
  const now=Date.now(),key=spec.id??id();
  if(await getAsset(key))throw Error('同じIDの素材が既に存在します。新規素材として取り込んでください。');
  const entry:AssetEntry={
    id:key,kind:spec.kind,name,folder:clean(spec.folder??'',80),
    tags:normalTags(spec.tags??[]),favorite:false,hidden:false,deleted:false,
    version:spec.version&&Number.isSafeInteger(spec.version)&&spec.version>0?spec.version:1,
    ...(spec.parentId?{parentId:spec.parentId}:{}),createdAt:now,updatedAt:now,lastUsedAt:null,mime:spec.data.type||'application/octet-stream',
    bytes:spec.data.size,license:clean(spec.license??'',200),origin:clean(spec.origin??'',600),
    notes:clean(spec.notes??'',1200),data:spec.data
  };
  await transact<void>('readwrite',(store,done)=>{
    const check=store.get(key);
    check.onsuccess=()=>{if(check.result!==undefined){throw Error('同じIDの素材は上書きできません。');}
      store.add(entry);done(undefined);
    };
  });
  const check=await getAsset(key);
  if(!check||check.bytes!==entry.bytes||check.version!==entry.version)throw Error('保存した素材を読み戻せませんでした。');
  return assetMetadata(check);
}
export async function updateAsset(assetId:string,change:Readonly<{
  name?:string;folder?:string;tags?:readonly string[];favorite?:boolean;hidden?:boolean;
  license?:string;origin?:string;notes?:string;deleted?:boolean;
}>):Promise<AssetInfo>{
  await transact<void>('readwrite',(store,done)=>{
    const req=store.get(assetId);
    req.onsuccess=()=>{
      const current=req.result as AssetEntry|undefined;
      if(!current){throw Error('素材が存在しません。');}
      const next:AssetEntry={
        ...current,
        ...(change.name!==undefined?{name:clean(change.name)}:{}),
        ...(change.folder!==undefined?{folder:clean(change.folder,80)}:{}),
        ...(change.tags!==undefined?{tags:normalTags(change.tags)}:{}),
        ...(change.favorite!==undefined?{favorite:change.favorite}:{}),
        ...(change.hidden!==undefined?{hidden:change.hidden}:{}),
        ...(change.deleted!==undefined?{deleted:change.deleted}:{}),
        ...(change.license!==undefined?{license:clean(change.license,200)}:{}),
        ...(change.origin!==undefined?{origin:clean(change.origin,600)}:{}),
        ...(change.notes!==undefined?{notes:clean(change.notes,1200)}:{}),
        version:current.version+1,updatedAt:Date.now()
      };
      if(!next.name)throw Error('素材の名前は空にできません。');
      store.put(next);done(undefined);
    };
  });
  const result=await getAsset(assetId);if(!result)throw Error('素材の更新内容を読み戻せませんでした。');
  return assetMetadata(result);
}
/** New versions get a separate stable ID so old artwork dependencies stay intact. */
export async function createAssetVersion(assetId:string,data:Blob):Promise<AssetInfo>{
  const prior=await getAsset(assetId);
  if(!prior||prior.deleted)throw Error('更新元の素材が見つかりません。');
  if(data.size<1||data.size>MAX_SINGLE)throw Error('素材は1件32MB以下にしてください。');
  return addAsset({
    kind:prior.kind,name:prior.name,data,folder:prior.folder,tags:prior.tags,
    license:prior.license,origin:prior.origin,notes:prior.notes,
    parentId:prior.id,version:prior.version+1,
  });
}
export async function duplicateAsset(assetId:string):Promise<AssetInfo>{
  const prior=await getAsset(assetId);
  if(!prior||prior.deleted)throw Error('複製元の素材が見つかりません。');
  return addAsset({
    kind:prior.kind,name:prior.name+' のコピー',data:prior.data,
    folder:prior.folder,tags:prior.tags,license:prior.license,origin:prior.origin,notes:prior.notes
  });
}
export async function markAssetUsed(assetId:string):Promise<void>{
  await transact<void>('readwrite',(store,done)=>{
    const req=store.get(assetId);req.onsuccess=()=>{
      const current=req.result as AssetEntry|undefined;
      if(current&&!current.deleted)store.put({...current,lastUsedAt:Date.now()});
      done(undefined);
    };
  });
}
export async function removeAsset(assetId:string):Promise<void>{await updateAsset(assetId,{deleted:true});}
export async function restoreAsset(assetId:string):Promise<void>{await updateAsset(assetId,{deleted:false});}
