import type {CanvasView} from './canvasView';
import paperWorkerUrl from '../../../packages/brush-rt/dist/rt/paper.worker.mjs?worker&url';
type Page={key:string;x:number;y:number;width:number;height:number;gutter:number;bitmap:ImageBitmap|null};
type Frame={epoch:number;serial:number;pages:Page[];metrics:Record<string,unknown>};
/** The only owner of visible artwork. Navigation touches a retained DOM world
 * synchronously, with no dependency on raster work or image acceptance. */
export class PaperDisplay {
 readonly world=document.createElement('div');private worker:Worker;private pages=new Map<string,HTMLCanvasElement>();
 private readonly styles=document.createElement('style');private repeats:HTMLDivElement[]=[];private seamless=false;private disposed=false;
 private queuedFrame:Frame|null=null;private presenting=false;
 private sampleId=0;private samples=new Map<number,{resolve:(value:number[])=>void;reject:(error:Error)=>void}>();
 epoch=0;frames=0;lastAt=0;acceptedSerial=0;metrics:Record<string,unknown>={};fault:string|null=null;
 readonly transforms:Array<{inputAt:number;receivedAt:number;appliedAt:number;matrix:string}>=[];
 constructor(private source:HTMLCanvasElement,width:number,height:number,port:MessagePort,onFault:(message:string)=>void=()=>{}){
  this.world.className='illustro-paper-world';this.world.setAttribute('aria-hidden','true');
  Object.assign(this.world.style,{position:'absolute',left:'0',top:'0',width:width+'px',height:height+'px',transformOrigin:'0 0',pointerEvents:'none',backgroundColor:'white',contain:'layout style',willChange:'transform',overflow:'hidden'});
  this.styles.textContent='.illustro-paper-world [data-paper-back]{visibility:hidden}';document.head.append(this.styles);source.after(this.world);source.style.opacity='0';source.parentElement!.style.overflow='hidden';
  this.worker=new Worker(paperWorkerUrl,{type:'module'});
  this.worker.onmessage=({data:m})=>{if(m.type==='sample'){const request=this.samples.get(m.request);this.samples.delete(m.request);if(request){if(m.error)request.reject(Error(m.error));else request.resolve(m.rgba);}return;}if(m.type==='fault'){this.fault=m.message;if(m.message)onFault(m.message);return;}if(m.type==='metrics')this.metrics=m.metrics;if(m.type==='frame')this.enqueue(m,onFault);};
  const fail=(message:string)=>{if(this.disposed)return;this.fault=message;for(const request of this.samples.values())request.reject(Error(message));this.samples.clear();onFault(message);};this.worker.onerror=e=>fail(e.message||'Display worker failed');this.worker.onmessageerror=()=>fail('Display message could not be decoded');this.send({type:'init',width,height,port},[port]);
 }
 send(message:unknown,transfer:Transferable[]=[]){this.worker.postMessage(message,transfer);}
 private enqueue(frame:Frame,onFault:(message:string)=>void){
  if(this.queuedFrame){this.queuedFrame.pages.forEach(p=>p.bitmap?.close());this.send({type:'rejected',serial:this.queuedFrame.serial});}
  this.queuedFrame=frame;if(this.presenting)return;this.presenting=true;
  void (async()=>{try{while(this.queuedFrame&&!this.disposed){const current=this.queuedFrame;this.queuedFrame=null;try{await this.accept(current);}catch(error){this.fault=String(error);onFault(this.fault);current.pages.forEach(p=>p.bitmap?.close());if(!this.disposed)this.send({type:'rejected',serial:current.serial});}}}finally{this.presenting=false;}})();
 }
 private transfer(canvas:HTMLCanvasElement,bitmap:ImageBitmap){
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('Canvas presentation context unavailable');context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0);bitmap.close();
 }
 private async accept(m:Frame){
  const reject=()=>{m.pages.forEach(p=>p.bitmap?.close());if(!this.disposed)this.send({type:'rejected',serial:m.serial});};
  if(m.epoch!==this.epoch||m.serial<=this.acceptedSerial){reject();return;}
  const repeating=this.seamless,groups=[...this.repeats],copies=repeating?await Promise.all(m.pages.filter(p=>p.bitmap).map(async p=>({key:p.key,images:await Promise.all(groups.map(()=>createImageBitmap(p.bitmap!)))}))):[];
  const staged:Array<{key:string;old:HTMLCanvasElement|null;next:HTMLCanvasElement|null;primary:boolean}>=[],nextClass='paper-next-'+m.serial,previousClass='paper-prev-'+m.serial;
  const valid=()=>!this.disposed&&m.epoch===this.epoch&&repeating===this.seamless;
  const cleanup=()=>{for(const item of staged){item.next?.remove();item.old?.classList.remove(previousClass);}copies.forEach(p=>p.images.forEach(i=>i.close()));reject();};
  if(!valid()){cleanup();return;}
  this.styles.textContent='.illustro-paper-world [data-paper-back]{visibility:hidden}'+`.illustro-paper-world[data-paper-frame="${m.serial}"] .${nextClass}{visibility:visible}.illustro-paper-world[data-paper-frame="${m.serial}"] .${previousClass}{visibility:hidden}`;
  const operations=m.pages.flatMap(p=>[{page:p,parent:this.world,old:this.pages.get(p.key)??null,bitmap:p.bitmap,primary:true},...groups.map((parent,index)=>({page:p,parent,old:parent.querySelector<HTMLCanvasElement>('[data-page="'+p.key+'"]'),bitmap:copies.find(c=>c.key===p.key)?.images[index]??null,primary:false}))]);
  // Prepare replacement surfaces in bounded tasks. Input and the retained old
  // picture stay usable throughout preparation, including a full-document load.
  for(let i=0;i<operations.length;i++){
   if(!valid()){cleanup();return;}const {page:p,parent,old,bitmap,primary}=operations[i]!;let next:HTMLCanvasElement|null=null;
   if(bitmap){next=document.createElement('canvas');next.className='illustro-paper-page '+nextClass;next.dataset.paperBack='';next.dataset.page=p.key;next.dataset.paperGutter=String(p.gutter);next.width=p.width;next.height=p.height;Object.assign(next.style,{position:'absolute',left:p.x+'px',top:p.y+'px',width:p.width+'px',height:p.height+'px',pointerEvents:'none',willChange:'transform',transform:'translateZ(0)',contain:'strict',background:'transparent',aspectRatio:'auto',clip:`rect(${p.gutter}px,${p.width-p.gutter}px,${p.height-p.gutter}px,${p.gutter}px)`});this.transfer(next,bitmap);parent.append(next);}
   old?.classList.add(previousClass);staged.push({key:p.key,old,next,primary});
   if(i%4===3)await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  if(!valid()){cleanup();return;}
  // One property switches every prepared page and represented preview at once.
  this.world.dataset.paperFrame=String(m.serial);
  for(const item of staged)if(item.primary){if(item.next)this.pages.set(item.key,item.next);else this.pages.delete(item.key);}
  this.lastAt=performance.now();this.acceptedSerial=m.serial;this.metrics=m.metrics;this.frames++;
  for(let i=0;i<staged.length;i++){const item=staged[i]!;item.old?.remove();if(item.old){item.old.width=item.old.height=1;}item.next?.removeAttribute('data-paper-back');item.next?.classList.remove(nextClass);if(i%4===3)await new Promise<void>(resolve=>setTimeout(resolve,0));}
  this.styles.textContent='.illustro-paper-world [data-paper-back]{visibility:hidden}';
  if(!this.disposed)this.send({type:'accepted',epoch:m.epoch,serial:m.serial});
 }
 transform(view:CanvasView,inputAt=performance.now(),receivedAt=performance.now()){
  const s=view.state,c=Math.cos(s.rotation)*s.zoom,n=Math.sin(s.rotation)*s.zoom,fx=s.flipX?-1:1,fy=s.flipY?-1:1;
  const a=c*fx,b=n*fx,d=c*fy,e=-n*fy,x=s.cssWidth/2+s.panX-(a*s.documentWidth+e*s.documentHeight)/2,y=s.cssHeight/2+s.panY-(b*s.documentWidth+d*s.documentHeight)/2;
  const matrix=`matrix(${a},${b},${e},${d},${x},${y})`;this.world.style.transform=matrix;this.world.style.imageRendering=s.zoom>=4?'pixelated':'auto';
  if(s.seamless!==this.seamless){this.seamless=s.seamless;this.world.style.overflow=this.seamless?'visible':'hidden';this.repeats.forEach(e=>e.remove());this.repeats=[];if(this.seamless)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){if(!x&&!y)continue;const group=document.createElement('div');Object.assign(group.style,{position:'absolute',left:x*s.documentWidth+'px',top:y*s.documentHeight+'px',width:s.documentWidth+'px',height:s.documentHeight+'px',overflow:'hidden',backgroundColor:'white'});this.repeats.push(group);this.world.append(group);for(const [key,source]of this.pages){const version=this.acceptedSerial;void createImageBitmap(source).then(bitmap=>{if(this.disposed||!group.isConnected||this.acceptedSerial!==version){bitmap.close();return;}const c=source.cloneNode() as HTMLCanvasElement;c.dataset.page=key;c.removeAttribute('data-paper-back');c.className='illustro-paper-page';this.transfer(c,bitmap);group.append(c);});}}}
  this.transforms.push({inputAt,receivedAt,appliedAt:performance.now(),matrix});if(this.transforms.length>600)this.transforms.shift();
 }
 sample(x:number,y:number,surfaceId:string|null){if(this.disposed)return Promise.reject(Error('Display disposed'));const request=++this.sampleId;return new Promise<number[]>((resolve,reject)=>{this.samples.set(request,{resolve,reject});this.send({type:'sample',request,x,y,surfaceId,serial:this.acceptedSerial});});}
 history(steps:Array<{id:number;direction:'undo'|'redo'}>){this.epoch++;this.send({type:'history',epoch:this.epoch,steps});return this.epoch;}
 private drawPage(context:OffscreenCanvasRenderingContext2D,page:HTMLCanvasElement,x=0,y=0){const g=Number(page.dataset.paperGutter??0),w=page.width-g*2,h=page.height-g*2;context.drawImage(page,g,g,w,h,x+parseFloat(page.style.left)+g,y+parseFloat(page.style.top)+g,w,h);}
 readViewport(){
  const width=this.source.width,height=this.source.height,c=new OffscreenCanvas(width,height),ctx=c.getContext('2d')!,r=this.source.parentElement!.getBoundingClientRect();
  ctx.fillStyle='#edf2fa';ctx.fillRect(0,0,width,height);ctx.scale(width/r.width,height/r.height);const m=new DOMMatrix(this.world.style.transform);ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);
  ctx.fillStyle='white';ctx.fillRect(0,0,parseFloat(this.world.style.width),parseFloat(this.world.style.height));
  for(const page of this.pages.values())this.drawPage(ctx,page);
  for(const group of this.repeats){const x=parseFloat(group.style.left),y=parseFloat(group.style.top);ctx.fillRect(x,y,parseFloat(group.style.width),parseFloat(group.style.height));for(const page of group.querySelectorAll('canvas'))this.drawPage(ctx,page,x,y);}
  return ctx.getImageData(0,0,width,height).data;
 }
 destroy(){this.disposed=true;this.queuedFrame?.pages.forEach(p=>p.bitmap?.close());this.queuedFrame=null;for(const sample of this.samples.values())sample.reject(Error('Display disposed'));this.samples.clear();this.worker.terminate();this.world.remove();this.styles.remove();this.pages.clear();this.source.style.opacity='';}
}
