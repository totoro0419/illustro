import type {ArtworkGuide} from '@illustro/core';
import {StrokeHandoff,type StrokeReservation} from './strokeHandoff';
import {nativeBrushSensors} from './brushInput';
import {drawMaskPreview,type MaskStrokePoint} from './layerMaskEditing';
import {penEraserInput} from './stylusButtons';
import {EmptyStrokeError} from './strokeCommit';
import {canExtendProjection} from './persistence/projectionLineage';
import {readGpuTiles} from './gpuReadback';
import {compositeWhiteBackdrop} from './logicalWhitePixel';
import {TILE,validateRecord,validateFoundation,referenceBrushes,type FoundationPreset,type GpuRenderer,type RealtimeSession,type Sample,type StrokeRecord} from '@illustro/brush-rt';
import {CANONICAL_TILE_SIZE,type LayerBlend,type LayerMask,type MaskPoint,type LayerComp,type LayerId,type RevisionId,type SemanticOperation} from '@illustro/core';
import workerUrl from '../../../packages/brush-rt/dist/rt/canonical.worker.mjs?worker&url';
import drawingWorkerUrl from '../../../packages/brush-rt/dist/rt/drawing.worker.mjs?worker&url';
import presentationWorkerUrl from '../../../packages/brush-rt/dist/rt/presentation.worker.mjs?worker&url';
// The port reuses the exact renderer/session inside a dedicated drawing worker.
// @ts-expect-error Runtime JS port is deliberately separate from the engine API.
import {DrawingHost} from '../../../packages/brush-rt/dist/rt/drawing-host.mjs';
import type {EditorController,EditorHistoryChange} from './controller';
import type {DrawingTarget} from './ports';
import {CanvasView,type SavedCanvasView,type Point} from './canvasView';
import {CanvasNavigation} from './canvasNavigation';
import {wrappedCopies} from './seamlessStroke';
import {DEFAULT_SYMMETRY,symmetryCopies,symmetryPoint,type SymmetrySettings} from './strokeSymmetry';
import {buildSymmetricStrokes} from './runSymmetry';
import {DEFAULT_GUIDE_SETTINGS,normalizeGuideSettings,lockStraightGuide,lockArtworkGuide,snapToStraightGuide,type GuideSettings,type LockedGuide} from './strokeGuide';
import {rectangleFromPoints,clampSelectionRect,type SelectionRect} from './strokeSelection';
import {selectionAsLayerMask} from './artwork/selectionMask';
import {applySelectedStroke} from './selection/brush';
import type {MaskData} from './selection/mask';
import type {ProjectionCache,ProjectionCacheV1,ProjectionCheckpointDeltaV2} from './persistence/projectionCache';


export type InputPointerRole='draw'|'pan'|'sample';
export type PointerRoleSettings=Readonly<{pen:InputPointerRole;mouse:InputPointerRole}>;
type CanvasEditGesture=Readonly<{
  path:boolean;width:number;color:string;complete:(points:readonly MaskStrokePoint[])=>void;
  pointEdit?:Readonly<{points:readonly MaskPoint[];edges?:readonly (readonly [number,number])[];fixed?:readonly boolean[];closed?:boolean;commit:(index:number,point:MaskPoint)=>void}>;
}>;

