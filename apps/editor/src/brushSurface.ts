import {StrokeHandoff,type StrokeReservation} from './strokeHandoff';
import {nativeBrushSensors} from './brushInput';
import {EmptyStrokeError} from './strokeCommit';
import {hasPixelData} from './persistence/pixelPresence';
import {canExtendProjection} from './persistence/projectionLineage';
import {readGpuTiles} from './gpuReadback';
import {TILE,validateRecord,validateFoundation,type FoundationPreset,type GpuRenderer,type RealtimeSession,type Sample,type StrokeRecord} from '@illustro/brush-rt';
import {CANONICAL_TILE_SIZE,type RevisionId,type SemanticOperation} from '@illustro/core';
import workerUrl from '../../../packages/brush-rt/dist/rt/canonical.worker.mjs?worker&url';
import type {EditorController,EditorHistoryChange} from './controller';
import {CanvasView,type Point} from './canvasView';
import {wrappedCopies} from './seamlessStroke';
import type {ProjectionCache,ProjectionCacheV1,ProjectionCheckpointDeltaV2} from './persistence/projectionCache';


export class BrushSurface{
  private readonly restoredRecords=new WeakMap<object,StrokeRecord>();
  private pendingStrokeIds=new Map<StrokeReservation,number>();private pendingBranch=false;
  private historyTraces:Array<{direction:string;id:number|null;at:number;invalidatedAt:number;kind:string}>=[];
  private handoff:StrokeHandoff|null=null;private reservation:StrokeReservation|null=null;private gpuFinishes=new Map<number,Promise<void>>();private handoffFault:string|null=null;private inputBarrier=false;private protectionQueueLength=0;
  private inputAttempts:Array<{at:number;eventAt:number;reason:string|null;acceptedAt?:number;id?:number;state:Record<string,unknown>}>=[];
  private handoffAccepted=0;private handoffRejected=0;private handoffTraces:Array<{id:number;upAt:number;readyMs:number;recordMs?:number;logicalMs?:number;parkedMs?:number;gpuMs?:number;savePrepareMs?:number;uiStateMs?:number}>=[];
  private readonly traceHandoff=new URLSearchParams(location.search).has('perf')||location.pathname.includes('/qa/perf-stroke-handoff/')||location.pathname.includes('/qa/perf-mobile4000/')||location.pathname.includes('/qa/perf-thin-stroke4000/');
  private renderer:GpuRenderer|null=null;private session:RealtimeSession|null=null;private frameId=0;private pointer:number|null=null;private finishing=false;private historySyncing=false;private previewPressureShown=false;private disposed=false;private target:ReturnType<EditorController['target']>|null=null;private presentedFrames=0;private lastPresentedAt=0;private _initializationError:string|null=null;private _projectionRestoreMs=0;private _projectionRestoreMode:'none'|'cache'|'replay-fallback'='none';private _projectionCacheRevision:string|null=null;
  private lastFrameAt=0;private viewNotificationPending=false;private checkpointMetrics={captures:0,tiles:0,batches:0,bytes:0,lastMs:0};private view:CanvasView|null=null;private resizeObserver:ResizeObserver|null=null;private touchPoints=new Map<number,Point>();private lastGesture:{center:Point;distance:number;angle:number}|null=null;
  private eyedropper=false;private eyedropperPointer:number|null=null;private sampleSource:'composite'|'layer'='composite';private pendingSample:{point:Point;phase:'preview'|'commit'}|null=null;private sampleRunning=false;private sampleEpoch=0;private foreground:readonly [number,number,number]=[.12,.15,.2];
  private wheelNavigationUntil=0;private wheelNavigationTimer:number|null=null;private panning:{id:number;point:Point}|null=null;private keyboardSpace=false;private densityMedia:MediaQueryList|null=null;private wrapOrigin:Point|null=null;private activeStrokeId:number|null=null;
  readonly abort=new AbortController();brushes:readonly FoundationPreset[]=[];preset:FoundationPreset|null=null;fingerDrawing=false;
  constructor(private canvas:HTMLCanvasElement,private controller:EditorController,private status:(text:string)=>void,private onCommitted:()=>void=()=>{},private onStateChanged:(reason?:'view'|'view-command'|'state')=>void=()=>{},private backendOverride:'auto'|'webgl2'|'webgpu'|null=null,private onSample:(rgba:readonly number[]|null,phase:'preview'|'commit'|'cancel',point:Point|null)=>void=()=>{}){}
  async initialize(){const engine=await import('@illustro/brush-rt'),target=this.controller.target();this.view=new CanvasView(target.width,target.height,document.body.classList.contains('canvas-viewport')?.94:1);
    this.canvas.style.aspectRatio=document.body.classList.contains('canvas-viewport')?'auto':target.width+' / '+target.height;
    const rect=this.canvas.getBoundingClientRect();this.view.resize(Math.max(1,rect.width),Math.max(1,rect.height));this.setBackingSize();
    const requested=new URLSearchParams(location.search).get('backend');
    this._initializationError=null;
    // Production uses capability-based auto selection. WebGPU is accepted only after
    // adapter + device + renderer pipelines + canvas presentation all initialize.
    // Only then is it used; any failure in auto mode falls back to WebGL2.
    const backend:'auto'|'webgl2'|'webgpu'=this.backendOverride??(requested==='webgpu'||requested==='webgl2'?requested:'auto');
    try{
      this.renderer=await engine.GpuRenderer.create(this.canvas,target.width,target.height,backend,{webglDesynchronized:false,strokeHandoff:true,strokeOverlay:new URLSearchParams(location.search).get('overlay')==='gpu'?false:{ratio:new URLSearchParams(location.search).get('overlayRatio')||'auto'},tileHistory:new URLSearchParams(location.search).get('tileHistory')!=='legacy',historyMemoryBudgetBytes:((navigator as Navigator&{deviceMemory?:number}).deviceMemory??0)>=8?16*1024*1024:8*1024*1024,historyGpuBudgetBytes:((navigator as Navigator&{deviceMemory?:number}).deviceMemory??0)>=8?64*1024*1024:32*1024*1024});
    }catch(error){
      const message=error instanceof Error?error.message:String(error);
      this._initializationError='GPU initialization failed: '+message;
      throw new Error(this._initializationError,{cause:error});
    }
    this.renderer.onPresentation=()=>this.markPresented();
    this.updateView();
    this.resizeObserver=new ResizeObserver(entries=>{const e=entries[0];if(!e)return;const exact=e.devicePixelContentBoxSize?.[0];this.setBackingSize(exact?{width:exact.inlineSize,height:exact.blockSize}:undefined);});
    try{this.resizeObserver.observe(this.canvas,{box:'device-pixel-content-box'});}catch{this.resizeObserver.observe(this.canvas);}
    window.addEventListener('resize',this.windowResize,{signal:this.abort.signal});
    window.addEventListener('orientationchange',this.windowResize,{signal:this.abort.signal});this.observeDensity();
    window.addEventListener('keydown',this.keyDown,{signal:this.abort.signal});
    window.addEventListener('keyup',this.keyUp,{signal:this.abort.signal});
    this.canvas.addEventListener('wheel',this.wheel,{signal:this.abort.signal,passive:false});
    this.renderer.setSurfaceStack(this.surfaceKeys());this.syncLayerStyles();this.session=new engine.RealtimeSession(this.renderer,workerUrl);this.handoff=new StrokeHandoff(this.controller,(reservation,record,additional,result,undone)=>this.publishStroke(reservation,record,additional,undone),(record,reservation)=>{this.session?.forgetStaged(record);this.pendingStrokeIds.delete(reservation);});this.brushes=engine.referenceBrushes;this.preset=structuredClone(this.brushes[0]!);(this.renderer as any).proxy?.prepare(this.preset);
    const options={signal:this.abort.signal};this.canvas.addEventListener('pointerdown',this.down,options);this.canvas.addEventListener('pointermove',this.move,options);this.canvas.addEventListener('pointerup',this.up,options);this.canvas.addEventListener('pointercancel',this.cancel,options);this.canvas.addEventListener('lostpointercapture',this.cancel,options);this.frameId=requestAnimationFrame(this.frame);this.onStateChanged();}
  private pointerLocation(e:PointerEvent|WheelEvent):Point{const r=this.canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  private setBackingSize(exact?:{width:number;height:number}){if(!this.view)return;const r=this.canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return;
    this.view.resize(r.width,r.height);const dpr=window.devicePixelRatio||1,estimatedW=Math.max(1,Math.round(r.width*dpr)),estimatedH=Math.max(1,Math.round(r.height*dpr));
    // Some emulated DPR browsers report CSS-sized devicePixelContentBox. If it disagrees
    // substantially with DPR scaling, preserve rendering fidelity by using the larger
    // DPR-aware backing rather than silently downgrading device output resolution.
    const w=exact&&Math.abs(exact.width-estimatedW)<=3?Math.max(1,exact.width):estimatedW;
    const h=exact&&Math.abs(exact.height-estimatedH)<=3?Math.max(1,exact.height):estimatedH;
    if(this.canvas.width!==w)this.canvas.width=w;if(this.canvas.height!==h)this.canvas.height=h;this.updateView();}
  private densityChanged=()=>{this.observeDensity();this.setBackingSize();};
  private observeDensity(){this.densityMedia?.removeEventListener('change',this.densityChanged);this.densityMedia=window.matchMedia('(resolution: '+(window.devicePixelRatio||1)+'dppx)');this.densityMedia.addEventListener('change',this.densityChanged);}
  private windowResize=()=>this.setBackingSize();
  private keyDown=(e:KeyboardEvent)=>{if(e.code==='Space'&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLTextAreaElement))this.keyboardSpace=true;};
  private keyUp=(e:KeyboardEvent)=>{if(e.code==='Space')this.keyboardSpace=false;};
  private syncNavigationActivity(){this.renderer?.setNavigationActive(!!this.panning||this.touchPoints.size>=2||performance.now()<this.wheelNavigationUntil);}
  private wheel=(e:WheelEvent)=>{if(!this.view)return;e.preventDefault();this.wheelNavigationUntil=performance.now()+120;this.syncNavigationActivity();if(this.wheelNavigationTimer!==null)clearTimeout(this.wheelNavigationTimer);this.wheelNavigationTimer=window.setTimeout(()=>{this.wheelNavigationTimer=null;this.syncNavigationActivity();},125);this.view.zoomAt(Math.exp(-e.deltaY*.0018),this.pointerLocation(e));this.updateView();};
  private updateView(immediate=false){if(this.view&&this.renderer){(this.renderer as GpuRenderer&{setViewTransform:(value:Float32Array)=>void}).setViewTransform(this.view.uniform(this.canvas.width,this.canvas.height));this.viewNotificationPending=!immediate;if(immediate)this.onStateChanged('view-command');}}
  get viewState(){return this.view?.state??null;}
  documentToScreen(point:Point){return this.view?.screen(point)??point;}
  screenToDocument(point:Point){return this.view?.document(point)??point;}
  get canChangeGeometry(){return !this.busy&&!!this.renderer;}
  get displayDiagnostics(){const r=this.canvas.getBoundingClientRect();return {document:{width:this.controller.document.root.width,height:this.controller.document.root.height},css:{width:r.width,height:r.height},backing:{width:this.canvas.width,height:this.canvas.height},dpr:window.devicePixelRatio,view:this.viewState};}
  fitView(){if(this.view){this.view.fit();this.updateView(true);}}
  viewAt100(){if(this.view){this.view.setZoom(1);this.updateView(true);}}
  actualPixels(){if(this.view){this.view.setZoom(1/(window.devicePixelRatio||1));this.updateView(true);}}
  zoomView(factor:number){if(this.view){this.view.zoomAt(factor,{x:this.view.cssWidth/2,y:this.view.cssHeight/2});this.updateView(true);}}
  resetRotation(){if(this.view){this.view.setRotation(0);this.updateView(true);}}
  flipView(axis:'x'|'y'){if(this.view){this.view.toggleFlip(axis);this.updateView(true);}}
  setViewZoom(zoom:number,notify=true){if(this.view){this.view.setZoom(zoom);this.updateView(notify);}}
  setViewRotation(angle:number,notify=true){if(this.view){this.view.setRotation(angle);this.updateView(notify);}}
  setSeamless(enabled:boolean){if(this.view){this.view.seamless=enabled;this.updateView(true);}}
  setReferencePattern(enabled:boolean){if(this.view){this.view.reference=enabled;this.updateView(true);}}
  private sample(e:PointerEvent):Sample{const v=this.view,d=v?v.document(this.pointerLocation(e)):this.pointerLocation(e);return {x:d.x-(this.wrapOrigin?.x??0),y:d.y-(this.wrapOrigin?.y??0),t:e.timeStamp,...nativeBrushSensors(e)};}
  private gesture(){const points=[...this.touchPoints.values()];if(points.length<2)return null;const a=points[0]!,b=points[1]!;return {center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance:Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)),angle:Math.atan2(b.y-a.y,b.x-a.x)};}
  private touchMovement(e:PointerEvent){if(!this.touchPoints.has(e.pointerId)||!this.view)return false;this.touchPoints.set(e.pointerId,this.pointerLocation(e));
    if(this.touchPoints.size>=2){const next=this.gesture();if(next&&this.lastGesture){this.view.zoomAt(next.distance/this.lastGesture.distance,this.lastGesture.center);this.view.rotateAt(next.angle-this.lastGesture.angle,this.lastGesture.center);this.view.pan(next.center.x-this.lastGesture.center.x,next.center.y-this.lastGesture.center.y);this.updateView();}this.lastGesture=next;return true;}
    if(this.panning?.id===e.pointerId){const point=this.pointerLocation(e);this.view.pan(point.x-this.panning.point.x,point.y-this.panning.point.y);this.panning.point=point;this.updateView();return true;}
    return false;
  }
  private down=(e:PointerEvent)=>{if(!this.view||!this.session||!this.preset)return;
    if(this.eyedropper){if(e.button!==0||this.eyedropperPointer!==null)return;e.preventDefault();this.eyedropperPointer=e.pointerId;this.canvas.setPointerCapture(e.pointerId);this.queueSample(this.screenToDocument(this.pointerLocation(e)),'preview');return;}
    if(e.pointerType==='touch'){e.preventDefault();this.touchPoints.set(e.pointerId,this.pointerLocation(e));this.canvas.setPointerCapture(e.pointerId);
      if(this.touchPoints.size>=2){if(this.pointer!==null)void this.cancelStroke();this.panning=null;this.lastGesture=this.gesture();this.syncNavigationActivity();return;}
      if(!this.fingerDrawing){this.panning={id:e.pointerId,point:this.pointerLocation(e)};this.syncNavigationActivity();return;}
    }else if(e.button===1||(e.button===0&&this.keyboardSpace)){e.preventDefault();this.panning={id:e.pointerId,point:this.pointerLocation(e)};this.syncNavigationActivity();this.canvas.setPointerCapture(e.pointerId);return;}
    const inputReason=e.button!==0?'button':this.pointer!==null?'pointer-active':this.finishing?'cancelling':this.historySyncing?'history':this.inputBarrier?'document-barrier':this.touchPoints.size>1?'gesture':null;const attempt=this.traceHandoff?{at:performance.now(),eventAt:e.timeStamp,reason:inputReason,state:{finishing:this.finishing,historySyncing:this.historySyncing,inputBarrier:this.inputBarrier,pendingLogical:this.handoff?.pending??0,pendingGpu:this.gpuFinishes.size,formalCommands:(this.renderer as any)?.document.count??0,pendingRaw:this.session.pendingRawCount,protectionQueue:this.protectionQueueLength}} as (typeof this.inputAttempts)[number]:null;if(attempt){this.inputAttempts.push(attempt);if(this.inputAttempts.length>1200)this.inputAttempts.shift();}if(inputReason)return;if(this.handoffFault){if(attempt)attempt.reason='fault';this.handoffRejected++;this.status('描画処理が停止しています。'+this.handoffFault);return;}const r=this.renderer as any;if((this.handoff?.pending??0)+this.gpuFinishes.size>=64||r?.document.count>100000||this.session.pendingRawCount>50000||this.protectionQueueLength>=128){if(attempt)attempt.reason='resource-limit';this.handoffRejected++;this.status('処理量の上限に達しました。作品の処理が終わるまで次の一筆をお待ちください。');return;}e.preventDefault();
    try{this.target=this.controller.target();this.pendingBranch=this.controller.canRedo;this.reservation=this.handoff!.reserve(this.target);
      const origin=this.view.document(this.pointerLocation(e)),w=this.target.width,h=this.target.height;
      this.wrapOrigin=this.view.seamless?{x:Math.floor(origin.x/w)*w,y:Math.floor(origin.y/h)*h}:null;
      this.renderer?.setSeamlessPreview(this.view.seamless);
      this.activeStrokeId=this.session.begin(this.preset,0,{},this.target.surfaceId);this.pendingStrokeIds.set(this.reservation!,this.activeStrokeId);if(attempt){attempt.acceptedAt=performance.now();attempt.id=this.activeStrokeId;}this.handoffAccepted++;const s=this.sample(e);this.session.accept(s);this.session.predictions([]);this.pointer=e.pointerId;this.canvas.setPointerCapture(e.pointerId);this.onStateChanged();}catch{this.target=null;this.status('このレイヤーには描画できません。');void this.cancelStroke();}};
  private move=(e:PointerEvent)=>{if(e.pointerId===this.eyedropperPointer){e.preventDefault();this.queueSample(this.screenToDocument(this.pointerLocation(e)),'preview');return;}if(this.touchMovement(e))return;if(this.panning?.id===e.pointerId&&this.view){e.preventDefault();const point=this.pointerLocation(e);this.view.pan(point.x-this.panning.point.x,point.y-this.panning.point.y);this.panning.point=point;this.updateView();return;}
    if(e.pointerId!==this.pointer||!this.session)return;e.preventDefault();const coalesced=e.getCoalescedEvents?.()??[],events=coalesced.length?coalesced:[e],actual:Sample[]=[];for(let i=0;i<events.length;i++){const s=this.sample(events[i]!);actual.push(s);this.session.accept(s,i===events.length-1);}const predictedEvents=e.getPredictedEvents?.()??[],predicted=this.clampPredicted(actual.at(-1)??this.sample(e),predictedEvents.slice(0,2).map(event=>({...this.sample(event),origin:'predicted'})));this.session.predictions(predicted);};
  private up=(e:PointerEvent)=>{if(e.pointerId===this.eyedropperPointer){e.preventDefault();this.eyedropperPointer=null;this.queueSample(this.screenToDocument(this.pointerLocation(e)),'commit');return;}if(this.touchPoints.has(e.pointerId)){this.touchPoints.delete(e.pointerId);this.lastGesture=this.gesture();if(this.touchPoints.size===1&&this.pointer===null){const [id,p]=this.touchPoints.entries().next().value!;this.panning={id,point:p};}}if(this.panning?.id===e.pointerId){this.panning=null;this.syncNavigationActivity();return;}this.syncNavigationActivity();if(e.pointerId!==this.pointer||!this.session||!this.target)return;const session=this.session,target=this.target,release=this.sample(e),seamless=this.view?.seamless??false,strokeId=this.activeStrokeId,reservation=this.reservation!;session.predictions([]);const upAt=performance.now();this.pointer=null;this.target=null;this.wrapOrigin=null;this.activeStrokeId=null;this.reservation=null;
    const promise=session.end({...release,origin:'release'}),trace={id:strokeId!,upAt,readyMs:performance.now()-upAt} as (typeof this.handoffTraces)[number];if(this.traceHandoff){this.handoffTraces.push(trace);if(this.handoffTraces.length>1200)this.handoffTraces.shift();}const uiAt=performance.now();this.onStateChanged();trace.uiStateMs=performance.now()-uiAt;trace.readyMs=performance.now()-upAt;
    void promise.then(async record=>{if(!record||this.disposed)return;trace.recordMs=performance.now()-upAt;const copies=seamless?wrappedCopies(record,target.width,target.height).map(copy=>copy.record):[];
      try{const result=await this.handoff!.release(reservation,record,copies);if(result)trace.logicalMs=performance.now()-upAt;else trace.parkedMs=performance.now()-upAt;}
      catch(error){if(error instanceof EmptyStrokeError){if(!this.handoff?.pending)this.pendingBranch=false;await session.discardUncommitted(record);this.status('作品の範囲外のため、線は追加されませんでした。');return;}throw error;}
    }).catch(error=>{if(this.disposed)return;this.handoffFault=error instanceof Error?error.message:String(error);this.handoff?.fail(error);this.status('線を確定できませんでした。'+this.handoffFault);}).finally(()=>{if(!this.handoff?.owns(reservation))this.pendingStrokeIds.delete(reservation);if(!this.disposed)this.onStateChanged();});};
  private publishStroke(reservation:StrokeReservation,record:StrokeRecord,additional:readonly StrokeRecord[],undone=false){
    const session=this.session!,started=performance.now();this.pendingBranch=false;this.pendingStrokeIds.delete(reservation);let ids:number[];try{session.discardRedo();if(undone){session.commitUndoneRecord(record,additional,reservation.target.surfaceId);this.onCommitted();return;}ids=session.commitRecord(record,additional,reservation.target.surfaceId);this.onCommitted();}catch(error){this.handoffFault=error instanceof Error?error.message:String(error);this.status('線の記録後に表示更新で問題が起きました。'+this.handoffFault);throw error;}const trace=this.handoffTraces.find(item=>item.id===ids[0]);if(trace)trace.savePrepareMs=performance.now()-started;
    const promise=session.renderer.waitStroke(ids).then(completion=>{if(trace&&!completion?.superseded)trace.gpuMs=performance.now()-trace.upAt;if(ids[0]!==undefined)session.renderer.clearSeamlessPreviews(ids[0]);if(!completion?.superseded&&!this.disposed&&this.pointer===null&&this.gpuFinishes.size===1)this.status(record.preset.blend==='erase'?'消した内容を作品に反映しました。':'線を作品に反映しました。');}).catch(error=>{this.handoffFault=error instanceof Error?error.message:String(error);if(!this.disposed)this.status('線の記録後に表示更新で問題が起きました。'+this.handoffFault);}).finally(()=>{this.gpuFinishes.delete(reservation.sequence);if(!this.disposed)this.onStateChanged();});this.gpuFinishes.set(reservation.sequence,promise);
  }
  setInputBarrier(enabled:boolean){this.inputBarrier=enabled;this.handoff?.setPublicationHeld(enabled);}
  setProtectionQueueLength(count:number){this.protectionQueueLength=count;}
  async settleLogicalStrokes(){await this.handoff?.barrier();}
  /** Consume a reserved entry immediately. Worker completion stays independent. */
  navigatePending(direction:'undo'|'redo'){
    if(!this.handoff||!this.renderer)return false;this.handoff.rebase();
    if(direction==='redo'&&(this.controller.canRedo&&!this.pendingBranch))return false;
    const reservation=direction==='undo'?this.handoff.undoPending():this.handoff.redoPending();if(!reservation)return false;
    const id=this.pendingStrokeIds.get(reservation);const at=performance.now();
    if(id!==undefined){if(direction==='undo')this.renderer.hideStrokePreview(id);else this.renderer.restoreStrokePreview(id);}
    this.historyTraces.push({direction,id:id??null,at,invalidatedAt:performance.now(),kind:'reserved'});if(this.historyTraces.length>1200)this.historyTraces.shift();
    this.handoff.resume();this.onStateChanged();return true;
  }
  admitHistory(change:EditorHistoryChange){
    if(change.changed)for(const op of change.operations)if(op.kind==='brush.stroke'){
      const record=this.strokeRecord(op),id=(this.session as any)?.recordIds.get(record);if(id!==undefined){const at=performance.now();if(change.direction==='undo')this.renderer?.hideStrokePreview(id);else this.renderer?.restoreStrokePreview(id);this.historyTraces.push({direction:change.direction,id,at,invalidatedAt:performance.now(),kind:'published'});}
    }this.handoff?.rebase();if(this.historyTraces.length>1200)this.historyTraces.splice(0,this.historyTraces.length-1200);
  }
  get canUndo(){return this.handoff?.canUndo||this.controller.canUndo;}
  get canRedo(){return this.handoff?.canRedo||(!this.pendingBranch&&this.controller.canRedo);}
  async prepareHistory(){await this.renderer?.prepareHistory();}
  resumeHistory(){this.renderer?.resumeHistory();}
  async settleStrokes(){await this.settleLogicalStrokes();await Promise.all(this.gpuFinishes.values());if(this.handoffFault)throw new Error(this.handoffFault);}
  get hasUncommittedInput(){return this.pointer!==null||(this.handoff?.pending??0)>0;}
  get hasPendingStrokes(){return (this.handoff?.pending??0)>0||this.gpuFinishes.size>0;}
  get inputActive(){return this.pointer!==null||this.finishing||this.historySyncing;}
  private cancel=(e:PointerEvent)=>{if(e.pointerId===this.eyedropperPointer){this.eyedropperPointer=null;this.pendingSample=null;this.sampleEpoch++;this.onSample(null,'cancel',null);return;}this.touchPoints.delete(e.pointerId);this.lastGesture=this.gesture();if(this.panning?.id===e.pointerId)this.panning=null;this.syncNavigationActivity();if(e.pointerId===this.pointer)void this.cancelStroke();};
  private async cancelStroke(){const id=this.activeStrokeId;if(this.reservation){this.handoff?.cancel(this.reservation);this.pendingStrokeIds.delete(this.reservation);if(!this.handoff?.pending)this.pendingBranch=false;this.reservation=null;}this.pointer=null;this.target=null;this.wrapOrigin=null;this.activeStrokeId=null;this.finishing=true;this.onStateChanged();try{this.session?.predictions([]);await this.session?.cancel();}catch{this.status('描画を取り消せませんでした。');}finally{if(id!==null)this.renderer?.clearSeamlessPreviews(id);this.renderer?.setSeamlessPreview(false);this.finishing=false;this.onStateChanged();}}
  private frame=(now:number)=>{if(this.disposed)return;this.lastFrameAt=performance.now();this.session?.frame(now);if(this.viewNotificationPending){this.viewNotificationPending=false;this.onStateChanged('view');}const pressure=!!(this.renderer as any)?.backend.previewPressure;if(pressure!==this.previewPressureShown){this.previewPressureShown=pressure;if(pressure)this.status('表示処理が混み合っています。入力を保持して線の確定を優先しています。');else if(!this.handoffFault&&!this.historySyncing)this.status('描画を続けられます。');this.onStateChanged();}if(this.renderer?.errors.length||this.session?.errors.length)this.status('描画中に問題が起きました。');this.frameId=requestAnimationFrame(this.frame);};
  private markPresented(){this.presentedFrames++;this.lastPresentedAt=performance.now();const diagnostic=this.canvas as HTMLCanvasElement&{__illustroPresentationFrames?:number;__illustroPresentationLastAt?:number};diagnostic.__illustroPresentationFrames=this.presentedFrames;diagnostic.__illustroPresentationLastAt=this.lastPresentedAt;}
  async inspectRendering(){
    const backend=(this.renderer as unknown as {backend?:{
      readViewport?:()=>Uint8ClampedArray|Promise<Uint8ClampedArray>;
      gl?:WebGL2RenderingContext;
    }}|null)?.backend;
    const summarize=(data:Uint8ClampedArray|Uint8Array,width:number,height:number)=>{
      let sampled=0,transparent=0,opaque=0,blackOpaque=0,whiteOpaque=0,painted=0,sumAlpha=0;
      for(let i=0;i<data.length;i+=4*16){
        const r=data[i]??0,g=data[i+1]??0,b=data[i+2]??0,a=data[i+3]??0;
        sampled++;sumAlpha+=a;
        if(a<8)transparent++;
        if(a>247)opaque++;
        if(a>247&&r<20&&g<20&&b<20)blackOpaque++;
        if(a>247&&r>235&&g>235&&b>235)whiteOpaque++;
        if(a>24&&r<170&&g<170&&b<170)painted++;
      }
      const pixel=(x:number,y:number)=>{const i=(y*width+x)*4;return Array.from(data.slice(i,i+4));};
      return {width,height,sampled,transparent,opaque,blackOpaque,whiteOpaque,painted,meanAlpha:Math.round(sumAlpha/Math.max(1,sampled)),
        corner:pixel(0,0),center:pixel(Math.floor(width/2),Math.floor(height/2))};
    };
    const diagnostics:Record<string,unknown>={display:this.displayDiagnostics,
      time:new Date().toISOString(),backend:this.backend,rendererInfo:this.renderer?.info,
      rendererErrors:[...(this.renderer?.errors??[])].slice(-8),sessionErrors:[...(this.session?.errors??[])].slice(-8),
      committedStrokes:this.controller.committedStrokeCount,rawAccepted:this.session?.rawAccepted??0,
      completeFrames:this.presentedFrames,latestGpuMetrics:this.renderer?.completions.slice(-2),
      fingerDrawing:this.fingerDrawing,previewPresent:!!(this.renderer as any)?.proxy,previewVisible:((this.renderer as any)?.proxy?.footprints.size??0)>0,previewContext:(this.renderer as any)?.proxy?.transport??null,
      browserPredictionSamples:this.session?.browserPredictions??0,
      canvasCss:{background:getComputedStyle(this.canvas).backgroundColor,opacity:getComputedStyle(this.canvas).opacity}
    };
    if(backend?.gl){diagnostics.webglContext=backend.gl.getContextAttributes();diagnostics.webglLost=backend.gl.isContextLost();diagnostics.webglError=backend.gl.getError();}
    try{if(backend?.readViewport){const p=await backend.readViewport();diagnostics.gpuArtwork=summarize(p,this.controller.document.root.width,this.controller.document.root.height);}}
    catch(e){diagnostics.gpuArtworkError=String(e);}
    try{if(this.renderer){const surfaceId=this.controller.selectedLayer.surface.descriptor.surfaceId,p=await this.renderer.read(surfaceId);diagnostics.selectedRasterSurface={surfaceId,...summarize(p,this.controller.document.root.width,this.controller.document.root.height)};}}
    catch(e){diagnostics.selectedRasterSurfaceError=String(e);}
    try{
      const bitmap=await createImageBitmap(this.canvas);
      const tmp=document.createElement('canvas');tmp.width=this.canvas.width;tmp.height=this.canvas.height;
      const ctx=tmp.getContext('2d',{willReadFrequently:true});
      if(ctx){ctx.drawImage(bitmap,0,0);diagnostics.gpuVisibleCanvas=summarize(ctx.getImageData(0,0,tmp.width,tmp.height).data,tmp.width,tmp.height);}
      bitmap.close();
    }catch(e){diagnostics.gpuVisibleCanvasError=String(e);}
    return diagnostics;
  }
  private clampPredicted(last:Sample,predicted:Sample[]){if(!predicted.length)return[];const r=this.canvas.getBoundingClientRect(),target=this.target??this.controller.target(),maxLead=Math.max(1,target.width/Math.max(1,r.width)*3),out:Sample[]=[];let anchor=last;for(const p of predicted){let x=p.x,y=p.y;const dx=x-anchor.x,dy=y-anchor.y,d=Math.hypot(dx,dy);if(d>maxLead){const k=maxLead/d;x=anchor.x+dx*k;y=anchor.y+dy*k;}out.push({...p,x,y});anchor={...p,x,y};}return out;}
  async syncHistory(change:EditorHistoryChange){await this.syncHistoryBatch([change]);}
  async syncHistoryBatch(changes:readonly EditorHistoryChange[]){
    if(!changes.length)return;if(!this.session)throw new Error('Renderer is not initialized');if(this.pointer!==null||this.finishing||this.historySyncing)throw new Error('History is busy');
    this.historySyncing=true;this.onStateChanged();try{
      this.syncLayerStack();const steps:import('@illustro/brush-rt').DerivedHistoryStep[]=[];
      for(const change of changes){const operations=change.direction==='undo'?[...change.operations].reverse():change.operations;
        for(const operation of operations){if(operation.kind!=='brush.stroke')continue;steps.push({direction:change.direction,record:this.strokeRecord(operation),keys:this.runtimeKeys(operation),surfaceKey:this.surfaceForOperation(operation,change.direction==='undo'?change.fromRevision:change.toRevision)});}
      }await this.session.navigateDerived(steps);
    }finally{this.historySyncing=false;this.onStateChanged();}
  }
  async captureProjectionCache(revisionId:string):Promise<ProjectionCacheV1>{
    if(!this.renderer||!this.session)throw new Error('Renderer is not initialized');if(this.busy||this.controller.document.head!==revisionId)throw new Error('Projection cache capture is stale');
    const root=this.controller.document.root,layers:Array<{surfaceId:string;pixels:Uint8Array}>=[];
    for(const layer of this.controller.layers){
      if(this.busy||this.controller.document.head!==revisionId)throw new Error('Projection cache capture is stale');
      const pixels=await this.renderer.read(layer.surface.descriptor.surfaceId);layers.push({surfaceId:layer.surface.descriptor.surfaceId,pixels:new Uint8Array(pixels)});
    }
    if(this.busy||this.controller.document.head!==revisionId)throw new Error('Projection cache capture is stale');
    return Object.freeze({version:1 as const,revisionId,width:root.width,height:root.height,layers:Object.freeze(layers.map(layer=>Object.freeze(layer)))});
  }
  async captureProjectionDelta(revisionId:string,operations?:readonly SemanticOperation[]):Promise<ProjectionCheckpointDeltaV2>{
    if(!this.renderer||!this.session)throw new Error('Renderer is not initialized');if(this.busy||this.controller.document.head!==revisionId)throw new Error('Projection checkpoint capture is stale');
    const started=performance.now(),root=this.controller.document.root,bySurface=new Map<string,Set<string>>(),backend=(this.renderer as unknown as {backend?:any}).backend;
    await this.renderer.drain(false);const valid=()=>!this.disposed&&!this.busy&&this.controller.document.head===revisionId;
    if(operations===undefined){
      const active=new Set(this.controller.layers.map(layer=>layer.surface.descriptor.surfaceId));
      for(const tile of backend.tiles.values()){if(!active.has(tile.surfaceKey))continue;const keys=bySurface.get(tile.surfaceKey)??new Set<string>();keys.add(tile.key);bySurface.set(tile.surfaceKey,keys);}
    }else for(const operation of operations){
      for(const footprint of operation.dirtyFootprint){
        if(!root.hasLayer(footprint.layerId))continue;
        const surfaceId=root.getLayer(footprint.layerId).surface.descriptor.surfaceId,set=bySurface.get(surfaceId)??new Set<string>();bySurface.set(surfaceId,set);
        const x0=footprint.tileX*CANONICAL_TILE_SIZE+footprint.bounds.x0,y0=footprint.tileY*CANONICAL_TILE_SIZE+footprint.bounds.y0,x1=footprint.tileX*CANONICAL_TILE_SIZE+footprint.bounds.x1,y1=footprint.tileY*CANONICAL_TILE_SIZE+footprint.bounds.y1;
        const minX=Math.max(0,Math.floor(x0/TILE)),minY=Math.max(0,Math.floor(y0/TILE)),maxX=Math.min(Math.ceil(root.width/TILE)-1,Math.ceil(x1/TILE)-1),maxY=Math.min(Math.ceil(root.height/TILE)-1,Math.ceil(y1/TILE)-1);
        for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)set.add(x+','+y);
      }
    }
    const tiles:Array<{surfaceId:string;key:string;pixels:Uint8Array}>=[],requests=[...bySurface].flatMap(([surfaceId,keys])=>[...keys].map(key=>({surfaceId,key})));
    for(let offset=0;offset<requests.length;offset+=16){
      tiles.push(...await readGpuTiles(backend,requests.slice(offset,offset+16),valid));this.checkpointMetrics.batches++;
      // Let input and screen presentation run between bounded transfer batches.
      if(offset+16<requests.length)await new Promise<void>(resolve=>setTimeout(resolve,0));
    }
    this.checkpointMetrics.captures++;this.checkpointMetrics.tiles+=tiles.length;this.checkpointMetrics.bytes+=tiles.length*TILE*TILE*4;this.checkpointMetrics.lastMs=performance.now()-started;
    if(this.busy||this.controller.document.head!==revisionId)throw new Error('Projection checkpoint capture is stale');
    return Object.freeze({version:2 as const,replace:operations===undefined,revisionId,width:root.width,height:root.height,tileSize:TILE,surfaceIds:Object.freeze(this.controller.layers.map(layer=>layer.surface.descriptor.surfaceId)),tiles:Object.freeze(tiles.map(tile=>Object.freeze(tile)))});
  }
  /** Build a small artwork preview from occupied GPU tiles, without allocating full-size layer bitmaps. */
  async captureWorkThumbnail():Promise<Blob>{
    if(!this.renderer||this.busy||this.disposed)throw new Error('描画処理が完了していません。');
    await this.renderer.drain();
    if(this.busy||this.disposed)throw new Error('描画状態が変更されました。');
    const root=this.controller.document.root,scale=Math.min(1,320/root.width,240/root.height);
    const width=Math.max(1,Math.round(root.width*scale)),height=Math.max(1,Math.round(root.height*scale));
    const output=new OffscreenCanvas(width,height),context=output.getContext('2d');
    if(!context)throw new Error('Thumbnail 2D canvas unavailable');
    const backend=(this.renderer as unknown as {backend?:any}).backend;
    if(!backend?.tiles?.values)throw new Error('GPU tile snapshot unavailable');
    const occupied=[...backend.tiles.values()] as {key:string;surfaceKey:string;x:number;y:number}[];
    const tileCanvas=new OffscreenCanvas(TILE,TILE),tileContext=tileCanvas.getContext('2d');
    if(!tileContext)throw new Error('Thumbnail tile canvas unavailable');
    for(const layer of this.controller.layers){
      if(!layer.visible||layer.opacity<=0)continue;
      const key=layer.surface.descriptor.surfaceId;
      const layerCanvas=new OffscreenCanvas(width,height),layerContext=layerCanvas.getContext('2d');
      if(!layerContext)throw new Error('Thumbnail layer canvas unavailable');
      const tiles=occupied.filter(tile=>tile.surfaceKey===key),revision=this.controller.document.head,valid=()=>!this.busy&&!this.disposed&&this.controller.document.head===revision;
      for(let offset=0;offset<tiles.length;offset+=16){
        const batch=tiles.slice(offset,offset+16),read=await readGpuTiles(backend,batch.map(tile=>({surfaceId:key,key:tile.key})),valid);
        for(let index=0;index<batch.length;index++){const tile=batch[index]!,pixels=read[index]!.pixels;
          const imageData=new ImageData(new Uint8ClampedArray(pixels),TILE,TILE);tileContext.putImageData(imageData,0,0);
          layerContext.drawImage(tileCanvas,tile.x*scale,tile.y*scale,TILE*scale,TILE*scale);
        }
        if(offset+16<tiles.length)await new Promise<void>(resolve=>setTimeout(resolve,0));
      }
      context.globalAlpha=layer.opacity;context.drawImage(layerCanvas,0,0);
    }
    if(this.busy||this.disposed)throw new Error('Thumbnail became stale');
    return output.convertToBlob({type:'image/png'});
  }
  async captureDocumentLayers(){if(!this.renderer||this.busy)throw new Error('画像を変更できません。描画終了後に操作してください。');
    await this.renderer.drain();
    const result=new Map<ReturnType<EditorController['target']>['layerId'],Uint8Array>();
    for(const layer of this.controller.layers){const bytes=await this.renderer.read(layer.surface.descriptor.surfaceId);result.set(layer.id,new Uint8Array(bytes));}
    return result;
  }
  async restoreDocumentProjection(cache?:ProjectionCache){
    if(!this.session||!this.renderer)throw new Error('Renderer is not initialized');if(this.busy)throw new Error('Renderer is busy');
    const started=performance.now();this.historySyncing=true;this.onStateChanged();let held=false,complete=false;
    const renderer=this.renderer as unknown as {backend?:any;formalQuantum?:number;frame:(now:number)=>boolean;document:{append:(id:number,preset:unknown,commands:readonly Float64Array[],filter:Set<string>|null,surfaceKey:string)=>void;end:(id:number,preset:unknown,surfaceKey:string)=>readonly string[]};drain:(finalFrame?:boolean)=>Promise<void>;reset:()=>Promise<void>;needsFrame:boolean};
    const runtime=this.session as unknown as {records:StrokeRecord[];redoRecords:StrokeRecord[];id:number;recordSurfaces:WeakMap<StrokeRecord,string>;recordTiles:WeakMap<StrokeRecord,string[]>;recordIds:WeakMap<StrokeRecord,number>;recordOrder:WeakMap<StrokeRecord,number>;tileRecords:Map<string,StrokeRecord[]>;nextRecordOrder:number;indexRecord:(record:StrokeRecord,keys:readonly string[],surfaceKey:string)=>void;presetForRecord:(record:StrokeRecord)=>unknown;rebuild:()=>Promise<void>};
    const originalFrame=renderer.frame;
    try{
      this.syncLayerStack();const operations=this.controller.document.operationsTo(),geometryIndex=operations.findLastIndex(op=>op.kind==='document.crop'||op.kind==='document.canvas-resize'||op.kind==='document.image-resize');
      const geometry=geometryIndex>=0;((this.renderer as any).proxy)?.setEnabled(!geometry);const visibleOperations=geometry?operations.slice(geometryIndex+1):operations;
      const entries:Array<{operation:SemanticOperation;record:StrokeRecord;surfaceKey:string;keys:string[]}>=[];for(const operation of visibleOperations){
        if(operation.kind==='brush.stroke'){const record=validateRecord(operation.parameters.strokeRecord);this.restoredRecords.set(operation.parameters.strokeRecord as object,record);entries.push({operation,record,surfaceKey:this.surfaceForOperation(operation),keys:this.runtimeKeys(operation)});}
        else if(operation.kind==='raster.strict-delta')throw new Error('Direct raster deltas outside geometry need materialization');
      }
      const root=this.controller.document.root;
      const savedCache=this.validProjectionCache(cache);
      const baseGeometry:ProjectionCacheV1|undefined=geometry&&!savedCache?{version:1,revisionId:this.controller.document.head,width:root.width,height:root.height,layers:this.controller.layers.map(layer=>({surfaceId:layer.surface.descriptor.surfaceId,pixels:this.controller.document.readBaseRasterPixels(layer.id)}))}:undefined;
      const validCache=savedCache??this.validProjectionCache(baseGeometry);
      if(renderer.backend?.setPresentationHeld){renderer.backend.setPresentationHeld(true);held=true;}
      renderer.frame=(now:number)=>{renderer.formalQuantum=Math.max(256,renderer.formalQuantum??0);return originalFrame.call(renderer,now);};
      if(validCache){
        await renderer.reset();this.syncLayerStack();this.resetDerivedRuntime(runtime);
        const cachedKeys=geometry&&!savedCache?new Set<SemanticOperation['key']>():new Set(this.controller.document.operationsTo(validCache.revisionId as RevisionId).filter(operation=>operation.kind==='brush.stroke').map(operation=>operation.key));
        await this.seedProjectionCache(validCache,renderer.backend);
        runtime.records=entries.map(entry=>entry.record);runtime.redoRecords=[];
        for(const entry of entries){
          const id=++runtime.id;(runtime as any).seedSequence=Math.max((runtime as any).seedSequence??0,entry.record.seed[1]);runtime.recordIds.set(entry.record,id);runtime.recordSurfaces.set(entry.record,entry.surfaceKey);runtime.indexRecord(entry.record,entry.keys,entry.surfaceKey);
          if(!cachedKeys.has(entry.operation.key)){const preset=runtime.presetForRecord(entry.record);renderer.document.append(id,preset,entry.record.commands as unknown as readonly Float64Array[],null,entry.surfaceKey);renderer.document.end(id,preset,entry.surfaceKey);}
        }
        renderer.needsFrame=true;await renderer.drain();this._projectionRestoreMode='cache';this._projectionCacheRevision=validCache.revisionId;
      }else{
        runtime.records=entries.map(entry=>entry.record);runtime.redoRecords=[];for(const entry of entries)runtime.recordSurfaces.set(entry.record,entry.surfaceKey);
        await runtime.rebuild();this._projectionRestoreMode='replay-fallback';this._projectionCacheRevision=null;
      }
      complete=true;
    }finally{
      renderer.frame=originalFrame;if(held)renderer.backend?.setPresentationHeld?.(false);
      if(complete){await renderer.backend?.presentCurrent?.();(this.renderer as any).proxy?.invalidate();}
      this._projectionRestoreMs=performance.now()-started;this.historySyncing=false;this.onStateChanged();
    }
  }
  private validProjectionCache(cache?:ProjectionCache){
    if(!cache||(cache.version!==1&&cache.version!==2)||cache.width!==this.controller.document.root.width||cache.height!==this.controller.document.root.height||!this.controller.document.hasRevision(cache.revisionId as RevisionId))return null;
    if(!canExtendProjection(this.controller.document.operationsTo(cache.revisionId as RevisionId),this.controller.document.operationsTo()))return null;
    const root=this.controller.document.revision(cache.revisionId as RevisionId).root,expected=new Set<string>(root.rootLayerIds.map(id=>root.getLayer(id).surface.descriptor.surfaceId)),seen=new Set<string>(),bytes=cache.width*cache.height*4;
    for(const layer of cache.layers){
      if(!expected.has(layer.surfaceId)||seen.has(layer.surfaceId))return null;seen.add(layer.surfaceId);
      if(cache.version===1){if(!('pixels' in layer)||layer.pixels.byteLength!==bytes)return null;}
      else{
        if(cache.tileSize!==TILE||!('tiles' in layer))return null;
        const keys=new Set<string>();for(const tile of layer.tiles){
          if(!/^\d+,\d+$/.test(tile.key)||keys.has(tile.key)||tile.pixels.byteLength!==TILE*TILE*4)return null;
          const [tx=NaN,ty=NaN]=tile.key.split(',').map(Number);
          if(!Number.isSafeInteger(tx)||!Number.isSafeInteger(ty)||tx<0||ty<0||tx>=Math.ceil(cache.width/TILE)||ty>=Math.ceil(cache.height/TILE))return null;
          keys.add(tile.key);
        }
      }
    }if(seen.size!==expected.size)return null;return cache;
  }
  private resetDerivedRuntime(runtime:{id:number;recordSurfaces:WeakMap<StrokeRecord,string>;recordTiles:WeakMap<StrokeRecord,string[]>;recordIds:WeakMap<StrokeRecord,number>;recordOrder:WeakMap<StrokeRecord,number>;tileRecords:Map<string,StrokeRecord[]>;nextRecordOrder:number}){
    runtime.recordSurfaces=new WeakMap();runtime.recordTiles=new WeakMap();runtime.recordIds=new WeakMap();runtime.recordOrder=new WeakMap();runtime.tileRecords=new Map();runtime.nextRecordOrder=0;runtime.id=0;
  }
  private async seedProjectionCache(cache:ProjectionCache,backend:any){
    if(!backend?.tile||!backend?.dirtyConfirmed)throw new Error('Projection cache upload unavailable');
    const upload=(key:string,surfaceId:string,pixels:Uint8Array)=>{
      if(!hasPixelData(pixels))return;
      const t=backend.tile(key,surfaceId),target=t.layer[t.l];
      if(backend.gl){const g=backend.gl;g.bindTexture(g.TEXTURE_2D,target.t);g.texSubImage2D(g.TEXTURE_2D,0,0,0,TILE,TILE,g.RGBA,g.UNSIGNED_BYTE,pixels);}
      else if(backend.device){backend.device.queue.writeTexture({texture:target},pixels,{bytesPerRow:TILE*4},[TILE,TILE]);}
      else throw new Error('Projection cache upload backend unsupported');
      t.committedId=-1;backend.dirtyConfirmed.add(key);
    };
    if(cache.version===2){
      for(const layer of cache.layers)for(const tile of layer.tiles)upload(tile.key,layer.surfaceId,tile.pixels);
    }else{
      const width=cache.width,height=cache.height;
      for(const layer of cache.layers)for(let ty=0;ty<Math.ceil(height/TILE);ty++)for(let tx=0;tx<Math.ceil(width/TILE);tx++){
        const tile=new Uint8Array(TILE*TILE*4);const copyW=Math.min(TILE,width-tx*TILE),copyH=Math.min(TILE,height-ty*TILE);
        for(let y=0;y<copyH;y++){const source=((ty*TILE+y)*width+tx*TILE)*4,target=y*TILE*4;tile.set(layer.pixels.subarray(source,source+copyW*4),target);}
        upload(tx+','+ty,layer.surfaceId,tile);
      }
    }
    if(backend.device)await backend.device.queue.onSubmittedWorkDone();
  }
  syncLayerStack(){const keys=this.surfaceKeys();this.renderer?.setSurfaceStack(keys);this.session?.setSurfaceStack(keys);this.syncLayerStyles();}
  discardRedoProjection(){this.handoff?.discardRedo();this.session?.discardRedo();}
  private syncLayerStyles(){this.renderer?.setSurfaceStyles(this.controller.layers.map(layer=>({surfaceKey:layer.surface.descriptor.surfaceId,visible:layer.visible,opacity:layer.opacity})));}
  private surfaceKeys(){return this.controller.layers.map(layer=>layer.surface.descriptor.surfaceId);}
  private surfaceForOperation(operation:SemanticOperation,revisionId?:RevisionId){const target=operation.targetEntityIds[0],root=revisionId?this.controller.document.revision(revisionId).root:this.controller.document.root;if(!target||!root.hasLayer(target))throw new Error('History target layer missing');return root.getLayer(target).surface.descriptor.surfaceId;}
  private strokeRecord(operation:SemanticOperation){const record=operation.parameters.strokeRecord;if(!record||typeof record!=='object'||!Array.isArray((record as StrokeRecord).commands))throw new Error('History stroke record missing');return this.restoredRecords.get(record as object)??record as StrokeRecord;}
  private runtimeKeys(operation:SemanticOperation){const root=this.controller.document.root,keys=new Set<string>(),maxX=Math.ceil(root.width/TILE)-1,maxY=Math.ceil(root.height/TILE)-1;
    for(const f of operation.dirtyFootprint){const x0=f.tileX*CANONICAL_TILE_SIZE+f.bounds.x0,y0=f.tileY*CANONICAL_TILE_SIZE+f.bounds.y0,x1=f.tileX*CANONICAL_TILE_SIZE+f.bounds.x1,y1=f.tileY*CANONICAL_TILE_SIZE+f.bounds.y1;
      const minX=Math.max(0,Math.floor(x0/TILE)),minY=Math.max(0,Math.floor(y0/TILE)),endX=Math.min(maxX,Math.ceil(x1/TILE)-1),endY=Math.min(maxY,Math.ceil(y1/TILE)-1);
      for(let y=minY;y<=endY;y++)for(let x=minX;x<=endX;x++)keys.add(x+','+y);}
    return [...keys];
  }
  setForegroundColor(color:readonly [number,number,number]){if(!color.every(x=>Number.isFinite(x)&&x>=0&&x<=1))return;this.foreground=[...color] as [number,number,number];if(this.preset?.blend!=='erase'&&this.preset)this.preset.color=[...this.foreground];}
  setEyedropper(enabled:boolean,source:'composite'|'layer'='composite'){if(!enabled&&this.eyedropperPointer!==null){this.eyedropperPointer=null;this.pendingSample=null;this.sampleEpoch++;this.onSample(null,'cancel',null);}this.eyedropper=enabled;this.sampleSource=source;}
  private queueSample(point:Point,phase:'preview'|'commit'){this.pendingSample={point,phase};if(!this.sampleRunning)void this.flushSamples();}
  private async flushSamples(){this.sampleRunning=true;const epoch=this.sampleEpoch;try{while(this.pendingSample&&epoch===this.sampleEpoch&&!this.disposed){const requested=this.pendingSample;this.pendingSample=null;let rgba:readonly number[]|null=null;try{rgba=await this.readOnePixel(requested.point);}catch(error){this.status('色を取得できませんでした。'+(error instanceof Error?error.message:String(error)));}
    if(epoch!==this.sampleEpoch||this.disposed)return;if(this.pendingSample&&requested.phase!=='commit')continue;this.onSample(rgba,requested.phase,requested.point);
   }}finally{this.sampleRunning=false;if(this.pendingSample&&!this.disposed)void this.flushSamples();}}
  /** Read only a 1x1 GPU region. Neither a canvas readback nor a layer recomposition is allowed here. */
  private async readOnePixel(point:Point):Promise<readonly number[]|null>{
   const x=Math.floor(point.x),y=Math.floor(point.y),w=this.controller.document.root.width,h=this.controller.document.root.height;
   if(x<0||y<0||x>=w||y>=h)return null;
   const backend=(this.renderer as unknown as {backend?:any}|null)?.backend;if(!backend)return null;
   const layer=this.sampleSource==='layer',key=Math.floor(x/TILE)+','+Math.floor(y/TILE),surfaceKey=this.controller.selectedLayer.surface.descriptor.surfaceId;
   const tile=layer?backend.tiles?.get(surfaceKey+'\u0000'+key):null;
   if(layer&&!tile)return [0,0,0,0];
   const sx=layer?x%TILE:x,sy=layer?y%TILE:y;
   if(backend.gl){const gl=backend.gl as WebGL2RenderingContext,out=new Uint8Array(4);
    gl.bindFramebuffer(gl.FRAMEBUFFER,layer?tile.layer[tile.l].f:backend.liveTarget.f);
    gl.readPixels(sx,layer?sy:h-1-sy,1,1,gl.RGBA,gl.UNSIGNED_BYTE,out);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);return [...out];
   }
   if(backend.device){const device=backend.device as any,texture=layer?tile.layer[tile.l]:backend.liveTarget;
    const buffer=device.createBuffer({size:256,usage:(globalThis as any).GPUBufferUsage.COPY_DST|(globalThis as any).GPUBufferUsage.MAP_READ});
    try{const encoder=device.createCommandEncoder();encoder.copyTextureToBuffer({texture,origin:{x:sx,y:sy,z:0}},{buffer,bytesPerRow:256,rowsPerImage:1},{width:1,height:1,depthOrArrayLayers:1});device.queue.submit([encoder.finish()]);await buffer.mapAsync((globalThis as any).GPUMapMode.READ);const raw=new Uint8Array(buffer.getMappedRange());const bgra=!layer&&String(backend.format).startsWith('bgra');const result=[raw[bgra?2:0]??0,raw[1]??0,raw[bgra?0:2]??0,raw[3]??0];buffer.unmap();return result;}
    finally{buffer.destroy();}
   }
   return null;
  }
  /** Refresh preset catalog without mutating an in-flight stroke or the artwork. */
  setBrushes(brushes:readonly FoundationPreset[]){
    if(!brushes.length||brushes.length>256)throw Error('invalid brush collection');
    const seen=new Set<string>();
    this.brushes=brushes.map(p=>{
      const valid=structuredClone(validateFoundation(p));
      if(seen.has(valid.id))throw Error('duplicate brush preset ID');
      seen.add(valid.id);return valid;
    });
    if(this.preset&&!seen.has(this.preset.id))this.select(0);
  }
  /** Apply a validated preset for subsequent strokes only; existing records stay unchanged. */
  applyPreset(candidate:FoundationPreset){
    if(this.inputActive)throw Error('描画中はブラシ設定を変更できません');
    const validated=structuredClone(validateFoundation(candidate));
    if(!this.brushes.some(p=>p.id===validated.id))throw Error('unknown brush ID');
    this.preset=validated;
    if(this.preset.blend!=='erase')this.preset.color=[...this.foreground];
    (this.renderer as any)?.proxy?.prepare(this.preset);
  }
  select(index:number){const p=this.brushes[index];if(p){this.preset=structuredClone(p);if(this.preset.blend!=='erase')this.preset.color=[...this.foreground];(this.renderer as any)?.proxy?.prepare(this.preset);}}selectById(id:string){const p=this.brushes.find(item=>item.id===id);if(!p)throw new Error('brush preset not found');this.preset=structuredClone(p);if(this.preset.blend!=='erase')this.preset.color=[...this.foreground];(this.renderer as any)?.proxy?.prepare(this.preset);}setSize(value:number){if(this.preset&&Number.isFinite(value)&&value>=.1&&value<=1024){this.preset.size=value;(this.renderer as any)?.proxy?.prepare(this.preset);}}setForceFade(enabled:boolean){if(this.preset?.forceFade)this.preset.forceFade.enabled=enabled;}
  setPerformanceEnabled(enabled:boolean){this.renderer?.setPerformanceEnabled(enabled);}
  handoffProbe(){return {renderer:this.renderer,session:this.session,controller:this.controller};}
  get performanceDiagnostics(){const r=this.renderer as any;return {...this.renderer?.performanceSummary(),handoff:{inputAttempts:this.traceHandoff?this.inputAttempts:[],accepted:this.handoffAccepted,rejected:this.handoffRejected,pendingLogical:this.handoff?.pending??0,pendingGpu:this.gpuFinishes.size,pendingEntries:this.handoff?.diagnostics,historyVisibility:this.historyTraces,protectionQueue:this.protectionQueueLength,fault:this.handoffFault,traces:this.traceHandoff?this.handoffTraces:[]},frameState:{lastFrameAt:this.lastFrameAt,disposed:this.disposed,pointer:this.pointer,finishing:this.finishing,historySyncing:this.historySyncing,inputBarrier:this.inputBarrier,pendingRawCount:this.session?.pendingRawCount??0,formalCommands:r?.document.count??0,inflight:r?.inflight,viewPending:r?.viewPending,cancellingStroke:!!r?.cancellingStroke,needsFrame:r?.needsFrame,jobs:r?.document.jobs.length,presentationHeld:r?.backend.presentationHeld,glFence:!!r?.backend.fence,pending:!!r?.backend.pending,errors:r?.errors,sessionErrors:this.session?.errors},checkpoint:{...this.checkpointMetrics},strokeReplayFallbacks:this.historyReplayFallbacks,fullDocumentRebuilds:this.session?.fullDocumentRebuilds??0,fullReplayStrokes:this.session?.fullReplayStrokes??0,cancelledStrokeCount:this.session?.cancelledStrokeCount??0,projectionRestoreMode:this._projectionRestoreMode};}
  get interacting(){return this.touchPoints.size>0||this.panning!==null||this.busy;}
  get initializationError(){return this._initializationError;}get backendSelection(){return this.renderer?.info.selection??null;}get backend(){return String(this.renderer?.info.backend??'未取得');}get rendererDesynchronized(){return Boolean(this.renderer?.info.desynchronized);}get rendererAlpha(){return Boolean(this.renderer?.info.alpha);}get rendererPremultipliedAlpha(){return Boolean(this.renderer?.info.premultipliedAlpha);}get rendererArtworkAlpha(){return Boolean(this.renderer?.info.artworkAlpha);}get presentationOpaque(){return Boolean(this.renderer?.info.presentationOpaque);}get presentationMode(){return 'direct-gpu';}get presentationAlpha(){return this.renderer?.info.alpha??null;}get presentationDesynchronized(){return this.renderer?.info.desynchronized??null;}get presentationFrames(){return this.presentedFrames;}get presentationLastAt(){return this.lastPresentedAt;}get projectionRestoreMs(){return this._projectionRestoreMs;}get projectionRestoreMode(){return this._projectionRestoreMode;}get projectionCacheRevision(){return this._projectionCacheRevision;}get browserPredictionSamples(){return this.session?.browserPredictions??0;}get brushName(){return this.preset?.name??'未選択';}get brushId(){return this.preset?.id??'未選択';}get blendMode(){return this.preset?.blend??'normal';}get eraserType(){return this.preset?.id==='foundation-hard-eraser'?'hard':this.preset?.id==='foundation-soft-eraser'?'soft':this.preset?.blend==='erase'?'erase':null;}get brushSize(){return this.preset?.size??0;}get historyPatchHits(){return this.session?.historyPatchHits??0;}get historyReplayFallbacks(){return this.session?.historyReplayFallbacks??0;}get busy(){return this.inputActive||this.hasPendingStrokes;}
  destroy(){if(this.wheelNavigationTimer!==null)clearTimeout(this.wheelNavigationTimer);this.resizeObserver?.disconnect();this.densityMedia?.removeEventListener('change',this.densityChanged);this.touchPoints.clear();this.disposed=true;cancelAnimationFrame(this.frameId);this.abort.abort();if(this.renderer)this.renderer.onPresentation=null;this.session?.destroy();}
}
