import type {CanvasView} from './canvasView';
import paperWorkerUrl from '../../../packages/brush-rt/dist/rt/paper.worker.mjs?worker&url';
type Page={key:string;x:number;y:number;width:number;height:number;bitmap:ImageBitmap|null};
/** The only owner of visible artwork. Navigation touches a retained DOM world
 * synchronously, with no dependency on raster work or image acceptance. */
export class PaperDisplay {
 readonly world=document.createElement('div');private worker:Worker;private pages=new Map<string,HTMLCanvasElement>();
 private repeats:HTMLDivElement[]=[];private seamless=false;private disposed=false;
 epoch=0;frames=0;lastAt=0;acceptedSerial=0;metrics:Record<string,unknown>={};fault:string|null=null;
 readonly transforms:Array<{inputAt:number;receivedAt:number;appliedAt:number;matrix:string}>=[];
 constructor(private source:HTMLCanvasElement,width:number,height:number,port:MessagePort){
  this.world.className='illustro-paper-world';this.world.setAttribute('aria-hidden','true');
  Object.assign(this.world.style,{position:'absolute',left:'0',top:'0',width:width+'px',height:height+'px',transformOrigin:'0 0',pointerEvents:'none',backgroundColor:'white',contain:'layout style',willChange:'transform',overflow:'hidden'});
  source.after(this.world);source.style.opacity='0';source.parentElement!.style.overflow='hidden';
  this.worker=new Worker(paperWorkerUrl,{type:'module'});
  this.worker.onmessage=({data:m})=>{if(m.type==='fault'){this.fault=m.message;return;}if(m.type==='metrics')this.metrics=m.metrics;if(m.type==='frame')void this.accept(m);};
  this.worker.onerror=e=>{this.fault=e.message;};this.send({type:'init',width,height,port},[port]);
 }
 send(message:unknown,transfer:Transferable[]=[]){this.worker.postMessage(message,transfer);}
 private async accept(m:{epoch:number;serial:number;pages:Page[];metrics:Record<string,unknown>}){
  if(m.epoch!==this.epoch||m.serial<=this.acceptedSerial){for(const p of m.pages)p.bitmap?.close();this.send({type:'rejected',serial:m.serial});return;}
  const copies=this.seamless?await Promise.all(m.pages.filter(p=>p.bitmap).map(async p=>({key:p.key,images:await Promise.all(this.repeats.map(()=>createImageBitmap(p.bitmap!)))}))):[];
  if(this.disposed||m.epoch!==this.epoch){m.pages.forEach(p=>p.bitmap?.close());copies.forEach(p=>p.images.forEach(i=>i.close()));if(!this.disposed)this.send({type:'rejected',serial:m.serial});return;}
  // All replacement tiles, including removal of the represented previews, are
  // installed in one task. The browser cannot paint an intermediate state.
  for(const p of m.pages){if(!p.bitmap){this.pages.get(p.key)?.remove();this.pages.delete(p.key);for(const group of this.repeats)group.querySelector('[data-page="'+p.key+'"]')?.remove();continue;}let c=this.pages.get(p.key);if(!c){c=document.createElement('canvas');c.className='illustro-paper-page';c.width=p.width;c.height=p.height;Object.assign(c.style,{position:'absolute',left:p.x+'px',top:p.y+'px',width:p.width+'px',height:p.height+'px',pointerEvents:'none'});this.pages.set(p.key,c);this.world.append(c);}c.getContext('bitmaprenderer')!.transferFromImageBitmap(p.bitmap);}
  copies.forEach(p=>p.images.forEach((bitmap,index)=>{const group=this.repeats[index];if(!group){bitmap.close();return;}let c=group.querySelector<HTMLCanvasElement>('[data-page="'+p.key+'"]');if(!c){c=this.pages.get(p.key)!.cloneNode() as HTMLCanvasElement;c.dataset.page=p.key;group.append(c);}c.getContext('bitmaprenderer')!.transferFromImageBitmap(bitmap);}));
  this.lastAt=performance.now();this.acceptedSerial=m.serial;this.metrics=m.metrics;this.frames++;this.send({type:'accepted',epoch:m.epoch,serial:m.serial});
 }
 transform(view:CanvasView,inputAt=performance.now(),receivedAt=performance.now()){
  const s=view.state,c=Math.cos(s.rotation)*s.zoom,n=Math.sin(s.rotation)*s.zoom,fx=s.flipX?-1:1,fy=s.flipY?-1:1;
  const a=c*fx,b=n*fx,d=c*fy,e=-n*fy,x=s.cssWidth/2+s.panX-(a*s.documentWidth+e*s.documentHeight)/2,y=s.cssHeight/2+s.panY-(b*s.documentWidth+d*s.documentHeight)/2;
  const matrix=`matrix(${a},${b},${e},${d},${x},${y})`;this.world.style.transform=matrix;this.world.style.imageRendering=s.zoom>=4?'pixelated':'auto';
  if(s.seamless!==this.seamless){this.seamless=s.seamless;this.world.style.overflow=this.seamless?'visible':'hidden';this.repeats.forEach(e=>e.remove());this.repeats=[];if(this.seamless)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){if(!x&&!y)continue;const group=document.createElement('div');Object.assign(group.style,{position:'absolute',left:x*s.documentWidth+'px',top:y*s.documentHeight+'px',width:s.documentWidth+'px',height:s.documentHeight+'px',overflow:'hidden',backgroundColor:'white'});this.repeats.push(group);this.world.append(group);for(const [key,source]of this.pages){const version=this.acceptedSerial;void createImageBitmap(source).then(bitmap=>{if(this.disposed||!group.isConnected||this.acceptedSerial!==version){bitmap.close();return;}const c=source.cloneNode() as HTMLCanvasElement;c.dataset.page=key;c.getContext('bitmaprenderer')!.transferFromImageBitmap(bitmap);group.append(c);});}}}
  this.transforms.push({inputAt,receivedAt,appliedAt:performance.now(),matrix});if(this.transforms.length>600)this.transforms.shift();
 }
 history(steps:Array<{id:number;direction:'undo'|'redo'}>){this.epoch++;this.send({type:'history',epoch:this.epoch,steps});return this.epoch;}
 readViewport(){
  const width=this.source.width,height=this.source.height,c=new OffscreenCanvas(width,height),ctx=c.getContext('2d')!,r=this.source.parentElement!.getBoundingClientRect();
  ctx.fillStyle='#edf2fa';ctx.fillRect(0,0,width,height);ctx.scale(width/r.width,height/r.height);const m=new DOMMatrix(this.world.style.transform);ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);
  ctx.fillStyle='white';ctx.fillRect(0,0,parseFloat(this.world.style.width),parseFloat(this.world.style.height));
  for(const page of this.pages.values())ctx.drawImage(page,parseFloat(page.style.left),parseFloat(page.style.top));
  for(const group of this.repeats){const x=parseFloat(group.style.left),y=parseFloat(group.style.top);ctx.fillRect(x,y,parseFloat(group.style.width),parseFloat(group.style.height));for(const page of group.querySelectorAll('canvas'))ctx.drawImage(page,x+parseFloat(page.style.left),y+parseFloat(page.style.top));}
  return ctx.getImageData(0,0,width,height).data;
 }
 destroy(){this.disposed=true;this.worker.terminate();this.world.remove();this.pages.clear();this.source.style.opacity='';}
}
