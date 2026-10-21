import {viewAffine} from '@rt/stroke-overlay';

// A gesture only moves this single browser scene. Input is in the untransformed
// viewport, while completed ink, temporary ink and document pixels move as one.
export class NavigationScene {
 constructor(canvas){
  this.element=document.createElement('div');this.element.className='illustro-navigation-scene';
  Object.assign(this.element.style,{position:'relative',width:'100%',height:'100%',
   transformOrigin:'0 0',pointerEvents:'none',transform:'none',willChange:'transform'});
  canvas.before(this.element);this.element.append(canvas);
  canvas.style.pointerEvents='auto';this.baseView=null;
 }
 begin(view){if(!view||this.baseView)return;this.baseView=Array.from(view);this.element.style.transform='none';}
 move(view){if(!this.baseView)return false;this.element.style.transform='matrix('+viewAffine(this.baseView,view).join(',')+')';return true;}
 end(){this.element.style.transform='none';this.baseView=null;}
 destroy(canvas){this.end();this.element.before(canvas);this.element.remove();canvas.style.pointerEvents='';}
}
