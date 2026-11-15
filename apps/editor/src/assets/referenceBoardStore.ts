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
export async function readBoard(documentId:string):Promise<BoardSnapshot>{
  const store=await db();
  const value=await new Promise<unknown>((resolve,reject)=>{
    const tx=store.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(documentId);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  if(!value||typeof value!=='object')return {version:1,documentId,items:[],hidden:false};
  const raw=value as Partial<BoardSnapshot>;
  if(raw.version!==1||raw.documentId!==documentId||!Array.isArray(raw.items))return {version:1,documentId,items:[],hidden:false};
  const found=new Set<string>();const items:BoardItem[]=[];
  for(const item of raw.items.slice(0,80)){
    if(!item||typeof item.id!=='string'||!item.id||found.has(item.id)||typeof item.assetId!=='string')continue;
    if(!Number.isFinite(item.x)||!Number.isFinite(item.y)||!Number.isFinite(item.width)||!Number.isFinite(item.height)||
      !Number.isFinite(item.zoom)||!Number.isFinite(item.rotation))continue;
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
  if(input.items.length>80||!input.documentId)throw Error('資料の数か作品IDが正しくありません。');
  const store=await db();
  await new Promise<void>((resolve,reject)=>{
    const tx=store.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(input);
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??Error('資料の配置を保存できませんでした。'));
  });
  const output=await readBoard(input.documentId);
  if(output.items.length!==input.items.length)throw Error('資料の保存内容を確認できませんでした。');
}
export function newBoardItem(assetId:string,position:number):BoardItem{
  return {
    id:crypto.randomUUID(),assetId,group:'',x:24+(position%4)*25,y:84+(position%5)*22,
    width:280,height:230,zoom:1,panX:0,panY:0,rotation:0,pinned:false,hidden:false,
    grayscale:false,flipX:false,flipY:false,front:false,notes:''
  };
}