export class BrushSurface{
  private editGesture:CanvasEditGesture|null=null;
  private editPointer:number|null=null;
  private editPointIndex:number|null=null;
  private editPointerType='';
  private editPoints:MaskStrokePoint[]=[];
  private editStrokeOutline:SVGSVGElement|null=null;
  private artworkPreview:HTMLCanvasElement|null=null;
  private maskInspection:HTMLCanvasElement|null=null;
  private layerOutline:HTMLCanvasElement|null=null;
  private layerOutlineSequence=0;
  private readonly restoredRecords=new WeakMap<object,StrokeRecord>();
  private pendingStrokeIds=new Map<StrokeReservation,number>();private pendingBranch=false;
  private historyTraces:Array<{direction:string;id:number|null;at:number;invalidatedAt:number;kind:string}>=[];
  private handoff:StrokeHandoff|null=null;private reservation:StrokeReservation|null=null;private gpuFinishes=new Map<number,Promise<void>>();private handoffFault:string|null=null;private inputBarrier=false;private protectionQueueLength=0;
  private inputAttempts:Array<{at:number;eventAt:number;reason:string|null;acceptedAt?:number;id?:number;state:Record<string,unknown>}>=[];
  private handoffAccepted=0;private handoffRejected=0;private handoffTraces:Array<{id:number;upAt:number;readyMs:number;recordMs?:number;logicalMs?:number;parkedMs?:number;gpuMs?:number;savePrepareMs?:number;uiStateMs?:number}>=[];
  private readonly traceHandoff=new URLSearchParams(location.search).has('perf')||location.pathname.includes('/qa/perf-stroke-handoff/')||location.pathname.includes('/qa/perf-mobile4000/')||location.pathname.includes('/qa/perf-thin-stroke4000/');
  private renderer:GpuRenderer|null=null;private session:RealtimeSession|null=null;private frameId=0;private pointer:number|null=null;private finishing=false;private historySyncing=false;private previewPressureShown=false;private disposed=false;private target:ReturnType<EditorController['target']>|null=null;private presentedFrames=0;private lastPresentedAt=0;private _initializationError:string|null=null;private _projectionRestoreMs=0;private _projectionRestoreMode:'none'|'cache'|'replay-fallback'='none';private _projectionCacheRevision:string|null=null;
  private lastFrameAt=0;private viewNotificationPending=false;private checkpointMetrics={captures:0,tiles:0,batches:0,bytes:0,lastMs:0};private view:CanvasView|null=null;private resizeObserver:ResizeObserver|null=null;private navigation:CanvasNavigation|null=null;
  private pointerRoles:PointerRoleSettings={pen:'draw',mouse:'draw'};
  setPointerRoles(roles:PointerRoleSettings){this.pointerRoles={...roles};}
  private eyedropper=false;private eyedropperPointer:number|null=null;private sampleSource:'composite'|'layer'|'specific'='composite';private sampleLayerId:LayerId|null=null;private sampleDiameter:1|3|5=1;private sampleTransparency:'skip'|'keep'|'white'='skip';private pendingSample:{point:Point;phase:'preview'|'commit'}|null=null;private sampleRunning=false;private sampleEpoch=0;private colorOpacity=1;private foreground:readonly [number,number,number]=[.12,.15,.2];
  private densityMedia:MediaQueryList|null=null;private spacePressed=false;private wrapOrigin:Point|null=null;private activeStrokeId:number|null=null;private strokePointerType='';
  // Navigation transforms the published canvas, not its fixed input viewport.
  private get inputViewport(){return this.canvas.closest<HTMLElement>('.surface')??this.canvas;}
  private layoutRect(){return this.inputViewport.getBoundingClientRect();}
  get viewportRect(){return this.layoutRect();}
  readonly abort=new AbortController();brushes:readonly FoundationPreset[]=[];preset:FoundationPreset|null=null;fingerDrawing=false;barrelErases=false;palmGuard=true;panTool=false;rotationSnap=false;
  eraserPreset:()=>FoundationPreset|null=()=>null;
  private suppressedTouches=new Set<number>();
  private commonStabilization=0.25;
  private pressureCalibrationMidpoint=0.5;
  private selectionRect:SelectionRect|null=null;
  private selectionVisible=true;
  private selectionMode=false;private selectionPointer:number|null=null;private selectionAnchor:Point|null=null;
  selectionMask:()=>MaskData|null=()=>null;
  private strokeMask:MaskData|null=null;
  onSelectionChanged:()=>void=()=>{};
  private guideSettings:GuideSettings=DEFAULT_GUIDE_SETTINGS;
  private artworkGuides:readonly ArtworkGuide[]=[];
  private guidePreview:readonly ArtworkGuide[]|null=null;
  private artworkGuideOverlay:SVGSVGElement|null=null;
  private showArtworkGuides=true;
  private skipNextArtworkGuide=false;
  private preferredGuide:string|null=null;
  onArtworkGuideTarget:(label:string)=>void=()=>{};
  setArtworkGuides(guides:readonly ArtworkGuide[]){
    if(this.artworkGuides===guides)return;
    this.artworkGuides=guides;this.paintArtworkGuides();
  }
  previewArtworkGuides(guides:readonly ArtworkGuide[]|null){this.guidePreview=guides;this.paintArtworkGuides();}
  showArtworkGuideLines(visible:boolean){this.showArtworkGuides=visible;this.paintArtworkGuides();}
  setPreferredGuide(id:string|null){this.preferredGuide=id;}
  bypassNextGuide(){this.skipNextArtworkGuide=true;}
  private guideGeometry:Readonly<{items:readonly ArtworkGuide[];width:number;height:number;preview:boolean}>|null=null;
  private paintArtworkGuides(){
    const view=this.view,root=this.controller.document.root,items=this.guidePreview??this.artworkGuides;
    if(!view||!items.length||!this.showArtworkGuides){
      this.artworkGuideOverlay?.remove();this.artworkGuideOverlay=null;this.guideGeometry=null;return;
    }
    const ns='http://www.w3.org/2000/svg';
    if(!this.artworkGuideOverlay){
      const svg=document.createElementNS(ns,'svg');svg.setAttribute('aria-hidden','true');
      svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';
      this.inputViewport.append(svg);this.artworkGuideOverlay=svg;
    }
    const origin=view.screen({x:0,y:0}),xUnit=view.screen({x:1,y:0}),yUnit=view.screen({x:0,y:1});
    const transform=`matrix(${xUnit.x-origin.x} ${xUnit.y-origin.y} ${yUnit.x-origin.x} ${yUnit.y-origin.y} ${origin.x} ${origin.y})`;
    const preview=!!this.guidePreview,geometry=this.guideGeometry;
    if(geometry?.items===items&&geometry.width===root.width&&geometry.height===root.height&&geometry.preview===preview){
      this.artworkGuideOverlay.firstElementChild?.setAttribute('transform',transform);
      return;
    }
    this.guideGeometry={items,width:root.width,height:root.height,preview};
    const lines=document.createElementNS(ns,'g');lines.setAttribute('transform',transform);
    const appendLine=(a:Point,b:Point,color:string)=>{
      const start=a,end=b,line=document.createElementNS(ns,'line');
      line.setAttribute('vector-effect','non-scaling-stroke');
      line.setAttribute('x1',String(start.x));line.setAttribute('y1',String(start.y));
      line.setAttribute('x2',String(end.x));line.setAttribute('y2',String(end.y));
      line.setAttribute('stroke',color);line.setAttribute('opacity','.48');line.setAttribute('stroke-dasharray','4 5');
      lines.append(line);
    };
    for(const item of items){
      const {x,y}=item.origin,angle=item.angle*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
      const color=this.guidePreview?'#f59b36':item.enabled?'#5baad5':'#a1abb3';
      if(item.kind==='circle'||item.kind==='ellipse'){
        const curve=document.createElementNS(ns,'polyline'),ry=item.kind==='circle'?item.rx:item.ry;
        curve.setAttribute('points',Array.from({length:73},(_,index)=>{
          const a=index*Math.PI/36,dx=Math.cos(a)*item.rx,dy=Math.sin(a)*ry,point={x:x+dx*c-dy*s,y:y+dx*s+dy*c};
          return point.x+','+point.y;
        }).join(' '));
        curve.setAttribute('vector-effect','non-scaling-stroke');curve.setAttribute('fill','none');curve.setAttribute('stroke',color);curve.setAttribute('opacity','.5');lines.append(curve);continue;
      }
      if(item.kind.startsWith('perspective')){
        const count=item.kind==='perspective3'?3:item.kind==='perspective2'?2:1;
        for(const point of [item.origin,...item.vanishing].slice(0,count))
          for(const end of [{x:0,y:0},{x:root.width,y:0},{x:root.width,y:root.height},{x:0,y:root.height}])appendLine(point,end,color);
        continue;
      }
      const angles=item.kind==='grid'?[angle,angle+Math.PI/2]:item.kind==='isometric'?[angle,angle-Math.PI/3,angle+Math.PI/3]:[angle];
      const length=Math.hypot(root.width,root.height)+Math.hypot(x,y);
      const offsets=item.kind==='straight'?[0]:Array.from({length:9},(_,index)=>(index-4)*item.spacing);
      for(const axis of angles)for(const offset of offsets){
        const cx=x-Math.sin(axis)*offset,cy=y+Math.cos(axis)*offset,dx=Math.cos(axis)*length,dy=Math.sin(axis)*length;
        appendLine({x:cx-dx,y:cy-dy},{x:cx+dx,y:cy+dy},color);
      }
    }
    this.artworkGuideOverlay.replaceChildren(lines);
  }
  private symmetry:SymmetrySettings=DEFAULT_SYMMETRY;
  private strokeSymmetry:SymmetrySettings|null=null;
  private symmetryOverlay:SVGSVGElement|null=null;
  private symmetryAnchor:Point|null=null;
  private symmetryFrame=0;
  private activeGuide:LockedGuide|null=null;
  constructor(private canvas:HTMLCanvasElement,private controller:EditorController,private status:(text:string)=>void,private onCommitted:()=>void=()=>{},private onStateChanged:(reason?:'view'|'view-command'|'state')=>void=()=>{},private backendOverride:'auto'|'webgl2'|'webgpu'|null=null,private onSample:(rgba:readonly number[]|null,phase:'preview'|'commit'|'cancel',point:Point|null)=>void=()=>{}){}
  async initialize(){const target=this.controller.target();this.view=new CanvasView(target.width,target.height,document.body.classList.contains('canvas-viewport')?.94:1);
    this.canvas.style.aspectRatio=document.body.classList.contains('canvas-viewport')?'auto':target.width+' / '+target.height;
    const rect=this.layoutRect();this.view.resize(Math.max(1,rect.width),Math.max(1,rect.height));this.setBackingSize();
    const requested=new URLSearchParams(location.search).get('backend');
    this._initializationError=null;
    // Production uses capability-based auto selection. WebGPU is accepted only after
    // adapter + device + renderer pipelines + canvas presentation all initialize.
    // Only then is it used; any failure in auto mode falls back to WebGL2.
    const backend:'auto'|'webgl2'|'webgpu'=this.backendOverride??(requested==='webgpu'||requested==='webgl2'?requested:'auto');
    try{
      const rendererOptions={webglDesynchronized:false,strokeHandoff:true,strokeOverlay:{mode:new URLSearchParams(location.search).get('overlay')==='gpu'?'gpu':new URLSearchParams(location.search).get('overlay')==='cpu'?'cpu':'auto',ratio:new URLSearchParams(location.search).get('overlayRatio')||'auto'},tileHistory:new URLSearchParams(location.search).get('tileHistory')!=='legacy',historyMemoryBudgetBytes:((navigator as Navigator&{deviceMemory?:number}).deviceMemory??0)>=8?16*1024*1024:8*1024*1024,historyGpuBudgetBytes:((navigator as Navigator&{deviceMemory?:number}).deviceMemory??0)>=8?64*1024*1024:32*1024*1024} as const;
      const created=await DrawingHost.create(this.canvas,target.width,target.height,backend,rendererOptions,drawingWorkerUrl,workerUrl,this.traceHandoff,presentationWorkerUrl,this.abort.signal) as GpuRenderer;
      if(this.disposed){created.destroy();throw Error('Discarded Home warmup completed after cancellation');}
      this.renderer=created;
    }catch(error){
      const message=error instanceof Error?error.message:String(error);
      this._initializationError='GPU initialization failed: '+message;
      throw new Error(this._initializationError,{cause:error});
    }
    this.renderer.onPresentation=()=>this.markPresented();
     const host=this.renderer as unknown as {beginViewportNavigation:()=>void;endViewportNavigation:()=>void};
     this.navigation=new CanvasNavigation(this.view,
      ()=>host.beginViewportNavigation(),()=>this.updateView(),()=>host.endViewportNavigation());
    this.navigation.snapRotation=this.rotationSnap;
    this.updateView();
    this.resizeObserver=new ResizeObserver(entries=>{const e=entries[0];if(!e)return;const exact=e.devicePixelContentBoxSize?.[0];this.setBackingSize(exact?{width:exact.inlineSize,height:exact.blockSize}:undefined);});
    try{this.resizeObserver.observe(this.canvas,{box:'device-pixel-content-box'});}catch{this.resizeObserver.observe(this.canvas);}
    window.addEventListener('resize',this.windowResize,{signal:this.abort.signal});
    window.addEventListener('orientationchange',this.windowResize,{signal:this.abort.signal});this.observeDensity();
    this.inputViewport.style.touchAction='none';
    this.inputViewport.addEventListener('wheel',this.wheelNavigation,{signal:this.abort.signal,passive:false});
    window.addEventListener('keydown',this.keyNavigation,{signal:this.abort.signal});
    window.addEventListener('keyup',this.keyNavigation,{signal:this.abort.signal});
    window.addEventListener('blur',this.interruptInput,{signal:this.abort.signal});
    this.inputViewport.addEventListener('contextmenu',event=>{if(event instanceof PointerEvent&&event.pointerType==='pen'&&this.barrelErases)event.preventDefault();},{signal:this.abort.signal});
    this.renderer.setSurfaceStack(this.surfaceKeys());this.syncLayerStyles();this.session=(this.renderer as any).session as RealtimeSession;this.handoff=new StrokeHandoff(this.controller,(reservation,record,additional,result,undone)=>this.publishStroke(reservation,record,additional,undone),(record,reservation)=>{this.session?.forgetStaged(record);this.pendingStrokeIds.delete(reservation);});this.brushes=referenceBrushes;this.preset=structuredClone(this.brushes[0]!);(this.renderer as any).proxy?.prepare(this.preset);
    const options={signal:this.abort.signal,capture:true},input=this.inputViewport;input.addEventListener('pointerdown',this.down,options);input.addEventListener('pointermove',this.move,options);input.addEventListener('pointerup',this.up,options);input.addEventListener('pointerleave',this.clearSymmetryCursor,options);input.addEventListener('pointercancel',this.cancel,options);input.addEventListener('lostpointercapture',this.cancel,options);this.frameId=requestAnimationFrame(this.frame);this.onStateChanged();}
  private pointerLocation(e:PointerEvent|WheelEvent):Point{const r=this.layoutRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  private setBackingSize(exact?:{width:number;height:number}){if(!this.view)return;const r=this.layoutRect();if(r.width<=0||r.height<=0)return;
    this.view.resize(r.width,r.height);const dpr=window.devicePixelRatio||1,estimatedW=Math.max(1,Math.round(r.width*dpr)),estimatedH=Math.max(1,Math.round(r.height*dpr));
    // Some emulated DPR browsers report CSS-sized devicePixelContentBox. If it disagrees
    // substantially with DPR scaling, preserve rendering fidelity by using the larger
    // DPR-aware backing rather than silently downgrading device output resolution.
    const w=exact&&Math.abs(exact.width-estimatedW)<=3?Math.max(1,exact.width):estimatedW;
    const h=exact&&Math.abs(exact.height-estimatedH)<=3?Math.max(1,exact.height):estimatedH;
    // Resizing a canvas destroys its displayed pixels. Keep the published
    // backing until the renderer can replace it; view input still updates now.
    if(!this.renderer){if(this.canvas.width!==w)this.canvas.width=w;if(this.canvas.height!==h)this.canvas.height=h;}
    this.updateView(false,[w,h]);}
  private densityChanged=()=>{this.observeDensity();this.setBackingSize();};
  private observeDensity(){this.densityMedia?.removeEventListener('change',this.densityChanged);this.densityMedia=window.matchMedia('(resolution: '+(window.devicePixelRatio||1)+'dppx)');this.densityMedia.addEventListener('change',this.densityChanged);}
  private windowResize=()=>this.setBackingSize();
  // Home may have resized the editor without changing its inert DOM state.
  // Update the real viewport after Home is hidden; do not reset actual ink.
  refreshVisibleViewport(){if(this.disposed||!this.renderer)return;this.setBackingSize();this.updateView(true);}
  private get operationMode(): 'idle'|'drawing'|'navigation'{
    return this.navigation?.active?'navigation':this.pointer!==null||this.editPointer!==null?'drawing':'idle';
  }
  private keyNavigation=(e:KeyboardEvent)=>{
    if(e.type==='keydown'&&e.key==='Escape'&&this.editPointer!==null){
      this.clearCanvasEditGestureStroke();
      if(this.editGesture?.pointEdit)this.updateEditStrokeOutline();
      e.preventDefault();
    }
    if(e.code==='Space')this.spacePressed=e.type==='keydown'&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&
      !(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,button,[contenteditable],dialog[open]'));
  };
  private wheelNavigation=(e:WheelEvent)=>{
    if(!this.navigation)return;
    e.preventDefault();this.navigation.wheelZoom(e.deltaY,this.pointerLocation(e));
  };
  private updateView(immediate=false,backing?:readonly number[]){if(this.view&&this.renderer){const size=backing??(this.renderer as unknown as {backend:{viewTransform?:Float32Array}}).backend.viewTransform??[this.canvas.width,this.canvas.height];this.renderer.setViewTransform(this.view.uniform(size[0]!,size[1]!));this.viewNotificationPending=!immediate;if(this.activeGuide)this.updateGuideOverlay();if(this.artworkGuideOverlay||this.artworkGuides.length||this.guidePreview)this.paintArtworkGuides();if(this.symmetry.mode!=='off'||this.symmetryOverlay)this.updateSymmetryOverlay();if(this.selectionRect)this.updateSelectionOverlay();if(this.editPointer!==null||this.editGesture?.pointEdit)this.updateEditStrokeOutline();if(this.artworkPreview)this.positionDocumentOverlay(this.artworkPreview);if(this.maskInspection)this.positionDocumentOverlay(this.maskInspection);if(this.layerOutline)this.positionDocumentOverlay(this.layerOutline);if(immediate)this.onStateChanged('view-command');}}
  get viewState(){return this.view?.state??null;}
  restoreView(state:SavedCanvasView){this.view?.restore(state);this.updateView(true);}
  documentToScreen(point:Point){return this.view?.screen(point)??point;}
  screenToDocument(point:Point){return this.view?.document(point)??point;}
  get canChangeGeometry(){return !this.busy&&!!this.renderer;}
  get displayDiagnostics(){const r=this.layoutRect();return {document:{width:this.controller.document.root.width,height:this.controller.document.root.height},css:{width:r.width,height:r.height},backing:{width:this.canvas.width,height:this.canvas.height},dpr:window.devicePixelRatio,view:this.viewState};}
  fitView(){if(this.view){this.view.fit();this.updateView(true);}}
  viewAt100(){if(this.view){this.view.setZoom(1);this.updateView(true);}}
  actualPixels(){if(this.view){this.view.setZoom(1/(window.devicePixelRatio||1));this.updateView(true);}}
  zoomView(factor:number){if(this.view){this.view.zoomAt(factor,{x:this.view.cssWidth/2,y:this.view.cssHeight/2});this.updateView(true);}}
  resetRotation(){if(this.view){this.view.setRotation(0);this.updateView(true);}}
  flipView(axis:'x'|'y'){if(this.view){this.view.toggleFlip(axis);this.updateView(true);}}
  setViewZoom(zoom:number,notify=true){if(this.view){this.view.setZoom(zoom);this.updateView(notify);}}
  setRotationSnap(enabled:boolean){this.rotationSnap=enabled;if(this.navigation)this.navigation.snapRotation=enabled;}
  setViewRotation(angle:number,notify=true){if(this.view){this.view.setRotation(angle);this.updateView(notify);}}
  /** BRU-010: settings are snapshotted when a stroke starts. */
  /** Document-pixel selection, independent of canvas zoom and angle. */
  get selectedRectangle(){return this.selectionRect;}
  setSelectionVisible(show:boolean){this.selectionVisible=show;this.updateSelectionOverlay();}
  get selectionIsVisible(){return this.selectionVisible;}
  get selectingRectangle(){return this.selectionMode;}
  setSelectionMode(enabled:boolean){
    if(this.inputActive)return;
    this.selectionMode=enabled;this.onSelectionChanged();
  }
  clearRectangleSelection(){
    if(this.inputActive)return;
    this.selectionRect=null;this.selectionMode=false;this.selectionAnchor=null;
    this.selectionPointer=null;this.updateSelectionOverlay();this.onSelectionChanged();
  }
  restoreRectangleSelection(selection:SelectionRect|null){
    if(this.inputActive)return;
    this.selectionMode=false;this.selectionAnchor=null;this.selectionPointer=null;
    const root=this.controller.document.root;
    const next=selection?clampSelectionRect(selection,root.width,root.height):null;
    this.selectionRect=next&&next.width>0&&next.height>0?next:null;
    this.updateSelectionOverlay();this.onSelectionChanged();
  }
  private updateSelectionOverlay(){
    let overlay=this.inputViewport.querySelector<SVGSVGElement>('.illustro-selection-overlay');
    const rectangle=this.selectionRect,v=this.view;
    if(!rectangle||!v||!this.selectionVisible){if(overlay)overlay.style.display='none';return;}
    if(!overlay){
      overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
      overlay.classList.add('illustro-selection-overlay');overlay.setAttribute('aria-hidden','true');
      overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:4';
      const polygon=document.createElementNS('http://www.w3.org/2000/svg','polygon');
      polygon.setAttribute('stroke','#43bfea');polygon.setAttribute('stroke-width','1.5');
      polygon.setAttribute('stroke-dasharray','7 4');polygon.setAttribute('fill','#43bfea');
      polygon.setAttribute('fill-opacity','0.08');overlay.append(polygon);
      this.inputViewport.append(overlay);
    }
    overlay.style.display='block';
    const points=[
      {x:rectangle.x,y:rectangle.y},
      {x:rectangle.x+rectangle.width,y:rectangle.y},
      {x:rectangle.x+rectangle.width,y:rectangle.y+rectangle.height},
      {x:rectangle.x,y:rectangle.y+rectangle.height}
    ].map(p=>v.screen(p));
    overlay.firstElementChild!.setAttribute('points',points.map(p=>p.x+','+p.y).join(' '));
  }
  setSymmetry(settings:SymmetrySettings){
    this.symmetry=settings;
    this.updateSymmetryOverlay();
  }
  private clearSymmetryCursor=()=>{
    this.symmetryAnchor=null;
    this.showSymmetryCursors();
  };
  private updateSymmetryOverlay(){
    const settings=this.pointer!==null?this.strokeSymmetry:this.symmetry,v=this.view;
    if(!v||!settings||settings.mode==='off'){
      this.symmetryOverlay?.remove();this.symmetryOverlay=null;
      return;
    }
    if(!this.symmetryOverlay){
      const overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
      overlay.setAttribute('aria-hidden','true');
      overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3';
      this.inputViewport.append(overlay);this.symmetryOverlay=overlay;
    }
    const axes=document.createElementNS('http://www.w3.org/2000/svg','g');
    axes.setAttribute('stroke','#a369db');axes.setAttribute('stroke-dasharray','5 5');
    const center=v.screen(settings),length=Math.hypot(v.cssWidth,v.cssHeight)+Math.hypot(center.x,center.y);
    const count=settings.mode==='mirror'?1:settings.count;
    for(let i=0;i<count;i++){
      const angle=settings.angle*Math.PI/180+i*2*Math.PI/count;
      const scale=length/Math.max(v.zoom,.001),dx=Math.cos(angle)*scale,dy=Math.sin(angle)*scale;
      const from=settings.mode==='mirror'?v.screen({x:settings.x-dx,y:settings.y-dy}):center;
      const to=v.screen({x:settings.x+dx,y:settings.y+dy});
      const line=document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1',String(from.x));line.setAttribute('y1',String(from.y));
      line.setAttribute('x2',String(to.x));line.setAttribute('y2',String(to.y));
      axes.append(line);
    }
    const cursors=document.createElementNS('http://www.w3.org/2000/svg','g');
    cursors.setAttribute('fill','none');cursors.setAttribute('stroke','#b16bea');
    for(const _copy of symmetryCopies(settings)){
      const cursor=document.createElementNS('http://www.w3.org/2000/svg','circle');
      cursor.setAttribute('r','4');cursors.append(cursor);
    }
    this.symmetryOverlay.replaceChildren(axes,cursors);this.showSymmetryCursors();
  }
  private showSymmetryCursors(){
    const group=this.symmetryOverlay?.lastElementChild,v=this.view,point=this.symmetryAnchor;
    const settings=this.pointer!==null?this.strokeSymmetry:this.symmetry;
    if(!group||!v||!settings)return;
    group.setAttribute('visibility',point?'visible':'hidden');
    if(!point)return;
    symmetryCopies(settings).forEach((copy,index)=>{
      const cursor=group.children[index],p=v.screen(symmetryPoint(point,settings,copy));
      if(cursor){cursor.setAttribute('cx',String(p.x));cursor.setAttribute('cy',String(p.y));}
    });
  }
  private trackSymmetryCursor(event:PointerEvent){
    if(!this.symmetryOverlay||!this.view)return;
    this.symmetryAnchor=event.shiftKey&&this.pointer===null||this.editPointer!==null||
      event.pointerType==='touch'&&event.pointerId!==this.pointer?null:this.sample(event);
    if(!this.symmetryFrame)this.symmetryFrame=requestAnimationFrame(()=>{
      this.symmetryFrame=0;this.showSymmetryCursors();
    });
  }
  private async copySymmetricStroke(record:StrokeRecord,settings:SymmetrySettings):Promise<readonly StrokeRecord[]>{
    try{return await buildSymmetricStrokes(record,settings);}
    catch(error){
      this.status('対称の反映先を計算できませんでした。手元の一筆を反映します。'+(error instanceof Error?error.message:''));
      return [];
    }
  }
  setGuideSettings(settings:GuideSettings){this.guideSettings=normalizeGuideSettings(settings);this.updateGuideOverlay();}
  setCommonStabilization(strength:number){if(Number.isFinite(strength))this.commonStabilization=Math.min(1,Math.max(0,strength));}
  setPressureCalibration(midpoint:number){if(Number.isFinite(midpoint))this.pressureCalibrationMidpoint=Math.min(1,Math.max(0,midpoint));}
  private updateGuideOverlay(){
    let overlay=this.inputViewport.querySelector<SVGSVGElement>('.illustro-straight-guide');
    const guide=this.activeGuide,v=this.view;
    if(!guide||!v){if(overlay)overlay.style.display='none';return;}
    if(!overlay){
      overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
      overlay.classList.add('illustro-straight-guide');overlay.setAttribute('aria-hidden','true');
      overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:3';
      const line=document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('stroke','#42b9e8');line.setAttribute('stroke-width','1');
      line.setAttribute('stroke-dasharray','8 5');line.setAttribute('opacity','0.85');
      overlay.append(line);this.inputViewport.append(overlay);
    }
    overlay.style.display='block';
    const length=Math.max(v.cssWidth,v.cssHeight)*2/Math.max(v.zoom,0.001);
    const dx=Math.cos(guide.angle)*length,dy=Math.sin(guide.angle)*length;
    const x=guide.origin.x+(this.wrapOrigin?.x??0),y=guide.origin.y+(this.wrapOrigin?.y??0);
    const start=v.screen({x:x-dx,y:y-dy}),end=v.screen({x:x+dx,y:y+dy});
    const line=overlay.firstElementChild!;
    let ellipse=overlay.querySelector('polyline');
    if(guide.ellipse){
      if(!ellipse){
        ellipse=document.createElementNS('http://www.w3.org/2000/svg','polyline');
        ellipse.setAttribute('stroke','#42b9e8');ellipse.setAttribute('stroke-dasharray','8 5');ellipse.setAttribute('fill','none');overlay.append(ellipse);
      }
      const {rx,ry}=guide.ellipse,c=Math.cos(guide.angle),s=Math.sin(guide.angle);
      ellipse.setAttribute('points',Array.from({length:97},(_,i)=>{
        const theta=i*Math.PI/48,u=Math.cos(theta)*rx,w=Math.sin(theta)*ry,p=v.screen({x:x+u*c-w*s,y:y+u*s+w*c});
        return p.x+','+p.y;
      }).join(' '));
    }else ellipse?.remove();
    if(guide.ellipse)line.setAttribute('visibility','hidden');else line.removeAttribute('visibility');
    line.setAttribute('x1',String(start.x));line.setAttribute('y1',String(start.y));
    line.setAttribute('x2',String(end.x));line.setAttribute('y2',String(end.y));
  }
  setSeamless(enabled:boolean){if(this.view){this.view.seamless=enabled;this.updateView(true);}}
  setReferencePattern(enabled:boolean){if(this.view){this.view.reference=enabled;this.updateView(true);}}
  private sample(e:PointerEvent):Sample{const v=this.view,d=v?v.document(this.pointerLocation(e)):this.pointerLocation(e),p=snapToStraightGuide({x:d.x-(this.wrapOrigin?.x??0),y:d.y-(this.wrapOrigin?.y??0)},this.activeGuide);return {x:p.x,y:p.y,t:e.timeStamp,...nativeBrushSensors(e)};}
  private layerPick:((ids:readonly LayerId[])=>void)|null=null;
  onLayerPickShortcut:(point:Point)=>void=()=>{};
  private layerPickHold:{pointer:number;position:Point;timer:number}|null=null;
  private cancelLayerPickHold(){
    if(!this.layerPickHold)return;
    window.clearTimeout(this.layerPickHold.timer);
    this.layerPickHold=null;
  }
  pickLayerAt(point:Point){
    const receive=this.layerPick;
    this.layerPick=null;
    if(receive)void this.findLayersAt(point,receive);
  }
  setLayerPick(callback:((ids:readonly LayerId[])=>void)|null){this.layerPick=callback;}
  private async findLayersAt(point:Point,receive:(ids:readonly LayerId[])=>void){
    const root=this.controller.document.root,revision=this.controller.document.head,solo=this.inspectedLayer;
    const x=Math.floor(point.x),y=Math.floor(point.y);
    if(x<0||y<0||x>=root.width||y>=root.height){receive([]);return;}
    const layers=[...this.controller.layers].reverse().filter(layer=>layer.opacity>0&&(solo?layer.id===solo.id:root.isLayerVisible(layer.id))).map(layer=>({
      key:layer.surface.descriptor.surfaceId,id:layer.id,white:layer.baseColor==='white',
    }));
    const host=this.renderer as unknown as {call:(name:string,args:unknown)=>Promise<LayerId[]>}|null;
    if(!host){receive([]);return;}
    try{
      const hits=await host.call('layerHits',{x,y,layers});
      if(!this.disposed&&this.controller.document.head===revision)receive(hits);
      else receive([]);
    }catch(error){
      receive([]);
      this.status('重なっているレイヤーを取得できませんでした。'+(error instanceof Error?error.message:''));
    }
  }
  get maskBrushOpacity(){return this.preset?.opacity??1;}
  setMaskInspection(mask?:LayerMask,mode:'grayscale'|'red'='grayscale'){
    if(!mask){
      this.maskInspection?.remove();
      this.maskInspection=null;
      return;
    }
    const {width,height}=this.controller.document.root;
    const canvas=this.maskInspection??document.createElement('canvas');
    canvas.setAttribute('aria-hidden','true');
    const scale=Math.min(1,512/Math.max(width,height));
    canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    canvas.style.cssText='position:absolute;left:0;top:0;pointer-events:none;z-index:3;transform-origin:0 0';
    canvas.style.width=width+'px';canvas.style.height=height+'px';
    drawMaskPreview(canvas,mask,width,height,mode);
    if(!this.maskInspection)this.inputViewport.append(canvas);
    this.maskInspection=canvas;
    this.positionDocumentOverlay(canvas);
  }
  showArtworkPreview(image:ImageData|null){
    if(!image){this.artworkPreview?.remove();this.artworkPreview=null;return;}
    const {width,height}=this.controller.document.root;
    const canvas=this.artworkPreview??document.createElement('canvas');
    canvas.width=image.width;canvas.height=image.height;
    canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText='position:absolute;left:0;top:0;pointer-events:none;z-index:3;transform-origin:0 0;opacity:.78';
    canvas.style.width=width+'px';canvas.style.height=height+'px';
    canvas.getContext('2d')?.putImageData(image,0,0);
    if(!this.artworkPreview)this.inputViewport.append(canvas);
    this.artworkPreview=canvas;this.positionDocumentOverlay(canvas);
  }
  private positionDocumentOverlay(overlay:HTMLCanvasElement){
    if(!this.view)return;
    const origin=this.view.screen({x:0,y:0}),x=this.view.screen({x:1,y:0}),y=this.view.screen({x:0,y:1});
    overlay.style.transform='matrix('+[x.x-origin.x,x.y-origin.y,y.x-origin.x,y.y-origin.y,origin.x,origin.y].join(',')+')';
  }
  async layerThumbnail(id:LayerId){
    const root=this.controller.document.root;
    const host=this.renderer as unknown as {call:(name:string,args:unknown)=>Promise<Uint8ClampedArray>}|null;
    if(!host||!root.hasLayer(id))return null;
    const surfaceKey=root.getLayer(id).surface.descriptor.surfaceId;
    return host.call('layerThumbnail',{surfaceKey});
  }
  async showLayerOutline(id:LayerId|null){
    const sequence=++this.layerOutlineSequence;
    this.layerOutline?.remove();
    this.layerOutline=null;
    const document=this.controller.document,root=document.root,revision=document.head;
    const host=this.renderer as unknown as {call:(name:string,args:unknown)=>Promise<{data:Uint8ClampedArray;width:number;height:number}|null>}|null;
    if(!id||!host||!root.hasLayer(id))return;
    try{
      const surfaceKey=root.getLayer(id).surface.descriptor.surfaceId;
      const result=await host.call('layerOutline',{surfaceKey});
      if(!result||this.disposed||sequence!==this.layerOutlineSequence||document!==this.controller.document||document.head!==revision)return;
      const canvas=this.inputViewport.ownerDocument.createElement('canvas');
      canvas.setAttribute('aria-hidden','true');
      canvas.width=result.width;canvas.height=result.height;
      canvas.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(result.data),result.width,result.height),0,0);
      canvas.style.cssText='position:absolute;left:0;top:0;pointer-events:none;z-index:4;transform-origin:0 0;filter:drop-shadow(0 0 1px #083c53)';
      canvas.style.width=root.width+'px';canvas.style.height=root.height+'px';
      this.inputViewport.append(canvas);
      this.layerOutline=canvas;
      this.positionDocumentOverlay(canvas);
    }catch{
      if(sequence===this.layerOutlineSequence&&!this.disposed)this.status('このレイヤーの輪郭を取得できませんでした。');
    }
  }
  setCanvasEditGesture(gesture:CanvasEditGesture|null){
    this.clearCanvasEditGestureStroke();
    this.editGesture=gesture;
    if(gesture?.pointEdit)this.updateEditStrokeOutline();
  }
  private clearCanvasEditGestureStroke(){
    this.editPointer=null;
    this.editPointIndex=null;
    this.editPointerType='';
    this.editPoints=[];
    this.editStrokeOutline?.remove();
    this.editStrokeOutline=null;
  }
  private appendEditPoint(event:PointerEvent){
    if(!this.view)return;
    const {x,y}=this.view.document(this.pointerLocation(event));
    const pressure=event.pointerType==='pen'?(event.pressure||this.editPoints.at(-1)?.pressure||.5):1;
    const last=this.editPoints.at(-1);
    if(!last||Math.hypot(x-last.x,y-last.y)>=.5)this.editPoints.push({x,y,pressure});
    if(this.editPoints.length>4096)this.editPoints=this.editPoints.filter((_,i)=>i%2===0);
  }
  private updateEditStrokeOutline(){
    const gesture=this.editGesture,v=this.view;
    if(!gesture||!v||(!this.editPoints.length&&!gesture.pointEdit))return;
    const svg='http://www.w3.org/2000/svg';
    if(!this.editStrokeOutline){
      const outline=document.createElementNS(svg,'svg');
      outline.setAttribute('aria-hidden','true');
      outline.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:4';
      outline.append(document.createElementNS(svg,'path'));
      this.inputViewport.append(outline);
      this.editStrokeOutline=outline;
    }
    const path=this.editStrokeOutline.firstElementChild!;
    if(gesture.pointEdit){
      const points=gesture.pointEdit.points.map((p,i)=>v.screen(i===this.editPointIndex?(this.editPoints.at(-1)??p):p));
      if(this.editStrokeOutline.childElementCount!==points.length+1){
        const svg='http://www.w3.org/2000/svg';
        this.editStrokeOutline.replaceChildren(path,...points.map(()=>{
          const dot=document.createElementNS(svg,'circle');
          dot.setAttribute('fill','#fff');dot.setAttribute('stroke','#137e9b');
          dot.setAttribute('stroke-width','2');dot.setAttribute('r','6');
          return dot;
        }));
      }
      const edges=gesture.pointEdit.edges;
      const outline=edges?edges.map(([a,b])=>{
        const start=points[a]!,end=points[b]!;
        return 'M'+start.x+' '+start.y+'L'+end.x+' '+end.y;
      }).join(' '):points.map(({x,y},i)=>(i?'L':'M')+x+' '+y).join(' ')+(gesture.pointEdit.closed===false?'':' Z');
      path.setAttribute('d',outline);
      path.setAttribute('fill',gesture.pointEdit.closed===false?'none':'rgba(60,180,220,.12)');
      path.setAttribute('stroke','#43bfea');
      path.setAttribute('stroke-width','2');
      path.setAttribute('stroke-dasharray','5 3');
      for(let i=0;i<points.length;i++){
        const dot=this.editStrokeOutline.children[i+1]!;
        dot.setAttribute('cx',String(points[i]!.x));
        dot.setAttribute('cy',String(points[i]!.y));
        dot.setAttribute('r',i===this.editPointIndex?'8':'6');
        dot.setAttribute('fill',gesture.pointEdit.fixed?.[i]?'#303640':'#fff');
      }
      return;
    }
    const points=this.editPoints.map(p=>v.screen(p));
    if(points.length===1)points.push({x:points[0]!.x+.01,y:points[0]!.y});
    path.setAttribute('d',points.map(({x,y},i)=>(i?'L':'M')+x+' '+y).join(' ')+(gesture.path?' Z':''));
    path.setAttribute('stroke',gesture.color);
    path.setAttribute('fill',gesture.path?'rgba(60,180,220,.16)':'none');
    path.setAttribute('stroke-width',String(gesture.path?2:Math.max(2,gesture.width*v.state.zoom)));
    path.setAttribute('stroke-linecap','round');
    path.setAttribute('stroke-linejoin','round');
    path.setAttribute('stroke-opacity',gesture.path?'1':'.48');
  }
  private finishCanvasEditGesture(event:PointerEvent){
    this.appendEditPoint(event);
    const gesture=this.editGesture,points=this.editPoints,index=this.editPointIndex;
    this.clearCanvasEditGestureStroke();
    if(gesture?.pointEdit){
      const finalPoint=points.at(-1);
      if(index!==null&&finalPoint)gesture.pointEdit.commit(index,{x:finalPoint.x,y:finalPoint.y});
      if(this.editGesture?.pointEdit)this.updateEditStrokeOutline();
      return;
    }
    gesture?.complete(points);
  }
  private down=(e:PointerEvent)=>{if(!this.view||!this.session||!this.preset)return;
    // Undo can restore a virtual background while it remains selected. Do not
    // admit a stroke against nonexistent white raster; reselect to materialize.

    // Always accept a new gesture on the fixed viewport, even when a temporary
    // stroke / document layer becomes the hit target during formal painting.
    // Interactive editor controls inside the viewport must remain interactive.
    if(e.target instanceof Element&&e.target.closest('button,input,select,textarea,[contenteditable="true"],.crop-overlay,[data-canvas-no-input]'))return;
    if(this.editGesture?.pointEdit){
      if(e.button!==0||this.busy||this.inputBarrier||this.editPointer!==null)return;
      const location=this.pointerLocation(e),v=this.view;
      let index=-1,distance=22;
      this.editGesture.pointEdit.points.forEach((point,i)=>{
        if(this.editGesture?.pointEdit?.fixed?.[i])return;
        const screen=v.screen(point),d=Math.hypot(location.x-screen.x,location.y-screen.y);
        if(d<distance){index=i;distance=d;}
      });
      if(index>=0){
        e.preventDefault();this.editPointIndex=index;this.editPointer=e.pointerId;
        this.editPointerType=e.pointerType;this.appendEditPoint(e);
        this.inputViewport.setPointerCapture(e.pointerId);this.updateEditStrokeOutline();return;
      }
      if(e.pointerType!=='touch')return;
    }
    if(this.layerPick&&e.button===0){
      e.preventDefault();
      this.pickLayerAt(this.screenToDocument(this.pointerLocation(e)));
      return;
    }
    if(e.button===0&&e.altKey&&e.pointerType==='mouse'&&!this.busy&&!this.inputBarrier&&!this.editGesture&&!this.selectionMode&&!this.eyedropper){
      e.preventDefault();
      this.onLayerPickShortcut(this.screenToDocument(this.pointerLocation(e)));
      return;
    }
    if(!this.editGesture&&!this.selectionMode&&!this.eyedropper&&e.button===0&&
      (e.pointerType==='mouse'||e.pointerType==='pen')){
      const chosen=e.pointerType==='pen'?this.pointerRoles.pen:this.pointerRoles.mouse;
      if(chosen==='pan'){
        e.preventDefault();this.navigation?.mouseDown(e.pointerId,this.pointerLocation(e));
        this.inputViewport.setPointerCapture(e.pointerId);return;
      }
      if(chosen==='sample'){
        if(this.eyedropperPointer!==null)return;
        e.preventDefault();this.eyedropperPointer=e.pointerId;
        this.inputViewport.setPointerCapture(e.pointerId);
        this.queueSample(this.screenToDocument(this.pointerLocation(e)),'preview');return;
      }
    }
    if(this.selectionMode){
      if(this.selectionPointer!==null||e.button!==0)return;
      e.preventDefault();this.selectionPointer=e.pointerId;
      const start=this.view.document(this.pointerLocation(e));
      this.selectionAnchor=start;this.selectionRect=rectangleFromPoints(start,start);
      this.inputViewport.setPointerCapture(e.pointerId);
      this.updateSelectionOverlay();this.onSelectionChanged();return;
    }
    if(this.eyedropper){if(e.button!==0||this.eyedropperPointer!==null)return;e.preventDefault();this.eyedropperPointer=e.pointerId;this.inputViewport.setPointerCapture(e.pointerId);this.queueSample(this.screenToDocument(this.pointerLocation(e)),'preview');return;}
    if(e.pointerType==='touch'){
      e.preventDefault();
      const penActive=(this.pointer!==null&&this.strokePointerType==='pen')||this.editPointerType==='pen';
      if(this.palmGuard&&penActive&&Math.max(e.width,e.height)>=45){
        this.suppressedTouches.add(e.pointerId);this.inputViewport.setPointerCapture(e.pointerId);return;
      }
      if(this.navigation?.touchCount&&this.strokePointerType==='touch'){
       if(this.pointer!==null){void this.cancelStroke();}
      }
      if(this.navigation?.touchCount&&this.editPointerType==='touch')this.clearCanvasEditGestureStroke();
      this.cancelLayerPickHold();
      if(!this.fingerDrawing&&!penActive&&!this.panTool&&!this.busy&&!this.editGesture&&!this.inputBarrier&&!this.navigation?.touchCount){
        const position=this.pointerLocation(e);
        const timer=window.setTimeout(()=>{
          this.layerPickHold=null;
          if(!this.busy&&!this.inputBarrier&&!this.disposed)this.onLayerPickShortcut(this.screenToDocument(position));
        },550);
        this.layerPickHold={pointer:e.pointerId,position,timer};
      }
      this.navigation?.touchDown(e.pointerId,this.pointerLocation(e),!this.fingerDrawing||penActive||this.panTool);
      this.inputViewport.setPointerCapture(e.pointerId);
      if(this.navigation?.active||!this.fingerDrawing||penActive)return;
    }else if((e.pointerType==='mouse'&&e.button===1)||(e.button===0&&(this.spacePressed||this.panTool))){
      e.preventDefault();this.navigation?.mouseDown(e.pointerId,this.pointerLocation(e));
      this.inputViewport.setPointerCapture(e.pointerId);return;
    }
    if(this.editGesture){
      if(this.editGesture.pointEdit)return;
      if(e.button!==0||this.busy||this.inputBarrier||this.inspectedLayer||this.layerCompPreview||this.layerBlendPreview?.layerId===this.controller.selectedLayer.id)return;
      e.preventDefault();
      this.editPointer=e.pointerId;
      this.editPointerType=e.pointerType;
      this.appendEditPoint(e);
      this.inputViewport.setPointerCapture(e.pointerId);
      this.updateEditStrokeOutline();
      return;
    }
    const eraser=penEraserInput(e,this.barrelErases)?this.eraserPreset():null,preset=eraser??this.preset;
    const mask=this.selectionMask();
    if(mask&&this.busy){this.status('前の描画を反映しています。');return;}
    if(this.layerBlendPreview?.layerId===this.controller.selectedLayer.id){this.status('合成モードを確定または取り消してから描いてください。');return;}
    if(this.layerCompPreview){this.status('表示案の比較を終了してから描いてください。');return;}
    if(this.inspectedLayer){this.status('レイヤーの単独表示を解除してから描いてください。');return;}
    const layer=this.controller.selectedLayer;
    const root=this.controller.document.root,locked=root.isLayerContentLocked(layer.id);
    if(locked||!root.isLayerVisible(layer.id)){
      this.status(locked?'このレイヤーはロック中です。解除するか、別のレイヤーを選んでください。':'このレイヤーは非表示です。表示するか、別のレイヤーを選んでください。');
      return;
    }
    if(layer.imageLink){this.status('参照画像に描くには、リンク・埋め込みの管理で独立した描画レイヤーにしてください。');return;}
    if(layer.editable){this.status('このレイヤーは専用の操作画面で編集できます。筆で描くには描画用レイヤーを選んでください。');return;}
    if(layer.alphaLocked&&preset.blend==='erase'){
      this.status('不透明度をロックしているため消しゴムは使えません。');
      return;
    }
    if(this.controller.selectedLayer.baseColor==='white'){this.status('背景レイヤーをもう一度選ぶと、背景にも直接描けます。');return;}
    const inputReason=e.button!==0&&!eraser?'button':this.pointer!==null?'pointer-active':this.finishing?'cancelling':this.historySyncing?'history':this.inputBarrier?'document-barrier':this.operationMode!=='idle'?this.operationMode:null;const attempt=this.traceHandoff?{at:performance.now(),eventAt:e.timeStamp,reason:inputReason,state:{finishing:this.finishing,historySyncing:this.historySyncing,inputBarrier:this.inputBarrier,pendingLogical:this.handoff?.pending??0,pendingGpu:this.gpuFinishes.size,formalCommands:(this.renderer as any)?.document.count??0,pendingRaw:this.session.pendingRawCount,protectionQueue:this.protectionQueueLength}} as (typeof this.inputAttempts)[number]:null;if(attempt){this.inputAttempts.push(attempt);if(this.inputAttempts.length>1200)this.inputAttempts.shift();}if(inputReason)return;if(this.handoffFault){if(attempt)attempt.reason='fault';this.handoffRejected++;this.status('描画処理が停止しています。'+this.handoffFault);return;}const r=this.renderer as any;if((this.handoff?.pending??0)+this.gpuFinishes.size>=64||r?.document.count>100000||this.session.pendingRawCount>50000||this.protectionQueueLength>=128){if(attempt)attempt.reason='resource-limit';this.handoffRejected++;this.status('処理量の上限に達しました。作品の処理が終わるまで次の一筆をお待ちください。');return;}e.preventDefault();
    try{this.target=this.controller.target();this.pendingBranch=this.controller.canRedo;this.strokeMask=mask;this.reservation=mask?null:this.handoff!.reserve(this.target);
      const origin=this.view.document(this.pointerLocation(e)),w=this.target.width,h=this.target.height;
      this.wrapOrigin=this.view.seamless?{x:Math.floor(origin.x/w)*w,y:Math.floor(origin.y/h)*h}:null;
      const guideOrigin={x:origin.x-(this.wrapOrigin?.x??0),y:origin.y-(this.wrapOrigin?.y??0)};
      const bypass=e.shiftKey||this.skipNextArtworkGuide;
      this.skipNextArtworkGuide=false;
      const picked=!bypass&&this.artworkGuides.length?lockArtworkGuide(guideOrigin,this.artworkGuides,preset.blend==='erase',this.preferredGuide):null;
      this.activeGuide=picked?.guide??lockStraightGuide(guideOrigin,this.guideSettings,preset.blend==='erase',bypass);
      if(this.artworkGuides.length||bypass)this.onArtworkGuideTarget(picked?picked.name+'へ吸着（'+picked.distance.toFixed(1)+' px）':bypass?'この一筆は吸着を解除':'作品の定規への吸着なし');
      this.updateGuideOverlay();
      this.renderer?.setSeamlessPreview(this.view.seamless);
      const context={...(layer.alphaLocked?{alphaLocked:true}:{}),...(this.pressureCalibrationMidpoint===0.5?{}:{deviceCurve:[[0,0],[0.5,this.pressureCalibrationMidpoint],[1,1]] as const}),...(preset.stabilization.scope==='common'?{commonStabilization:{constant:this.commonStabilization,fast:preset.stabilization.fast,speedMode:preset.stabilization.speedMode,post:preset.stabilization.post}}:{})};
      // Color opacity applies to this stroke, not to the stored brush preset.
      // The eraser keeps its own separately configurable opacity.
      const strokePreset=preset.blend==='erase'||this.colorOpacity===1?preset:
        {...preset,opacity:preset.opacity*this.colorOpacity};
      this.activeStrokeId=this.session.begin(strokePreset,0,context,this.target.surfaceId,!mask);if(this.reservation)this.pendingStrokeIds.set(this.reservation,this.activeStrokeId);if(attempt){attempt.acceptedAt=performance.now();attempt.id=this.activeStrokeId;}this.handoffAccepted++;const s=this.sample(e);this.session.accept(s);this.session.predictions([]);this.pointer=e.pointerId;
      this.strokeSymmetry=!e.shiftKey&&this.symmetry.mode!=='off'&&(preset.blend!=='erase'||this.symmetry.erase)?this.symmetry:null;
      if(this.symmetry.mode!=='off'){this.updateSymmetryOverlay();this.trackSymmetryCursor(e);}
      this.strokePointerType=e.pointerType;this.inputViewport.setPointerCapture(e.pointerId);this.onStateChanged();}catch{this.target=null;this.status('このレイヤーには描画できません。');void this.cancelStroke();}};
  private move=(e:PointerEvent)=>{
    this.trackSymmetryCursor(e);
    if(this.layerPickHold?.pointer===e.pointerId){
      const p=this.pointerLocation(e),start=this.layerPickHold.position;
      if(Math.hypot(p.x-start.x,p.y-start.y)>7)this.cancelLayerPickHold();
    }
    if(e.pointerId===this.editPointer){
      e.preventDefault();
      const samples=e.getCoalescedEvents?.()??[];
      for(const sample of samples.length?samples:[e])this.appendEditPoint(sample);
      this.updateEditStrokeOutline();
      return;
    }
    if(e.pointerId===this.selectionPointer){
      if(!this.view||!this.selectionAnchor)return;
      const end=this.view.document(this.pointerLocation(e));
      this.selectionRect=clampSelectionRect(rectangleFromPoints(this.selectionAnchor,end),this.controller.document.root.width,this.controller.document.root.height);
      this.updateSelectionOverlay();e.preventDefault();return;
    }
    if(e.pointerId===this.eyedropperPointer){e.preventDefault();this.queueSample(this.screenToDocument(this.pointerLocation(e)),'preview');return;}
    if(e.pointerType==='touch'&&this.navigation?.touchMove(e.pointerId,this.pointerLocation(e))){e.preventDefault();return;}
     if(this.navigation?.mouseMove(e.pointerId,this.pointerLocation(e))){e.preventDefault();return;}
     if(e.pointerId!==this.pointer||!this.session)return;e.preventDefault();const coalesced=e.getCoalescedEvents?.()??[],events=coalesced.length?coalesced:[e],actual:Sample[]=[];for(let i=0;i<events.length;i++){
      const sample=this.sample(events[i]!);
      actual.push(sample);this.session.accept(sample,i===events.length-1);
    }
    const predictedEvents=this.strokeMask?[]:e.getPredictedEvents?.()??[];
    const predicted=this.clampPredicted(actual.at(-1)??this.sample(e),predictedEvents.slice(0,2).map(event=>({...this.sample(event),origin:'predicted'})));
    this.session.predictions(predicted);};
  private up=(e:PointerEvent)=>{
    if(this.layerPickHold?.pointer===e.pointerId)this.cancelLayerPickHold();
    if(e.pointerId===this.editPointer){
      if(e.pointerType==='touch')this.navigation?.touchUp(e.pointerId);
      e.preventDefault();this.finishCanvasEditGesture(e);return;
    }
    if(e.pointerId===this.selectionPointer){
      e.preventDefault();this.selectionPointer=null;this.selectionAnchor=null;
      if(!this.selectionRect||this.selectionRect.width<2||this.selectionRect.height<2)this.selectionRect=null;
      this.selectionMode=false;this.updateSelectionOverlay();this.onSelectionChanged();return;
    }
    if(this.suppressedTouches.delete(e.pointerId))return;if(e.pointerId===this.eyedropperPointer){e.preventDefault();this.eyedropperPointer=null;this.queueSample(this.screenToDocument(this.pointerLocation(e)),'commit');return;}if(e.pointerType==='touch')this.navigation?.touchUp(e.pointerId);else this.navigation?.mouseUp(e.pointerId);if(e.pointerId!==this.pointer||!this.session||!this.target)return;
    this.finishStroke(this.sample(e));};
  private finishStroke(release:Sample|null=null){if(!this.session||!this.target||this.pointer===null)return;const session=this.session,target=this.target,seamless=this.view?.seamless??false,strokeId=this.activeStrokeId,reservation=this.reservation,mask=this.strokeMask,symmetry=this.strokeSymmetry;session.predictions([]);const upAt=performance.now();this.pointer=null;this.strokeSymmetry=null;if(this.symmetryOverlay||this.symmetry.mode!=='off'){this.clearSymmetryCursor();this.updateSymmetryOverlay();}this.target=null;this.wrapOrigin=null;this.activeGuide=null;this.updateGuideOverlay();this.strokeMask=null;this.activeStrokeId=null;this.reservation=null;
    if(mask){void this.finishMaskedStroke(session,target,mask,seamless,release,symmetry);return;}
    if(!reservation)return;
    const promise=session.end(release?{...release,origin:'release'}:null),trace={id:strokeId!,upAt,readyMs:performance.now()-upAt} as (typeof this.handoffTraces)[number];if(this.traceHandoff){this.handoffTraces.push(trace);if(this.handoffTraces.length>1200)this.handoffTraces.shift();}const uiAt=performance.now();this.onStateChanged();trace.uiStateMs=performance.now()-uiAt;trace.readyMs=performance.now()-upAt;
    void promise.then(async record=>{if(!record||this.disposed)return;trace.recordMs=performance.now()-upAt;const variants=symmetry?[record,...await this.copySymmetricStroke(record,symmetry)]:[record];
      const copies=seamless?variants.flatMap((variant,index)=>[
        ...(index?[variant]:[]),...wrappedCopies(variant,target.width,target.height).map(copy=>copy.record)
      ]):variants.slice(1);
      try{const result=await this.handoff!.release(reservation,record,copies);if(result)trace.logicalMs=performance.now()-upAt;else trace.parkedMs=performance.now()-upAt;}
      catch(error){if(error instanceof EmptyStrokeError){if(!this.handoff?.pending)this.pendingBranch=false;await session.discardUncommitted(record);this.status('作品の範囲外のため、線は追加されませんでした。');return;}throw error;}
    }).catch(error=>{if(this.disposed)return;this.handoffFault=error instanceof Error?error.message:String(error);this.handoff?.fail(error);this.status('線を確定できませんでした。'+this.handoffFault);}).finally(()=>{if(!this.handoff?.owns(reservation))this.pendingStrokeIds.delete(reservation);if(!this.disposed)this.onStateChanged();});}

