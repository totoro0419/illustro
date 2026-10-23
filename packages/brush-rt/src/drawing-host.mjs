import {DocumentPresentation} from '@rt/document-presentation';
import {ViewPlane} from '@rt/view-plane';


// Window-side port: no brush reconstruction, pixel evaluation or GPU commands.
// One current view transforms all immutable pictures, including old pictures
// arriving after a more recent pan/zoom/rotation. Worker messages never own it.
export class DrawingHost {
 static async create(canvas,width,height,backend,options,workerUrl,canonicalUrl,diagnostics=false,presentationUrl){
  const host=new DrawingHost(canvas,workerUrl,presentationUrl);host.documentPresentation=new DocumentPresentation(canvas,width,height);host.viewPlane=new ViewPlane(canvas,host.documentPresentation);host.documentVersion=0;try{
   host.update(await host.call('init',{width:canvas.width,height:canvas.height,documentWidth:width,documentHeight:height,backend,options,canonicalUrl,diagnostics,timeOrigin:performance.timeOrigin}));
   host.presentation.postMessage({method:'init',width:canvas.width,height:canvas.height,documentWidth:width,documentHeight:height,backend:host.info.selection.selected});await host.presentationReady;return host;
  }catch(error){host.destroy();throw error;}
 }
 constructor(canvas,url,presentationUrl){this.remote=true;this.canvas=canvas;this.context=canvas.getContext('bitmaprenderer');if(!this.context)throw Error('ImageBitmap presentation unavailable');this.uploadSamples=[];
  this.presentation=new Worker(presentationUrl,{type:'module'});this.presentationRequests=new Map;this.presentationRequestId=0;this.presentationVersion=0;this.pendingRetirements=new Map;
  this.display={backend:{readViewport:()=>new Promise((resolve,reject)=>{const request=++this.presentationRequestId;this.presentationRequests.set(request,{resolve,reject,read:true});this.presentation.postMessage({method:'read',request});})}};
  this.presentationReady=new Promise((resolve,reject)=>{this.presentationResolve=resolve;this.presentationReject=reject;});
  this.presentation.onmessage=({data:m})=>{
   if(this.disposed){m.bitmap?.close();for(const t of m.tiles??[])t.bitmap.close();return;}
   if(m.type==='ready'){this.presentationResolve();return;}
   if(m.type==='fault'){this.presentationReject(Error(m.error));this.fault(m.error);return;}
   if(m.type==='document'){
    const accepted=m.epoch===this.epoch&&m.version>=this.documentVersion;
    if(accepted){
     this.documentPresentation.apply(m.tiles);this.documentVersion=m.version;
     this.viewPlane.updatePaper(m.version);
     this.retireOverlays(this.viewPlane.displayedRevision());
         }else for(const t of m.tiles)t.bitmap.close();
    const request=this.presentationRequests.get(m.request);this.presentationRequests.delete(m.request);request?.resolve({accepted});return;
   }
   if(m.type==='read'){const r=this.presentationRequests.get(m.request);this.presentationRequests.delete(m.request);r?.resolve(m.pixels);return;}
   if(m.type==='image'){this.presentationMetrics=m.performance;
    const accepted=m.epoch===this.epoch&&m.version>=this.presentationVersion&&m.version>=this.documentVersion;
    if(accepted){
     // Never expose an empty bitmap: install the complete image, then retire
     // covered previews and choose the visible base as one browser task.
     if(this.canvas.width!==m.bitmap.width)this.canvas.width=m.bitmap.width;
     if(this.canvas.height!==m.bitmap.height)this.canvas.height=m.bitmap.height;
     this.context.transferFromImageBitmap(m.bitmap);this.presentationVersion=m.version;
     this.viewPlane.replacePicture(m.view,m.version);
     this.retireOverlays(this.viewPlane.displayedRevision());
    }else m.bitmap.close();
    this.onPresentation?.({kind:'display-image',at:performance.now(),accepted});
   }
  };this.presentation.onerror=e=>{this.presentationReject(Error(e.message));this.fault(e.message);};
  this.worker=new Worker(url,{type:'module'});this.requests=new Map;this.requestId=0;this.sequence=0;this.epoch=0;this.hiddenStrokeIds=new Set;this.layers=new Map;this.localFaults=[];this.errors=[];this.info={};this.completions=[];this.document={jobs:{length:0},count:0};this.backend={canvas,tiles:new Map,viewTransform:null,read:key=>this.read(key),readViewport:()=>this.call('readViewport'),readTiles:requests=>this.call('readTiles',requests)};
  this.proxy={prepare:p=>this.send('prepare',p),setEnabled:value=>this.send('overlayEnabled',value),invalidate:()=>this.send('overlayInvalidate'),pending:{size:0},finalizations:{size:0},footprints:{size:0}};this.session=new DrawingSessionPort(this);this.worker.onmessage=({data:m})=>{
   if(this.disposed){closePicture(m);return;}if(m.state)this.update(m.state);
   if(m.type==='overlay'){
    if(m.epoch!==this.epoch){closePicture(m);return;}
    this.installInkLayers(m.layers);
    this.onPresentation?.({kind:'picture-overlay',at:performance.now(),waitingForDocument:true,independent:true});
    return;
   }
   if(m.type==='picture'){this.picture(m).catch(e=>this.fault(e.message));return;}if(m.type==='fault'){this.fault(m.message);return;}
   const request=this.requests.get(m.request);if(!request)return;this.requests.delete(m.request);if(m.error)request.reject(Error(m.error));else request.resolve(m.result);
  };this.worker.onerror=e=>this.fault(e.message||'Drawing worker failed');this.worker.onmessageerror=()=>this.fault('Drawing worker message could not be decoded');
 }
 fault(message){this.localFaults.push(message);this.errors.push(message);for(const request of this.requests.values())request.reject(Error(message));this.requests.clear();for(const request of this.presentationRequests.values())request.reject(Error(message));this.presentationRequests.clear();}
 send(method,args){if(!this.disposed)this.worker.postMessage({method,args});}
 call(method,args){if(this.disposed)return Promise.reject(Error('Drawing host disposed'));const request=++this.requestId;return new Promise((resolve,reject)=>{this.requests.set(request,{resolve,reject});this.worker.postMessage({method,args,request});});}
 update(s){if(!s)return;this.info=s.info;this.errors=[...(s.errors??[]),...this.localFaults];this.completions=s.completions;this.summary=s.performance;
  Object.assign(this.document,{width:s.document.width,height:s.document.height,count:s.document.count});this.document.jobs.length=s.document.jobs;
  for(const key of ['inflight','needsFrame','viewPending','historyPreparing','guardPreparing'])this[key]=s[key];this.backend.presentationHeld=s.presentationHeld;
  for(const [key,size]of [['pending',s.proxy.pending],['finalizations',s.proxy.finalizations],['footprints',s.proxy.footprints]])this.proxy[key].size=size;
  this.proxy.error=s.proxy.error;const sessionId=this.session.id;Object.assign(this.session,s.session);this.session.id=Math.max(sessionId,s.session.id);if(s.tiles)this.backend.tiles=new Map(s.tiles.map(t=>[t.surfaceKey+'\u0000'+t.key,t]));
  if(s.recordIds)for(const [token,id]of s.recordIds){const r=this.session.recordsByToken.get(token);if(r&&id!==undefined)this.session.recordIds.set(r,id);}
 }
 installInkLayers(layers){
  const originX=this.canvas.offsetLeft,originY=this.canvas.offsetTop;
  for(const data of layers){
   let layer=this.layers.get(data.id);
   if(!layer){
    const element=document.createElement('canvas');
    element.className='illustro-stroke-overlay';
    element.setAttribute('aria-hidden','true');
    Object.assign(element.style,{position:'absolute',pointerEvents:'none',transformOrigin:'0 0',background:'transparent',aspectRatio:'auto'});
    layer={element,context:element.getContext('bitmaprenderer')};
    if(!layer.context){
     element.remove();data.bitmap.close();
     this.fault('Stroke ImageBitmap presentation unavailable');continue;
    }
    const next=[...this.layers].filter(([id])=>id>data.id).sort(([a],[b])=>a-b)[0]?.[1];
    if(next)next.element.before(element);
    else ([...this.layers].sort(([a],[b])=>a-b).at(-1)?.[1].element??this.canvas).after(element);
    this.layers.set(data.id,layer);
   }
   layer.view=data.view;layer.rect=data.rect;layer.scale=data.scale;layer.polygon=data.polygon;
   if(layer.element.width!==data.bitmap.width)layer.element.width=data.bitmap.width;
   if(layer.element.height!==data.bitmap.height)layer.element.height=data.bitmap.height;
   layer.context.transferFromImageBitmap(data.bitmap);
   const [x,y]=data.rect;
   Object.assign(layer.element.style,{left:originX+x+'px',top:originY+y+'px',
    width:layer.element.width/data.scale+'px',height:layer.element.height/data.scale+'px',
    display:this.hiddenStrokeIds.has(data.id)?'none':'block',
    clipPath:'polygon('+data.polygon.map(p=>(p.x-x)+'px '+(p.y-y)+'px').join(',')+')'});
   this.viewPlane.placeInk(layer);
  }
 }
 async picture(m){
  if(m.sequence<=this.sequence||m.epoch!==this.epoch){
   closePicture(m);this.send('pictureAck',{sequence:m.sequence,accepted:false});return;
  }
  this.sequence=m.sequence;
  const hasPages=!!m.pages?.length;
  // The display worker is allowed to take arbitrarily long to finish.
  // It cannot withhold the latest temporary ink or a future input gesture.
  // Retire the old ink ONLY when the replacement document pixels are visible.
  // When a previous exact image is still waiting for the display Worker,
  // an overlay-only retirement must NOT reveal the stale document beneath.
  // The next precise raster that actually contains the ink may retire it.
  const exactImagePending=[...this.presentationRequests.values()].some(request=>!request.read);
  if(hasPages||exactImagePending)for(const id of m.retired)this.pendingRetirements.set(id,m.sequence);
  else for(const id of m.retired){
   const layer=this.layers.get(id);layer?.element.remove();this.layers.delete(id);
  }
  this.installInkLayers(m.layers);
  this.onPresentation?.({kind:'picture-overlay',at:performance.now(),sequence:m.sequence,waitingForDocument:hasPages});
  if(hasPages){
   const request=++this.presentationRequestId;
   const shown=new Promise((resolve,reject)=>this.presentationRequests.set(request,{resolve,reject}));
   // This is document upkeep. It happens AFTER the ink is shown and must not
   // control the live camera transform, the next stroke or Undo admission.
   this.presentation.postMessage({method:'tiles',pages:m.pages,epoch:m.epoch,version:m.sequence,request},m.pages.map(p=>p.bitmap));
   const displayed=await shown;
   if(this.disposed||m.epoch!==this.epoch||!displayed.accepted){
    // Ink was already consumed by the bitmap renderer. Its local visibility
    // follows hiddenStrokeIds; later versions will replace its pixels.
    this.send('pictureAck',{sequence:m.sequence,accepted:false});return;
   }
  }
  this.retireOverlays(this.viewPlane.displayedRevision());
  this.send('pictureAck',{sequence:m.sequence,accepted:true});
  this.onPresentation?.({kind:'picture',at:performance.now(),sequence:m.sequence});
 }
 retireOverlays(version){
  for(const [id,requiredVersion]of this.pendingRetirements){
   if(requiredVersion>version)continue;
   const layer=this.layers.get(id);layer?.element.remove();this.layers.delete(id);
   this.pendingRetirements.delete(id);
  }
 }
 setViewTransform(view,localOnly=false){
  const old=this.backend.viewTransform;
  if(old&&view.every((n,i)=>n===old[i]))return;
  this.backend.viewTransform=Array.from(view);
  // This is the complete live gesture path: no Worker, GPU, bitmap or await.
  this.viewPlane.move(view);
  this.onPresentation?.({kind:'local-transform',at:performance.now(),view:Array.from(view)});
  if(!localOnly)this.publishView();
 }
 publishView(){
  const view=this.backend.viewTransform;if(!view)return;
  this.presentation.postMessage({method:'view',view});
  this.send('view',view);
 }
 setSurfaceStack(keys){this.send('stack',keys);}
 setSurfaceStyles(styles){this.send('styles',styles);}
 setSeamlessPreview(active){this.send('seamless',active);}
 clearSeamlessPreviews(id){this.send('clearSeamless',id);}
 hideStrokePreview(id){this.hiddenStrokeIds.add(id);const layer=this.layers.get(id);if(layer)layer.element.style.display='none';this.send('hide',{id,epoch:++this.epoch});}
 restoreStrokePreview(id){this.hiddenStrokeIds.delete(id);const layer=this.layers.get(id);if(layer)layer.element.style.display='block';this.send('show',{id,epoch:++this.epoch});}
 prepareHistory(){return this.call('prepareHistory');}
 resumeHistory(){this.send('resumeHistory');}
 async waitStroke(ids){return this.call('waitStroke',ids);}
 async drain(finalFrame=true){this.update(await this.call('drain',finalFrame));}
 read(surfaceKey='default'){return this.call('read',surfaceKey);}
 readPixel(x,y,surfaceKey){return this.call('pixel',{x,y,surfaceKey});}
 setPerformanceEnabled(enabled){this.send('measure',enabled);}
 performanceSummary(){return {...(this.summary??{}),displayWorker:this.presentationMetrics??null,retainedDocumentTiles:this.documentPresentation?.tiles.size??0,retainedDocumentGroups:this.documentPresentation?.tiles.size??0,deferredStrokePictures:this.pendingRetirements.size,retainedDocumentBytes:this.documentPresentation?.bytes??0};}
 frame(){return false;}
 async inspect(){const state=await this.call('inspect');this.update(state);return state;}
 destroy(){if(this.disposed)return;this.disposed=true;this.pendingRetirements.clear();this.worker.terminate();for(const request of this.requests.values())request.reject(Error('Drawing host disposed'));this.requests.clear();for(const l of this.layers.values())l.element.remove();this.layers.clear();this.viewPlane?.detach();this.documentPresentation?.destroy();this.presentation.terminate();for(const request of this.presentationRequests.values())request.reject(Error('Display host disposed'));this.presentationRequests.clear();}
}
function closePicture(m){for(const p of m.pages??[])p.bitmap?.close();for(const l of m.layers??[])l.bitmap?.close();}

