// Deletion-only stage. Stroke, history and document messaging remain;
// bitmap display, image transfer and temporary canvas presentation are removed.
export class DrawingHost {
 static async create(canvas,width,height,backend,options,workerUrl,canonicalUrl,diagnostics=false){
  const host=new DrawingHost(canvas,workerUrl);
  try{host.update(await host.call('init',{width:canvas.width,height:canvas.height,documentWidth:width,documentHeight:height,backend,options,canonicalUrl,diagnostics,timeOrigin:performance.timeOrigin}));return host;}
  catch(error){host.destroy();throw error;}
 }
 constructor(canvas,url){
  this.remote=true;this.canvas=canvas;this.localFaults=[];this.errors=[];this.info={};this.completions=[];this.requests=new Map;this.requestId=0;
  this.document={jobs:{length:0},count:0};this.backend={canvas,tiles:new Map,viewTransform:null,read:key=>this.read(key),readViewport:()=>this.call('readViewport'),readTiles:requests=>this.call('readTiles',requests)};
  this.session=new DrawingSessionPort(this);this.worker=new Worker(url,{type:'module'});
  this.worker.onmessage=({data:m})=>{if(this.disposed)return;if(m.state)this.update(m.state);if(m.type==='fault'){this.fault(m.message);return;}const request=this.requests.get(m.request);if(!request)return;this.requests.delete(m.request);if(m.error)request.reject(Error(m.error));else request.resolve(m.result);};
  this.worker.onerror=e=>this.fault(e.message||'Drawing worker failed');this.worker.onmessageerror=()=>this.fault('Drawing worker message could not be decoded');
 }
 fault(message){this.localFaults.push(message);this.errors.push(message);for(const request of this.requests.values())request.reject(Error(message));this.requests.clear();}
 send(method,args){if(!this.disposed)this.worker.postMessage({method,args});}
 call(method,args){if(this.disposed)return Promise.reject(Error('Drawing host disposed'));const request=++this.requestId;return new Promise((resolve,reject)=>{this.requests.set(request,{resolve,reject});this.worker.postMessage({method,args,request});});}
 update(s){if(!s)return;this.info=s.info;this.errors=[...(s.errors??[]),...this.localFaults];this.completions=s.completions;this.summary=s.performance;
  Object.assign(this.document,{width:s.document.width,height:s.document.height,count:s.document.count});this.document.jobs.length=s.document.jobs;
  for(const key of ['inflight','needsFrame','viewPending','historyPreparing','guardPreparing'])this[key]=s[key];this.backend.presentationHeld=s.presentationHeld;
  const sessionId=this.session.id;Object.assign(this.session,s.session);this.session.id=Math.max(sessionId,s.session.id);if(s.tiles)this.backend.tiles=new Map(s.tiles.map(t=>[t.surfaceKey+'\u0000'+t.key,t]));
  if(s.recordIds)for(const [token,id]of s.recordIds){const r=this.session.recordsByToken.get(token);if(r&&id!==undefined)this.session.recordIds.set(r,id);}
 }
 // CanvasView owns editing coordinates; the formal GPU is not a view renderer.
 setViewTransform(view){this.backend.viewTransform=Array.from(view);}
 setSurfaceStack(keys){this.send('stack',keys);}
 setSurfaceStyles(styles){this.send('styles',styles);}
 prepareHistory(){return this.call('prepareHistory');}
 resumeHistory(){this.send('resumeHistory');}
 async waitStroke(ids){return this.call('waitStroke',ids);}
 async drain(finalFrame=true){this.update(await this.call('drain',finalFrame));}
 read(surfaceKey='default'){return this.call('read',surfaceKey);}
 readPixel(x,y,surfaceKey){return this.call('pixel',{x,y,surfaceKey});}
 setPerformanceEnabled(enabled){this.send('measure',enabled);}
 performanceSummary(){return this.summary??{};}
 frame(){return false;}
 async inspect(){const state=await this.call('inspect');this.update(state);return state;}
 destroy(){if(this.disposed)return;this.disposed=true;this.worker.terminate();for(const request of this.requests.values())request.reject(Error('Drawing host disposed'));this.requests.clear();}
}
class DrawingSessionPort {
 constructor(host){this.renderer=host;this.prediction=true;this.id=0;this.recordIds=new WeakMap;this.tokens=new WeakMap;this.recordsByToken=new Map;this.pending=[];this.pendingRawCount=0;this.rawAccepted=0;this.browserPredictions=0;this.errors=[];}
 begin(preset,fast=0,context={},surfaceKey='default'){if(this.active)throw Error('Stroke already active');const id=this.id+1;this.id+=9;this.active={id,count:0,token:'stroke:'+id};this.renderer.send('begin',{preset,fast,context,surfaceKey,id});return id;}
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
