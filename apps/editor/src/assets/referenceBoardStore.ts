/** C05 reference-board metadata is separate from artwork and Undo. */
export type BoardItem=Readonly<{
  id:string;assetId:string;group:string;x:number;y:number;width:number;height:number;
  zoom:number;panX:number;panY:number;rotation:number;pinned:boolean;hidden:boolean;
  grayscale:boolean;flipX:boolean;flipY:boolean;front:boolean;notes:string;
}>;
export type BoardSnapshot=Readonly<{version:1;documentId:string;items:readonly BoardItem[];hidden:boolean}>;
const DB='illustro-c05-reference-boards-v1',STORE='boards';
let dbPromise:Promise<IDBDatabase>|null=null;
function db(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open(DB,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'documentId'});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>{dbPromise=null;reject(request.error??Error('資料の配置保存を開けませんでした。'));};
  });
  return dbPromise;
}
/** An absent board is normal; an existing damaged board must never be silently replaced. */
export async function readBoard(documentId:string):Promise<BoardSnapshot>{
  const store=await db();
  const value=await new Promise<unknown>((resolve,reject)=>{
    const tx=store.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(documentId);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error??Error('資料の配置を読み込めませんでした。'));
  });
  return decodeBoardRecord(documentId,value);
}

/** Pure validation used by imports and regression tests, with no storage writes. */
export function decodeBoardRecord(documentId:string,value:unknown):BoardSnapshot{
  if(value===undefined)return {version:1,documentId,items:[],hidden:false};
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('保存した参考資料の情報が壊れています。元データを保護するため変更できません。');
  const raw=value as Partial<BoardSnapshot>;
  if(raw.version!==1||raw.documentId!==documentId||!Array.isArray(raw.items)||raw.items.length>80)
    throw Error('参考資料の保存形式が一致しません。元データを上書きせず保持しました。');
  const found=new Set<string>();const items:BoardItem[]=[];
  for(const item of raw.items){
    if(!item||typeof item!=='object'||typeof item.id!=='string'||!item.id||found.has(item.id)||
      typeof item.assetId!=='string'||!item.assetId||
      !Number.isFinite(item.x)||!Number.isFinite(item.y)||!Number.isFinite(item.width)||!Number.isFinite(item.height)||
      !Number.isFinite(item.zoom)||!Number.isFinite(item.rotation)||
      item.width<=0||item.height<=0||item.zoom<=0)
      throw Error('参考資料の配置の一部が壊れています。元のデータは上書きしていません。');
    if((item.group!==undefined&&typeof item.group!=='string')||(item.notes!==undefined&&typeof item.notes!=='string'))
      throw Error('参考資料の文字情報が壊れています。元のデータは上書きしていません。');
    found.add(item.id);items.push({
      id:item.id,assetId:item.assetId,group:item.group??'',x:item.x,y:item.y,
      width:Math.max(120,Math.min(1000,item.width)),height:Math.max(90,Math.min(900,item.height)),
      zoom:Math.max(.1,Math.min(16,item.zoom)),panX:Number.isFinite(item.panX)?item.panX:0,panY:Number.isFinite(item.panY)?item.panY:0,
      rotation:item.rotation,pinned:!!item.pinned,hidden:!!item.hidden,grayscale:!!item.grayscale,
      flipX:!!item.flipX,flipY:!!item.flipY,front:!!item.front,notes:item.notes??''
    });
  }
  return {version:1,documentId,items,hidden:!!raw.hidden};
}

export async function writeBoard(input:BoardSnapshot):Promise<void>{
  if(input.version!==1||input.items.length>80||!input.documentId)
    throw Error('資料の数か作品IDが正しくありません。');
  const ids=new Set<string>();
  for(const item of input.items){
    if(!item.id||ids.has(item.id)||!item.assetId||
      ![item.x,item.y,item.width,item.height,item.zoom,item.panX,item.panY,item.rotation].every(Number.isFinite)||
      item.width<=0||item.height<=0||item.zoom<=0)
      throw Error('資料の配置が正しくありません。保存前の情報を保護しました。');
    ids.add(item.id);
  }
  const store=await db();
  await new Promise<void>((resolve,reject)=>{
    const tx=store.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(input);
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??Error('資料の配置を保存できませんでした。'));
  });
  const output=await readBoard(input.documentId);
  if(output.items.length!==input.items.length||output.items.some((item,index)=>
    item.id!==input.items[index]?.id||item.assetId!==input.items[index]?.assetId))
    throw Error('資料の保存内容を確認できませんでした。');
}
/** Copy placement only: original assets remain shared and are never deleted. */
export async function copyReferenceBoard(sourceDocumentId:string,targetDocumentId:string):Promise<number>{
  if(!sourceDocumentId||!targetDocumentId||sourceDocumentId===targetDocumentId)
    throw Error('参考資料のコピー元とコピー先を確認してください。');
  const source=await readBoard(sourceDocumentId);
  // Refuse to replace an existing target even when it has no windows.
  const store=await db();
  await new Promise<void>((resolve,reject)=>{
    const tx=store.transaction(STORE,'readwrite');
    const table=tx.objectStore(STORE),lookup=table.get(targetDocumentId);
    let conflict=false;
    lookup.onsuccess=()=>{
      if(lookup.result!==undefined){conflict=true;tx.abort();return;}
      table.put({
        version:1,documentId:targetDocumentId,hidden:false,
        items:source.items.map(item=>({...item,id:crypto.randomUUID()}))
      } satisfies BoardSnapshot);
    };
    tx.oncomplete=()=>resolve();
    tx.onabort=()=>reject(conflict?Error('コピー先には既に参考資料があります。上書きしませんでした。'):
      tx.error??Error('参考資料をコピーできませんでした。'));
  });
  return source.items.length;
}
export function newBoardItem(assetId:string,position:number):BoardItem{
  return {
    id:crypto.randomUUID(),assetId,group:'',x:24+(position%4)*25,y:84+(position%5)*22,
    width:280,height:230,zoom:1,panX:0,panY:0,rotation:0,pinned:false,hidden:false,
    grayscale:false,flipX:false,flipY:false,front:false,notes:''
  };
}
