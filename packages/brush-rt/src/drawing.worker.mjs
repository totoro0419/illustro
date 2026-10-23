import {GpuRenderer} from '@rt/renderer';
import {RealtimeSession} from '@rt/session';
import {readHistoryImages} from '@rt/history-io';
import {TILE} from '@rt/model';

globalThis.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),0);
let renderer,session,diagnostics=false;
let displayPort=null,displayEpoch=0,displaySerial=0;const publicationKeys=new Map;
let formalGate=null,recordGate=false;const heldRecords=[],records=new Map,recordTokens=new WeakMap;
const metrics={formal:[]};
const tokenFor=record=>recordTokens.get(record);
function remember(token,record){records.set(token,record);recordTokens.set(record,token);return record;}
function record(token){const value=records.get(token);if(!value)throw Error('Unknown stroke token');return value;}
function stats(includeTiles=false){if(!renderer)return null;const r=renderer,b=r.backend,p=r.performanceSummary();
 if(p.instantPreview)p.instantPreview.samples=p.instantPreview.samples?.slice(-16);
 return {info:{...r.info,alpha:false,presentationOpaque:true},errors:r.errors,completions:r.completions.slice(-4),performance:{...p,execution:'document-tile-worker',formalRender:{count:metrics.formal.length,events:includeTiles?metrics.formal:[]}},
  document:{width:r.document.width,height:r.document.height,count:r.document.count,jobs:r.document.jobs.length},inflight:r.inflight,needsFrame:r.needsFrame,viewPending:r.viewPending,historyPreparing:r.historyPreparing,guardPreparing:r.guardPreparing,
  gates:{formal:!!formalGate,held:formalGate?.held??null,record:recordGate,heldRecords:heldRecords.length},proxy:{pending:r.proxy?.pending.size??0,finalizations:r.proxy?.finalizations.size??0,footprints:r.proxy?.footprints.size??0,error:r.proxy?.error},
  session:{id:session?.id??0,seedSequence:session?.seedSequence??0,errors:session?.errors??[],pendingRawCount:session?.pendingRawCount??0,rawAccepted:session?.rawAccepted??0,browserPredictions:session?.browserPredictions??0,historyPatchHits:session?.historyPatchHits??0,historyReplayFallbacks:session?.historyReplayFallbacks??0,fullDocumentRebuilds:session?.fullDocumentRebuilds??0,fullReplayStrokes:session?.fullReplayStrokes??0,cancelledStrokeCount:session?.cancelledStrokeCount??0},
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
 },renderer.inflight||renderer.document.jobs.length?2:16);
}
async function init(m){
 const nativeNow=performance.now.bind(performance),offset=performance.timeOrigin-m.timeOrigin;Object.defineProperty(performance,'now',{value:()=>nativeNow()+offset});Object.defineProperty(performance,'timeOrigin',{value:m.timeOrigin});
 // Old CPU/GPU presentation and overlay feedback are disconnected. Preserve
 // the canonical input, formal deposition, history and save data paths.
 diagnostics=!!m.diagnostics;
 renderer=await GpuRenderer.create(new OffscreenCanvas(512,512),m.documentWidth,m.documentHeight,m.backend,{...m.options,tiledPresentation:true,strokeOverlay:null});
 session=new RealtimeSession(renderer,m.canonicalUrl);const receive=session.worker.onmessage;session.worker.onmessage=event=>{if(recordGate&&event.data.type==='record')heldRecords.push(event);else receive(event);};
 renderer.setLive=()=>{};
 const b=renderer.backend,render=b.render.bind(b),poll=b.poll?.bind(b);b.documentOnly=true;if(poll)b.poll=()=>{poll();return false;};
 b.render=(...args)=>{const at=performance.now(),pending=render(...args);
  if(diagnostics){metrics.formal.push({at:performance.timeOrigin+at,cpuMs:performance.now()-at,jobs:args[1].length,tiles:new Set(args[1].map(j=>j.key)).size,commands:args[1].reduce((n,j)=>n+j.commands.length,0),compositedTiles:b.lastSubmission?.compositedTiles??0});if(metrics.formal.length>1200)metrics.formal.shift();}
  return Promise.resolve(pending).then(async result=>{
   if(formalGate?.stage==='formal'&&args[1].length){formalGate.held='formal';await formalGate.promise;}
   const jobs=args[1],id=jobs[0]?.id;
   if(id!=null){
    let keys=publicationKeys.get(id);if(!keys)publicationKeys.set(id,keys=new Map);
    for(const j of jobs)if(j.commit)keys.set(j.surfaceKey+'\u0000'+j.key,{surfaceId:j.surfaceKey,key:j.key});
    const commits=renderer.document.jobs.filter(j=>j.id===id&&j.commit).length;
    if(jobs.at(-1)?.commit&&commits===jobs.filter(j=>j.commit).length){await publishTiles([...keys.values()],{id,ids:[id]});publicationKeys.delete(id);}
   }
   return result;
  });
 };
 // No viewport copy, fence or borrowed default framebuffer exists here.
 // History/reload also invalidate document tiles through this same port.
 b.presentView=()=>true;b.presentCurrent=()=>true;renderer.setPerformanceEnabled(diagnostics);return stats(true);
}
async function readTiles(requests){const b=renderer.backend,result=requests.map(r=>({...r,pixels:new Uint8Array(TILE*TILE*4)}));
 for(let at=0;at<result.length;at+=8){const group=result.slice(at,at+8),occupied=group.filter(r=>b.tiles.has(r.surfaceId+'\u0000'+r.key)),images=occupied.map(r=>{const t=b.tiles.get(r.surfaceId+'\u0000'+r.key);return t.layer[t.l];}),pixels=await readHistoryImages(b,images);occupied.forEach((r,i)=>r.pixels=pixels[i]);}return result;
}
// A publication is a coherent stroke boundary, never a viewport or preview ACK.
// Bounded readbacks finish before the next formal stroke mutates these tiles.
// The formal worker never waits for the display's consumption of the packet.
async function publishTiles(requests,metadata={}){
 if(!displayPort)return;const epoch=displayEpoch,tiles=[];
 for(let at=0;at<requests.length;at+=8){
  const group=await readTiles(requests.slice(at,at+8));
  if(epoch!==displayEpoch)return;tiles.push(...group);
 }
 displayPort.postMessage({epoch,serial:++displaySerial,tiles,...metadata},tiles.map(t=>t.pixels.buffer));
}
async function publishAll(){
 publicationKeys.clear();
 await publishTiles([...renderer.backend.tiles.values()].map(t=>({surfaceId:t.surfaceKey,key:t.key})),{replace:true,ids:session.records.map(r=>session.recordIds.get(r))});
}
async function seed(cache){const b=renderer.backend,upload=(surfaceId,key,pixels)=>{if(!pixels.some(x=>x!==0))return;const t=b.tile(key,surfaceId),image=t.layer[t.l];
 if(b.gl){const g=b.gl;g.bindTexture(g.TEXTURE_2D,image.t);g.texSubImage2D(g.TEXTURE_2D,0,0,0,TILE,TILE,g.RGBA,g.UNSIGNED_BYTE,pixels);}else b.device.queue.writeTexture({texture:image},pixels,{bytesPerRow:TILE*4},[TILE,TILE]);t.committedId=-1;b.dirtyConfirmed.add(key);};
 if(cache.version===2){for(const l of cache.layers)for(const t of l.tiles)upload(l.surfaceId,t.key,t.pixels);}
 else for(const l of cache.layers)for(let ty=0;ty<Math.ceil(cache.height/TILE);ty++)for(let tx=0;tx<Math.ceil(cache.width/TILE);tx++){const a=new Uint8Array(TILE*TILE*4),w=Math.min(TILE,cache.width-tx*TILE),h=Math.min(TILE,cache.height-ty*TILE);for(let y=0;y<h;y++){const from=((ty*TILE+y)*cache.width+tx*TILE)*4;a.set(l.pixels.subarray(from,from+w*4),y*TILE*4);}upload(l.surfaceId,tx+','+ty,a);}
}
async function restore({entries,cache,geometry}){const r=renderer,s=session,b=r.backend;b.setPresentationHeld(true);
 try{
  await r.reset();records.clear();s.records=[];s.redoRecords=[];s.id=0;s.recordSurfaces=new WeakMap;s.recordTiles=new WeakMap;s.recordIds=new WeakMap;s.recordOrder=new WeakMap;s.tileRecords=new Map;s.nextRecordOrder=0;
  if(cache)await seed(cache);
  for(const e of entries){const value=remember(e.token,e.record),id=++s.id;s.seedSequence=Math.max(s.seedSequence,value.seed?.[1]??0);s.records.push(value);s.recordIds.set(value,id);s.recordSurfaces.set(value,e.surfaceKey);s.indexRecord(value,e.keys,e.surfaceKey);
   if(!e.cached){const preset=s.presetForRecord(value);r.document.append(id,preset,value.commands,null,e.surfaceKey);r.document.end(id,preset,e.surfaceKey);}}
  r.needsFrame=true;await r.drain();
 }finally{b.setPresentationHeld(false);}
 return stats(true);
}
async function pixel({x,y,surfaceKey}){const b=renderer.backend;
 if(surfaceKey===null){
  const key=Math.floor(x/TILE)+','+Math.floor(y/TILE),tiles=await readTiles(b.surfaceStack.map(surfaceId=>({surfaceId,key})));let a=0,r=0,g=0,blue=0;
  const i=((y%TILE)*TILE+x%TILE)*4;
  for(const t of tiles){const style=b.surfaceStyles?.get(t.surfaceId);if(style?.visible===false)continue;const p=t.pixels,sa=p[i+3]/255*(style?.opacity??1);r=p[i]*sa+r*(1-sa);g=p[i+1]*sa+g*(1-sa);blue=p[i+2]*sa+blue*(1-sa);a=sa+a*(1-sa);}
  return a?[Math.round(r),Math.round(g),Math.round(blue),Math.round(a*255)]:[0,0,0,0];
 }
 const layer=true,t=layer?b.tiles.get(surfaceKey+'\u0000'+Math.floor(x/TILE)+','+Math.floor(y/TILE)):null;if(layer&&!t)return [0,0,0,0];
 const sx=layer?x%TILE:x,sy=layer?y%TILE:y;
 if(b.gl){const g=b.gl,a=new Uint8Array(4);g.bindFramebuffer(g.FRAMEBUFFER,layer?t.layer[t.l].f:b.liveTarget.f);g.readPixels(sx,layer?sy:b.height-1-sy,1,1,g.RGBA,g.UNSIGNED_BYTE,a);return [...a];}
 const d=b.device,buffer=d.createBuffer({size:256,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{const e=d.createCommandEncoder();e.copyTextureToBuffer({texture:layer?t.layer[t.l]:b.liveTarget,origin:{x:sx,y:sy}},{buffer,bytesPerRow:256},[1,1]);d.queue.submit([e.finish()]);await buffer.mapAsync(GPUMapMode.READ);const a=new Uint8Array(buffer.getMappedRange()),bgra=!layer&&b.format.startsWith('bgra');return [a[bgra?2:0],a[1],a[bgra?0:2],a[3]];}finally{buffer.destroy();}
}
// Review-only invariant: splitting GPU submissions must preserve every formal
// byte. Both runs use the same canonical record and exact deposition shaders.
async function comparePartition(value){
 const outputs=[];for(const documentOnly of [false,true]){
  const r=await GpuRenderer.create(new OffscreenCanvas(512,512),renderer.document.width,renderer.document.height,renderer.backend.gl?'webgl2':'webgpu',{strokeHandoff:true,tileHistory:false,tiledPresentation:true,strokeOverlay:null});
  try{r.backend.documentOnly=documentOnly;r.document.append(1,value.preset,value.commands);r.document.end(1,value.preset);r.markEnded(1);await r.drain();outputs.push(await r.read('default'));}finally{const gl=r.backend.gl;r.destroy();gl?.getExtension('WEBGL_lose_context')?.loseContext();}
 }
 let different=0,maxDelta=0;for(let i=0;i<outputs[0].length;i++){const delta=Math.abs(outputs[0][i]-outputs[1][i]);if(delta)different++;maxDelta=Math.max(maxDelta,delta);}return {bytes:outputs[0].length,different,maxDelta};
}
async function command(method,a){const r=renderer,s=session;
 switch(method){
 case 'displayPort':displayPort=a.port;displayPort.start();return;
 case 'displayEpoch':displayEpoch=a;return;
 case 'begin':{if(a.seedSequence!==undefined)s.seedSequence=a.seedSequence-1;const id=s.begin(a.preset,a.fast,a.context,a.surfaceKey);if(id!==a.id)throw Error('Drawing worker stroke sequence mismatch');return id;}
 case 'samples':s.prediction=a.prediction!==false;for(const sample of a.samples)s.accept(sample,false);s.predictions(a.predictions??[]);s.flush();s.updateLive(performance.now());return;
 case 'end':{r.releaseInteractiveUntil=performance.now()+280;const value=await s.end(a.release);if(value)remember(a.token,value);return value;}
 case 'commit':a.additional.forEach((value,i)=>remember(a.token+':copy:'+i,value));return s.commitRecord(record(a.token),a.additional,a.surfaceKey);
 case 'commitUndone':a.additional.forEach((value,i)=>remember(a.token+':copy:'+i,value));return s.commitUndoneRecord(record(a.token),a.additional,a.surfaceKey);
 case 'forget':s.forgetStaged(record(a.token));records.delete(a.token);return;
 case 'discardUncommitted':return s.discardUncommitted(record(a.token));
 case 'cancel':return s.cancel();
 case 'discardRedo':return s.discardRedo();
 case 'navigate':await s.navigateDerived(a.map(e=>({...e,record:record(e.token)})));await publishAll();return;
 case 'restore':{const state=await restore(a);await publishAll();return state;}
 case 'waitStroke':return r.waitStroke(a);
 case 'drain':await r.drain(a);return stats(true);
 case 'read':return r.read(a);
 case 'readViewport':await r.drain();return r.backend.readViewport();
 case 'readTiles':return readTiles(a);
 case 'pixel':return pixel(a);
 case 'stack':r.setSurfaceStack(a);return;
 case 'styles':r.setSurfaceStyles(a);return;
 case 'prepareHistory':return r.prepareHistory();
 case 'resumeHistory':return r.resumeHistory();
 case 'measure':r.setPerformanceEnabled(a);return;
 case 'comparePartition':if(!diagnostics)throw Error('Diagnostics are disabled');return comparePartition(record(a.token));
 case 'recordGate':if(!diagnostics)throw Error('Diagnostics are disabled');recordGate=!!a;if(!a){const receive=session.worker.onmessage;for(const event of heldRecords.splice(0))receive(event);}return;
 case 'gate':if(!diagnostics)throw Error('Diagnostics are disabled');if(a){if(!formalGate){let release;const promise=new Promise(ok=>release=ok);formalGate={promise,release,stage:'formal',held:null};}}else{formalGate?.release();formalGate=null;}return;
 case 'inspect':return stats(true);
 case 'destroy':s.destroy();close();return;
 default:throw Error('Unknown drawing worker command: '+method);
 }
}
self.onmessage=({data:m})=>{scheduleFrame();Promise.resolve().then(()=>m.method==='init'?init(m.args):command(m.method,m.args)).then(result=>{scheduleFrame();if(m.request){const transfer=result instanceof Uint8Array||result instanceof Uint8ClampedArray?[result.buffer]:m.method==='readTiles'?result.map(t=>t.pixels.buffer):[];postMessage({type:'reply',request:m.request,result,state:stats(m.method==='navigate'||m.method==='restore'||m.method==='drain')},transfer);}}).catch(error=>m.request?postMessage({type:'reply',request:m.request,error:String(error),state:stats()}):fail(error));};
