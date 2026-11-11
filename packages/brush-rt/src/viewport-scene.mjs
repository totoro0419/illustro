import {viewAffine} from '@rt/stroke-overlay';

// Every artwork element (document groups, viewport bitmap and temporary ink)
// lives inside this single compositor-owned scene. Input stays on the parent.
export class ViewportScene {
 constructor(canvas){
  this.element=document.createElement('div');
  this.element.className='illustro-viewport-scene';
  Object.assign(this.element.style,{position:'relative',width:'100%',height:'100%',
   transformOrigin:'0 0',transform:'none',pointerEvents:'none',willChange:'transform'});
  // A cancelled Home prewarm can still own an older scene while a newer
  // drawing host is being built. Never nest viewport scenes: removing the
  // old one would otherwise detach the canvas of the new active host.
  while(canvas.parentElement?.classList.contains('illustro-viewport-scene')){
   const previous=canvas.parentElement,parent=previous.parentElement;
   const target=parent??document.querySelector('#canvasArea .surface');
   if(!target)throw Error('Canvas has no stable display parent');
   target.insertBefore?.(canvas,parent?previous:null);
   if(!parent)target.append(canvas);
   previous.remove();
  }
  canvas.before(this.element);this.element.append(canvas);this.baseView=null;
 }
 get active(){return this.baseView!==null;}
 begin(view){if(!this.active&&view)this.baseView=Array.from(view);}
 move(view){
  if(!this.active)return false;
  this.element.style.transform='matrix('+viewAffine(this.baseView,view).join(',')+')';return true;
 }
 complete(){this.element.style.transform='none';this.baseView=null;}
 destroy(canvas){
  this.complete();
  // Stale hosts may finish teardown after a new host has adopted this canvas.
  // Only the current direct owner may move it. Do not remove a newer scene.
  if(canvas.parentElement===this.element){
   const parent=this.element.parentElement??document.querySelector('#canvasArea .surface');
   if(parent){
    if(this.element.parentElement===parent)parent.insertBefore(canvas,this.element);
    else parent.append(canvas);
   }
  }
  this.element.remove();
 }
}
