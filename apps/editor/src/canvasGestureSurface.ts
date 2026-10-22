import {CanvasView,type Point} from './canvasView';

/**
 * Pointer ownership and gesture math only. No render worker, pixel readback,
 * brush raster, asynchronous callback or DOM image replacement lives here.
 */
export class CanvasGestureSurface {
  private readonly touches=new Map<number,Point>();
  private mouse:number|null=null;
  private mousePoint:Point|null=null;
  private mode:'idle'|'pan'|'pinch'='idle';
  private anchor:{center:Point;distance:number;angle:number}|null=null;
  private space=false;
  private readonly abort=new AbortController();
  constructor(
    private readonly target:HTMLElement,
    private readonly view:CanvasView,
    private readonly drawingTouch:()=>boolean,
    private readonly penDrawing:()=>boolean,
    private readonly canSingleTouchPan:()=>boolean,
    private readonly endTouchInk:()=>void,
    private readonly changed:()=>void,
    private readonly completed:()=>void
  ){
    const signal=this.abort.signal;
    target.addEventListener('pointerdown',this.down,{signal,capture:true});
    target.addEventListener('pointermove',this.move,{signal,capture:true});
    target.addEventListener('pointerup',this.up,{signal,capture:true});
    target.addEventListener('pointercancel',this.up,{signal,capture:true});
    target.addEventListener('lostpointercapture',this.up,{signal,capture:true});
    target.addEventListener('wheel',this.wheel,{signal,passive:false});
    window.addEventListener('keydown',this.key,{signal});
    window.addEventListener('keyup',this.key,{signal});
    window.addEventListener('blur',()=>{this.space=false;this.stop();},{signal});
  }
  get active(){return this.mode!=='idle';}
  get touching(){return this.touches.size>0;}
  private point(e:PointerEvent|WheelEvent):Point{
    const r=this.target.getBoundingClientRect();
    return {x:e.clientX-r.left,y:e.clientY-r.top};
  }
  private snapshot(){
    const [p,q]=[...this.touches.values()];
    if(!p||!q)return null;
    return {center:{x:(p.x+q.x)/2,y:(p.y+q.y)/2},
      distance:Math.max(.001,Math.hypot(p.x-q.x,p.y-q.y)),
      angle:Math.atan2(q.y-p.y,q.x-p.x)};
  }
  private key=(e:KeyboardEvent)=>{
    if(e.code!=='Space')return;
    const t=e.target;
    if(e.type==='keydown'&&(t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement||(t instanceof HTMLElement&&t.isContentEditable)))return;
    this.space=e.type==='keydown';
    if(this.space&&!e.repeat)e.preventDefault();
  };
  private down=(e:PointerEvent)=>{
    if(e.pointerType==='touch'){
      this.touches.set(e.pointerId,this.point(e));
      if(this.touches.size>=2){
        if(this.touches.size===2&&this.drawingTouch()&&!this.penDrawing())this.endTouchInk();
        this.mode='pinch';this.anchor=this.snapshot();
      }else if((!this.drawingTouch()||this.penDrawing())&&this.canSingleTouchPan()){
        this.mode='pan';this.anchor=null;
      }
      if(this.active){
        e.preventDefault();e.stopImmediatePropagation();
        try{this.target.setPointerCapture(e.pointerId);}catch{}
      }
      return;
    }
    if(e.pointerType==='mouse'&&(e.button===1||(e.button===0&&this.space))){
      this.mode='pan';this.mouse=e.pointerId;this.mousePoint=this.point(e);
      e.preventDefault();e.stopImmediatePropagation();
      try{this.target.setPointerCapture(e.pointerId);}catch{}
    }
  };
  private move=(e:PointerEvent)=>{
    const p=this.point(e);
    if(e.pointerType==='touch'){
      const previous=this.touches.get(e.pointerId);
      if(!previous)return;
      this.touches.set(e.pointerId,p);
      if(this.mode==='pinch'){
        const next=this.snapshot();
        if(next&&this.anchor){
          const delta=next.angle-this.anchor.angle;
          const angle=Math.atan2(Math.sin(delta),Math.cos(delta));
          this.view.pan(next.center.x-this.anchor.center.x,next.center.y-this.anchor.center.y);
          this.view.zoomAt(next.distance/this.anchor.distance,next.center);
          this.view.rotateAt(angle,next.center);
          this.changed();this.anchor=next;
        }
      }else if(this.mode==='pan'){
        this.view.pan(p.x-previous.x,p.y-previous.y);this.changed();
      }else return;
      e.preventDefault();e.stopImmediatePropagation();return;
    }
    if(e.pointerId===this.mouse&&this.mousePoint&&this.mode==='pan'){
      this.view.pan(p.x-this.mousePoint.x,p.y-this.mousePoint.y);
      this.mousePoint=p;this.changed();e.preventDefault();e.stopImmediatePropagation();
    }
  };
  private up=(e:PointerEvent)=>{
    if(e.pointerType==='touch'){
      if(!this.touches.delete(e.pointerId))return;
      if(this.mode==='idle')return;
      if(this.touches.size>=2){this.mode='pinch';this.anchor=this.snapshot();}
      else if(this.touches.size===1){this.mode='pan';this.anchor=null;}
      else this.stop();
      e.preventDefault();e.stopImmediatePropagation();return;
    }
    if(e.pointerId===this.mouse){
      this.mouse=null;this.mousePoint=null;this.stop();
      e.preventDefault();e.stopImmediatePropagation();
    }
  };
  private wheel=(e:WheelEvent)=>{
    if(!Number.isFinite(e.deltaY))return;
    e.preventDefault();
    this.view.zoomAt(Math.exp(-e.deltaY*.0015),this.point(e));
    this.changed();this.completed();
  };
  private stop(){
    const wasActive=this.active;this.mode='idle';this.mouse=null;this.mousePoint=null;this.anchor=null;this.touches.clear();
    if(wasActive)this.completed();
  }
  destroy(){this.stop();this.abort.abort();}
}
