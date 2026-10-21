import {viewAffine} from '@rt/stroke-overlay';

// Every artwork element (document groups, viewport bitmap and temporary ink)
// lives inside this single compositor-owned scene. Input stays on the parent.
export class ViewportScene {
 constructor(canvas){
  this.element=document.createElement('div');
  this.element.className='illustro-viewport-scene';
  Object.assign(this.element.style,{position:'relative',width:'100%',height:'100%',
   transformOrigin:'0 0',transform:'none',pointerEvents:'none',willChange:'transform'});
  canvas.before(this.element);this.element.append(canvas);this.baseView=null;
 }
 get active(){return this.baseView!==null;}
 begin(view){if(!this.active&&view)this.baseView=Array.from(view);}
 move(view){
  if(!this.active)return false;
  this.element.style.transform='matrix('+viewAffine(this.baseView,view).join(',')+')';return true;
 }
 complete(){this.element.style.transform='none';this.baseView=null;}
 destroy(canvas){this.complete();this.element.before(canvas);this.element.remove();}
}
