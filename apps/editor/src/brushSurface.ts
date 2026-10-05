import type {FoundationPreset,GpuRenderer,RealtimeSession,Sample} from '@illustro/brush-rt';
import workerUrl from '../../../packages/brush-rt/dist/rt/canonical.worker.mjs?worker&url';
import type {EditorController} from './controller';

// This adapter uses the frozen engine; it never edits its shader/scheduler.
export class BrushSurface {
  private renderer:GpuRenderer|null=null;
  private session:RealtimeSession|null=null;
  private frameId=0;
  private pointer:number|null=null;
  private finishing=false;
  private disposed=false;
  private target:ReturnType<EditorController['target']>|null=null;
  readonly abort=new AbortController();
  brushes:readonly FoundationPreset[]=[];
  preset:FoundationPreset|null=null;
  fingerDrawing=false;
  constructor(private canvas:HTMLCanvasElement,private controller:EditorController,
    private status:(text:string)=>void) {}
  async initialize() {
    const engine=await import('@illustro/brush-rt');
    const target=this.controller.target();
    this.canvas.width=target.width;this.canvas.height=target.height;
    const backend=new URLSearchParams(location.search).get('backend');
    this.renderer=await engine.GpuRenderer.create(this.canvas,target.width,target.height,
      backend==='webgl2'||backend==='webgpu'?backend:'auto');
    this.session=new engine.RealtimeSession(this.renderer,workerUrl);
    this.brushes=engine.referenceBrushes;this.preset=structuredClone(this.brushes[0]!);
    const options={signal:this.abort.signal};
    this.canvas.addEventListener('pointerdown',this.down,options);
    this.canvas.addEventListener('pointermove',this.move,options);
    this.canvas.addEventListener('pointerup',this.up,options);
    this.canvas.addEventListener('pointercancel',this.cancel,options);
    this.canvas.addEventListener('lostpointercapture',this.cancel,options);
    this.frameId=requestAnimationFrame(this.frame);
  }
  private sample(e:PointerEvent):Sample {
    const r=this.canvas.getBoundingClientRect(),target=this.target??this.controller.target();
    return {x:(e.clientX-r.left)/r.width*target.width,y:(e.clientY-r.top)/r.height*target.height,
      t:e.timeStamp,pressure:e.pressure,pointerType:e.pointerType,
      tilt:Math.min(1,Math.hypot(e.tiltX,e.tiltY)/90),
      azimuth:Math.atan2(e.tiltY,e.tiltX),twist:e.twist/360};
  }
  private down=(e:PointerEvent)=>{
    if(e.button!==0||this.pointer!==null||this.finishing||!this.session||!this.preset)return;
    if(e.pointerType==='touch'&&!this.fingerDrawing)return;
    e.preventDefault();this.target=this.controller.target();
    try {this.session.begin(this.preset);this.session.accept(this.sample(e));
      this.pointer=e.pointerId;this.canvas.setPointerCapture(e.pointerId);
    } catch {this.status('描画を開始できませんでした。');void this.cancelStroke();}
  };
  private move=(e:PointerEvent)=>{
    if(e.pointerId!==this.pointer||!this.session)return;e.preventDefault();
    const samples=e.getCoalescedEvents?.()??[];
    for(const sample of samples.length?samples:[e])this.session.accept(this.sample(sample));
  };
  private up=(e:PointerEvent)=>{
    if(e.pointerId!==this.pointer||!this.session||!this.target)return;
    const session=this.session,target=this.target;this.pointer=null;this.finishing=true;
    // Do not synthesize release geometry. The engine receives release metadata.
    void session.end({...this.sample(e),origin:'release'}).then(async record=>{
      if(record)await this.controller.finishStroke(target,record);
      this.status('描画を確認できます。レイヤー・取消・保存は準備中です。');
    }).catch(()=>this.status('線を確定できませんでした。')).finally(()=>{this.finishing=false;});
  };
  private cancel=(e:PointerEvent)=>{if(e.pointerId===this.pointer)void this.cancelStroke();};
  private async cancelStroke(){this.pointer=null;this.finishing=true;
    try {await this.session?.cancel();}catch{this.status('描画を取り消せませんでした。');}
    finally{this.finishing=false;}}
  private frame=(now:number)=>{
    if(this.disposed)return;this.session?.frame(now);
    if(this.renderer?.errors.length||this.session?.errors.length)this.status('描画中に問題が起きました。');
    this.frameId=requestAnimationFrame(this.frame);
  };
  select(index:number){const p=this.brushes[index];if(p)this.preset=structuredClone(p);}
  setSize(value:number){if(this.preset&&Number.isFinite(value)&&value>=.1&&value<=1024)this.preset.size=value;}
  setForceFade(enabled:boolean){if(this.preset?.forceFade)this.preset.forceFade.enabled=enabled;}
  destroy(){this.disposed=true;cancelAnimationFrame(this.frameId);this.abort.abort();this.session?.destroy();}
}
