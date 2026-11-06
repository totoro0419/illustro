/** Presentation-only worker. Formal raster/history live in raster-worker.
 * UI owns View; all pictures use document coordinates. Retire + base replacement
 * enter this worker in one message and are composed before a tile is published.
 */
import {previewDabs} from './preview-stroke.mjs';
import {PreviewInk} from './preview-ink.mjs';
import {previewComposite} from './preview-composite.mjs';
import {tileBox,tileSize} from './brush-raster.mjs';
let epoch=0,generation=0,width=1,height=1,timer=0,inflight=null,serial=0;
let directMode=false,groupSize=128;
let bitmapMode=false,background='white',presentationInterval=16,lastPublishedAt=-Infinity;
let presentationWarmed=false;
function warmPresentation(target){
 if(presentationWarmed)return;presentationWarmed=true;
 // Resolve one-time Canvas upload/resampling setup before signalling readiness.
 // Probe pixels never publish; the real opaque paper overwrites them in-task.
 const source=new OffscreenCanvas(32,32),context=source.getContext('2d',{willReadFrequently:true}),data=new ImageData(32,32);
 for(let i=0;i<data.data.length;i+=4){data.data[i]=i%251;data.data[i+1]=100;data.data[i+2]=190;data.data[i+3]=255}context.putImageData(data,0,0);
 target.save();target.translate(16,16);target.rotate(.01);target.drawImage(source,0,0,64,64);target.restore();target.getImageData(32,32,1,1);
}
function snapshotGroup(group){
 if(!group.canvas){group.canvas=new OffscreenCanvas(group.w,group.h);group.context=group.canvas.getContext('2d',{alpha:false});}
 warmPresentation(group.context);group.context.putImageData(new ImageData(group.stagingData||group.data,group.w,group.h),0,0);
 return createImageBitmap(group.canvas);
}
let initialSurfaceReady=false;
const groups=new Map(),white=[255,255,255],checker=[233,237,240];
// Overlap must cover at least one screen pixel even at the minimum 5% zoom.
// All overlap pixels come from the same accepted opaque core snapshot, so they
// neither introduce seams nor double-blend semi-transparent strokes.
const gutter=32,visibleCores=new Map();
function backgroundPixels(box){
 const data=new Uint8ClampedArray(box.w*box.h*4);
 for(let y=0;y<box.h;y++)for(let x=0;x<box.w;x++){const i=(y*box.w+x)*4,tone=background==='white'||((Math.floor((box.x+x)/10)+Math.floor((box.y+y)/10))%2===0)?white:checker;data[i]=tone[0];data[i+1]=tone[1];data[i+2]=tone[2];data[i+3]=255}return data;
}
function groupFor(key){
 let group=groups.get(key);if(group)return group;
 const columns=Math.ceil(width/groupSize),box={x:key%columns*groupSize,y:Math.floor(key/columns)*groupSize,w:Math.min(groupSize,width-key%columns*groupSize),h:Math.min(groupSize,height-Math.floor(key/columns)*groupSize)},x=Math.max(0,box.x-gutter),y=Math.max(0,box.y-gutter),w=Math.min(width,box.x+box.w+gutter)-x,h=Math.min(height,box.y+box.h+gutter)-y;
 group={key,x,y,w,h,fresh:true};group.data=backgroundPixels(group);groups.set(key,group);return group;
}
function intersection(a,b){const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y),w=Math.min(a.x+a.w,b.x+b.w)-x,h=Math.min(a.y+a.h,b.y+b.h)-y;return w>0&&h>0?{x,y,w,h}:null}
function prepareGroups(pictures){
 const updates=new Map(),affected=new Set(),columns=Math.ceil(width/tileSize),groupColumns=Math.ceil(width/groupSize);
 for(const {key,box,image}of pictures){
  const data=backgroundPixels(box);for(let i=0;i<data.length;i+=4){const a=image.data[i+3]/255;for(let c=0;c<3;c++)data[i+c]=Math.round(image.data[i+c]*a+data[i+c]*(1-a))}updates.set(key,{box,data});
  const primary=Math.floor(box.y/groupSize)*groupColumns+Math.floor(box.x/groupSize);affected.add(primary);
  const left=Math.floor(Math.max(0,box.x-gutter)/groupSize),right=Math.floor(Math.min(width-1,box.x+box.w+gutter-1)/groupSize),top=Math.floor(Math.max(0,box.y-gutter)/groupSize),bottom=Math.floor(Math.min(height-1,box.y+box.h+gutter-1)/groupSize);
  for(let r=top;r<=bottom;r++)for(let c=left;c<=right;c++){const k=r*groupColumns+c;if(groups.has(k))affected.add(k)}
 }
 const presentations=[];
 for(const key of affected){
  const group=groupFor(key);
  // Keep the last ACKed opaque pixels. Reuse a second buffer, patch only new
  // core intersections, and swap after acceptance. Rejected/obsolete packets
  // never become the source of a later gutter (including translucent erasing).
  group.stagingData??=new Uint8ClampedArray(group.data.length);
  const data=group.stagingData;data.set(group.data);let damage=null;
  const left=Math.floor(group.x/tileSize),right=Math.floor((group.x+group.w-1)/tileSize),top=Math.floor(group.y/tileSize),bottom=Math.floor((group.y+group.h-1)/tileSize);
  for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++){
   const k=row*columns+col,core=updates.get(k)||(group.fresh?visibleCores.get(k):null);if(!core)continue;
   const part=intersection(group,core.box);if(!part)continue;
   for(let y=0;y<part.h;y++){const src=((part.y-core.box.y+y)*core.box.w+part.x-core.box.x)*4,dst=((part.y-group.y+y)*group.w+part.x-group.x)*4;data.set(core.data.subarray(src,src+part.w*4),dst)}
   if(updates.has(k)){if(!damage)damage={...part};else{const x=Math.min(damage.x,part.x),y=Math.min(damage.y,part.y);damage={x,y,w:Math.max(damage.x+damage.w,part.x+part.w)-x,h:Math.max(damage.y+damage.h,part.y+part.h)-y}}}
  }
  group.damage=damage;presentations.push(group);
 }
 return {updates,presentations};
}

