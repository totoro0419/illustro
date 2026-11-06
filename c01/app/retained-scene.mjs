import {docToScreen,screenToDoc} from './model.mjs';
/** Freeze document-space child transforms for the duration of a gesture.
 * Only this viewport-sized compositor layer moves on the live input path. */
export class RetainedScene{
 constructor(stage,paper){this.shadowOffset=document.createElement('div');this.shadowScene=document.createElement('div');this.shadowShape=document.createElement('div');
  Object.assign(this.shadowOffset.style,{position:'absolute',inset:'0',transform:'translateY(7px)',pointerEvents:'none'});Object.assign(this.shadowScene.style,{position:'absolute',inset:'0',transformOrigin:'0 0',willChange:'transform'});Object.assign(this.shadowShape.style,{position:'absolute',left:'0',top:'0',transformOrigin:'0 0',boxShadow:'0 0 20px rgba(35,54,90,.28)'});this.shadowOffset.append(this.shadowScene);this.shadowScene.append(this.shadowShape);stage.append(this.shadowOffset);
  this.element=document.createElement('div');this.element.id='retained-scene';Object.assign(this.element.style,{position:'absolute',inset:'0',transformOrigin:'0 0',pointerEvents:'none',willChange:'transform'});stage.append(this.element);this.element.append(paper);this.base=null;}
 begin(view){this.base??={...view};}
 move(view){if(!this.base)return;const map=(x,y)=>docToScreen(screenToDoc({x,y},this.base),view),p=map(0,0),x=map(1,0),y=map(0,1);const matrix=`matrix(${x.x-p.x},${x.y-p.y},${y.x-p.x},${y.y-p.y},${p.x},${p.y})`;this.element.style.transform=matrix;this.shadowScene.style.transform=matrix;}
 updateShadow(matrix,width,height){this.shadowShape.style.width=width+'px';this.shadowShape.style.height=height+'px';this.shadowShape.style.transform=matrix;}
 setShadowVisible(show){this.shadowOffset.hidden=!show;}
 complete(){this.base=null;this.element.style.transform='none';this.shadowScene.style.transform='none';}
}
