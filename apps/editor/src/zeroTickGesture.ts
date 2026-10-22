import type {CanvasView,Point} from './canvasView';

type Pair = {middle:Point;span:number;angle:number};
type Mode = 'none'|'translate'|'transform';

/**
 * Camera input owns only screen geometry. It never speaks to the drawing
 * Worker or waits for the current stroke; a blocked worker cannot own touch.
 */
export class ZeroTickGesture {
  private contacts=new Map<number,Point>();
  private mode:Mode='none';
  private lastPair:Pair|null=null;
  private mouseId:number|null=null;
  private mouseAt:Point|null=null;
  private space=false;
  private suspendedTouchStroke=false;
  private readonly abort=new AbortController();
  private bounds={left:0,top:0};
  constructor(
    private readonly region:HTMLElement,
    private readonly camera:CanvasView,
    private readonly fingerDraws:()=>boolean,
    private readonly penIsDown:()=>boolean,
    private readonly toolIsSampling:()=>boolean,
    private readonly repaint:()=>void,
    private readonly gestureFinished:()=>void,
    private readonly finishTouchStroke:()=>void
  ){
    const signal=this.abort.signal;
    for(const event of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'] as const)
      region.addEventListener(event,event==='pointerdown'?this.down:event==='pointermove'?this.move:this.up,{capture:true,signal});
    region.addEventListener('wheel',this.wheel,{passive:false,signal});
    window.addEventListener('keydown',this.onKey,{signal});
    window.addEventListener('keyup',this.onKey,{signal});
    window.addEventListener('blur',()=>{this.space=false;this.reset();},{signal});
  }
  get touching(){return this.contacts.size!==0;}
  get active(){return this.mode!=='none';}
  private coordinates(e:{clientX:number;clientY:number}):Point{
    return {x:e.clientX-this.bounds.left,y:e.clientY-this.bounds.top};
  }
  private refreshBounds(){
    const r=this.region.getBoundingClientRect();this.bounds={left:r.left,top:r.top};
  }
  private pair():Pair|null{
    if(this.contacts.size<2)return null;
    const [a,b]=this.contacts.values();
    const dx=b.x-a.x,dy=b.y-a.y;
    return {middle:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},
      span:Math.max(1,Math.hypot(dx,dy)),angle:Math.atan2(dy,dx)};
  }
  private consume(e:PointerEvent){e.preventDefault();e.stopImmediatePropagation();}
  private capture(e:PointerEvent){
    try{this.region.setPointerCapture(e.pointerId);}catch{}
  }
  private down=(e:PointerEvent)=>{
    if(e.pointerType==='touch'){
      if(!this.contacts.size)this.refreshBounds();
      this.contacts.set(e.pointerId,this.coordinates(e));
      if(this.contacts.size>=2){
        if(this.contacts.size===2&&this.fingerDraws()&&!this.penIsDown())this.suspendedTouchStroke=true;
        this.mode='transform';this.lastPair=this.pair();
        this.capture(e);this.consume(e);
      }else if(!this.toolIsSampling()&&(!this.fingerDraws()||this.penIsDown())){
        this.mode='translate';this.lastPair=null;this.capture(e);this.consume(e);
      }
      return;
    }
    if(e.pointerType==='mouse'&&(e.button===1||(this.space&&e.button===0))){
      this.refreshBounds();this.mode='translate';this.mouseId=e.pointerId;
      this.mouseAt=this.coordinates(e);this.capture(e);this.consume(e);
    }
  };
  private move=(e:PointerEvent)=>{
    if(e.pointerType==='touch'){
      if(!this.contacts.has(e.pointerId))return;
      const old=this.contacts.get(e.pointerId)!;
      const now=this.coordinates(e);this.contacts.set(e.pointerId,now);
      if(this.mode==='transform'){
        const pair=this.pair(),prev=this.lastPair;
        if(pair&&prev){
          // This mutation and the picture CSS transform finish in this event.
          this.camera.pan(pair.middle.x-prev.middle.x,pair.middle.y-prev.middle.y);
          this.camera.zoomAt(pair.span/prev.span,pair.middle);
          const angle=pair.angle-prev.angle;
          this.camera.rotateAt(Math.atan2(Math.sin(angle),Math.cos(angle)),pair.middle);
          this.repaint();
        }
        this.lastPair=pair;this.consume(e);
      }else if(this.mode==='translate'){
        this.camera.pan(now.x-old.x,now.y-old.y);this.repaint();this.consume(e);
      }
      return;
    }
    if(this.mode==='translate'&&this.mouseId===e.pointerId&&this.mouseAt){
      const now=this.coordinates(e);this.camera.pan(now.x-this.mouseAt.x,now.y-this.mouseAt.y);
      this.mouseAt=now;this.repaint();this.consume(e);
    }
  };
  private up=(e:PointerEvent)=>{
    if(e.pointerType==='touch'){
      if(!this.contacts.delete(e.pointerId))return;
      if(this.mode==='none')return; // A finger-drawn single stroke is not navigation.
      if(this.contacts.size>=2){this.mode='transform';this.lastPair=this.pair();}
      else if(this.contacts.size===1){this.mode='translate';this.lastPair=null;}
      else this.finish();
      this.consume(e);return;
    }
    if(e.pointerId===this.mouseId){this.finish();this.consume(e);}
  };
  private wheel=(e:WheelEvent)=>{
    this.refreshBounds();
    this.camera.zoomAt(Math.exp(-e.deltaY*.0015),this.coordinates(e));
    this.repaint();this.gestureFinished();e.preventDefault();
  };
  private onKey=(e:KeyboardEvent)=>{
    if(e.code!=='Space')return;
    if(e.type==='keydown'){
      const t=e.target;
      if(t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement||(t instanceof HTMLElement&&t.isContentEditable))return;
    }
    this.space=e.type==='keydown';if(this.space)e.preventDefault();
  };
  private finish(){
    const hadMode=this.active,endingInk=this.suspendedTouchStroke;
    this.mode='none';this.lastPair=null;this.mouseId=null;this.mouseAt=null;
    this.contacts.clear();this.suspendedTouchStroke=false;
    if(hadMode)this.gestureFinished();
    // The old touch stroke is finalized only AFTER the camera gesture ends.
    // It can never gate the first movement or its compositor presentation.
    if(endingInk)this.finishTouchStroke();
  }
  private reset(){this.finish();}
  dispose(){this.reset();this.abort.abort();}
}