let navigation=false,navCanvas=null,navContext=null,navScale=1,lastNavSnapshot=0,navNeedsFinal=false;
let measure=false,formalSeq=0,formalAcceptedAt=null,lastSubmittedSeq=0;
const candidates=new Map(),dirty=new Set(),baseTiles=new Map();
function invalidate(candidate){for(const key of candidate.ink.tiles.keys())dirty.add(key)}

function schedule(){
 if(timer)return;
 const remaining=lastPublishedAt+presentationInterval-performance.now();
 const delay=!inflight&&dirty.size&&remaining>0?Math.min(8,Math.max(1,remaining)):8;
 timer=setTimeout(()=>tick().catch(error=>postMessage({type:'error',epoch,message:String(error)})),delay);
}
async function tick(){
 timer=0;
 if(navigation&&!navNeedsFinal&&![...candidates.values()].some(c=>c.visible&&(c.active||c.dabs||c.previewIndex<c.stroke.points.length)))return;
 const start=performance.now(),first=[],firstIds=new Set(),liveDirty=new Set();let generateMs=0,uploadMs=0;
 const budget={remaining:64,until:performance.now()+4};
 const ordered=[...candidates.values()].sort((a,b)=>Number(b.active)-Number(a.active));
 for(const candidate of ordered){
  if(!candidate.visible)continue;
  let at=performance.now();previewDabs(candidate,budget);generateMs+=performance.now()-at;at=performance.now();candidate.ink.flush();uploadMs+=performance.now()-at;
  for(const key of candidate.ink.changed){dirty.add(key);if(candidate.active)liveDirty.add(key)}
  candidate.ink.changed.clear();
 }
 // A rejected picture must not immediately trigger another GPU snapshot
 // during navigation. Finish CPU preview intake, retain dirty pixels, and wait
 // for the consumer's navigation-end message. A new first mark is still shown.
 const values=[...candidates.values()];
 if(navigation&&!values.some(c=>c.active&&c.visible)&&!values.some(c=>c.visible&&!c.firstPublished&&c.ink.tiles.size)){
  if(values.some(c=>c.visible&&(c.dabs||c.previewIndex<c.stroke.points.length)))schedule();
  return;
 }
 const firstMark=values.some(c=>c.visible&&!c.firstPublished&&c.ink.tiles.size);
 if(!inflight&&dirty.size&&(firstMark||performance.now()-lastPublishedAt>=presentationInterval)){
  // The current pen must not queue behind a prior stroke's formal repaint.
  // Keep all older damage, but publish the newest live ink regions first.
  const keys=[...new Set([...liveDirty].reverse().concat([...dirty]))].slice(0,8),pictures=[],atEpoch=epoch,atGeneration=generation;
  keys.forEach(key=>dirty.delete(key));
  const rasterMs=performance.now()-start;
  const packet={serial:++serial,keys,generation,first,formalSeq:0,formalAcceptedAt:null,generatedAt:performance.now()};inflight=packet;
  try{
   for(const key of keys){
    const box=tileBox(key,width,height);
    for(const candidate of candidates.values())if(candidate.visible&&candidate.ink.tiles.has(key)&&!candidate.firstPublished&&!firstIds.has(candidate.id)){first.push({id:candidate.id,startedAt:candidate.startedAt});firstIds.add(candidate.id)}
    const image=previewComposite(baseTiles.get(key),candidates.values(),key,box),gpuImage=bitmapMode?null:new ImageData(new Uint8ClampedArray(image.data),box.w,box.h);
    const d=gpuImage?.data;for(let i=0;d&&i<d.length;i+=4){const a=d[i+3]/255;for(let c=0;c<3;c++)d[i+c]=Math.round(d[i+c]*a)}
    pictures.push({key,box,image,gpuImage});
   }
   let navBitmap=null;const groupPictures=[];
   if(navContext){
    for(const {box,image}of pictures){const tile=new OffscreenCanvas(box.w,box.h),ctx=tile.getContext('2d',{willReadFrequently:true});ctx.putImageData(image,0,0);const x=box.x*navScale,y=box.y*navScale,w=box.w*navScale,h=box.h*navScale;navContext.fillStyle='#fff';navContext.fillRect(x,y,w,h);navContext.drawImage(tile,0,0,box.w,box.h,x,y,w,h)}
    if(performance.now()-lastNavSnapshot>=32||navNeedsFinal){navNeedsFinal=false;navBitmap=await createImageBitmap(navCanvas);lastNavSnapshot=performance.now();}
   }
   if(bitmapMode){
    const prepared=prepareGroups(pictures);packet.updates=prepared.updates;packet.presentations=prepared.presentations;
    if(directMode)groupPictures.push(...packet.presentations.map(({key,x,y,w,h})=>({key,x,y,w,h,direct:true})));
    else{
     const snapshots=packet.presentations.map(g=>({key:g.key,x:g.x,y:g.y,w:g.w,h:g.h,promise:snapshotGroup(g)}));
     groupPictures.push(...await Promise.all(snapshots.map(async({key,x,y,w,h,promise})=>({key,x,y,w,h,bitmap:await promise}))));
    }
   }
   packet.formalSeq=dirty.size?0:formalSeq;packet.formalAcceptedAt=packet.formalSeq?formalAcceptedAt:null;
   if(atEpoch!==epoch||atGeneration!==generation){navBitmap?.close();groupPictures.forEach(g=>g.bitmap?.close());pictures.forEach(p=>p.bitmap?.close());if(atEpoch===epoch)keys.forEach(key=>dirty.add(key));if(inflight===packet)inflight=null;}
   else postMessage({type:'preview',epoch,generation,serial:packet.serial,pictures,groups:groupPictures,navBitmap,first,formalSeq:dirty.size?null:formalSeq,formalAcceptedAt:dirty.size?null:formalAcceptedAt,stats:measure?{rasterMs,generateMs,uploadMs,direct:directMode,presentationInterval,composeMs:performance.now()-start-rasterMs,totalMs:performance.now()-start,tiles:keys.length,updatedPixels:keys.reduce((n,k)=>{const b=tileBox(k,width,height);return n+b.w*b.h},0),bitmapPixels:groupPictures.reduce((n,g)=>n+g.w*g.h,0),previewBytes:[...candidates.values()].reduce((n,c)=>n+[...c.ink.tiles.values()].reduce((sum,t)=>sum+t.data.byteLength,0),0),baseBytes:[...baseTiles.values()].reduce((n,t)=>n+t.data.byteLength,0),groupBytes:[...groups.values()].reduce((n,g)=>n+g.data.byteLength,0),rgbaBytes:keys.reduce((sum,key)=>{const b=tileBox(key,width,height);return sum+b.w*b.h*(bitmapMode?4:8)},0),candidates:candidates.size}:null}, [...pictures.flatMap(p=>p.gpuImage?[p.image.data.buffer,p.gpuImage.data.buffer]:[p.image.data.buffer]),...groupPictures.flatMap(g=>g.bitmap?[g.bitmap]:[]),...(navBitmap?[navBitmap]:[])]);
  }catch(error){pictures.forEach(p=>p.bitmap?.close());inflight=null;postMessage({type:'error',epoch:atEpoch,message:String(error)})}
 }
 if(dirty.size&&!inflight||[...candidates.values()].some(c=>c.visible&&(c.dabs||c.previewIndex<c.stroke.points.length)))schedule();
}
self.onmessage=({data:m})=>{
 try{
  if(m.type==='reset'){
   if(m.epoch<epoch)return;
   epoch=m.epoch;generation=m.generation;width=m.width;height=m.height;navigation=false;measure=m.measure;bitmapMode=m.bitmap;directMode=m.direct;initialSurfaceReady=false;presentationInterval=16;lastPublishedAt=-Infinity;background=m.background;groupSize=[128,256,512].includes(m.groupSize)?m.groupSize:128;for(const g of groups.values())if(g.canvas)g.canvas.width=g.canvas.height=1;groups.clear();formalSeq=0;formalAcceptedAt=null;lastSubmittedSeq=0;
   if(m.navigationPicture){
   navScale=Math.min(1,768/Math.max(width,height));navCanvas=new OffscreenCanvas(Math.max(1,Math.ceil(width*navScale)),Math.max(1,Math.ceil(height*navScale)));navContext=navCanvas.getContext('2d',{alpha:false,willReadFrequently:true});navContext.fillStyle='#fff';navContext.fillRect(0,0,navCanvas.width,navCanvas.height);lastNavSnapshot=0;navNeedsFinal=false;
   }else{navCanvas=null;navContext=null;navNeedsFinal=false;}
   baseTiles.clear();visibleCores.clear();
   candidates.clear();dirty.clear();inflight=null;
   // Allocate the first real display tile during document initialization, rather
   // than paying the browser's first bitmap/compositor setup during pen-up.
   if(bitmapMode){
    const atEpoch=epoch,group=groupFor(0),{x,y,w,h}=group;
    if(directMode)postMessage({type:'surface-init',epoch:atEpoch,groups:[{key:0,x,y,w,h,direct:true}]});
    else snapshotGroup(group).then(bitmap=>{if(atEpoch!==epoch){bitmap.close();return}postMessage({type:'ready',epoch:atEpoch,groups:[{key:0,x,y,w,h,bitmap}]},[bitmap])}).catch(error=>postMessage({type:'error',epoch:atEpoch,message:String(error)}));
   }else postMessage({type:'ready',epoch});
   return;
  }
  if(m.epoch!==epoch){if(m.canvas)m.canvas.width=m.canvas.height=1;for(const p of m.pictures||[])p.bitmap?.close();m.bitmap?.close();return}
  if(m.type==='surface'){
   const group=groups.get(m.key);if(!group||!directMode){m.canvas.width=m.canvas.height=1;return}
   group.canvas=m.canvas;group.context=m.canvas.getContext('2d',{alpha:false,desynchronized:true});
   if(!group.context)throw Error('Offscreen display context unavailable');warmPresentation(group.context);
   group.context.putImageData(new ImageData(backgroundPixels(group),group.w,group.h),0,0);if(m.key===0&&!initialSurfaceReady){initialSurfaceReady=true;postMessage({type:'ready',epoch})}return;
  }
  if(m.type==='navigation'){navigation=m.active;if(navigation)navNeedsFinal=true;}else if(m.type==='start'){
   if(Number.isFinite(m.presentationInterval))presentationInterval=Math.min(32,Math.max(8,m.presentationInterval));
   const stroke=m.stroke;
   candidates.set(m.id,{id:m.id,stroke,ink:new PreviewInk(stroke,width,height),visible:true,active:true,startedAt:m.startedAt,previewIndex:0,previewCount:0});
  }else if(m.type==='points'){
   if(Number.isFinite(m.presentationInterval))presentationInterval=Math.min(32,Math.max(8,m.presentationInterval));
   const c=candidates.get(m.id);if(c){c.stroke.points.splice(m.offset,Infinity,...m.points);c.active=m.active;if(!m.active)navNeedsFinal=true;}
  }else if(m.type==='visibility'){
   generation=m.generation;
   const c=candidates.get(m.id);if(c){c.visible=m.visible;invalidate(c)}
   if(m.retire)candidates.delete(m.id);
  }else if(m.type==='base'){
   formalSeq=m.seq||formalSeq;formalAcceptedAt=m.acceptedAt||formalAcceptedAt;
   for(const p of m.pictures||[]){baseTiles.set(p.key,p.image);dirty.add(p.key)}

   for(const id of m.retired){const c=candidates.get(id);if(c)invalidate(c);candidates.delete(id)}
  }else if(m.type==='ack'&&inflight?.serial===m.serial){
   const accepted=m.accepted&&inflight.generation===generation;
   if(accepted){
    const started=performance.now();lastPublishedAt=started;let submittedPixels=0;
    for(const group of inflight.presentations||[]){
     [group.data,group.stagingData]=[group.stagingData,group.data];
     if(!directMode){group.fresh=false;continue}
     if(!group.context)throw Error('Display surface was not registered before ACK');
     const d=group.fresh?{x:group.x,y:group.y,w:group.w,h:group.h}:group.damage;if(d){group.context.putImageData(new ImageData(group.data,group.w,group.h),0,0,d.x-group.x,d.y-group.y,d.w,d.h);submittedPixels+=d.w*d.h}group.fresh=false;
    }
    for(const [key,core]of inflight.updates||[])visibleCores.set(key,core);
    for(const item of inflight.first)candidates.get(item.id)&&(candidates.get(item.id).firstPublished=true);
    if(measure||inflight.formalSeq>lastSubmittedSeq)postMessage({type:'display-submit',epoch,generation,serial:inflight.serial,seq:inflight.formalSeq,acceptedAt:inflight.formalAcceptedAt,stats:{direct:directMode,first:directMode?inflight.first.map(item=>({id:item.id,ms:performance.timeOrigin+performance.now()-item.startedAt})):[],uploadMs:performance.now()-started,queueMs:started-inflight.generatedAt,tiles:inflight.presentations?.length||0,submittedPixels}});lastSubmittedSeq=Math.max(lastSubmittedSeq,inflight.formalSeq);
   }
   if(!accepted)inflight.keys.forEach(key=>dirty.add(key));inflight=null;
  }
  schedule();
 }catch(error){postMessage({type:'error',epoch,message:String(error)})}
};
