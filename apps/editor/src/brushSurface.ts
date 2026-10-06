import {TILE,type FoundationPreset,type GpuRenderer,type RealtimeSession,type Sample,type StrokeRecord} from '@illustro/brush-rt';
import {CANONICAL_TILE_SIZE,type SemanticOperation} from '@illustro/core';
import workerUrl from '../../../packages/brush-rt/dist/rt/canonical.worker.mjs?worker&url';
import type {EditorController,EditorHistoryChange} from './controller';

export class BrushSurface{
  private renderer:GpuRenderer|null=null;private session:RealtimeSession|null=null;private frameId=0;private pointer:number|null=null;private finishing=false;private historySyncing=false;private disposed=false;private target:ReturnType<EditorController['target']>|null=null;private renderCanvas:OffscreenCanvas|null=null;private bitmapContext:ImageBitmapRenderingContext|null=null;private fallback2d:CanvasRenderingContext2D|null=null;private presentedFrames=0;private lastPresentedAt=0;
  readonly abort=new AbortController();brushes:readonly FoundationPreset[]=[];preset:FoundationPreset|null=null;fingerDrawing=false;
  constructor(private canvas:HTMLCanvasElement,private controller:EditorController,private status:(text:string)=>void,private onCommitted:()=>void=()=>{},private onStateChanged:()=>void=()=>{}){}
  async initialize(){const engine=await import('@illustro/brush-rt'),target=this.controller.target();this.canvas.width=target.width;this.canvas.height=target.height;
    const requested=new URLSearchParams(location.search).get('backend'),compact=matchMedia('(max-width:760px)').matches,canBridge=compact&&typeof OffscreenCanvas!=='undefined';
    let renderTarget:HTMLCanvasElement|OffscreenCanvas=this.canvas,backend:'auto'|'webgl2'|'webgpu'=requested==='webgl2'||requested==='webgpu'?requested:'auto',webglDesynchronized=true;
    if(canBridge){
      this.renderCanvas=new OffscreenCanvas(target.width,target.height);
      this.bitmapContext=this.canvas.getContext('bitmaprenderer');
      if(!this.bitmapContext)this.fallback2d=this.canvas.getContext('2d',{alpha:true,desynchronized:true});
      if(this.bitmapContext||this.fallback2d)renderTarget=this.renderCanvas;
      else this.renderCanvas=null;
    }
    if(compact&&renderTarget===this.canvas){backend=requested==='webgl2'||requested==='webgpu'?requested:'webgl2';webglDesynchronized=false;}
    this.renderer=await engine.GpuRenderer.create(renderTarget as HTMLCanvasElement,target.width,target.height,backend,{webglDesynchronized});
    if(this.renderCanvas)this.renderer.onComplete=()=>this.presentLatestFrame();
    this.session=new engine.RealtimeSession(this.renderer,workerUrl);this.brushes=engine.referenceBrushes;this.preset=structuredClone(this.brushes[0]!);
    const options={signal:this.abort.signal};this.canvas.addEventListener('pointerdown',this.down,options);this.canvas.addEventListener('pointermove',this.move,options);this.canvas.addEventListener('pointerup',this.up,options);this.canvas.addEventListener('pointercancel',this.cancel,options);this.canvas.addEventListener('lostpointercapture',this.cancel,options);this.frameId=requestAnimationFrame(this.frame);this.onStateChanged();}
  private sample(e:PointerEvent):Sample{const r=this.canvas.getBoundingClientRect(),target=this.target??this.controller.target();return {x:(e.clientX-r.left)/r.width*target.width,y:(e.clientY-r.top)/r.height*target.height,t:e.timeStamp,pressure:e.pressure,pointerType:e.pointerType,tilt:Math.min(1,Math.hypot(e.tiltX,e.tiltY)/90),azimuth:Math.atan2(e.tiltY,e.tiltX),twist:e.twist/360};}
  private down=(e:PointerEvent)=>{if(e.button!==0||this.pointer!==null||this.finishing||this.historySyncing||!this.session||!this.preset)return;if(e.pointerType==='touch'&&!this.fingerDrawing)return;e.preventDefault();
    try{this.target=this.controller.target();this.session.begin(this.preset);this.session.accept(this.sample(e));this.pointer=e.pointerId;this.canvas.setPointerCapture(e.pointerId);this.onStateChanged();}catch{this.target=null;this.status('このレイヤーには描画できません。');void this.cancelStroke();}};
  private move=(e:PointerEvent)=>{if(e.pointerId!==this.pointer||!this.session)return;e.preventDefault();const samples=e.getCoalescedEvents?.()??[];for(const sample of samples.length?samples:[e])this.session.accept(this.sample(sample));};
  private up=(e:PointerEvent)=>{if(e.pointerId!==this.pointer||!this.session||!this.target)return;const session=this.session,target=this.target;this.pointer=null;this.target=null;this.finishing=true;this.onStateChanged();
    void session.end({...this.sample(e),origin:'release'}).then(async record=>{if(!record)return;try{await this.controller.finishStroke(target,record);session.discardRedo();this.status('線を作品に反映しました。');this.onCommitted();}
      catch{try{await session.rollbackLatest(record);}catch{}this.status('線を確定できなかったため、作品には残していません。');}})
      .catch(()=>{this.status('線を確定できませんでした。');}).finally(()=>{this.finishing=false;this.onStateChanged();});};
  private cancel=(e:PointerEvent)=>{if(e.pointerId===this.pointer)void this.cancelStroke();};
  private async cancelStroke(){this.pointer=null;this.target=null;this.finishing=true;this.onStateChanged();try{await this.session?.cancel();this.presentLatestFrame();}catch{this.status('描画を取り消せませんでした。');}finally{this.finishing=false;this.onStateChanged();}}
  private frame=(now:number)=>{if(this.disposed)return;this.session?.frame(now);if(this.renderer?.errors.length||this.session?.errors.length)this.status('描画中に問題が起きました。');this.frameId=requestAnimationFrame(this.frame);};
  private presentLatestFrame(){const source=this.renderCanvas;if(!source||this.disposed)return;try{if(this.bitmapContext){const bitmap=source.transferToImageBitmap();this.bitmapContext.transferFromImageBitmap(bitmap);}else if(this.fallback2d){this.fallback2d.clearRect(0,0,this.canvas.width,this.canvas.height);this.fallback2d.drawImage(source,0,0);}this.presentedFrames++;this.lastPresentedAt=performance.now();const diagnostic=this.canvas as HTMLCanvasElement&{__illustroPresentationFrames?:number;__illustroPresentationLastAt?:number};diagnostic.__illustroPresentationFrames=this.presentedFrames;diagnostic.__illustroPresentationLastAt=this.lastPresentedAt;}catch{this.status('画面への表示更新に失敗しました。');}}
  async syncHistory(change:EditorHistoryChange){
    if(!change.changed)return;if(!this.session)throw new Error('Renderer is not initialized');if(this.pointer!==null||this.finishing||this.historySyncing)throw new Error('History is busy');
    this.historySyncing=true;this.onStateChanged();try{const operations=change.direction==='undo'?[...change.operations].reverse():change.operations;
      for(const operation of operations){if(operation.kind!=='brush.stroke')continue;const record=this.strokeRecord(operation),keys=this.runtimeKeys(operation);if(change.direction==='undo')await this.session.undoDerived(record,keys);else await this.session.redoDerived(record,keys);}
      this.presentLatestFrame();
    }finally{this.historySyncing=false;this.onStateChanged();}
  }
  discardRedoProjection(){this.session?.discardRedo();}
  private strokeRecord(operation:SemanticOperation){const record=operation.parameters.strokeRecord;if(!record||typeof record!=='object'||!Array.isArray((record as StrokeRecord).commands))throw new Error('History stroke record missing');return record as StrokeRecord;}
  private runtimeKeys(operation:SemanticOperation){const root=this.controller.document.root,keys=new Set<string>(),maxX=Math.ceil(root.width/TILE)-1,maxY=Math.ceil(root.height/TILE)-1;
    for(const f of operation.dirtyFootprint){const x0=f.tileX*CANONICAL_TILE_SIZE+f.bounds.x0,y0=f.tileY*CANONICAL_TILE_SIZE+f.bounds.y0,x1=f.tileX*CANONICAL_TILE_SIZE+f.bounds.x1,y1=f.tileY*CANONICAL_TILE_SIZE+f.bounds.y1;
      const minX=Math.max(0,Math.floor(x0/TILE)),minY=Math.max(0,Math.floor(y0/TILE)),endX=Math.min(maxX,Math.ceil(x1/TILE)-1),endY=Math.min(maxY,Math.ceil(y1/TILE)-1);
      for(let y=minY;y<=endY;y++)for(let x=minX;x<=endX;x++)keys.add(x+','+y);}
    return [...keys];
  }
  select(index:number){const p=this.brushes[index];if(p)this.preset=structuredClone(p);}setSize(value:number){if(this.preset&&Number.isFinite(value)&&value>=.1&&value<=1024)this.preset.size=value;}setForceFade(enabled:boolean){if(this.preset?.forceFade)this.preset.forceFade.enabled=enabled;}
  get backend(){return String(this.renderer?.info.backend??'未取得');}get rendererDesynchronized(){return Boolean(this.renderer?.info.desynchronized);}get rendererAlpha(){return Boolean(this.renderer?.info.alpha);}get rendererPremultipliedAlpha(){return Boolean(this.renderer?.info.premultipliedAlpha);}get presentationMode(){return this.renderCanvas?(this.bitmapContext?'offscreen-bitmap':'offscreen-2d'):'direct';}get presentationFrames(){return this.presentedFrames;}get presentationLastAt(){return this.lastPresentedAt;}get brushName(){return this.preset?.name??'未選択';}get brushSize(){return this.preset?.size??0;}get historyPatchHits(){return this.session?.historyPatchHits??0;}get historyReplayFallbacks(){return this.session?.historyReplayFallbacks??0;}get busy(){return this.pointer!==null||this.finishing||this.historySyncing;}
  destroy(){this.disposed=true;cancelAnimationFrame(this.frameId);this.abort.abort();if(this.renderer)this.renderer.onComplete=null;this.session?.destroy();this.renderCanvas=null;this.bitmapContext=null;this.fallback2d=null;}
}