  private async finishMaskedStroke(session:RealtimeSession,target:DrawingTarget,mask:MaskData,seamless:boolean,release:Sample|null,symmetry:SymmetrySettings|null){
    this.finishing=true;
    this.onStateChanged();
    try{
      const record=await session.end(release?{...release,origin:'release'}:null);
      if(!record||this.disposed)return;
      await session.discardUncommitted(record);
      const artwork=this.controller.document,renderer=this.renderer;
      if(!renderer||artwork.head!==target.baseRevision||mask.width!==target.width||mask.height!==target.height)return;
      const variants=symmetry?[record,...await this.copySymmetricStroke(record,symmetry)]:[record];
      const copies=seamless?variants.flatMap((variant,index)=>[
        ...(index?[variant]:[]),...wrappedCopies(variant,target.width,target.height).map(copy=>copy.record)
      ]):variants.slice(1);
      const previous=new Uint8Array(await renderer.read(target.surfaceId));
      const result=await applySelectedStroke(mask,previous,[record,...copies]);
      if(!result||this.disposed||artwork.head!==target.baseRevision)return;
      const transaction=artwork.begin(record.preset.blend==='erase'?'選択範囲を消す':'選択範囲に描く');
      const deformation=artwork.root.getLayer(target.layerId).deformation;
      if(deformation){
        const later=artwork.rasterReplayPlan().operations.flatMap(operation=>
          operation.kind==='brush.stroke'&&operation.targetEntityIds[0]===target.layerId?[operation.parameters.strokeRecord]:[]);
        const passes=[...deformation.postPaint??[]];
        for(let start=0;start<later.length;start+=64)passes.push({selection:null,records:later.slice(start,start+64)});
        passes.push({selection:selectionAsLayerMask(mask),records:[record,...copies]});
        transaction.replaceLayerRaster(target.layerId,result,undefined,undefined,{...deformation,postPaint:passes});
      }else transaction.replaceLayerRaster(target.layerId,result);
      transaction.activateDrawingLayer(target.layerId);
      this.controller.lastPersistenceHandoff=transaction.commit().persistence;
      this.discardRedoProjection();
      this.onCommitted();
      this.finishing=false;
      await this.restoreDocumentProjection();
      this.status('選択範囲に反映しました。');
    }catch(error){if(!this.disposed)this.status(error instanceof Error?error.message:String(error));}
    finally{
      this.pendingBranch=false;
      this.finishing=false;
      this.renderer?.setSeamlessPreview(false);
      if(!this.disposed)this.onStateChanged();
    }
  }

