import {viewAffine} from '@rt/stroke-overlay';

// Sparse retained document pictures, independent of any viewport/GPU fence.
// They fill newly revealed regions immediately while the M08 viewport sampler
// produces its next exact frame. One parent transform moves every tile.
export class DocumentPresentation {
 constructor(source,width,height){
  this.source=source;this.tiles=new Map;this.bytes=0;this.peakBytes=0;
  this.view=[width,height,width,height,width,height,1,0,0,0,1,1,0,0,0,0];
  this.element=document.createElement('div');this.element.className='illustro-document-presentation';this.element.setAttribute('aria-hidden','true');
  Object.assign(this.element.style,{position:'absolute',left:source.offsetLeft+'px',top:source.offsetTop+'px',width:width+'px',height:height+'px',transformOrigin:'0 0',pointerEvents:'none',overflow:'hidden',background:'#fff'});source.before(this.element);
 }
 apply(tiles){
  for(const data of tiles){let tile=this.tiles.get(data.key);if(!tile){const element=document.createElement('canvas'),context=element.getContext('bitmaprenderer');if(!context){data.bitmap.close();throw Error('Document tile presentation unavailable');}
    Object.assign(element.style,{position:'absolute',left:data.x+'px',top:data.y+'px',width:data.w+'px',height:data.h+'px',pointerEvents:'none',background:'transparent',imageRendering:'inherit'});
    element.width=data.w;element.height=data.h;tile={element,context};this.element.append(element);this.tiles.set(data.key,tile);this.bytes+=data.w*data.h*4;this.peakBytes=Math.max(this.peakBytes,this.bytes);
   }
   tile.context.transferFromImageBitmap(data.bitmap);
  }
 }
 update(view){if(!view)return;this.element.style.display=view[12]>.5||view[14]>.5?'none':'block';this.element.style.imageRendering=view[13]>.5?'pixelated':'auto';this.element.style.transform='matrix('+viewAffine(this.view,view).join(',')+')';}
 destroy(){for(const tile of this.tiles.values())tile.element.width=tile.element.height=1;this.tiles.clear();this.element.remove();this.bytes=0;}
}
