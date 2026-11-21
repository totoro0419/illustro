type LinkedHandle=Readonly<{getFile:()=>Promise<File>}>;
type PickerWindow=Window&{showOpenFilePicker?:(options:unknown)=>Promise<LinkedHandle[]>};
const handles=new Map<string,LinkedHandle>();
/** Updating the same source keeps its key. Manually selecting another file
 * MUST rotate the key: a stale saved browser handle must never turn a future
 * "check for changes" back into the previously selected file. */
export function nextLinkedImageFileKey(
 action:'link'|'reselect'|'update',previous:string|null,newKey:()=>string
):string{
 if(action==='update'){
  if(!previous)throw Error('更新する元画像の参照先がありません。');
  return previous;
 }
 const key=newKey();
 if(!key||key===previous)throw Error('元画像の新しい参照先を作れませんでした。');
 return key;
}
let storage:Promise<IDBDatabase>|undefined;
function database(){
  storage??=new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open('illustro-linked-images-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('handles');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error??Error('画像の参照先を保存できません。'));
  });
  return storage;
}
export async function chooseLinkedImage(){
  const picker=(window as PickerWindow).showOpenFilePicker;
  if(picker){
    const [handle]=await picker.call(window,{multiple:false,types:[{description:'画像',accept:{'image/png':['.png'],'image/jpeg':['.jpg','.jpeg'],'image/webp':['.webp']}}]});
    if(!handle)throw Error('画像を選んでください。');
    return {file:await handle.getFile(),handle};
  }
  const file=await new Promise<File>((resolve,reject)=>{
    const input=document.createElement('input');input.type='file';
    input.accept='.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';
    input.onchange=()=>input.files?.[0]?resolve(input.files[0]):reject(Error('画像の選択を取り消しました。'));
    input.oncancel=()=>reject(Error('画像の選択を取り消しました。'));
    input.click();
  });
  return {file,handle:null};
}
export async function rememberImageHandle(key:string,handle:LinkedHandle):Promise<boolean>{
  handles.set(key,handle);
  try{
    const db=await database();
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction('handles','readwrite');
      tx.objectStore('handles').put(handle,key);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);
    });
    return true;
  }catch{
    // The live tab may work, but reloading will require re-selection.
    return false;
  }
}
// Call only after the updated artwork transaction commits. A manual reselect
// uses a distinct file key, so failure to clean an orphan never restores the
// previously selected image on the new layer.
export async function forgetImageHandle(key:string):Promise<void>{
  const previous=handles.get(key);handles.delete(key);
  try{
    const db=await database();
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction('handles','readwrite');
      tx.objectStore('handles').delete(key);
      tx.oncomplete=()=>resolve();
      tx.onabort=()=>reject(tx.error??Error('元画像の参照情報を解除できません。'));
      tx.onerror=()=>reject(tx.error??Error('元画像の参照情報を解除できません。'));
    });
  }catch(error){
    if(previous)handles.set(key,previous);
    throw new Error('以前のファイル参照を解除できません。再選択をやり直してください。',{cause:error});
  }
}
export async function readLinkedFile(key:string){
  let handle=handles.get(key);
  if(!handle)try{
    const db=await database();
    handle=await new Promise<LinkedHandle|undefined>((resolve,reject)=>{
      const tx=db.transaction('handles','readonly'),request=tx.objectStore('handles').get(key);
      request.onsuccess=()=>resolve(request.result as LinkedHandle|undefined);
      request.onerror=()=>reject(request.error);
    });
  }catch{/* The user can identify the source again. */}
  if(!handle)throw Error('元画像の自動更新はこの端末で利用できません。「元ファイルを選び直す」から手動で更新してください。');
  try{return await handle.getFile();}
  catch{throw Error('元ファイルを開けませんでした。保存済みの見た目は残っています。元ファイルを選び直してください。');}
}
export async function decodeLinkedImage(file:File){
  if(file.size<1||file.size>64*1024*1024)throw Error('画像は64MB以下にしてください。');
  const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()));
  const digest=Array.from(hash,byte=>byte.toString(16).padStart(2,'0')).join('');
  const bitmap=await createImageBitmap(file);
  return {name:file.name.slice(0,240)||'参照画像',digest,bitmap};
}
export function placedImage(canvasWidth:number,canvasHeight:number,bitmap:ImageBitmap|ImageData,placement:{x:number;y:number;width:number;height:number}){
  const canvas=new OffscreenCanvas(canvasWidth,canvasHeight),ctx=canvas.getContext('2d');
  if(!ctx)throw Error('配置用の画像を読み込めません。');
  const {x,y,width,height}=placement;
  if(bitmap instanceof ImageData){
    if(bitmap.width===width&&bitmap.height===height)ctx.putImageData(bitmap,x,y);
    else{
      const original=new OffscreenCanvas(bitmap.width,bitmap.height);
      original.getContext('2d')?.putImageData(bitmap,0,0);
      ctx.drawImage(original,x,y,width,height);
    }
  }else ctx.drawImage(bitmap,x,y,width,height);
  return new Uint8Array(ctx.getImageData(0,0,canvasWidth,canvasHeight).data);
}
