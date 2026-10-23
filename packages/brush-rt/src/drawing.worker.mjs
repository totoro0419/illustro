import {GpuRenderer} from '@rt/renderer';
import {RealtimeSession} from '@rt/session';
import {WorkerStrokeSink} from '@rt/worker-stroke-sink';
import {captureTilePages,ATLAS_SIZE} from '@rt/presentation-tiles';
import {readHistoryImages} from '@rt/history-io';
import {TILE} from '@rt/model';

globalThis.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),0);
let renderer,session,sink,diagnostics=false,visibilityEpoch=0,latestView,initialView=false;
let publishing=false,publishRequested=false,lastSent=0,acknowledged=0,serial=0,sentPacket=null;
let formalGate=null,recordGate=false;const heldRecords=[],records=new Map,recordTokens=new WeakMap,pendingTiles=new Set;
const metrics={gpuCaptures:0,bitmapBytes:0,publications:0,formal:[]};
const tokenFor=record=>recordTokens.get(record);
function remember(token,record){records.set(token,record);recordTokens.set(record,token);return record;}
function record(token){const value=records.get(token);if(!value)throw Error('Unknown stroke token');return value;}
function stats(includeTiles=false){if(!renderer)return null;const r=renderer,b=r.backend,p=r.performanceSummary();
 if(p.instantPreview)p.instantPreview.samples=p.instantPreview.samples?.slice(-16);
 return {info:{...r.info,alpha:false,presentationOpaque:true},errors:r.errors,completions:r.completions.slice(-4),performance:{...p,execution:'document-tile-worker',publication:{...metrics,pendingTiles:pendingTiles.size,publishing,publishRequested,lastSent,acknowledged,changed:sink.changed.size,retired:sink.retired.size,formal:includeTiles?metrics.formal:[]}},
  document:{width:r.document.width,height:r.document.height,count:r.document.count,jobs:r.document.jobs.length},inflight:r.inflight,needsFrame:r.needsFrame,viewPending:r.viewPending,historyPreparing:r.historyPreparing,guardPreparing:r.guardPreparing,
  gates:{formal:!!formalGate,held:formalGate?.held??null,record:recordGate,heldRecords:heldRecords.length},proxy:{pending:r.proxy?.pending.size??0,finalizations:r.proxy?.finalizations.size??0,footprints:r.proxy?.footprints.size??0,error:r.proxy?.error},
  session:{id:session?.id??0,errors:session?.errors??[],pendingRawCount:session?.pendingRawCount??0,rawAccepted:session?.rawAccepted??0,browserPredictions:session?.browserPredictions??0,historyPatchHits:session?.historyPatchHits??0,historyReplayFallbacks:session?.historyReplayFallbacks??0,fullDocumentRebuilds:session?.fullDocumentRebuilds??0,fullReplayStrokes:session?.fullReplayStrokes??0,cancelledStrokeCount:session?.cancelledStrokeCount??0},
  ...(includeTiles?{tiles:[...b.tiles.values()].map(({surfaceKey,key,x,y})=>({surfaceKey,key,x,y})),recordIds:[...records].map(([token,value])=>[token,session.recordIds.get(value)])}:{}),presentationHeld:b.presentationHeld};
}
function fail(error){postMessage({type:'fault',message:error instanceof Error?error.message:String(error)});}
// Render work advances within the drawing worker, not from window rAF.
let frameScheduled=false;
function scheduleFrame(){
 if(frameScheduled||!renderer||!session)return;
 frameScheduled=true;
 setTimeout(()=>{
  frameScheduled=false;if(!renderer||renderer.disposed)return;
  try{
   session.frame(performance.now());
   if(renderer.errors.length||session.errors.length)throw Error([...renderer.errors,...session.errors].join(';'));
  }catch(error){fail(error);return;}
  if(session.active||renderer.inflight||renderer.needsFrame||renderer.viewPending||renderer.guardPreparing||
    renderer.document.jobs.length||renderer.mailbox.value||renderer.strokeFrames.size||renderer.backend.previewGpuPending) scheduleFrame();
 },16);
}
let overlayPublishing=false;
// The authoritative tile packet has its own acknowledgment. A slow image
// Worker must not hold newer temporary ink behind that acknowledgment.
function requestPublish(){
 publishRequested=true;
 queueMicrotask(()=> (lastSent>acknowledged?publishPreviewOnly():publish()).catch(fail));
}
async function publishPreviewOnly(){
 if(overlayPublishing||publishing||!renderer||!sink||lastSent<=acknowledged)return;
 overlayPublishing=true;const epoch=visibilityEpoch;
 try{
  const result=await sink.snapshot();
  // Retirement is an authoritative document update, never an overlay update.
  // Keep its obligation until the exact raster packet can be acknowledged.
  for(const id of result.retired)sink.retired.add(id);
  if(epoch!==visibilityEpoch){
   for(const l of result.layers)l.bitmap.close();
   for(const id of sink.layers.keys())sink.changed.add(id);
   return;
  }
  if(result.layers.length)postMessage({type:'overlay',epoch,layers:result.layers},result.layers.map(l=>l.bitmap));
 }finally{
  overlayPublishing=false;
  if(sink.changed.size||(publishRequested&&lastSent<=acknowledged))requestPublish();
 }
}
function coherent(){const r=renderer;if(!r||r.backend.presentationHeld||r.historyPreparing||r.inflight||r.strokeFrames.size)return false;
 // CPU pictures cover the entire document. Keep them until their exact
 // replacement is composed; never leak the half-committed stroke underneath.
 for(const id of r.backend.overlayHoldIds)if(r.ended.has(id))return false;
 return true;
}
async function publish(){
 if(publishing||overlayPublishing||!publishRequested||lastSent>acknowledged||!renderer||renderer.backend.presentationHeld)return;
 publishing=true;publishRequested=false;const epoch=visibilityEpoch,ready=coherent(),keys=ready?[...pendingTiles]:[];if(ready)pendingTiles.clear();
 let pages=[];
 try{pages=captureTilePages(renderer.backend,keys);const images=sink.snapshot();const result=await images,layers=result.layers,retired=ready?result.retired:[];if(!ready)for(const id of result.retired)sink.retired.add(id);
  if(epoch!==visibilityEpoch){for(const p of pages)p.bitmap.close();for(const l of layers)l.bitmap.close();for(const key of keys)pendingTiles.add(key);for(const id of sink.layers.keys())sink.changed.add(id);for(const id of retired)sink.retired.add(id);publishRequested=true;return;}
  if(!pages.length&&!layers.length&&!retired.length)return;
  if(formalGate?.stage==='picture'&&pages.length){formalGate.held='picture';await formalGate.promise;}
  lastSent=++serial;sentPacket={keys,retired};metrics.publications++;metrics.gpuCaptures+=pages.length;metrics.bitmapBytes+=pages.reduce((n,p)=>n+p.bitmap.width*p.bitmap.height*4,0)+layers.reduce((n,l)=>n+l.bitmap.width*l.bitmap.height*4,0);
  postMessage({type:'picture',sequence:lastSent,epoch,pages,layers,retired,state:stats()},[...pages.map(p=>p.bitmap),...layers.map(l=>l.bitmap)]);
 }finally{publishing=false;if(publishRequested)requestPublish();}
}
async function init(m){
 const nativeNow=performance.now.bind(performance),offset=performance.timeOrigin-m.timeOrigin;Object.defineProperty(performance,'now',{value:()=>nativeNow()+offset});Object.defineProperty(performance,'timeOrigin',{value:m.timeOrigin});
 diagnostics=!!m.diagnostics;sink=new WorkerStrokeSink(requestPublish);sink.documentSpace=true;
 renderer=await GpuRenderer.create(new OffscreenCanvas(ATLAS_SIZE,ATLAS_SIZE),m.documentWidth,m.documentHeight,m.backend,{...m.options,tiledPresentation:true,strokeOverlay:{...m.options.strokeOverlay,sink,documentSpace:true}});
 session=new RealtimeSession(renderer,m.canonicalUrl);const receive=session.worker.onmessage;session.worker.onmessage=event=>{if(recordGate&&event.data.type==='record')heldRecords.push(event);else receive(event);};
 const b=renderer.backend,render=b.render.bind(b),poll=b.poll?.bind(b);if(poll)b.poll=()=>{poll();return false;};
 b.render=(...args)=>{const at=performance.now(),pending=render(...args);for(const key of b.lastSubmission?.compositionKeys??[])pendingTiles.add(key);
  if(diagnostics){metrics.formal.push({at:performance.timeOrigin+at,cpuMs:performance.now()-at,jobs:args[1].length,tiles:new Set(args[1].map(j=>j.key)).size,commands:args[1].reduce((n,j)=>n+j.commands.length,0),compositedTiles:b.lastSubmission?.compositedTiles??0});if(metrics.formal.length>1200)metrics.formal.shift();}
  return Promise.resolve(pending).then(async result=>{if(formalGate?.stage==='formal'&&args[1].length){formalGate.held='formal';await formalGate.promise;}return result;});
 };
 // No viewport copy, fence or borrowed default framebuffer exists here.
 // History/reload also invalidate document tiles through this same port.
 b.presentView=()=>true;b.presentCurrent=()=>{requestPublish();return true;};
 renderer.onContentReady=requestPublish;renderer.setPerformanceEnabled(diagnostics);return stats(true);
}
async function readTiles(requests){const b=renderer.backend,result=requests.map(r=>({...r,pixels:new Uint8Array(TILE*TILE*4)}));
 for(let at=0;at<result.length;at+=8){const group=result.slice(at,at+8),occupied=group.filter(r=>b.tiles.has(r.surfaceId+'\u0000'+r.key)),images=occupied.map(r=>{const t=b.tiles.get(r.surfaceId+'\u0000'+r.key);return t.layer[t.l];}),pixels=await readHistoryImages(b,images);occupied.forEach((r,i)=>r.pixels=pixels[i]);}return result;
}
async function seed(cache){const b=renderer.backend,upload=(surfaceId,key,pixels)=>{if(!pixels.some(x=>x!==0))return;const t=b.tile(key,surfaceId),image=t.layer[t.l];
 if(b.gl){const g=b.gl;g.bindTexture(g.TEXTURE_2D,image.t);g.texSubImage2D(g.TEXTURE_2D,0,0,0,TILE,TILE,g.RGBA,g.UNSIGNED_BYTE,pixels);}else b.device.queue.writeTexture({texture:image},pixels,{bytesPerRow:TILE*4},[TILE,TILE]);t.committedId=-1;b.dirtyConfirmed.add(key);};
 if(cache.version===2){for(const l of cache.layers)for(const t of l.tiles)upload(l.surfaceId,t.key,t.pixels);}
 else for(const l of cache.layers)for(let ty=0;ty<Math.ceil(cache.height/TILE);ty++)for(let tx=0;tx<Math.ceil(cache.width/TILE);tx++){const a=new Uint8Array(TILE*TILE*4),w=Math.min(TILE,cache.width-tx*TILE),h=Math.min(TILE,cache.height-ty*TILE);for(let y=0;y<h;y++){const from=((ty*TILE+y)*cache.width+tx*TILE)*4;a.set(l.pixels.subarray(from,from+w*4),y*TILE*4);}upload(l.surfaceId,tx+','+ty,a);}
}
async function restore({entries,cache,geometry}){const r=renderer,s=session,b=r.backend;r.proxy?.setEnabled(!geometry);b.setPresentationHeld(true);
 try{
  // Reset replaces a projection in the SAME display host. Clear every old
  // occupied region as well as seeding the new ones, including removed ink.
  for(const t of b.tiles.values())pendingTiles.add(t.key);for(const v of b.previews.values())for(const key of v.keys??[])pendingTiles.add(key);
  await r.reset();records.clear();s.records=[];s.redoRecords=[];s.id=0;s.recordSurfaces=new WeakMap;s.recordTiles=new WeakMap;s.recordIds=new WeakMap;s.recordOrder=new WeakMap;s.tileRecords=new Map;s.nextRecordOrder=0;
  if(cache)await seed(cache);
  for(const e of entries){const value=remember(e.token,e.record),id=++s.id;s.seedSequence=Math.max(s.seedSequence,value.seed?.[1]??0);s.records.push(value);s.recordIds.set(value,id);s.recordSurfaces.set(value,e.surfaceKey);s.indexRecord(value,e.keys,e.surfaceKey);
   if(!e.cached){const preset=s.presetForRecord(value);r.document.append(id,preset,value.commands,null,e.surfaceKey);r.document.end(id,preset,e.surfaceKey);}}
  r.needsFrame=true;await r.drain();
 }finally{b.setPresentationHeld(false);}
 await b.presentCurrent();r.proxy?.invalidate();requestPublish();return stats(true);
}
async function pixel({x,y,surfaceKey}){const b=renderer.backend,layer=surfaceKey!==null,t=layer?b.tiles.get(surfaceKey+'\u0000'+Math.floor(x/TILE)+','+Math.floor(y/TILE)):null;if(layer&&!t)return [0,0,0,0];
 const sx=layer?x%TILE:x,sy=layer?y%TILE:y;
 if(b.gl){const g=b.gl,a=new Uint8Array(4);g.bindFramebuffer(g.FRAMEBUFFER,layer?t.layer[t.l].f:b.liveTarget.f);g.readPixels(sx,layer?sy:b.height-1-sy,1,1,g.RGBA,g.UNSIGNED_BYTE,a);return [...a];}
 const d=b.device,buffer=d.createBuffer({size:256,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{const e=d.createCommandEncoder();e.copyTextureToBuffer({texture:layer?t.layer[t.l]:b.liveTarget,origin:{x:sx,y:sy}},{buffer,bytesPerRow:256},[1,1]);d.queue.submit([e.finish()]);await buffer.mapAsync(GPUMapMode.READ);const a=new Uint8Array(buffer.getMappedRange()),bgra=!layer&&b.format.startsWith('bgra');return [a[bgra?2:0],a[1],a[bgra?0:2],a[3]];}finally{buffer.destroy();}
}
async function settlePictures(){requestPublish();while(publishing||publishRequested||pendingTiles.size||sink.changed.size||sink.retired.size||lastSent>acknowledged){if(renderer.errors.length)throw Error(renderer.errors.join(';'));await new Promise(ok=>setTimeout(ok,0));}}
async function command(method,a){const r=renderer,s=session;
 switch(method){
 case 'begin':{const id=s.begin(a.preset,a.fast,a.context,a.surfaceKey);if(id!==a.id)throw Error('Drawing worker stroke sequence mismatch');return id;}
 case 'samples':s.prediction=a.prediction!==false;for(const sample of a.samples)s.accept(sample,false);s.predictions(a.predictions??[]);s.flush();s.updateLive(performance.now());return;
 case 'end':{r.releaseInteractiveUntil=performance.now()+280;const value=await s.end(a.release);if(value)remember(a.token,value);return value;}
 case 'commit':a.additional.forEach((value,i)=>remember(a.token+':copy:'+i,value));return s.commitRecord(record(a.token),a.additional,a.surfaceKey);
 case 'commitUndone':a.additional.forEach((value,i)=>remember(a.token+':copy:'+i,value));return s.commitUndoneRecord(record(a.token),a.additional,a.surfaceKey);
 case 'forget':s.forgetStaged(record(a.token));records.delete(a.token);return;
 case 'discardUncommitted':return s.discardUncommitted(record(a.token));
 case 'cancel':return s.cancel();
 case 'discardRedo':return s.discardRedo();
 case 'navigate':return s.navigateDerived(a.map(e=>({...e,record:record(e.token)})));
 case 'restore':await restore(a);await settlePictures();return stats(true);
 case 'pictureAck':acknowledged=Math.max(acknowledged,a.sequence);if(!a.accepted&&sentPacket){for(const key of sentPacket.keys)pendingTiles.add(key);for(const id of sink.layers.keys())sink.changed.add(id);for(const id of sentPacket.retired)sink.retired.add(id);}sentPacket=null;if(publishRequested||pendingTiles.size||sink.changed.size||sink.retired.size)requestPublish();return;
 case 'waitStroke':{const result=await r.waitStroke(a);await settlePictures();return result;}
 case 'drain':await r.drain(a);await settlePictures();return stats(true);
 case 'read':return r.read(a);
 case 'readViewport':await r.drain();return r.backend.readViewport();
 case 'readTiles':return readTiles(a);
 case 'pixel':return pixel(a);
 case 'view':latestView=a;if(!initialView){initialView=true;r.setViewTransform(a);r.syncOverlayView();}else r.proxy?.setView(a);return;
 case 'stack':r.setSurfaceStack(a);return;
 case 'styles':r.setSurfaceStyles(a);return;
 case 'seamless':r.setSeamlessPreview(a);return;
 case 'clearSeamless':r.clearSeamlessPreviews(a);return;
 case 'hide':visibilityEpoch=a.epoch;r.hideStrokePreview(a.id);for(const id of sink.layers.keys())sink.changed.add(id);requestPublish();return;
 case 'show':visibilityEpoch=a.epoch;r.restoreStrokePreview(a.id);for(const id of sink.layers.keys())sink.changed.add(id);requestPublish();return;
 case 'prepareHistory':return r.prepareHistory();
 case 'resumeHistory':return r.resumeHistory();
 case 'prepare':r.proxy?.prepare(a);return;
 case 'overlayEnabled':r.proxy?.setEnabled(a);return;
 case 'overlayInvalidate':r.proxy?.invalidate();return;
 case 'measure':r.setPerformanceEnabled(a);return;
 case 'recordGate':if(!diagnostics)throw Error('Diagnostics are disabled');recordGate=!!a;if(!a){const receive=session.worker.onmessage;for(const event of heldRecords.splice(0))receive(event);}return;
 case 'gate':if(!diagnostics)throw Error('Diagnostics are disabled');if(a){if(!formalGate){let release;const promise=new Promise(ok=>release=ok);formalGate={promise,release,stage:a==='picture'?'picture':'formal',held:null};}}else{formalGate?.release();formalGate=null;}return;
 case 'inspect':return stats(true);
 case 'destroy':s.destroy();close();return;
 default:throw Error('Unknown drawing worker command: '+method);
 }
}
self.onmessage=({data:m})=>{scheduleFrame();Promise.resolve().then(()=>m.method==='init'?init(m.args):command(m.method,m.args)).then(result=>{scheduleFrame();if(m.request){const transfer=result instanceof Uint8Array||result instanceof Uint8ClampedArray?[result.buffer]:m.method==='readTiles'?result.map(t=>t.pixels.buffer):[];postMessage({type:'reply',request:m.request,result,state:stats(m.method==='navigate'||m.method==='restore'||m.method==='drain')},transfer);}}).catch(error=>m.request?postMessage({type:'reply',request:m.request,error:String(error),state:stats()}):fail(error));};
