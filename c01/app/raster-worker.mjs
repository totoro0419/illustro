/** The Worker owns accepted raster revisions. Publication may skip display frames,
 * but every command and every save fence is evaluated in acceptance order.
 */
import {createLayeredManifest} from './layered-manifest.mjs';
import {RasterLayerStore} from './raster-layers.mjs';
import {strokeDabs} from './brush-engine.mjs';
import {Ink,composite,tileBox,tileSize} from './brush-raster.mjs';

let canvas, ctx, layers, epoch=0, index=0, historyBytes=0;
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
 // C02-equivalent fast path: a single Normal layer is already the exact
 // authoritative raster. Never roundtrip through a second Canvas composite.
 const sole=layers.layers.length===1?layers.layers[0]:null;
 const direct=sole&&sole.type==='raster'&&!sole.mask&&!sole.vectorMask&&!sole.blendIf&&!sole.clipped&&sole.opacity===1&&sole.blendMode==='normal'&&(layers.soloId===sole.id||(!layers.soloId&&sole.visible))
  ?layers.surfaces.get(sole.id)?.ctx:null;
 for(const key of dirty.keys()){
  if(!await cooperate())return;
  const box=tileBox(key,canvas.width,canvas.height);
  if(!direct)layers.renderTile(ctx,box);
  const reader=direct||ctx;
  pictures.push({key,box,image:reader.getImageData(box.x,box.y,box.w,box.h)});
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
 const inkCtx=layers.drawingContext(stroke.target);
 const size=[...ink.tiles.values()].reduce((sum,tile)=>sum+tile.width*tile.height*8,0);
 const retained=historyBytes-actions.slice(index).reduce((sum,entry)=>sum+entry.bytes,0);
 if(retained+size>maxHistoryBytes) throw Error('履歴のメモリ上限に達しました。作品を開き直すと履歴をリセットできます');
 const patches=[],cooperate=workSlice(msg);
 try{
  for(const [key,tile] of ink.tiles){
   if(!await cooperate())return null;
   const box=tileBox(key,width,height);
   const before=inkCtx.getImageData(box.x,box.y,box.w,box.h);
   const patch={key,box,before,after:null};
   patches.push(patch);
   composite(inkCtx,stroke,tile,box.x,box.y);
   layers.preserveAlpha(stroke.target,before,box);
   patch.after=inkCtx.getImageData(box.x,box.y,box.w,box.h);
  }
 }catch(error){
  for(const {box,before} of patches)inkCtx.putImageData(before,box.x,box.y);
  throw error;
 }
 actions.length=index;
 actions.push({kind:'stroke',patches,bytes:size,stroke});
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
  layers=new RasterLayerStore(msg.width,msg.height);
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
  await layers.loadLayers(msg.layers||[{id:'raster-1',type:'raster',name:'レイヤー1',lifetime:1,visible:true,opacity:1,blendMode:'normal',locks:{},png:msg.png}]);
  priorArchive=msg.archive||[];recoveryArchive=msg.recovery||[];
  if(Number.isInteger(msg.seq)){
   for(let y=0;y<canvas.height;y+=tileSize)for(let x=0;x<canvas.width;x+=tileSize)dirty.set(Math.floor(y/tileSize)*Math.ceil(canvas.width/tileSize)+Math.floor(x/tileSize),msg.seq);
   await emitFrame(msg);
  }
  return;
 }
 if(msg.type==='layers'||msg.type==='solo'){
  if(msg.type==='layers')layers.setLayers(msg.layers);
  else layers.soloId=msg.layerId??null;
  for(let y=0;y<canvas.height;y+=tileSize)
   for(let x=0;x<canvas.width;x+=tileSize)
    dirty.set(Math.floor(y/tileSize)*Math.ceil(canvas.width/tileSize)+Math.floor(x/tileSize),msg.seq);
  await emitFrame(msg);return;
 }
 if(msg.type==='stroke'){
  const start=performance.now();
  const stats=await applyStroke(msg.stroke,msg.seq,msg);if(!stats)return;
  await emitFrame(msg,{...stats,workerMs:performance.now()-start});
  return;
 }
 if(msg.type==='hit-test'){
  const found=[];
  for(const layer of [...layers.layers].reverse()){
   if(layer.type!=='raster'||!layer.visible)continue;
   const context=layers.getSurface(layer.id,layer.lifetime).ctx;
   if(context.getImageData(msg.x,msg.y,1,1).data[3]>=msg.threshold)found.push({id:layer.id,name:layer.name});
  }
  self.postMessage({type:'hit-result',epoch,requestId:msg.requestId,candidates:found});return;
 }
 if(msg.type==='layer-operation'){
  const op=msg.operation||{},affected=['duplicate','copy-snapshot-layer','merged-copy'].includes(op.kind)?[op.targetId]:op.kind==='merge'?[op.lowerId]:[];
  if(!affected.length)throw Error('Unknown layer operation');
  const capture=ids=>ids.flatMap(id=>[id,id+'::mask'].map(key=>({id:key,pixels:layers.surfaces.get(key)?.ctx.getImageData(0,0,canvas.width,canvas.height)||null})));
  const before=capture(affected);
  if(op.kind==='duplicate'){
   const source=layers.surfaces.get(op.sourceId);
   if(!source)throw Error('Duplicate source missing');
   layers.setLayers(msg.layers);
   const target=layers.surfaces.get(op.targetId);
   target.ctx.clearRect(0,0,canvas.width,canvas.height);
   target.ctx.drawImage(source.canvas,0,0);
   const sourceMask=layers.surfaces.get(op.sourceId+'::mask'),targetMask=layers.surfaces.get(op.targetId+'::mask');
   if(sourceMask&&targetMask){targetMask.ctx.clearRect(0,0,canvas.width,canvas.height);targetMask.ctx.drawImage(sourceMask.canvas,0,0);}
  }else if(op.kind==='copy-snapshot-layer'){
   const bitmap=await createImageBitmap(await(await fetch(op.png)).blob());
   try{
    if(bitmap.width!==canvas.width||bitmap.height!==canvas.height)throw Error('Snapshot layer dimensions mismatch');
    layers.setLayers(msg.layers);
    const target=layers.surfaces.get(op.targetId),rect=op.rect;
    target.ctx.clearRect(0,0,canvas.width,canvas.height);
    if(rect)target.ctx.drawImage(bitmap,...rect,...rect);
    else target.ctx.drawImage(bitmap,0,0);
   }finally{bitmap.close()}
  }else if(op.kind==='merged-copy'){
   const targetImage=new OffscreenCanvas(canvas.width,canvas.height),targetContext=targetImage.getContext('2d',{willReadFrequently:true});
   for(let y=0;y<canvas.height;y+=tileSize)for(let x=0;x<canvas.width;x+=tileSize){
    const key=Math.floor(y/tileSize)*Math.ceil(canvas.width/tileSize)+Math.floor(x/tileSize);
    layers.renderTile(targetContext,tileBox(key,canvas.width,canvas.height));
   }
   layers.setLayers(msg.layers);
   const target=layers.surfaces.get(op.targetId);
   target.ctx.clearRect(0,0,canvas.width,canvas.height);
   target.ctx.drawImage(targetImage,0,0);
  }else if(op.kind==='merge'){
   const source=layers.surfaces.get(op.upperId),target=layers.surfaces.get(op.lowerId);
   if(!source||!target)throw Error('Merge target missing');
   target.ctx.drawImage(source.canvas,0,0);
   layers.setLayers(msg.layers);
  }
  const after=capture(affected);
  const bytes=affected.length*canvas.width*canvas.height*16;
  const retained=historyBytes-actions.slice(index).reduce((sum,a)=>sum+a.bytes,0);
  if(retained+bytes>maxHistoryBytes){
   for(const saved of before)if(saved.pixels)layers.surfaces.get(saved.id)?.ctx.putImageData(saved.pixels,0,0);
   throw Error('Layer operation history memory limit');
  }
  actions.length=index;actions.push({kind:'operation',bytes,before,after});index++;historyBytes=retained+bytes;
  for(let y=0;y<canvas.height;y+=tileSize)for(let x=0;x<canvas.width;x+=tileSize)dirty.set(Math.floor(y/tileSize)*Math.ceil(canvas.width/tileSize)+Math.floor(x/tileSize),msg.seq);
  await emitFrame(msg);return;
 }
 if(msg.type==='restore-snapshot'){
  const next=new RasterLayerStore(canvas.width,canvas.height);
  await next.loadLayers(msg.layers);
  const beforeLayers=await layers.nativeLayers();
  const afterLayers=await next.nativeLayers();
  const bytes=JSON.stringify(beforeLayers).length+JSON.stringify(afterLayers).length;
  const retained=historyBytes-actions.slice(index).reduce((sum,a)=>sum+a.bytes,0);
  if(retained+bytes>maxHistoryBytes)throw Error('Snapshot restore exceeds Undo memory limit');
  layers=next;
  actions.length=index;actions.push({kind:'restore',beforeLayers,afterLayers,archiveAfter:msg.archive||[],recoveryAfter:msg.recovery||[],bytes});
  index++;historyBytes=retained+bytes;
  for(let y=0;y<canvas.height;y+=tileSize)for(let x=0;x<canvas.width;x+=tileSize)dirty.set(Math.floor(y/tileSize)*Math.ceil(canvas.width/tileSize)+Math.floor(x/tileSize),msg.seq);
  await emitFrame(msg);return;
 }
 if(msg.type==='undo'||msg.type==='redo'){
  const cooperate=workSlice(msg);
  const entry=msg.type==='undo'?(index?actions[--index]:null):(index<actions.length?actions[index++]:null);
  if(entry?.kind==='restore'){
   const next=new RasterLayerStore(canvas.width,canvas.height);
   await next.loadLayers(msg.type==='undo'?entry.beforeLayers:entry.afterLayers);
   layers=next;
   for(let y=0;y<canvas.height;y+=tileSize)for(let x=0;x<canvas.width;x+=tileSize)dirty.set(Math.floor(y/tileSize)*Math.ceil(canvas.width/tileSize)+Math.floor(x/tileSize),msg.seq);
  }else if(entry?.kind==='operation'){
   for(const snapshot of msg.type==='undo'?entry.before:entry.after){
    if(!await cooperate())return;
    const ctx=layers.surfaces.get(snapshot.id)?.ctx;if(!ctx)continue;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(snapshot.pixels)ctx.putImageData(snapshot.pixels,0,0);
   }
   for(let y=0;y<canvas.height;y+=tileSize)for(let x=0;x<canvas.width;x+=tileSize)dirty.set(Math.floor(y/tileSize)*Math.ceil(canvas.width/tileSize)+Math.floor(x/tileSize),msg.seq);
  }else for(const {key,box,before,after} of entry?.patches||[]){
   if(!await cooperate())return;
   layers.drawingContext(entry.stroke.target).putImageData(msg.type==='undo'?before:after,box.x,box.y);dirty.set(key,msg.seq);
  }
  await emitFrame(msg);return;
 }
 if(msg.type==='compare-snapshot'){
  const alternative=new RasterLayerStore(canvas.width,canvas.height);
  await alternative.loadLayers(msg.layers);
  const scale=Math.min(1,256/Math.max(canvas.width,canvas.height));
  const width=Math.max(1,Math.round(canvas.width*scale)),height=Math.max(1,Math.round(canvas.height*scale));
  const cooperate=workSlice(msg);
  const thumbnail=async store=>{
   const out=new OffscreenCanvas(width,height),outCtx=out.getContext('2d',{willReadFrequently:true});
   const full=new OffscreenCanvas(canvas.width,canvas.height),fullCtx=full.getContext('2d',{willReadFrequently:true});
   const solo=store.soloId;store.soloId=null;
   try{
    for(let y=0;y<canvas.height;y+=tileSize)for(let x=0;x<canvas.width;x+=tileSize){
     if(!await cooperate())return null;
     const box=tileBox(Math.floor(y/tileSize)*Math.ceil(canvas.width/tileSize)+Math.floor(x/tileSize),canvas.width,canvas.height);
     store.renderTile(fullCtx,box);
     outCtx.drawImage(full,box.x,box.y,box.w,box.h,Math.round(box.x*scale),Math.round(box.y*scale),Math.ceil(box.w*scale)+1,Math.ceil(box.h*scale)+1);
    }
   }finally{store.soloId=solo;}
   return new Uint8Array(await (await out.convertToBlob({type:'image/png'})).arrayBuffer());
  };
  const current=await thumbnail(layers),saved=await thumbnail(alternative);
  if(!current||!saved)return;
  self.postMessage({type:'snapshot-comparison',epoch,requestId:msg.requestId,current,saved,width,height},[current.buffer,saved.buffer]);
  return;
 }
 if(msg.type==='export-png'){
  const frame=msg.cropFrame||[0,0,canvas.width,canvas.height];
  const [sx,sy,w,h]=frame;
  if(!frame.every(Number.isSafeInteger)||sx<0||sy<0||w<1||h<1||sx+w>canvas.width||sy+h>canvas.height)throw Error('Invalid export frame');
  const exportCanvas=new OffscreenCanvas(w,h),exportCtx=exportCanvas.getContext('2d',{willReadFrequently:true});
  if(!exportCtx)throw Error('Export surface unavailable');
  if(msg.background==='white'){exportCtx.fillStyle='#fff';exportCtx.fillRect(0,0,w,h);}
  const full=new OffscreenCanvas(canvas.width,canvas.height),fullCtx=full.getContext('2d',{willReadFrequently:true});
  const prevSolo=layers.soloId;layers.soloId=null;
  try{
   const cooperate=workSlice(msg);
   for(let y=sy;y<sy+h;y+=tileSize)for(let x=sx;x<sx+w;x+=tileSize){
    if(!await cooperate())return;
    const box={x,y,w:Math.min(tileSize,sx+w-x),h:Math.min(tileSize,sy+h-y)};
    layers.renderTile(fullCtx,box);
    exportCtx.drawImage(full,box.x,box.y,box.w,box.h,box.x-sx,box.y-sy,box.w,box.h);
   }
  }finally{layers.soloId=prevSolo;}
  const blob=await exportCanvas.convertToBlob({type:'image/png'});
  const bytes=new Uint8Array(await blob.arrayBuffer());
  self.postMessage({type:'exported-png',epoch,requestId:msg.requestId,width:w,height:h,data:bytes},[bytes.buffer]);return;
 }
 if(msg.type==='save'){
  const start=performance.now();
  const nativeLayers=await layers.nativeLayers();
  const accepted=actions.slice(0,index),restoreAt=accepted.findLastIndex(action=>action.kind==='restore');
  const base=restoreAt<0?priorArchive:accepted[restoreAt].archiveAfter;
  const brushArchive={version:1,strokes:[...base,...accepted.slice(restoreAt+1).filter(a=>a.kind==='stroke').map(a=>a.stroke)]};
  const recovery=restoreAt<0?recoveryArchive:accepted[restoreAt].recoveryAfter;
  if(recovery?.length)brushArchive.recovery=recovery;
  const manifest=createLayeredManifest(msg.metadata,nativeLayers,msg.revision,{brushArchive,history:msg.extra||{}});
  const native=new TextEncoder().encode(JSON.stringify(manifest));
  self.postMessage({type:'saved',epoch,requestId:msg.requestId,native,
   stats:{encodeMs:performance.now()-start,nativeBytes:native.byteLength}},[native.buffer]);
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
