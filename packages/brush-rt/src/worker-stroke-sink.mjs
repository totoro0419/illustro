// Private raster surfaces. They never own the editor's view transform or DOM.
// Only Worker-side preview raster calculations survive this deletion stage.
const CELL=32,CHUNK=128;
export class WorkerStrokeSink {
 constructor(id=null){this.atomic=true;this.id=id;this.layers=new Map;this.allocations=0;}
 updateOrigin(){}
 forStroke(id){let layer=this.layers.get(id);if(!layer){layer=new WorkerStrokeSink(id);this.layers.set(id,layer);}return layer;}
 configure(plan,bounds){const scale=plan.scale,unit=CHUNK/scale,x=Math.max(0,Math.floor(bounds[0]/unit)*unit),y=Math.max(0,Math.floor(bounds[1]/unit)*unit),right=Math.min(plan.screenWidth,Math.ceil(bounds[2]/unit)*unit),bottom=Math.min(plan.screenHeight,Math.ceil(bounds[3]/unit)*unit),w=Math.max(1,Math.ceil((right-x)*scale)),h=Math.max(1,Math.ceil((bottom-y)*scale));
  this.plan=plan;if(this.rect&&this.scale===scale&&x>=this.rect[0]&&y>=this.rect[1]&&right<=this.rect[2]&&bottom<=this.rect[3])return false;
  this.rect=[x,y,right,bottom];this.scale=scale;
  if(!this.element)this.element=new OffscreenCanvas(w,h);
  if(this.element.width!==w)this.element.width=w;if(this.element.height!==h)this.element.height=h;
  this.context=this.element.getContext('2d',{alpha:true,willReadFrequently:true});if(!this.context)throw Error('Worker preview Canvas2D unavailable');
  this.context.clearRect(0,0,w,h);this.allocations++;return true;
 }
 draw(_plan,_rects,_guards,cells){const [x,y]=this.rect;for(const {key,image}of cells){const [cx,cy]=key.split(',').map(Number);this.context.putImageData(image,cx*CELL-Math.round(x*this.scale),cy*CELL-Math.round(y*this.scale));}}
 reproject(from){this.view=Array.from(from);}
 retireStroke(id){const layer=this.layers.get(id);if(!layer)return;layer.destroy();this.layers.delete(id);}
 hide(){for(const id of [...this.layers.keys()])this.retireStroke(id);}
 get pixels(){return (this.element?this.element.width*this.element.height:0)+[...this.layers.values()].reduce((n,s)=>n+s.pixels,0);}
 get totalAllocations(){return this.allocations+[...this.layers.values()].reduce((n,s)=>n+s.totalAllocations,0);}
 destroy(){for(const s of this.layers.values())s.destroy();this.layers.clear();if(this.element)this.element.width=this.element.height=1;}
}
