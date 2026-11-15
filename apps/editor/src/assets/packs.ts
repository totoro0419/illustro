/**
 * C05 offline asset-pack exchange. JSON contains only binary bytes and
 * declarative metadata, never executable scripts, styles or remote URLs.
 */
import {type AssetKind,ASSET_KINDS,type AssetInfo,getAsset,addAsset} from './library';
export type PackManifest=Readonly<{
  schema:'illustro.asset-pack';version:1;createdAt:number;items:readonly PackItem[];
}>;
type PackItem=Readonly<{
  id:string;kind:AssetKind;name:string;folder:string;tags:readonly string[];
  license:string;origin:string;notes:string;mime:string;bytes:number;dataBase64:string;
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
export async function exportAssetPack(ids:readonly string[]):Promise<Blob>{
  if(ids.length>80||new Set(ids).size!==ids.length)throw Error('素材の指定が重複しているか多すぎます。');
  let total=0;const items:PackItem[]=[];
  for(const id of ids){
    const entry=await getAsset(id);
    if(!entry||entry.deleted)throw Error('選んだ素材のうち見つからないものがあります。');
    total+=entry.bytes;
    if(total>PACK_LIMIT)throw Error('一度に書き出す素材は48MBまでです。数を減らしてください。');
    const bytes=new Uint8Array(await entry.data.arrayBuffer());
    items.push({
      id:entry.id,kind:entry.kind,name:entry.name,folder:entry.folder,tags:entry.tags,
      license:entry.license,origin:entry.origin,notes:entry.notes,mime:entry.mime,
      bytes:bytes.byteLength,dataBase64:encode(bytes)
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
      typeof o.mime!=='string'||o.mime.length>180)throw Error('素材パックの内容が正しくありません。');
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
      mime:o.mime,bytes:o.bytes,dataBase64:data
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
export async function importAssetPack(manifest:PackManifest,options?:Readonly<{onItem?:(index:number,total:number)=>void}>)
  :Promise<{imported:AssetInfo[];renamedIds:Readonly<Record<string,string>>;failures:readonly string[]}>{
  // Validate again at application boundary; imported content never runs as code.
  const input=parse(manifest),imported:AssetInfo[]=[],failures:string[]=[];
  const renamedIds:Record<string,string>={};
  for(const [index,item] of input.items.entries()){
    options?.onItem?.(index+1,input.items.length);
    try{
      const payload=decode(item.dataBase64);
      if(payload.byteLength!==item.bytes)throw Error('素材の中身が欠けています。');
      const conflict=!!(await getAsset(item.id));
      const id=conflict?crypto.randomUUID():item.id;
      // Create a new identity on conflict; never mutate existing saved work.
      const result=await addAsset({
        id,kind:item.kind,name:item.name,data:new Blob([payload.buffer as ArrayBuffer],{type:item.mime}),
        folder:item.folder,tags:item.tags,license:item.license,origin:item.origin,notes:item.notes
      });
      renamedIds[item.id]=result.id;imported.push(result);
    }catch(error){failures.push(item.name+': '+(error instanceof Error?error.message:String(error)));}
  }
  return {imported,renamedIds,failures};
}
