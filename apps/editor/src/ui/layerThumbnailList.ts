import type {LayerId,LayerNode} from '@illustro/core';

type Thumbnail={data:Uint8ClampedArray|null;bounds:readonly [number,number,number,number]|null};
type CurrentView={
 document:object;width:number;height:number;busy:()=>boolean;
 layers:readonly LayerNode[];read:(id:LayerId)=>Promise<Thumbnail|null>;
};
type Cached={layer:LayerNode;image:Thumbnail};

export class LayerThumbnailList{
 private timer:number|undefined;
 private view:CurrentView|null=null;
 private cache=new Map<LayerId,Cached>();
 private running=false;
 private painted=new WeakMap<HTMLCanvasElement,Thumbnail>();
 constructor(private lists:readonly HTMLElement[]){}

 update(view:CurrentView|null){
  const size=view?view.width+'×'+view.height:'';
  if(view&&(view.document!==this.cachedDocument||size!==this.cachedSize)){
   this.cache.clear();
   this.cachedDocument=view.document;
   this.cachedSize=size;
   this.painted=new WeakMap();
  }
  this.view=view;
  this.paintCached();
  this.schedule(180);
 }
 private cachedDocument:object|null=null;
 private cachedSize='';

 private entries(){
  return this.lists.filter(list=>list.checkVisibility()).flatMap(list=>
   [...list.querySelectorAll<HTMLCanvasElement>('canvas[data-thumbnail-layer]')]);
 }
 private paintCached(){
  if(!this.view)return;
  for(const canvas of this.entries()){
   const cached=this.cache.get(canvas.dataset.thumbnailLayer as LayerId);
   if(!cached||this.painted.get(canvas)===cached.image)continue;
   const {data,bounds}=cached.image,ctx=canvas.getContext('2d');
   if(!ctx)continue;
   ctx.clearRect(0,0,canvas.width,canvas.height);
   if(data)ctx.putImageData(new ImageData(new Uint8ClampedArray(data),48,48),0,0);
   const location=canvas.nextElementSibling as HTMLElement;
   location.hidden=!bounds||bounds[2]-bounds[0]>.92&&bounds[3]-bounds[1]>.92;
   if(bounds&&!location.hidden){
    const [x0,y0,x1,y1]=bounds;
    const dot=location.firstElementChild as HTMLElement;
    dot.style.left=(x0+x1)*50+'%';
    dot.style.top=(y0+y1)*50+'%';
   }
   this.painted.set(canvas,cached.image);
  }
 }
 private schedule(delay:number){
  window.clearTimeout(this.timer);
  if(this.view)this.timer=window.setTimeout(()=>void this.refresh(),delay);
 }
 private async refresh(){
  const view=this.view;
  if(!view||this.running)return;
  const displayed=new Set(this.entries().map(canvas=>canvas.dataset.thumbnailLayer));
  if(!displayed.size)return;
  if(view.busy()){this.schedule(180);return;}
  const ids=new Set(view.layers.map(layer=>layer.id));
  for(const id of this.cache.keys())if(!ids.has(id))this.cache.delete(id);
  const layer=view.layers.find(layer=>{
   if(!displayed.has(layer.id))return false;
   const old=this.cache.get(layer.id)?.layer;
   return !old||old.surface!==layer.surface||old.baseColor!==layer.baseColor||old.editable!==layer.editable||
    old.deformation!==layer.deformation||old.imageLink!==layer.imageLink||old.vectorMask!==layer.vectorMask;
  });
  if(!layer)return;
  this.running=true;
  let retry=40;
  try{
   const image=await view.read(layer.id);
   if(!image){retry=180;return;}
   if(this.view===view&&!view.busy())this.cache.set(layer.id,{layer,image});
  }catch{
   // A surface can close while the worker is reading it.
   retry=500;
  }finally{
   this.running=false;
   this.paintCached();
   this.schedule(retry);
  }
 }
}
