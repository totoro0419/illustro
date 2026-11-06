/** The Worker owns accepted raster revisions. Publication may skip display frames,
 * but every command and every save fence is evaluated in acceptance order.
 */
import {createManifest} from './model.mjs';
import {strokeDabs} from './brush-engine.mjs';
import {Ink,composite,tileBox} from './brush-raster.mjs';

let canvas, ctx, epoch=0, index=0, historyBytes=0;
let priorArchive=[],recoveryArchive=[];
let actions=[], queue=Promise.resolve(), latestEpoch=0, failed=false;
const dirty=new Map();
let navigation=false,releaseNavigation=[];
const maxHistoryBytes=192*1024*1024;

// All formal stages yield, including tile finalization/composite/readback. A
// navigation message cannot interrupt a Canvas call, so check between calls.
function workSlice(msg){
 let deadline=performance.now()+3;
 return async(force=false)=>{
  if(force||navigation||performance.now()>=deadline){
   await new Promise(resolve=>setTimeout(resolve,0));
   while(navigation&&msg.epoch===latestEpoch)await new Promise(resolve=>releaseNavigation.push(resolve));
   deadline=performance.now()+3;
  }
  return msg.epoch===latestEpoch;
 };
}
async function emitFrame(msg,stats){
 if(msg.epoch!==latestEpoch)return;
 const pictures=[],cooperate=workSlice(msg);
 for(const key of dirty.keys()){
  if(!await cooperate())return;
  const box=tileBox(key,canvas.width,canvas.height);
  pictures.push({key,box,image:ctx.getImageData(box.x,box.y,box.w,box.h)});
 }
 if(msg.epoch!==latestEpoch){return}
 self.postMessage({type:'frame',epoch,seq:msg.seq,pictures,stats},pictures.map(p=>p.image.data.buffer));
}

async function rasterInk(stroke,msg){
 const ink=new Ink(stroke,canvas.width,canvas.height);let stamps=0,deadline=performance.now()+3,maxSliceMs=0,started=performance.now(),pausedMs=0;
 const cooperate=async()=>{maxSliceMs=Math.max(maxSliceMs,performance.now()-started);await new Promise(resolve=>setTimeout(resolve,0));const at=performance.now();while(navigation&&msg.epoch===latestEpoch)await new Promise(resolve=>releaseNavigation.push(resolve));pausedMs+=performance.now()-at;started=performance.now();deadline=started+3;};
 for(const dab of strokeDabs(stroke)){
  if(++stamps>250000)throw Error('この筆のスタンプ数が上限を超えました。間隔を広げるか筆を分割してください');
  for(let i=0;i<Math.round(dab.particles);i++){
   const radians=i*2.3999632297,particle=i?{...dab,x:dab.x+Math.cos(radians)*dab.size*.42,y:dab.y+Math.sin(radians)*dab.size*.42,size:dab.size*.21}:dab;
   for(const _ of ink.stampSteps(particle)){
    if(navigation||performance.now()>=deadline)await cooperate();
    if(msg.epoch!==latestEpoch)return null;
   }
  }
 }
 const finish=workSlice(msg);
 for(const key of ink.tiles.keys()){
  if(!await finish())return null;
  ink.finishTile(key);
 }
 return {ink,stamps,maxSliceMs:Math.max(maxSliceMs,performance.now()-started),pausedMs};
}
async function applyStroke(stroke,seq,msg){
 const {width,height}=canvas;
 const raster=await rasterInk(stroke,msg);if(!raster)return null;
 const {ink,stamps,maxSliceMs,pausedMs}=raster;
 const size=[...ink.tiles.values()].reduce((sum,tile)=>sum+tile.width*tile.height*8,0);
 const retained=historyBytes-actions.slice(index).reduce((sum,entry)=>sum+entry.bytes,0);
 if(retained+size>maxHistoryBytes) throw Error('履歴のメモリ上限に達しました。作品を開き直すと履歴をリセットできます');
 const patches=[],cooperate=workSlice(msg);
 try{
  for(const [key,tile] of ink.tiles){
   if(!await cooperate())return null;
   const box=tileBox(key,width,height);
   const before=ctx.getImageData(box.x,box.y,box.w,box.h);
   const patch={key,box,before,after:null};
   patches.push(patch);
   composite(ctx,stroke,tile,box.x,box.y);
   patch.after=ctx.getImageData(box.x,box.y,box.w,box.h);
  }
 }catch(error){
  for(const {box,before} of patches)ctx.putImageData(before,box.x,box.y);
  throw error;
 }
 actions.length=index;
 actions.push({patches,bytes:size,stroke});
 historyBytes=retained+size;
 index++;
 for(const {key} of patches)dirty.set(key,seq);
 return {stamps,tiles:patches.length,historyBytes,maxSliceMs,pausedMs};
}

