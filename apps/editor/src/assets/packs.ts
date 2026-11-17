/**
 * C05 offline asset-pack exchange. JSON contains only binary bytes and
 * declarative metadata, never executable scripts, styles or remote URLs.
 */
import {type AssetKind,ASSET_KINDS,type AssetInfo,getAsset,addAsset,addAssetsAtomically,listAssets} from './library';
export type PackManifest=Readonly<{
  schema:'illustro.asset-pack';version:1;createdAt:number;items:readonly PackItem[];
}>;
type PackItem=Readonly<{
  id:string;kind:AssetKind;name:string;folder:string;tags:readonly string[];
  license:string;origin:string;notes:string;mime:string;bytes:number;dataBase64:string;
  version:number;parentId?:string;
}>;
export type PackPreview=Readonly<{
  items:readonly Readonly<{name:string;kind:AssetKind;bytes:number;id:string;conflict:boolean}>[];
  totalBytes:number;conflicts:number;
}>;
const PACK_LIMIT=48*1024*1024,ITEM_LIMIT=32*1024*1024;
function encode(bytes:Uint8Array):string{
  let text='';
  for(let p=0;p<bytes.byteLength;p+=8192)text+=String.fromCharCode(...bytes.subarray(p,p+8192));
  return btoa(text);
}
function decode(value:string):Uint8Array{
  const text=atob(value),out=new Uint8Array(text.length);
  for(let i=0;i<text.length;i++)out[i]=text.charCodeAt(i);
  return out;
}
export async function exportAssetPack(
  ids:readonly string[],options?:Readonly<{includeAncestors?:boolean}>
):Promise<Blob>{
  if(ids.length>80||new Set(ids).size!==ids.length)throw Error('素材の指定が重複しているか多すぎます。');
  // User-initiated sharing includes old versions; artwork attachments keep their existing behavior.
  const queue=[...ids],seen=new Set(ids);
  let total=0;const items:PackItem[]=[];
  for(let index=0;index<queue.length;index++){
    if(queue.length>80)throw Error('旧版を含めると80件を超えます。書き出し対象を減らしてください。');
    const entry=await getAsset(queue[index]!);
    if(!entry||(!options?.includeAncestors&&entry.deleted))
      throw Error('選んだ素材または旧版が見つかりません。');
    total+=entry.bytes;
    if(total>PACK_LIMIT)throw Error('旧版を含む素材は一度に48MBまでです。数を減らしてください。');
    if(options?.includeAncestors&&entry.parentId&&!seen.has(entry.parentId)){
      seen.add(entry.parentId);queue.push(entry.parentId);
    }
    const bytes=new Uint8Array(await entry.data.arrayBuffer());
    items.push({
      id:entry.id,kind:entry.kind,name:entry.name,folder:entry.folder,tags:entry.tags,
      license:entry.license,origin:entry.origin,notes:entry.notes,mime:entry.mime,
      bytes:bytes.byteLength,dataBase64:encode(bytes),
      version:entry.version,...(entry.parentId?{parentId:entry.parentId}:{})
    });
  }
  const manifest:PackManifest={schema:'illustro.asset-pack',version:1,createdAt:Date.now(),items};
  return new Blob([JSON.stringify(manifest)],{type:'application/json'});
}
function parse(input:unknown):PackManifest{
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('素材パックの形式が正しくありません。');
  const raw=input as Record<string,unknown>;
  if(raw.schema!=='illustro.asset-pack'||raw.version!==1||!Array.isArray(raw.items)||raw.items.length>80)
    throw Error('対応していない素材パックです。');
  const ids=new Set<string>(),items:PackItem[]=[];let total=0;
  for(const value of raw.items){
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('素材の情報が壊れています。');
    const o=value as Record<string,unknown>;
    if(typeof o.id!=='string'||o.id.length>120||!o.id||ids.has(o.id)||
      typeof o.name!=='string'||!o.name.trim()||o.name.length>120||
      !ASSET_KINDS.includes(o.kind as AssetKind)||typeof o.bytes!=='number'||!Number.isInteger(o.bytes)||
      o.bytes<1||o.bytes>ITEM_LIMIT||typeof o.dataBase64!=='string'||
      typeof o.mime!=='string'||o.mime.length>180||
      (o.version!==undefined&&(!Number.isSafeInteger(o.version)||(o.version as number)<1))||
      (o.parentId!==undefined&&(typeof o.parentId!=='string'||!o.parentId||
        o.parentId.length>120||o.parentId===o.id)))
      throw Error('素材パックの内容が正しくありません。');
    ids.add(o.id);total+=o.bytes;
    if(total>PACK_LIMIT)throw Error('素材パックの合計容量が48MBを超えています。');
    const data=o.dataBase64;
    if(data.length>Math.ceil(o.bytes/3)*4+8||data.length<Math.ceil(o.bytes/3)*4)
      throw Error('素材データの長さが正しくありません。');
    if(typeof o.folder!=='string'||!Array.isArray(o.tags)||!o.tags.every(x=>typeof x==='string')||
       typeof o.license!=='string'||typeof o.origin!=='string'||typeof o.notes!=='string')
      throw Error('素材の名前・分類情報が正しくありません。');
    items.push({
      id:o.id,name:o.name,kind:o.kind as AssetKind,folder:o.folder.slice(0,80),
      tags:o.tags.slice(0,16).map(x=>(x as string).slice(0,32)),
      license:o.license.slice(0,200),origin:o.origin.slice(0,600),notes:o.notes.slice(0,1200),
      mime:o.mime,bytes:o.bytes,dataBase64:data,
      version:typeof o.version==='number'?o.version:1,
      ...(typeof o.parentId==='string'?{parentId:o.parentId}:{})
    });
  }
  return {schema:'illustro.asset-pack',version:1,createdAt:typeof raw.createdAt==='number'?raw.createdAt:0,items};
}
export async function readAssetPack(file:Blob):Promise<PackManifest>{
  if(file.size>70*1024*1024)throw Error('素材パックの容量が大きすぎます。');
  try{return parse(JSON.parse(await file.text()));}
  catch(error){throw error instanceof SyntaxError?Error('素材パックのJSONを読み取れませんでした。'):error;}
}
export async function previewAssetPack(manifest:PackManifest):Promise<PackPreview>{
  const rows=[],total=manifest.items.reduce((sum,item)=>sum+item.bytes,0);
  let conflicts=0;
  for(const item of manifest.items){
    const conflict=!!(await getAsset(item.id));
    if(conflict)conflicts++;
    rows.push({name:item.name,kind:item.kind,bytes:item.bytes,id:item.id,conflict});
  }
  return {items:rows,totalBytes:total,conflicts};
}
export type PackImportResult=Readonly<{
  imported:AssetInfo[];
  renamedIds:Readonly<Record<string,string>>;
  resolvedIds:Readonly<Record<string,string>>;
  failures:readonly string[];
  failedIds:readonly string[];
  unresolvedParents:readonly string[];
}>;
export type PackImportOptions=Readonly<{
  onItem?:(index:number,total:number)=>void;
  onlyIds?:readonly string[];
  resolvedIds?:Readonly<Record<string,string>>;
  /** Save the complete ID allocation BEFORE writing any item, for crash-safe retry. */
  onResolvedIds?:(mapping:Readonly<Record<string,string>>)=>Promise<void>|void;
  /** The item is durable: record success before the next item starts. */
  onItemSucceeded?:(originalId:string)=>Promise<void>|void;
  /** Verify and reuse a previously imported ID when resuming a saved batch. */
  resumeExisting?:boolean;
  /** Required for a reference-board bundle: all assets commit or none do. */
  atomic?:boolean;
}>;
export async function importAssetPack(
  manifest:PackManifest,options?:PackImportOptions
):Promise<PackImportResult>{
  // Validate again at the application boundary; old v1 packs without version fields still work.
  const input=parse(manifest),imported:AssetInfo[]=[],failures:string[]=[],failedIds:string[]=[];
  // IDs come from pack files and may match built-in object property names.
  const renamedIds:Record<string,string>=Object.create(null);
  const selected=options?.onlyIds?new Set(options.onlyIds):null;
  if(selected&&[...selected].some(id=>!input.items.some(item=>item.id===id)))
    throw Error('再試行する素材がパック内に見つかりません。');
  const occupied=new Set((await listAssets(true)).map(item=>item.id));
  const resolvedIds:Record<string,string>=Object.assign(Object.create(null),options?.resolvedIds);
  const usedTargets=new Set(Object.values(resolvedIds));
  for(const item of input.items){
    if(resolvedIds[item.id])continue;
    let target=item.id;
    while(occupied.has(target)||usedTargets.has(target))target=crypto.randomUUID();
    resolvedIds[item.id]=target;usedTargets.add(target);
  }
  // The caller's recovery record must contain the whole mapping before the
  // first addAsset. Otherwise a page close could create duplicate imports.
  await options?.onResolvedIds?.(resolvedIds);
  const pending=input.items.filter(item=>!selected||selected.has(item.id));
  if(options?.atomic){
    if(selected)throw Error('一括保護する素材の一部だけを選ぶことはできません。');
    // Decode and validate ALL payloads before opening the single transaction.
    // Any invalid bytes or unavailable storage prevents partial additions.
    const staged:Parameters<typeof addAssetsAtomically>[0][number][]=[];
    for(const [index,item] of pending.entries()){
      options.onItem?.(index+1,pending.length);
      const payload=decode(item.dataBase64);
      if(payload.byteLength!==item.bytes)throw Error('素材「'+item.name+'」の中身が欠けています。');
      const parentId=item.parentId?(resolvedIds[item.parentId]??item.parentId):undefined;
      staged.push({
        id:resolvedIds[item.id]!,kind:item.kind,name:item.name,
        data:new Blob([payload.buffer as ArrayBuffer],{type:item.mime}),
        folder:item.folder,tags:item.tags,license:item.license,
        origin:item.origin,notes:item.notes,version:item.version,
        ...(parentId?{parentId}:{})
      });
    }
    const entries=await addAssetsAtomically(staged);
    const unresolvedParents:string[]=[];
    for(const entry of entries){
      renamedIds[pending.find(item=>resolvedIds[item.id]===entry.id)!.id]=entry.id;
      if(entry.parentId&&!entries.some(item=>item.id===entry.parentId)&&!(await getAsset(entry.parentId)))
        unresolvedParents.push(entry.name);
    }
    return {imported:entries,renamedIds,resolvedIds,failures:[],failedIds:[],unresolvedParents};
  }
  for(const [index,item] of pending.entries()){
    options?.onItem?.(index+1,pending.length);
    let result:AssetInfo|null=null;
    try{
      const payload=decode(item.dataBase64);
      if(payload.byteLength!==item.bytes)throw Error('素材の中身が欠けています。');
      const id=resolvedIds[item.id]!;
      // Every parent in the same pack uses its mapped identity.
      const parentId=item.parentId?(resolvedIds[item.parentId]??item.parentId):undefined;
      const existing=options?.resumeExisting?await getAsset(id):null;
      if(existing){
        // A crash can happen after the blob commit but before the checkpoint.
        // Accept such an item ONLY after exact metadata and binary comparison.
        const compatible=!existing.deleted&&existing.kind===item.kind&&
          existing.name===item.name.trim().slice(0,100)&&existing.version===item.version&&
          existing.parentId===parentId&&existing.mime===item.mime.toLowerCase()&&
          existing.bytes===item.bytes;
        let equal=compatible;
        for(let start=0;equal&&start<payload.byteLength;start+=1048576){
          const end=Math.min(payload.byteLength,start+1048576);
          const stored=new Uint8Array(await existing.data.slice(start,end).arrayBuffer());
          if(stored.length!==end-start)equal=false;
          else for(let offset=0;offset<stored.length;offset++){
            if(stored[offset]!==payload[start+offset]){equal=false;break;}
          }
        }
        if(!equal)throw Error('再開前に保存された素材の内容が一致しません。上書きしていません。');
        result=existing;
      }else{
        result=await addAsset({
          id,kind:item.kind,name:item.name,data:new Blob([payload.buffer as ArrayBuffer],{type:item.mime}),
          folder:item.folder,tags:item.tags,license:item.license,origin:item.origin,notes:item.notes,
          version:item.version,...(parentId?{parentId}:{})
        });
      }
    }catch(error){
      failedIds.push(item.id);
      failures.push(item.name+': '+(error instanceof Error?error.message:String(error)));
      continue;
    }
    // This callback is deliberately outside the catch. A failed progress
    // checkpoint must stop importing rather than masquerade as a bad asset.
    renamedIds[item.id]=result.id;
    imported.push(result);
    await options?.onItemSucceeded?.(item.id);
  }
  const unresolvedParents:string[]=[];
  for(const entry of imported){
    if(entry.parentId&&!(await getAsset(entry.parentId)))
      unresolvedParents.push(entry.name);
  }
  return {imported,renamedIds,resolvedIds,failures,failedIds,unresolvedParents};
}
