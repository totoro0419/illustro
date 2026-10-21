import type {CanvasView,Point} from './canvasView';

// One independent input state machine for touch, pen+finger, mouse and wheel.
// It edits CanvasView and tells the display port to move only an existing scene.
export class CanvasNavigation {
 private touches=new Map<number,Point>();
 private pan:{id:number;point:Point}|null=null;
 private pair:{center:Point;distance:number;angle:number}|null=null;
 private wheelTimer:number|null=null;
 private gestureActive=false;
 constructor(private view:CanvasView,private start:()=>void,private changed:()=>void,private finish:()=>void){}
 get active(){return this.gestureActive;}
 get touching(){return this.touches.size>0;}
 get touchCount(){return this.touches.size;}
 private begin(){if(!this.gestureActive){this.gestureActive=true;this.start();}}
 private end(){if(this.gestureActive){this.gestureActive=false;this.finish();}}
 private pairOf(){
  const [a,b]=this.touches.values();
  if(!a||!b)return null;
  return {center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},
   distance:Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)),angle:Math.atan2(b.y-a.y,b.x-a.x)};
 }
 touchDown(id:number,point:Point,panAllowed:boolean){
  this.touches.set(id,point);
  if(this.touches.size>=2){this.pan=null;this.pair=this.pairOf();this.begin();}
  else if(panAllowed){this.pan={id,point};this.begin();}
 }
 touchMove(id:number,point:Point){
  if(!this.touches.has(id))return false;
  this.touches.set(id,point);
  if(this.touches.size>=2){
   const next=this.pairOf(),prev=this.pair;
   if(next&&prev){
    this.view.zoomAt(next.distance/prev.distance,prev.center);
    this.view.rotateAt(next.angle-prev.angle,prev.center);
    this.view.pan(next.center.x-prev.center.x,next.center.y-prev.center.y);
    this.changed();
   }
   this.pair=next;return true;
  }
  if(this.pan?.id===id){
   this.view.pan(point.x-this.pan.point.x,point.y-this.pan.point.y);
   this.pan.point=point;this.changed();return true;
  }
  return false;
 }
 touchUp(id:number){
  const wasActive=this.gestureActive;this.touches.delete(id);
  if(this.touches.size>=2){this.pair=this.pairOf();return;}
  this.pair=null;
  if(wasActive&&this.touches.size===1){
   const [remaining,point]=this.touches.entries().next().value as [number,Point];
   this.pan={id:remaining,point};return;
  }
  this.pan=null;if(this.touches.size===0)this.end();
 }
 mouseDown(id:number,point:Point){this.pan={id,point};this.begin();}
 mouseMove(id:number,point:Point){
  if(this.pan?.id!==id)return false;
  this.view.pan(point.x-this.pan.point.x,point.y-this.pan.point.y);
  this.pan.point=point;this.changed();return true;
 }
 mouseUp(id:number){if(this.pan?.id!==id)return false;this.pan=null;this.end();return true;}
 wheelZoom(delta:number,point:Point){
  this.begin();this.view.zoomAt(Math.exp(-delta*.0018),point);this.changed();
  if(this.wheelTimer!==null)clearTimeout(this.wheelTimer);
  this.wheelTimer=window.setTimeout(()=>{this.wheelTimer=null;this.end();},135);
 }
 dispose(){
  if(this.wheelTimer!==null)clearTimeout(this.wheelTimer);
  this.wheelTimer=null;this.touches.clear();this.pan=null;this.pair=null;this.end();
 }
}
