/** The Worker owns accepted raster revisions. Publication may skip display frames,
 * but every command and every save fence is evaluated in acceptance order.
 */
import {composite,rasterize,tileBox} from './brush-raster.mjs';

let canvas, ctx, epoch=0, index=0, historyBytes=0;
let actions=[], queue=Promise.resolve(), latestRequestedSeq=0, latestEpoch=0, failed=false;
const dirty=new Map();
const maxHistoryBytes=192*1024*1024;

async function emitFrame(msg,stats){
 if(msg.epoch!==latestEpoch||msg.seq!==latestRequestedSeq) return;
 let bitmap=null, box=null;
 for(const key of dirty.keys()){
  const part=tileBox(key,canvas.width,canvas.height);
  if(!box){box=part;continue}
  const x=Math.min(part.x,box.x),y=Math.min(part.y,box.y);
  box={x,y,w:Math.max(part.x+part.w,box.x+box.w)-x,h:Math.max(part.y+part.h,box.y+box.h)-y};
 }
 if(box)bitmap=await createImageBitmap(canvas,box.x,box.y,box.w,box.h);
 if(msg.epoch!==latestEpoch||msg.seq!==latestRequestedSeq){bitmap?.close();return}
 self.postMessage({type:'frame',epoch,seq:msg.seq,box,bitmap,stats},bitmap?[bitmap]:[]);
}

function applyStroke(stroke,seq){
 const {width,height}=canvas;
 const {ink,stamps}=rasterize(stroke,width,height);
 const size=[...ink.tiles.values()].reduce((sum,tile)=>sum+tile.width*tile.height*8,0);
 const retained=historyBytes-actions.slice(index).reduce((sum,entry)=>sum+entry.bytes,0);
 if(retained+size>maxHistoryBytes) throw Error('履歴のメモリ上限に達しました。作品を開き直すと履歴をリセットできます');
 const patches=[];
 try{
  for(const [key,tile] of ink.tiles){
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
 actions.push({patches,bytes:size});
 historyBytes=retained+size;
 index++;
 for(const {key} of patches)dirty.set(key,seq);
 return {stamps,tiles:patches.length,historyBytes};
}

async function execute(msg){
 if(msg.type==='reset'){
  epoch=msg.epoch;
  canvas=new OffscreenCanvas(msg.width,msg.height);
  ctx=canvas.getContext('2d',{willReadFrequently:true});
  actions=[];index=0;historyBytes=0;dirty.clear();failed=false;
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
   if(image.width!==canvas.width||image.height!==canvas.height) throw Error('ネイティブ画像の寸法不一致');
   ctx.drawImage(image,0,0);
  }finally{image.close()}
  return;
 }
 if(msg.type==='stroke'){
  const start=performance.now();
  const stats=applyStroke(msg.stroke,msg.seq);
  await emitFrame(msg,{...stats,workerMs:performance.now()-start});
  return;
 }
 if(msg.type==='undo'||msg.type==='redo'){
  const entry=msg.type==='undo'?(index?actions[--index]:null):(index<actions.length?actions[index++]:null);
  for(const {key,box,before,after} of entry?.patches||[]){
   ctx.putImageData(msg.type==='undo'?before:after,box.x,box.y);dirty.set(key,msg.seq);
  }
  await emitFrame(msg);
  return;
 }
 if(msg.type==='save'){
  const png=await (await canvas.convertToBlob({type:'image/png'})).arrayBuffer();
  self.postMessage({type:'saved',epoch,requestId:msg.requestId,png},[png]);
 }
}

self.onmessage=({data:msg})=>{
 if(msg.type==='reset'){latestEpoch=msg.epoch;latestRequestedSeq=0}
 else if(msg.type!=='presented'&&msg.epoch===latestEpoch&&typeof msg.seq==='number')latestRequestedSeq=msg.seq;
 queue=queue.then(()=>execute(msg)).catch(error=>{
  if(msg.type!=='save')failed=true;
  self.postMessage({type:'error',epoch:msg.epoch,seq:msg.seq,requestId:msg.requestId,message:String(error?.message||error)});
 });
};