async function execute(msg){
 if(msg.epoch!==latestEpoch)return;
 if(msg.type==='reset'){
  epoch=msg.epoch;
  canvas=new OffscreenCanvas(msg.width,msg.height);
  ctx=canvas.getContext('2d',{willReadFrequently:true});
  actions=[];priorArchive=[];recoveryArchive=[];index=0;historyBytes=0;dirty.clear();failed=false;
  return;
 }
 if(msg.epoch!==epoch||!ctx) return;
 if(msg.type==='presented'){
  for(const [key,seq] of dirty)if(seq<=msg.seq)dirty.delete(key);
  return;
 }
 if(failed){
  if(msg.type==='save')throw Error('障害発生後の保存を停止しました');
  return;
 }
 if(msg.type==='load'){
  const image=await createImageBitmap(await (await fetch(msg.png)).blob());
  try{
   if(msg.epoch!==latestEpoch)return;
   if(image.width!==canvas.width||image.height!==canvas.height) throw Error('ネイティブ画像の寸法不一致');
   ctx.drawImage(image,0,0);priorArchive=msg.archive||[];recoveryArchive=msg.recovery||[];
  }finally{image.close()}
  return;
 }
 if(msg.type==='stroke'){
  const start=performance.now();
  const stats=await applyStroke(msg.stroke,msg.seq,msg);if(!stats)return;
  await emitFrame(msg,{...stats,workerMs:performance.now()-start});
  return;
 }
 if(msg.type==='undo'||msg.type==='redo'){
  const cooperate=workSlice(msg);
  const entry=msg.type==='undo'?(index?actions[--index]:null):(index<actions.length?actions[index++]:null);
  for(const {key,box,before,after} of entry?.patches||[]){
   if(!await cooperate())return;
   ctx.putImageData(msg.type==='undo'?before:after,box.x,box.y);dirty.set(key,msg.seq);
  }
  await emitFrame(msg);
  return;
 }
 if(msg.type==='save'){
  const start=performance.now(),blob=await canvas.convertToBlob({type:'image/png'});
  const png=new FileReaderSync().readAsDataURL(blob);
  const manifest=createManifest(msg.metadata,png,msg.revision,[...priorArchive,...actions.slice(0,index).map(a=>a.stroke)]);
  if(recoveryArchive.length)manifest.brushArchive.recovery=recoveryArchive;
  const native=new TextEncoder().encode(JSON.stringify(manifest));
  self.postMessage({type:'saved',epoch,requestId:msg.requestId,native,stats:{encodeMs:performance.now()-start,pngBytes:blob.size,nativeBytes:native.byteLength}},[native.buffer]);
 }
}

self.onmessage=({data:msg})=>{
 if(msg.type==='reset'){latestEpoch=Math.max(latestEpoch,msg.epoch);navigation=false;for(const release of releaseNavigation.splice(0))release()}
 if(msg.type==='navigation'){if(msg.epoch===latestEpoch){navigation=msg.active;if(!navigation)for(const release of releaseNavigation.splice(0))release()}return}
 if(msg.type==='presented'){if(msg.epoch===epoch)for(const [key,seq]of dirty)if(seq<=msg.seq)dirty.delete(key);return}
 queue=queue.then(async()=>{await execute(msg);await new Promise(resolve=>setTimeout(resolve,0))}).catch(error=>{
  if(msg.type!=='save')failed=true;
  self.postMessage({type:'error',epoch:msg.epoch,seq:msg.seq,requestId:msg.requestId,message:String(error?.message||error)});
 });
};