class DrawingSessionPort {
 constructor(host){this.renderer=host;this.prediction=true;this.id=0;this.recordIds=new WeakMap;this.tokens=new WeakMap;this.recordsByToken=new Map;this.pending=[];this.pendingRawCount=0;this.rawAccepted=0;this.browserPredictions=0;this.errors=[];}
 begin(preset,fast=0,context={},surfaceKey='default'){if(this.active)throw Error('Stroke already active');const id=this.id+1;this.id+=9;this.active={id,count:0,token:'stroke:'+id};if(this.renderer.backend.viewTransform)this.renderer.send('view',this.renderer.backend.viewTransform);this.renderer.send('begin',{preset,fast,context,surfaceKey,id});return id;}
 accept(sample){if(!this.active)return;this.pending.push(sample);this.active.count++;this.rawAccepted++;}
 predictions(samples){this.predicted=samples;this.browserPredictions+=samples.length;}
 flush(){if(!this.active||!this.pending.length)return;this.renderer.send('samples',{samples:this.pending,predictions:this.predicted??[],prediction:this.prediction});this.pending=[];}
 frame(){this.flush();return this.renderer.frame();}
 end(release=null){if(!this.active)return Promise.resolve(null);this.flush();const active=this.active;this.active=null;this.pendingRawCount+=active.count;
  return this.renderer.call('end',{release,token:active.token}).then(record=>{if(record){this.recordIds.set(record,active.id);this.tokens.set(record,active.token);this.recordsByToken.set(active.token,record);}return record;}).finally(()=>this.pendingRawCount=Math.max(0,this.pendingRawCount-active.count));
 }
 token(record){const token=this.tokens.get(record);if(!token)throw Error('Unknown main-thread stroke');return token;}
 commitRecord(record,additional=[],surfaceKey='default'){const id=this.recordIds.get(record),ids=[id,...additional.map(item=>{const dx=item.commands[0][0]-record.commands[0][0],dy=item.commands[0][1]-record.commands[0][1];return id+(dx===0?0:dx>0?3:6)+(dy===0?0:dy>0?1:2);})];additional.forEach((item,i)=>{const token=this.token(record)+':copy:'+i;this.tokens.set(item,token);this.recordsByToken.set(token,item);this.recordIds.set(item,ids[i+1]);});this.renderer.send('commit',{token:this.token(record),additional,surfaceKey});return ids;}
 commitUndoneRecord(record,additional=[],surfaceKey='default'){additional.forEach((item,i)=>{const token=this.token(record)+':copy:'+i;this.tokens.set(item,token);this.recordsByToken.set(token,item);});this.renderer.send('commitUndone',{token:this.token(record),additional,surfaceKey});}
 forgetStaged(record){this.renderer.send('forget',{token:this.token(record)});this.recordsByToken.delete(this.token(record));}
 discardUncommitted(record){return this.renderer.call('discardUncommitted',{token:this.token(record)});}
 cancel(){this.pending=[];this.active=null;return this.renderer.call('cancel');}
 discardRedo(){this.renderer.send('discardRedo');}
 setSurfaceStack(keys){this.renderer.setSurfaceStack(keys);}
 navigateDerived(steps){return this.renderer.call('navigate',steps.map(({record,...step})=>({...step,token:this.token(record)})));}
 async restore(entries,cache,geometry){this.recordsByToken.clear();this.tokens=new WeakMap;this.recordIds=new WeakMap;
  const data=entries.map((e,i)=>{const token='restored:'+i;this.tokens.set(e.record,token);this.recordsByToken.set(token,e.record);return {record:e.record,surfaceKey:e.surfaceKey,keys:e.keys,cached:e.cached,token};});const state=await this.renderer.call('restore',{entries:data,cache,geometry});this.id=state.session.id;this.renderer.update(state);
 }
 destroy(){this.renderer.destroy();}
}
