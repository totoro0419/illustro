import {CanvasView,type Point} from './canvasView';
type Hooks={finger:()=>boolean;drawingTouch:()=>boolean;cancelTouch:()=>void;changed:(at:number,receivedAt?:number)=>void};
/** Input-only controller: it has no renderer, queue, promise or busy flag. */
export class PaperGestures {
 private touches=new Map<number,Point>();private pen:number|null=null;private navigating=false;private previous:Point[]=[];private mouse:Point|null=null;private space=false;
 constructor(private element:HTMLElement,private view:CanvasView,private hooks:Hooks,signal:AbortSignal){
  const options={signal,capture:true};
  element.addEventListener('pointerdown',this.down,options);element.addEventListener('pointermove',this.move,options);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,this.up as EventListener,options);
  element.addEventListener('wheel',this.wheel,{signal,passive:false});
  window.addEventListener('keydown',e=>{if((e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable]'))return;if(e.code==='Space'){this.space=true;e.preventDefault();}},{signal});
  window.addEventListener('keyup',e=>{if(e.code==='Space')this.space=false;},{signal});window.addEventListener('blur',()=>{this.space=false;this.touches.clear();this.mouse=null;this.previous=[];this.navigating=false;},{signal});
 }
 private point(e:PointerEvent|WheelEvent){const r=this.element.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
 private stop(e:PointerEvent){e.preventDefault();e.stopImmediatePropagation();}
 private down=(e:PointerEvent)=>{
  if(e.target!==this.element&&!(e.target instanceof HTMLCanvasElement))return;
  if(e.pointerType==='pen'){this.pen=e.pointerId;return;}
  if(e.pointerType==='mouse'&&(e.button===1||e.button===0&&this.space)){this.mouse=this.point(e);this.element.setPointerCapture(e.pointerId);this.stop(e);return;}
  if(e.pointerType!=='touch')return;
  this.touches.set(e.pointerId,this.point(e));this.element.setPointerCapture(e.pointerId);
  if(this.touches.size>=2||this.pen!==null||!this.hooks.finger()||this.navigating){
   if(this.hooks.drawingTouch())this.hooks.cancelTouch();
   this.navigating=true;this.previous=[...this.touches.values()].slice(0,2);this.stop(e);
  }
 };
 private move=(e:PointerEvent)=>{const receivedAt=performance.now();
  if(this.mouse&&e.pointerType==='mouse'){const p=this.point(e);this.view.pan(p.x-this.mouse.x,p.y-this.mouse.y);this.mouse=p;this.hooks.changed(e.timeStamp,receivedAt);this.stop(e);return;}
  if(!this.touches.has(e.pointerId))return;this.touches.set(e.pointerId,this.point(e));if(!this.navigating)return;
  const current=[...this.touches.values()].slice(0,2),old=this.previous;this.previous=current;
  if(current.length===old.length&&old.length){
   const center=(p:Point[])=>p.length===1?p[0]!:{x:(p[0]!.x+p[1]!.x)/2,y:(p[0]!.y+p[1]!.y)/2},a=center(old),b=center(current);
   if(current.length===2){const dx=old[1]!.x-old[0]!.x,dy=old[1]!.y-old[0]!.y,nx=current[1]!.x-current[0]!.x,ny=current[1]!.y-current[0]!.y,d=Math.hypot(dx,dy);if(d>2){this.view.zoomAt(Math.hypot(nx,ny)/d,a);let angle=Math.atan2(ny,nx)-Math.atan2(dy,dx);angle=Math.atan2(Math.sin(angle),Math.cos(angle));this.view.rotateAt(angle,a);}}
   this.view.pan(b.x-a.x,b.y-a.y);this.hooks.changed(e.timeStamp,receivedAt);
  }this.stop(e);
 };
 private up=(e:PointerEvent)=>{
  if(e.pointerId===this.pen){this.pen=null;return;}
  if(this.mouse&&e.pointerType==='mouse'){this.mouse=null;this.stop(e);return;}
  if(!this.touches.delete(e.pointerId))return;
  const was=this.navigating;this.previous=[...this.touches.values()].slice(0,2);if(!this.touches.size)this.navigating=false;
  if(was)this.stop(e);
 };
 private wheel=(e:WheelEvent)=>{const receivedAt=performance.now();e.preventDefault();const p=this.point(e);if(e.shiftKey)this.view.rotateAt(-e.deltaY*.003,p);else this.view.zoomAt(Math.exp(-e.deltaY*.002),p);this.hooks.changed(e.timeStamp,receivedAt);};
}
