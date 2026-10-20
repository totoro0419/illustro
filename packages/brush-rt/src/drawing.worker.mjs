import {GpuRenderer} from '@rt/renderer';
import {RealtimeSession} from '@rt/session';
import {WorkerStrokeSink} from '@rt/worker-stroke-sink';
import {readHistoryImages} from '@rt/history-io';
import {TILE} from '@rt/model';

// This worker owns ALL raster work and GPU resources. The window owns input,
// the authoritative Core transaction and presentation of immutable images.
// Fence polling here must also work for standalone OffscreenCanvas workers.
globalThis.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),8);
let renderer,session,sink,gpuFrame,publishing=false,publishRequested=false,visibilityEpoch=0;
let serial=0,captured=0,baseDirty=false,inRender=false,diagnostics=false,lastSent=0,acknowledged=0;
let formalGate=null,recordGate=false;const heldRecords=[];const records=new Map,recordTokens=new WeakMap,metrics={gpuCaptures:0,bitmapBytes:0,publications:0,formal:[]};
const tokenFor=record=>recordTokens.get(record);
function remember(token,record){records.set(token,record);recordTokens.set(record,token);return record;}
function record(token){const value=records.get(token);if(!value)throw Error('Unknown stroke token');return value;}
function stats(includeTiles=false){if(!renderer)return null;const r=renderer,b=r.backend,p=r.performanceSummary();
 if(p.instantPreview)p.instantPreview.samples=p.instantPreview.samples?.slice(-32);
 return {info:r.info,errors:r.errors,completions:r.completions.slice(-4),performance:{...p,execution:'drawing-worker',publication:{...metrics,formal:includeTiles?metrics.formal:[]}},
  document:{width:r.document.width,height:r.document.height,count:r.document.count,jobs:r.document.jobs.length},inflight:r.inflight,needsFrame:r.needsFrame,viewPending:r.viewPending,historyPreparing:r.historyPreparing,guardPreparing:r.guardPreparing,
  gates:{formal:!!formalGate,record:recordGate,heldRecords:heldRecords.length},proxy:{pending:r.proxy?.pending.size??0,finalizations:r.proxy?.finalizations.size??0,footprints:r.proxy?.footprints.size??0,error:r.proxy?.error},
  session:{id:session?.id??0,errors:session?.errors??[],pendingRawCount:session?.pendingRawCount??0,rawAccepted:session?.rawAccepted??0,browserPredictions:session?.browserPredictions??0,historyPatchHits:session?.historyPatchHits??0,historyReplayFallbacks:session?.historyReplayFallbacks??0,fullDocumentRebuilds:session?.fullDocumentRebuilds??0,fullReplayStrokes:session?.fullReplayStrokes??0,cancelledStrokeCount:session?.cancelledStrokeCount??0},
  ...(includeTiles?{tiles:[...b.tiles.values()].map(({surfaceKey,key,x,y})=>({surfaceKey,key,x,y})),recordIds:[...records].map(([token,value])=>[token,session.recordIds.get(value)])}:{}),presentationHeld:b.presentationHeld};
}
function fail(error){postMessage({type:'fault',message:error instanceof Error?error.message:String(error)});}
function requestPublish(){publishRequested=true;queueMicrotask(()=>publish().catch(fail));}
async function publish(){
 if(publishing||!publishRequested||!renderer||renderer.backend.presentationHeld||lastSent>acknowledged)return;
 publishing=true;publishRequested=false;
 // Freeze all surfaces in the same task. The packet is applied atomically by
 // the window; CPU -> formal retirement needs no guard readback or DOM fence.
 const base=baseDirty?gpuFrame:null;if(base){gpuFrame=null;baseDirty=false;}
 const epoch=visibilityEpoch,sequence=++metrics.publications,images=sink.snapshot();
 try{const {layers,retired}=await images;if(!base&&!layers.length&&!retired.length)return;
  const transfer=[...(base?[base.bitmap]:[]),...layers.map(l=>l.bitmap)];
  metrics.bitmapBytes+=(base?base.bitmap.width*base.bitmap.height*4:0)+layers.reduce((n,l)=>n+l.bitmap.width*l.bitmap.height*4,0);
  lastSent=sequence;postMessage({type:'picture',sequence,epoch,base,layers,retired,state:stats()},transfer);
 }finally{publishing=false;if(publishRequested)requestPublish();}
}
function capture(){const b=renderer.backend;if(b.presentationHeld)return Promise.resolve();const id=++serial,view=Array.from(b.viewTransform??[]),epoch=visibilityEpoch;
 // Snapshot before a WebGPU canvas texture expires at the task boundary.
 const image=createImageBitmap(b.canvas);metrics.gpuCaptures++;
 return image.then(bitmap=>{if(id<captured||epoch!==visibilityEpoch){bitmap.close();return;}captured=id;gpuFrame?.bitmap.close();gpuFrame={bitmap,view};baseDirty=true;});
}
async function init(m){const nativeNow=performance.now.bind(performance),offset=performance.timeOrigin-m.timeOrigin;Object.defineProperty(performance,'now',{value:()=>nativeNow()+offset});Object.defineProperty(performance,'timeOrigin',{value:m.timeOrigin});diagnostics=!!m.diagnostics;sink=new WorkerStrokeSink(requestPublish);
 renderer=await GpuRenderer.create(new OffscreenCanvas(m.width,m.height),m.documentWidth,m.documentHeight,m.backend,{...m.options,strokeOverlay:{...m.options.strokeOverlay,sink}});
 session=new RealtimeSession(renderer,m.canonicalUrl);const receiveRecord=session.worker.onmessage;session.worker.onmessage=event=>{if(recordGate&&event.data.type==='record')heldRecords.push(event);else receiveRecord(event);};const b=renderer.backend,render=b.render.bind(b),poll=b.poll?.bind(b),present=b.presentCurrent.bind(b);
 // The acknowledgement joins exact GPU work AND its immutable screen image.
 // poll() still resolves the original fence, but cannot retire overlays early.
 if(poll)b.poll=()=>{poll();return false;};
 b.render=(...args)=>{const at=performance.now();inRender=true;let pending;try{pending=render(...args);}finally{inRender=false;}
  const snap=b.lastSubmission?.presentationSubmitted===false?Promise.resolve():capture(),cpuMs=performance.now()-at;
  if(diagnostics){metrics.formal.push({at:performance.timeOrigin+at,cpuMs,jobs:args[1].length,tiles:new Set(args[1].map(j=>j.key)).size,commands:args[1].reduce((n,j)=>n+j.commands.length,0),previewTiles:b.lastSubmission?.dirtyTiles??0});if(metrics.formal.length>1200)metrics.formal.shift();}
  return Promise.all([pending,snap]).then(async value=>{if(formalGate&&args[1].length)await formalGate.promise;return value;});
 };
 b.presentCurrent=(...args)=>{const pending=present(...args);if(inRender)return pending;return Promise.all([pending,capture()]).then(requestPublish);};
 const view=b.presentView.bind(b);b.presentView=()=>{inRender=true;let ok;try{ok=view();}finally{inRender=false;}if(ok)capture().then(requestPublish).catch(fail);return ok;};
 renderer.onContentReady=requestPublish;
 // No pointer-lifetime or post-release quiet timer may pause formal work in
 // this worker. The independent window can navigate any published picture.
 renderer.setPerformanceEnabled(diagnostics);
 return stats(true);
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
 try{await r.reset();records.clear();s.records=[];s.redoRecords=[];s.id=0;s.recordSurfaces=new WeakMap;s.recordTiles=new WeakMap;s.recordIds=new WeakMap;s.recordOrder=new WeakMap;s.tileRecords=new Map;s.nextRecordOrder=0;
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
async function settlePictures(){requestPublish();while(publishing||publishRequested||baseDirty||sink.changed.size||sink.retired.size)await new Promise(ok=>setTimeout(ok,0));const target=lastSent;while(acknowledged<target)await new Promise(ok=>setTimeout(ok,0));}
async function command(method,a){const r=renderer,s=session;
 switch(method){
 case 'begin':{const id=s.begin(a.preset,a.fast,a.context,a.surfaceKey);if(id!==a.id)throw Error('Drawing worker stroke sequence mismatch');return id;}
 case 'samples':s.prediction=a.prediction!==false;for(const sample of a.samples)s.accept(sample,false);s.predictions(a.predictions??[]);s.flush();s.updateLive(performance.now());return;
 case 'end':{const value=await s.end(a.release);if(value)remember(a.token,value);return value;}
 case 'commit':a.additional.forEach((value,i)=>remember(a.token+':copy:'+i,value));return s.commitRecord(record(a.token),a.additional,a.surfaceKey);
 case 'commitUndone':a.additional.forEach((value,i)=>remember(a.token+':copy:'+i,value));return s.commitUndoneRecord(record(a.token),a.additional,a.surfaceKey);
 case 'forget':s.forgetStaged(record(a.token));records.delete(a.token);return;
 case 'discardUncommitted':return s.discardUncommitted(record(a.token));
 case 'cancel':return s.cancel();
 case 'discardRedo':return s.discardRedo();
 case 'navigate':return s.navigateDerived(a.map(e=>({...e,record:record(e.token)})));
 case 'restore':return restore(a);
 case 'pictureAck':acknowledged=Math.max(acknowledged,a);if(publishRequested)requestPublish();return;
 case 'waitStroke':{const result=await r.waitStroke(a);await settlePictures();return result;}
 case 'drain':await r.drain(a);await settlePictures();return stats(true);
 case 'read':return r.read(a);
 case 'readViewport':await r.drain();return r.backend.readViewport();
 case 'readTiles':return readTiles(a);
 case 'pixel':return pixel(a);
 case 'view':r.setViewTransform(a);return;
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
 case 'tick':s.frame(performance.now());if(r.errors.length||s.errors.length)throw Error([...r.errors,...s.errors].join(';'));return;
 case 'recordGate':if(!diagnostics)throw Error('Diagnostics are disabled');recordGate=!!a;if(!a){const receive=session.worker.onmessage;for(const event of heldRecords.splice(0))receive(event);}return;
 case 'gate':if(!diagnostics)throw Error('Diagnostics are disabled');if(a){if(!formalGate){let release;const promise=new Promise(ok=>release=ok);formalGate={promise,release};}}else{formalGate?.release();formalGate=null;}return;
 case 'inspect':return stats(true);
 case 'destroy':s.destroy();close();return;
 default:throw Error('Unknown drawing worker command: '+method);
 }
}
self.onmessage=({data:m})=>{const work=m.method==='init'?init(m.args):command(m.method,m.args);
 Promise.resolve(work).then(result=>{if(m.request){const transfer=result instanceof Uint8Array||result instanceof Uint8ClampedArray?[result.buffer]:m.method==='readTiles'?result.map(t=>t.pixels.buffer):[];postMessage({type:'reply',request:m.request,result,state:stats(m.method==='navigate'||m.method==='restore'||m.method==='drain')},transfer);}}).catch(error=>m.request?postMessage({type:'reply',request:m.request,error:String(error),state:stats()}):fail(error));};
