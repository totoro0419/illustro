import {viewAffine} from '@rt/stroke-overlay';
import {publishDocumentGroupsAtomically} from '@rt/atomic-document-groups';

// One document-space group per 512px region. The drawing/history system still
// works in exact 128px tiles; only the *display* groups tiles together.
// All bitmap painting happens in the display worker, never in this input thread.
export class DocumentPresentation {
 constructor(source,width,height){
  this.source=source;this.tiles=new Map;this.bytes=0;this.peakBytes=0;
  this.view=[width,height,width,height,width,height,1,0,0,0,1,1,0,0,0,0];
  this.element=document.createElement('div');this.element.className='illustro-document-presentation';this.element.setAttribute('aria-hidden','true');
  Object.assign(this.element.style,{position:'absolute',left:source.offsetLeft+'px',top:source.offsetTop+'px',width:width+'px',height:height+'px',transformOrigin:'0 0',pointerEvents:'none',overflow:'hidden',background:'#fff'});source.before(this.element);
 }
 apply(groups){
  for(const data of groups){let group=this.tiles.get(data.key);if(!group){
    const element=document.createElement('canvas'),context=element.getContext('bitmaprenderer');
    if(!context){data.bitmap.close();throw Error('Document group presentation unavailable');}
    Object.assign(element.style,{position:'absolute',left:data.x+'px',top:data.y+'px',width:data.w+'px',height:data.h+'px',pointerEvents:'none',background:'transparent',imageRendering:'inherit'});
    element.width=data.w;element.height=data.h;group={element,context};
    this.element.append(element);this.tiles.set(data.key,group);this.bytes+=data.w*data.h*4;this.peakBytes=Math.max(this.peakBytes,this.bytes);
   }
   if(group.element.width!==data.bitmap.width||group.element.height!==data.bitmap.height){data.bitmap.close();throw Error('Document group size changed');}
   group.context.transferFromImageBitmap(data.bitmap);
  }
 }
 // For a newly opened canvas there are no OLD image tiles to protect.
 // Fill this first scene directly, without duplicating all display canvases.
 // This also preserves the earlier low-allocation startup path.
 async applyCooperatively(groups,isCurrent){
  if(groups.length<=1){
   if(isCurrent&&!isCurrent()){for(const group of groups)group.bitmap?.close?.();return false;}
   this.apply(groups);return true;
  }
  if(this.tiles.size===0){
   let consumed=0,lastYield=performance.now();
   try{
    for(;consumed<groups.length;consumed++){
     if(isCurrent&&!isCurrent())return false;
     this.apply([groups[consumed]]);
     if(consumed+1<groups.length&&performance.now()-lastYield>=8){
      await new Promise(resolve=>setTimeout(resolve,0));
      lastYield=performance.now();
     }
    }
    return true;
   }finally{
    // A stale packet may be superseded while its next group has not been
    // installed. Close only unconsumed transfers.
    for(let i=consumed;i<groups.length;i++)groups[i]?.bitmap?.close?.();
   }
  }
  // History and other changes to a displayed document stay atomic. Each
  // replacement is prepared offscreen and the full set is swapped at once.
  return publishDocumentGroupsAtomically(this,groups,isCurrent);
 }
 update(view){if(!view)return;this.element.style.display=view[12]>.5||view[14]>.5?'none':'block';this.element.style.imageRendering=view[13]>.5?'pixelated':'auto';this.element.style.transform='matrix('+viewAffine(this.view,view).join(',')+')';}
 destroy(){for(const group of this.tiles.values())group.element.width=group.element.height=1;this.tiles.clear();this.element.remove();this.bytes=0;}
}