  private publishStroke(reservation:StrokeReservation,record:StrokeRecord,additional:readonly StrokeRecord[],undone=false){
    const session=this.session!,started=performance.now();this.pendingBranch=false;this.pendingStrokeIds.delete(reservation);let ids:number[];try{session.discardRedo();if(undone){session.commitUndoneRecord(record,additional,reservation.target.surfaceId);this.onCommitted();return;}ids=session.commitRecord(record,additional,reservation.target.surfaceId);this.onCommitted();}catch(error){this.handoffFault=error instanceof Error?error.message:String(error);this.status('線の記録後に表示更新で問題が起きました。'+this.handoffFault);throw error;}const trace=this.handoffTraces.find(item=>item.id===ids[0]);if(trace)trace.savePrepareMs=performance.now()-started;
    const promise=session.renderer.waitStroke(ids).then(completion=>{if(trace&&!completion?.superseded)trace.gpuMs=performance.now()-trace.upAt;if(ids[0]!==undefined)session.renderer.clearSeamlessPreviews(ids[0]);if(!completion?.superseded&&!this.disposed&&this.pointer===null&&this.gpuFinishes.size===1)this.status(record.preset.blend==='erase'?'消した内容を作品に反映しました。':'線を作品に反映しました。');}).catch(error=>{this.handoffFault=error instanceof Error?error.message:String(error);if(!this.disposed)this.status('線の記録後に表示更新で問題が起きました。'+this.handoffFault);}).finally(()=>{this.gpuFinishes.delete(reservation.sequence);if(!this.disposed)this.onStateChanged();});this.gpuFinishes.set(reservation.sequence,promise);
  }
  setInputBarrier(enabled:boolean){this.inputBarrier=enabled;this.handoff?.setPublicationHeld(enabled);}
  setProtectionQueueLength(count:number){this.protectionQueueLength=count;}
  saveBoundary(){return this.handoff?.saveBoundary(this.reservation?.sequence)??Promise.resolve(this.controller.document.head);}
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
  get hasUncommittedInput(){return this.editPointer!==null||this.pointer!==null||(this.handoff?.pending??0)>0;}
  get hasPendingStrokes(){return (this.handoff?.pending??0)>0||this.gpuFinishes.size>0;}
  get inputActive(){return this.editPointer!==null||this.pointer!==null||this.finishing||this.historySyncing;}
  private cancel=(e:PointerEvent)=>{
    if(this.layerPickHold?.pointer===e.pointerId)this.cancelLayerPickHold();
    if(e.pointerId===this.editPointer){this.clearCanvasEditGestureStroke();if(this.editGesture?.pointEdit)this.updateEditStrokeOutline();}
    if(e.pointerId===this.selectionPointer){
      this.selectionPointer=null;this.selectionAnchor=null;this.selectionMode=false;this.updateSelectionOverlay();this.onSelectionChanged();return;
    }
    if(this.suppressedTouches.delete(e.pointerId))return;if(e.pointerId===this.eyedropperPointer){this.eyedropperPointer=null;this.pendingSample=null;this.sampleEpoch++;this.onSample(null,'cancel',null);return;}if(e.pointerType==='touch')this.navigation?.touchUp(e.pointerId);else this.navigation?.mouseUp(e.pointerId);if(e.pointerId===this.pointer){void this.cancelStroke();this.status('入力が中断されたため、この線を取り消しました。');}};
  private interruptInput=()=>{
    this.spacePressed=false;
    this.cancelLayerPickHold();
    this.clearCanvasEditGestureStroke();
    if(this.selectionPointer!==null){this.selectionPointer=null;this.selectionAnchor=null;this.selectionMode=false;this.updateSelectionOverlay();this.onSelectionChanged();}
    this.suppressedTouches.clear();
    this.navigation?.dispose();
    if(this.eyedropperPointer!==null){
      this.eyedropperPointer=null;this.pendingSample=null;this.sampleEpoch++;this.onSample(null,'cancel',null);
    }
    if(this.pointer!==null){void this.cancelStroke();this.status('入力が中断されたため、この線を取り消しました。');}
  };
  private async cancelStroke(){const id=this.activeStrokeId;if(this.reservation){this.handoff?.cancel(this.reservation);this.pendingStrokeIds.delete(this.reservation);if(!this.handoff?.pending)this.pendingBranch=false;this.reservation=null;}this.pointer=null;this.strokeSymmetry=null;if(this.symmetryOverlay||this.symmetry.mode!=='off'){this.clearSymmetryCursor();this.updateSymmetryOverlay();}this.target=null;this.wrapOrigin=null;this.activeGuide=null;this.updateGuideOverlay();this.strokeMask=null;this.activeStrokeId=null;this.finishing=true;this.onStateChanged();try{this.session?.predictions([]);await this.session?.cancel();}catch{this.status('描画を取り消せませんでした。');}finally{if(id!==null)this.renderer?.clearSeamlessPreviews(id);this.renderer?.setSeamlessPreview(false);this.finishing=false;this.onStateChanged();}}
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
  private clampPredicted(last:Sample,predicted:Sample[]){if(!predicted.length)return[];const r=this.layoutRect(),target=this.target??this.controller.target(),maxLead=Math.max(1,target.width/Math.max(1,r.width)*3),out:Sample[]=[];let anchor=last;for(const p of predicted){let x=p.x,y=p.y;const dx=x-anchor.x,dy=y-anchor.y,d=Math.hypot(dx,dy);if(d>maxLead){const k=maxLead/d;x=anchor.x+dx*k;y=anchor.y+dy*k;}out.push({...p,x,y});anchor={...p,x,y};}return out;}
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
      if(!root.isLayerVisible(layer.id)||layer.opacity<=0)continue;
      const key=layer.surface.descriptor.surfaceId;
      const layerCanvas=new OffscreenCanvas(width,height),layerContext=layerCanvas.getContext('2d');
      if(!layerContext)throw new Error('Thumbnail layer canvas unavailable');
      if(layer.baseColor==='white'){layerContext.fillStyle='#fff';layerContext.fillRect(0,0,width,height);}
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
  async captureDocumentLayers(ids?:ReadonlySet<LayerId>){if(!this.renderer||this.busy)throw new Error('画像を変更できません。描画終了後に操作してください。');
    await this.renderer.drain();
    const result=new Map<ReturnType<EditorController['target']>['layerId'],Uint8Array>();
    for(const layer of this.controller.layers){
      if(ids&&!ids.has(layer.id))continue;
      const bytes=new Uint8Array(await this.renderer.read(layer.surface.descriptor.surfaceId));
      if(layer.baseColor==='white')bytes.fill(255);
      result.set(layer.id,bytes);
    }
    return result;
  }
  // A newly created white work already has exact canonical white tiles.
  // Populate the new drawing worker directly instead of reconstructing a
  // full-size geometry projection and uploading it a second time.
  // Saved/recovered documents deliberately continue using normal restoration.
  async seedFreshWhiteBackground(surfaceKey:string){
    if(!this.renderer||!this.session)throw new Error('Renderer is not initialized');
    if(!this.controller.layers.some(layer=>layer.surface.descriptor.surfaceId===surfaceKey))throw new Error('White background layer missing');
    const host=this.renderer as unknown as {call?:(method:string,args:unknown)=>Promise<unknown>;update?:(state:unknown)=>void;worker?:Worker};
    if(!host.call||!host.update)throw new Error('Drawing worker cannot seed the new background');
    const monitor=(event:MessageEvent)=>{
      if(event.data?.type==='white-seed-stage'){const recorder=window as unknown as {__illustroWhiteSeedStage?:unknown;__illustroWhiteSeedStages?:unknown[]};recorder.__illustroWhiteSeedStage=event.data;(recorder.__illustroWhiteSeedStages??=[]).push(event.data);}
    };
    if(new URLSearchParams(location.search).has('perf'))host.worker?.addEventListener('message',monitor);
    try{host.update(await host.call('restore',{entries:[],cache:null,geometry:true,solidWhiteSurfaceKey:surfaceKey}));}
    finally{host.worker?.removeEventListener('message',monitor);}
  }
  async restoreDocumentProjection(cache?:ProjectionCache){
    if(!this.session||!this.renderer)throw new Error('Renderer is not initialized');if(this.busy)throw new Error('Renderer is busy');
    const started=performance.now();this.historySyncing=true;this.onStateChanged();    try{
      this.syncLayerStack();
      const {operations:visibleOperations,followsGeometry:geometry,seededLayers}=this.controller.document.rasterReplayPlan();
      const root=this.controller.document.root;
      const needsSeed=geometry||this.controller.layers.some(layer=>seededLayers.has(layer.id));
      ((this.renderer as any).proxy)?.setEnabled(!needsSeed);
      const entries:Array<{operation:SemanticOperation;record:StrokeRecord;surfaceKey:string;keys:string[]}>=[];for(const operation of visibleOperations){
        const target=operation.targetEntityIds[0];
        if(target&&!root.hasLayer(target))continue;
        if(operation.kind==='brush.stroke'){const record=validateRecord(operation.parameters.strokeRecord);this.restoredRecords.set(operation.parameters.strokeRecord as object,record);entries.push({operation,record,surfaceKey:this.surfaceForOperation(operation),keys:this.runtimeKeys(operation)});}
        else if(operation.kind==='raster.strict-delta')throw new Error('Direct raster deltas outside geometry need materialization');
      }
      const savedCache=this.validProjectionCache(cache);
      const baseGeometry:ProjectionCacheV1|undefined=needsSeed&&!savedCache?{version:1,revisionId:this.controller.document.head,width:root.width,height:root.height,layers:this.controller.layers.filter(layer=>geometry||seededLayers.has(layer.id)).map(layer=>({surfaceId:layer.surface.descriptor.surfaceId,pixels:this.controller.document.readBaseRasterPixels(layer.id)}))}:undefined;
      const validCache=savedCache??baseGeometry;
      const cachedKeys=needsSeed&&!savedCache?new Set<SemanticOperation['key']>():new Set(validCache?this.controller.document.rasterReplayPlan(validCache.revisionId as RevisionId).operations.filter(op=>op.kind==='brush.stroke').map(op=>op.key):[]);
      await (this.session as any).restore(entries.map(e=>({...e,cached:cachedKeys.has(e.operation.key)})),validCache,needsSeed);
      this._projectionRestoreMode=validCache?'cache':'replay-fallback';this._projectionCacheRevision=validCache?.revisionId??null;
    }finally{
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
  syncLayerStack(){const keys=this.surfaceKeys();this.renderer?.setSurfaceStack(keys);this.session?.setSurfaceStack(keys);this.syncLayerStyles();}
  discardRedoProjection(){this.handoff?.discardRedo();this.session?.discardRedo();}
  private soloLayerId:LayerId|null=null;
  get inspectedLayer(){
    const root=this.controller.document.root;
    return this.soloLayerId&&root.hasLayer(this.soloLayerId)?root.getLayer(this.soloLayerId):null;
  }
  setSoloLayer(id:LayerId|null){
    if(id&&!this.controller.document.root.hasLayer(id))throw new Error('unknown solo layer');
    this.soloLayerId=id;
    this.syncLayerStyles();
  }
  private layerCompPreview:LayerComp|null=null;
  private isolationPreview:{id:LayerId;isolated:boolean}|null=null;
  private structurePreview:EditorController['document']['root']|null=null;
  setStructurePreview(root:EditorController['document']['root']|null){
    this.structurePreview=root;
    const current=root??this.controller.document.root;
    this.renderer?.setSurfaceStack(current.rootLayerIds.map(id=>current.getLayer(id).surface.descriptor.surfaceId));
    this.syncLayerStyles();
  }
  setIsolationPreview(preview:{id:LayerId;isolated:boolean}|null){
    this.isolationPreview=preview;this.syncLayerStyles();
  }
  private layerBlendPreview:{layerId:LayerId;blend:LayerBlend;opacity:number;tonePreview?:boolean}|null=null;
  setLayerBlendPreview(preview:{layerId:LayerId;blend:LayerBlend;opacity:number;tonePreview?:boolean}|null){
    this.layerBlendPreview=preview;
    this.syncLayerStyles();
  }
  setLayerCompPreview(comp:LayerComp|null){
    this.layerCompPreview=comp;
    this.syncLayerStyles();
  }
  setLayerOpacityPreview(preview?:{layerId:LayerId;opacity:number}){
    this.syncLayerStyles(preview);
  }
  private syncLayerStyles(preview?:{layerId:LayerId;opacity:number}){
    const solo=this.inspectedLayer,root=this.structurePreview??this.controller.document.root;
    const layers=this.layerCompPreview?new Map(this.layerCompPreview.layers.map(layer=>[layer.id,layer])):null;
    const groups=this.layerCompPreview?new Map(this.layerCompPreview.groups.map(group=>[group.id,group.visible])):null;
    this.renderer?.setSurfaceStyles(root.rootLayerIds.map(id=>{
      const layer=root.getLayer(id),candidate=layers?.get(layer.id);
      const visible=this.layerCompPreview
        ?(candidate?.visible??layer.visible)&&root.groupsForLayer(layer.id).every(group=>groups?.get(group.id)??group.visible)
        :root.isLayerVisible(layer.id);
      const clip=root.clippingSource(layer.id);
      const isolation=solo?[]:root.groupsForLayer(layer.id).filter(group=>
        this.isolationPreview?.id===group.id?this.isolationPreview.isolated:group.compositing==='isolated').map(group=>group.id);
      const blendPreview=this.layerBlendPreview?.layerId===layer.id?this.layerBlendPreview:null;
      const blend=blendPreview?(blendPreview.tonePreview?{...blendPreview.blend,tonePreview:true}:blendPreview.blend)
        :candidate?.blend!==undefined?candidate.blend:layer.blend;
      return {
        surfaceKey:layer.surface.descriptor.surfaceId,
        visible:solo?layer.id===solo.id:visible,
        ...(!solo&&clip?{clipKey:clip.surface.descriptor.surfaceId}:{}),
        ...(isolation.length?{isolation}:{}),
        ...(layer.vectorMask?.enabled?{mask:layer.vectorMask}:{}),
        ...(!solo&&blend?{blend}:{}),
        ...(layer.baseColor==='white'?{white:true}:{}),
        opacity:preview?.layerId===layer.id?preview.opacity:blendPreview?.opacity??candidate?.opacity??layer.opacity,
      };
    }));
  }
  private surfaceKeys(){
    // White paper is a logical backdrop until the user explicitly edits it.
    // Do not place this virtual (pixel-free) layer into the realtime GPU
    // compositor; normal drawing has the exact same active GPU layer count
    // as a transparent document. Materialized/legacy backgrounds remain real.
    const physical=this.controller.layers.filter(layer=>layer.baseColor!=='white');
    return (physical.length?physical:this.controller.layers).map(layer=>layer.surface.descriptor.surfaceId);
  }
  private surfaceForOperation(operation:SemanticOperation,revisionId?:RevisionId){const target=operation.targetEntityIds[0],root=revisionId?this.controller.document.revision(revisionId).root:this.controller.document.root;if(!target||!root.hasLayer(target))throw new Error('History target layer missing');return root.getLayer(target).surface.descriptor.surfaceId;}
  private strokeRecord(operation:SemanticOperation){const record=operation.parameters.strokeRecord;if(!record||typeof record!=='object'||!Array.isArray((record as StrokeRecord).commands))throw new Error('History stroke record missing');return this.restoredRecords.get(record as object)??record as StrokeRecord;}
  private runtimeKeys(operation:SemanticOperation){const root=this.controller.document.root,keys=new Set<string>(),maxX=Math.ceil(root.width/TILE)-1,maxY=Math.ceil(root.height/TILE)-1;
    for(const f of operation.dirtyFootprint){const x0=f.tileX*CANONICAL_TILE_SIZE+f.bounds.x0,y0=f.tileY*CANONICAL_TILE_SIZE+f.bounds.y0,x1=f.tileX*CANONICAL_TILE_SIZE+f.bounds.x1,y1=f.tileY*CANONICAL_TILE_SIZE+f.bounds.y1;
      const minX=Math.max(0,Math.floor(x0/TILE)),minY=Math.max(0,Math.floor(y0/TILE)),endX=Math.min(maxX,Math.ceil(x1/TILE)-1),endY=Math.min(maxY,Math.ceil(y1/TILE)-1);
      for(let y=minY;y<=endY;y++)for(let x=minX;x<=endX;x++)keys.add(x+','+y);}
    return [...keys];
  }
  setForegroundColor(color:readonly [number,number,number],opacity=1){
    if(!color.every(x=>Number.isFinite(x)&&x>=0&&x<=1)||!Number.isFinite(opacity)||opacity<0||opacity>1)return;
    this.foreground=[...color] as [number,number,number];this.colorOpacity=opacity;
    if(this.preset?.blend!=='erase'&&this.preset)this.preset.color=[...this.foreground];
  }
  get samplingColor(){return this.eyedropperPointer!==null||this.commitSamplePending;}
  setEyedropper(enabled:boolean,source:'composite'|'layer'|'specific'='composite'){
    if(!enabled&&this.eyedropperPointer!==null){
      this.eyedropperPointer=null;this.pendingSample=null;this.sampleEpoch++;this.onSample(null,'cancel',null);
    }
    this.eyedropper=enabled;this.sampleSource=source;
  }
  configureSample(settings:{source:'composite'|'layer'|'specific';layerId:LayerId|null;diameter:1|3|5;transparency:'skip'|'keep'|'white'}){
    this.sampleSource=settings.source;this.sampleLayerId=settings.layerId;this.sampleDiameter=settings.diameter;
    this.sampleTransparency=settings.transparency;
  }
  private commitSamplePending=false;
  private queueSample(point:Point,phase:'preview'|'commit'){if(phase==='commit')this.commitSamplePending=true;this.pendingSample={point,phase};if(!this.sampleRunning)void this.flushSamples();}
  private async flushSamples(){this.sampleRunning=true;const epoch=this.sampleEpoch;try{while(this.pendingSample&&epoch===this.sampleEpoch&&!this.disposed){const requested=this.pendingSample;this.pendingSample=null;let rgba:readonly number[]|null=null;try{rgba=await this.readSampleArea(requested.point);}catch(error){this.status('色を取得できませんでした。'+(error instanceof Error?error.message:String(error)));}
    if(epoch!==this.sampleEpoch||this.disposed)return;if(this.pendingSample&&requested.phase!=='commit')continue;if(requested.phase==='commit')this.commitSamplePending=false;this.onSample(rgba,requested.phase,requested.point);
   }}finally{this.sampleRunning=false;if(this.pendingSample&&!this.disposed)void this.flushSamples();}}
  /** Optional 3x3/5x5 eyedropper averaging. One-pixel path stays the default. */
  private async readSampleArea(point:Point):Promise<readonly number[]|null>{
    const diameter=this.sampleDiameter,mode=this.sampleTransparency;
    if(diameter===1){
      const rgba=await this.readOnePixel(point);
      if(!rgba||rgba.length<4)return null;
      if(mode==='skip'&&(rgba[3]??0)===0)return null;
      return mode==='white'?this.sampleAgainstWhite(rgba):rgba;
    }
    const half=Math.floor(diameter/2);
    const sum=[0,0,0,0];let count=0;
    for(let y=-half;y<=half;y++)for(let x=-half;x<=half;x++){
      const rgba=await this.readOnePixel({x:point.x+x,y:point.y+y});
      if(!rgba||rgba.length<4)continue;
      if(mode==='skip'&&(rgba[3]??0)===0)continue;
      const c=mode==='white'?this.sampleAgainstWhite(rgba):rgba;
      for(let i=0;i<4;i++)sum[i]=(sum[i]??0)+(c[i]??0);
      count++;
    }
    if(!count)return null;
    return sum.map(n=>Math.min(255,Math.max(0,Math.round(n/count))));
  }
  private sampleAgainstWhite(rgba:readonly number[]):readonly number[]{
    const opacity=Math.min(1,Math.max(0,(rgba[3]??0)/255));
    return [0,1,2].map(index=>Math.min(255,Math.max(0,Math.round((rgba[index]??0)+(1-opacity)*255)))).concat([255]);
  }
  /** Read only a 1x1 GPU region. Neither a canvas readback nor a layer recomposition is allowed here. */
  private async readOnePixel(point:Point):Promise<readonly number[]|null>{
   const x=Math.floor(point.x),y=Math.floor(point.y),w=this.controller.document.root.width,h=this.controller.document.root.height;
   if(x<0||y<0||x>=w||y>=h)return null;
   const backend=(this.renderer as unknown as {backend?:any}|null)?.backend;if(!backend)return null;
   const selected=this.sampleSource==='specific'
     ?this.controller.layers.find(layer=>layer.id===this.sampleLayerId):this.controller.selectedLayer;
   if(this.sampleSource==='specific'&&!selected)return null;
   if(this.sampleSource!=='composite'&&selected?.baseColor==='white')return [255,255,255,255];
   const key=this.sampleSource==='composite'?null:selected?.surface.descriptor.surfaceId??null;
   const rgba=await (this.renderer as any).readPixel(x,y,key) as number[];
   // The logical white layer is not uploaded to the GPU. The composite
   // eyedropper must still return the actual appearance of white paper.
   const solo=this.inspectedLayer;
   const white=this.sampleSource==='composite'?this.controller.layers.find(layer=>layer.baseColor==='white'&&(solo?solo.id===layer.id:layer.visible)&&layer.opacity>0):null;
   if(white&&rgba&&rgba.length>=4){
     return compositeWhiteBackdrop(rgba,white.opacity);
   }
   return rgba;
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
  get performanceDiagnostics(){const r=this.renderer as any;return {...this.renderer?.performanceSummary(),handoff:{inputAttempts:this.traceHandoff?this.inputAttempts:[],accepted:this.handoffAccepted,rejected:this.handoffRejected,pendingLogical:this.handoff?.pending??0,pendingGpu:this.gpuFinishes.size,pendingEntries:this.handoff?.diagnostics,historyVisibility:this.historyTraces,protectionQueue:this.protectionQueueLength,fault:this.handoffFault,traces:this.traceHandoff?this.handoffTraces:[]},frameState:{lastFrameAt:this.lastFrameAt,disposed:this.disposed,operationMode:this.operationMode,pointer:this.pointer,finishing:this.finishing,historySyncing:this.historySyncing,inputBarrier:this.inputBarrier,pendingRawCount:this.session?.pendingRawCount??0,formalCommands:r?.document.count??0,inflight:r?.inflight,viewPending:r?.viewPending,navigationActive:r?.navigationActive,navigationUntil:r?.navigationUntil,guardPreparing:r?.guardPreparing,overlayViewPending:!!r?.overlayViewPending,overlayPending:r?.proxy?.pending.size,overlayFinalizations:r?.proxy?.finalizations.size,viewFence:!!r?.backend.viewFence,viewSubmission:!!r?.backend.viewSubmission,cancellingStroke:!!r?.cancellingStroke,needsFrame:r?.needsFrame,jobs:r?.document.jobs.length,presentationHeld:r?.backend.presentationHeld,glFence:!!r?.backend.fence,pending:!!r?.backend.pending,errors:r?.errors,sessionErrors:this.session?.errors},checkpoint:{...this.checkpointMetrics},strokeReplayFallbacks:this.historyReplayFallbacks,fullDocumentRebuilds:this.session?.fullDocumentRebuilds??0,fullReplayStrokes:this.session?.fullReplayStrokes??0,cancelledStrokeCount:this.session?.cancelledStrokeCount??0,projectionRestoreMode:this._projectionRestoreMode};}
  get interacting(){return !!this.navigation?.touching||this.busy;}
  get initializationError(){return this._initializationError;}get backendSelection(){return this.renderer?.info.selection??null;}get backend(){return String(this.renderer?.info.backend??'未取得');}get rendererDesynchronized(){return Boolean(this.renderer?.info.desynchronized);}get rendererAlpha(){return Boolean(this.renderer?.info.alpha);}get rendererPremultipliedAlpha(){return Boolean(this.renderer?.info.premultipliedAlpha);}get rendererArtworkAlpha(){return Boolean(this.renderer?.info.artworkAlpha);}get presentationOpaque(){return Boolean(this.renderer?.info.presentationOpaque);}get presentationMode(){return 'worker-images';}get presentationAlpha(){return this.renderer?.info.alpha??null;}get presentationDesynchronized(){return this.renderer?.info.desynchronized??null;}get presentationFrames(){return this.presentedFrames;}get presentationLastAt(){return this.lastPresentedAt;}get projectionRestoreMs(){return this._projectionRestoreMs;}get projectionRestoreMode(){return this._projectionRestoreMode;}get projectionCacheRevision(){return this._projectionCacheRevision;}get browserPredictionSamples(){return this.session?.browserPredictions??0;}get brushName(){return this.preset?.name??'未選択';}get brushId(){return this.preset?.id??'未選択';}get blendMode(){return this.preset?.blend??'normal';}get eraserType(){return this.preset?.id==='foundation-hard-eraser'?'hard':this.preset?.id==='foundation-soft-eraser'?'soft':this.preset?.blend==='erase'?'erase':null;}get brushSize(){return this.preset?.size??0;}get historyPatchHits(){return this.session?.historyPatchHits??0;}get historyReplayFallbacks(){return this.session?.historyReplayFallbacks??0;}get busy(){return this.inputActive||this.hasPendingStrokes;}
  destroy(){this.showArtworkPreview(null);this.artworkGuideOverlay?.remove();cancelAnimationFrame(this.symmetryFrame);this.symmetryOverlay?.remove();this.cancelLayerPickHold();void this.showLayerOutline(null);this.setCanvasEditGesture(null);this.setMaskInspection();this.activeGuide=null;this.selectionRect=null;this.updateSelectionOverlay();this.updateGuideOverlay();this.resizeObserver?.disconnect();this.densityMedia?.removeEventListener('change',this.densityChanged);this.navigation?.dispose();this.navigation=null;this.disposed=true;cancelAnimationFrame(this.frameId);this.abort.abort();if(this.renderer)this.renderer.onPresentation=null;this.session?.destroy();}
}
