import {TILE,validateRecord,type FoundationPreset,type GpuRenderer,type RealtimeSession,type Sample,type StrokeRecord} from '@illustro/brush-rt';
import {CANONICAL_TILE_SIZE,type SemanticOperation} from '@illustro/core';
import workerUrl from '../../../packages/brush-rt/dist/rt/canonical.worker.mjs?worker&url';
import type {EditorController,EditorHistoryChange} from './controller';


export class BrushSurface{
  private renderer:GpuRenderer|null=null;private session:RealtimeSession|null=null;private frameId=0;private pointer:number|null=null;private finishing=false;private historySyncing=false;private disposed=false;private target:ReturnType<EditorController['target']>|null=null;private presentedFrames=0;private lastPresentedAt=0;private _initializationError:string|null=null;private _projectionRestoreMs=0;
  readonly abort=new AbortController();brushes:readonly FoundationPreset[]=[];preset:FoundationPreset|null=null;fingerDrawing=false;
  constructor(private canvas:HTMLCanvasElement,private controller:EditorController,private status:(text:string)=>void,private onCommitted:()=>void=()=>{},private onStateChanged:()=>void=()=>{},private backendOverride:'auto'|'webgl2'|'webgpu'|null=null){}
  async initialize(){const engine=await import('@illustro/brush-rt'),target=this.controller.target();this.canvas.width=target.width;this.canvas.height=target.height;
    const requested=new URLSearchParams(location.search).get('backend');
    this._initializationError=null;
    // Production uses capability-based auto selection. WebGPU is accepted only after
    // adapter + device + renderer pipelines + canvas presentation all initialize.
    // Only then is it used; any failure in auto mode falls back to WebGL2.
    const backend:'auto'|'webgl2'|'webgpu'=this.backendOverride??(requested==='webgpu'||requested==='webgl2'?requested:'auto');
    try{
      this.renderer=await engine.GpuRenderer.create(this.canvas,target.width,target.height,backend,{webglDesynchronized:false});
    }catch(error){
      const message=error instanceof Error?error.message:String(error);
      this._initializationError='GPU initialization failed: '+message;
      throw new Error(this._initializationError,{cause:error});
    }
    this.renderer.onComplete=()=>this.markPresented();
    this.renderer.setSurfaceStack(this.surfaceKeys());this.session=new engine.RealtimeSession(this.renderer,workerUrl);this.brushes=engine.referenceBrushes;this.preset=structuredClone(this.brushes[0]!);
    const options={signal:this.abort.signal};this.canvas.addEventListener('pointerdown',this.down,options);this.canvas.addEventListener('pointermove',this.move,options);this.canvas.addEventListener('pointerup',this.up,options);this.canvas.addEventListener('pointercancel',this.cancel,options);this.canvas.addEventListener('lostpointercapture',this.cancel,options);this.frameId=requestAnimationFrame(this.frame);this.onStateChanged();}
  private sample(e:PointerEvent):Sample{const r=this.canvas.getBoundingClientRect(),target=this.target??this.controller.target();return {x:(e.clientX-r.left)/r.width*target.width,y:(e.clientY-r.top)/r.height*target.height,t:e.timeStamp,pressure:e.pressure,pointerType:e.pointerType,tilt:Math.min(1,Math.hypot(e.tiltX,e.tiltY)/90),azimuth:Math.atan2(e.tiltY,e.tiltX),twist:e.twist/360};}
  private down=(e:PointerEvent)=>{if(e.button!==0||this.pointer!==null||this.finishing||this.historySyncing||!this.session||!this.preset)return;if(e.pointerType==='touch'&&!this.fingerDrawing)return;e.preventDefault();
    try{this.target=this.controller.target();this.session.begin(this.preset,0,{},this.target.surfaceId);const s=this.sample(e);this.session.accept(s);this.session.predictions([]);this.pointer=e.pointerId;this.canvas.setPointerCapture(e.pointerId);this.onStateChanged();}catch{this.target=null;this.status('このレイヤーには描画できません。');void this.cancelStroke();}};
  private move=(e:PointerEvent)=>{if(e.pointerId!==this.pointer||!this.session)return;e.preventDefault();const coalesced=e.getCoalescedEvents?.()??[],events=coalesced.length?coalesced:[e],actual:Sample[]=[];for(let i=0;i<events.length;i++){const s=this.sample(events[i]!);actual.push(s);this.session.accept(s,i===events.length-1);}const predictedEvents=e.getPredictedEvents?.()??[],predicted=this.clampPredicted(actual.at(-1)??this.sample(e),predictedEvents.slice(0,2).map(event=>({...this.sample(event),origin:'predicted'})));this.session.predictions(predicted);};
  private up=(e:PointerEvent)=>{if(e.pointerId!==this.pointer||!this.session||!this.target)return;const session=this.session,target=this.target,release=this.sample(e);session.predictions([]);this.pointer=null;this.target=null;this.finishing=true;this.onStateChanged();
    void session.end({...release,origin:'release'}).then(async record=>{if(!record)return;try{await this.controller.finishStroke(target,record);await session.renderer.drain();session.discardRedo();this.status(record.preset.blend==='erase'?'消した内容を作品に反映しました。':'線を作品に反映しました。');this.onCommitted();}
      catch{try{await session.rollbackLatest(record);}catch{}this.status('線を確定できなかったため、作品には残していません。');}})
      .catch(()=>{this.status('線を確定できませんでした。');}).finally(()=>{this.finishing=false;this.onStateChanged();});};
  private cancel=(e:PointerEvent)=>{if(e.pointerId===this.pointer)void this.cancelStroke();};
  private async cancelStroke(){this.pointer=null;this.target=null;this.finishing=true;this.onStateChanged();try{this.session?.predictions([]);await this.session?.cancel();}catch{this.status('描画を取り消せませんでした。');}finally{this.finishing=false;this.onStateChanged();}}
  private frame=(now:number)=>{if(this.disposed)return;this.session?.frame(now);if(this.renderer?.errors.length||this.session?.errors.length)this.status('描画中に問題が起きました。');this.frameId=requestAnimationFrame(this.frame);};
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
    const diagnostics:Record<string,unknown>={
      time:new Date().toISOString(),backend:this.backend,rendererInfo:this.renderer?.info,
      rendererErrors:[...(this.renderer?.errors??[])].slice(-8),sessionErrors:[...(this.session?.errors??[])].slice(-8),
      committedStrokes:this.controller.committedStrokeCount,rawAccepted:this.session?.rawAccepted??0,
      completeFrames:this.presentedFrames,latestGpuMetrics:this.renderer?.completions.slice(-2),
      fingerDrawing:this.fingerDrawing,previewPresent:false,previewVisible:false,previewContext:null,
      browserPredictionSamples:this.session?.browserPredictions??0,
      canvasCss:{background:getComputedStyle(this.canvas).backgroundColor,opacity:getComputedStyle(this.canvas).opacity}
    };
    if(backend?.gl){diagnostics.webglContext=backend.gl.getContextAttributes();diagnostics.webglLost=backend.gl.isContextLost();diagnostics.webglError=backend.gl.getError();}
    try{if(backend?.readViewport){const p=await backend.readViewport();diagnostics.gpuArtwork=summarize(p,this.canvas.width,this.canvas.height);}}
    catch(e){diagnostics.gpuArtworkError=String(e);}
    try{if(this.renderer){const surfaceId=this.controller.selectedLayer.surface.descriptor.surfaceId,p=await this.renderer.read(surfaceId);diagnostics.selectedRasterSurface={surfaceId,...summarize(p,this.canvas.width,this.canvas.height)};}}
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
  async syncHistory(change:EditorHistoryChange){
    if(!change.changed)return;if(!this.session)throw new Error('Renderer is not initialized');if(this.pointer!==null||this.finishing||this.historySyncing)throw new Error('History is busy');
    this.historySyncing=true;this.onStateChanged();try{this.syncLayerStack();const operations=change.direction==='undo'?[...change.operations].reverse():change.operations;
      for(const operation of operations){if(operation.kind!=='brush.stroke')continue;const record=this.strokeRecord(operation),keys=this.runtimeKeys(operation),surfaceId=this.surfaceForOperation(operation);if(change.direction==='undo')await this.session.undoDerived(record,keys,surfaceId);else await this.session.redoDerived(record,keys,surfaceId);}
    }finally{this.historySyncing=false;this.onStateChanged();}
  }
  async restoreDocumentProjection(){
    if(!this.session||!this.renderer)throw new Error('Renderer is not initialized');if(this.busy)throw new Error('Renderer is busy');
    const started=performance.now();this.historySyncing=true;this.onStateChanged();let held=false,complete=false;
    const renderer=this.renderer as unknown as {backend?:{setPresentationHeld?:(held:boolean)=>void;presentCurrent?:()=>Promise<void>|void};formalQuantum?:number;frame:(now:number)=>boolean};
    const originalFrame=renderer.frame;
    try{
      this.syncLayerStack();const entries:Array<{record:StrokeRecord;surfaceKey:string}>=[];
      for(const operation of this.controller.document.operationsTo()){if(operation.kind==='brush.stroke')entries.push({record:validateRecord(operation.parameters.strokeRecord),surfaceKey:this.surfaceForOperation(operation)});
        else if(operation.kind==='raster.strict-delta')throw new Error('This saved strict Raster delta cannot yet be projected by the M05 editor renderer');}
      const runtime=this.session as unknown as {records:StrokeRecord[];redoRecords:StrokeRecord[];recordSurfaces:WeakMap<StrokeRecord,string>;rebuild:()=>Promise<void>};
      runtime.records=entries.map(entry=>entry.record);runtime.redoRecords=[];for(const entry of entries)runtime.recordSurfaces.set(entry.record,entry.surfaceKey);
      // Restores are not live drawing. Keep the partially rebuilt image off-screen and
      // feed larger confirmed batches to the existing renderer, then present once.
      if(renderer.backend?.setPresentationHeld){renderer.backend.setPresentationHeld(true);held=true;}
      renderer.frame=(now:number)=>{renderer.formalQuantum=Math.max(128,renderer.formalQuantum??0);return originalFrame.call(renderer,now);};
      await runtime.rebuild();complete=true;
    }finally{
      renderer.frame=originalFrame;if(held)renderer.backend?.setPresentationHeld?.(false);
      if(complete)await renderer.backend?.presentCurrent?.();
      this._projectionRestoreMs=performance.now()-started;this.historySyncing=false;this.onStateChanged();
    }
  }
  syncLayerStack(){const keys=this.surfaceKeys();this.renderer?.setSurfaceStack(keys);this.session?.setSurfaceStack(keys);}
  discardRedoProjection(){this.session?.discardRedo();}
  private surfaceKeys(){return this.controller.layers.map(layer=>layer.surface.descriptor.surfaceId);}
  private surfaceForOperation(operation:SemanticOperation){const target=operation.targetEntityIds[0],layer=this.controller.layers.find(item=>item.id===target);if(!layer)throw new Error('History target layer missing');return layer.surface.descriptor.surfaceId;}
  private strokeRecord(operation:SemanticOperation){const record=operation.parameters.strokeRecord;if(!record||typeof record!=='object'||!Array.isArray((record as StrokeRecord).commands))throw new Error('History stroke record missing');return record as StrokeRecord;}
  private runtimeKeys(operation:SemanticOperation){const root=this.controller.document.root,keys=new Set<string>(),maxX=Math.ceil(root.width/TILE)-1,maxY=Math.ceil(root.height/TILE)-1;
    for(const f of operation.dirtyFootprint){const x0=f.tileX*CANONICAL_TILE_SIZE+f.bounds.x0,y0=f.tileY*CANONICAL_TILE_SIZE+f.bounds.y0,x1=f.tileX*CANONICAL_TILE_SIZE+f.bounds.x1,y1=f.tileY*CANONICAL_TILE_SIZE+f.bounds.y1;
      const minX=Math.max(0,Math.floor(x0/TILE)),minY=Math.max(0,Math.floor(y0/TILE)),endX=Math.min(maxX,Math.ceil(x1/TILE)-1),endY=Math.min(maxY,Math.ceil(y1/TILE)-1);
      for(let y=minY;y<=endY;y++)for(let x=minX;x<=endX;x++)keys.add(x+','+y);}
    return [...keys];
  }
  select(index:number){const p=this.brushes[index];if(p)this.preset=structuredClone(p);}selectById(id:string){const p=this.brushes.find(item=>item.id===id);if(!p)throw new Error('brush preset not found');this.preset=structuredClone(p);}setSize(value:number){if(this.preset&&Number.isFinite(value)&&value>=.1&&value<=1024)this.preset.size=value;}setForceFade(enabled:boolean){if(this.preset?.forceFade)this.preset.forceFade.enabled=enabled;}
  get initializationError(){return this._initializationError;}get backendSelection(){return this.renderer?.info.selection??null;}get backend(){return String(this.renderer?.info.backend??'未取得');}get rendererDesynchronized(){return Boolean(this.renderer?.info.desynchronized);}get rendererAlpha(){return Boolean(this.renderer?.info.alpha);}get rendererPremultipliedAlpha(){return Boolean(this.renderer?.info.premultipliedAlpha);}get rendererArtworkAlpha(){return Boolean(this.renderer?.info.artworkAlpha);}get presentationOpaque(){return Boolean(this.renderer?.info.presentationOpaque);}get presentationMode(){return 'direct-gpu';}get presentationAlpha(){return this.renderer?.info.alpha??null;}get presentationDesynchronized(){return this.renderer?.info.desynchronized??null;}get presentationFrames(){return this.presentedFrames;}get presentationLastAt(){return this.lastPresentedAt;}get projectionRestoreMs(){return this._projectionRestoreMs;}get browserPredictionSamples(){return this.session?.browserPredictions??0;}get brushName(){return this.preset?.name??'未選択';}get brushId(){return this.preset?.id??'未選択';}get blendMode(){return this.preset?.blend??'normal';}get eraserType(){return this.preset?.id==='foundation-hard-eraser'?'hard':this.preset?.id==='foundation-soft-eraser'?'soft':this.preset?.blend==='erase'?'erase':null;}get brushSize(){return this.preset?.size??0;}get historyPatchHits(){return this.session?.historyPatchHits??0;}get historyReplayFallbacks(){return this.session?.historyReplayFallbacks??0;}get busy(){return this.pointer!==null||this.finishing||this.historySyncing;}
  destroy(){this.disposed=true;cancelAnimationFrame(this.frameId);this.abort.abort();if(this.renderer)this.renderer.onComplete=null;this.session?.destroy();}
}
