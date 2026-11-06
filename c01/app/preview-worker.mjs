/** Presentation-only worker. Formal raster/history live in raster-worker.
 * UI owns View; all pictures use document coordinates. Retire + base replacement
 * enter this worker in one message and are composed before a tile is published.
 */
import {previewDabs} from './preview-stroke.mjs';
import {PreviewInk} from './preview-ink.mjs';
import {previewComposite} from './preview-composite.mjs';
import {tileBox,tileSize} from './brush-raster.mjs';
let epoch=0,generation=0,width=1,height=1,timer=0,inflight=null,serial=0;
let bitmapMode=false,background='white';
function snapshotGroup(group){
 if(!group.canvas){group.canvas=new OffscreenCanvas(group.w,group.h);group.context=group.canvas.getContext('2d',{alpha:false});}
 group.context.putImageData(new ImageData(group.data,group.w,group.h),0,0);
 return createImageBitmap(group.canvas);
}
const groups=new Map(),white=[255,255,255],checker=[233,237,240];
let navigation=false,navCanvas=null,navContext=null,navScale=1,lastNavSnapshot=0,navNeedsFinal=false;
let measure=false,formalSeq=0,formalAcceptedAt=null;
const candidates=new Map(),dirty=new Set(),baseTiles=new Map();
function invalidate(candidate){for(const key of candidate.ink.tiles.keys())dirty.add(key)}

function schedule(){if(!timer)timer=setTimeout(()=>tick().catch(error=>postMessage({type:'error',epoch,message:String(error)})),8)}
async function tick(){
 timer=0;
 if(navigation&&!navNeedsFinal&&![...candidates.values()].some(c=>c.visible&&(c.active||c.dabs||c.previewIndex<c.stroke.points.length)))return;
 const start=performance.now(),first=[];let generateMs=0,uploadMs=0;
 const budget={remaining:64,until:performance.now()+4};
 const ordered=[...candidates.values()].sort((a,b)=>Number(b.active)-Number(a.active));
 for(const candidate of ordered){
  if(!candidate.visible)continue;
  let at=performance.now();previewDabs(candidate,budget);generateMs+=performance.now()-at;at=performance.now();candidate.ink.flush();uploadMs+=performance.now()-at;
  for(const key of candidate.ink.changed)dirty.add(key);
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
 if(!inflight&&dirty.size){
  const keys=[...dirty].slice(0,8),pictures=[],atEpoch=epoch,atGeneration=generation;
  keys.forEach(key=>dirty.delete(key));
  const rasterMs=performance.now()-start;
  const packet={serial:++serial,keys};inflight=packet;
  try{
   for(const key of keys){
    const box=tileBox(key,width,height);
    for(const candidate of candidates.values())if(candidate.visible&&candidate.ink.tiles.has(key)&&!candidate.firstPublished){first.push({id:candidate.id,startedAt:candidate.startedAt});candidate.firstPublished=true}
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
    const changed=new Set(),groupSize=512,columns=Math.ceil(width/groupSize);
    for(const {box,image}of pictures){const x=Math.floor(box.x/groupSize)*groupSize,y=Math.floor(box.y/groupSize)*groupSize,key=Math.floor(y/groupSize)*columns+Math.floor(x/groupSize);let group=groups.get(key);
     if(!group){const w=Math.min(groupSize,width-x),h=Math.min(groupSize,height-y),data=new Uint8ClampedArray(w*h*4);for(let row=0;row<h;row++)for(let col=0;col<w;col++){const i=(row*w+col)*4,tone=background==='white'||((Math.floor((x+col)/10)+Math.floor((y+row)/10))%2===0)?white:checker;data[i]=tone[0];data[i+1]=tone[1];data[i+2]=tone[2];data[i+3]=255}group={key,x,y,w,h,data};groups.set(key,group)}
     for(let row=0;row<box.h;row++)for(let col=0;col<box.w;col++){const i=(row*box.w+col)*4,j=((box.y-y+row)*group.w+box.x-x+col)*4,a=image.data[i+3]/255,tone=background==='white'||((Math.floor((box.x+col)/10)+Math.floor((box.y+row)/10))%2===0)?white:checker;for(let c=0;c<3;c++)group.data[j+c]=Math.round(image.data[i+c]*a+tone[c]*(1-a));group.data[j+3]=255}
     changed.add(key);
    }
    const snapshots=[...changed].map(key=>{const g=groups.get(key);return {key:g.key,x:g.x,y:g.y,w:g.w,h:g.h,promise:snapshotGroup(g)}});
    groupPictures.push(...await Promise.all(snapshots.map(async({key,x,y,w,h,promise})=>({key,x,y,w,h,bitmap:await promise}))));
   }
   if(atEpoch!==epoch||atGeneration!==generation){navBitmap?.close();groupPictures.forEach(g=>g.bitmap.close());pictures.forEach(p=>p.bitmap?.close());if(atEpoch===epoch)keys.forEach(key=>dirty.add(key));if(inflight===packet)inflight=null;}
   else postMessage({type:'preview',epoch,generation,serial:packet.serial,pictures,groups:groupPictures,navBitmap,first,formalSeq:dirty.size?null:formalSeq,formalAcceptedAt:dirty.size?null:formalAcceptedAt,stats:measure?{rasterMs,generateMs,uploadMs,composeMs:performance.now()-start-rasterMs,totalMs:performance.now()-start,tiles:keys.length,updatedPixels:keys.reduce((n,k)=>{const b=tileBox(k,width,height);return n+b.w*b.h},0),bitmapPixels:groupPictures.reduce((n,g)=>n+g.w*g.h,0),previewBytes:[...candidates.values()].reduce((n,c)=>n+[...c.ink.tiles.values()].reduce((sum,t)=>sum+t.data.byteLength,0),0),baseBytes:[...baseTiles.values()].reduce((n,t)=>n+t.data.byteLength,0),groupBytes:[...groups.values()].reduce((n,g)=>n+g.data.byteLength,0),rgbaBytes:keys.reduce((sum,key)=>{const b=tileBox(key,width,height);return sum+b.w*b.h*(bitmapMode?4:8)},0),candidates:candidates.size}:null}, [...pictures.flatMap(p=>p.gpuImage?[p.image.data.buffer,p.gpuImage.data.buffer]:[p.image.data.buffer]),...groupPictures.map(g=>g.bitmap),...(navBitmap?[navBitmap]:[])]);
  }catch(error){pictures.forEach(p=>p.bitmap?.close());inflight=null;postMessage({type:'error',epoch:atEpoch,message:String(error)})}
 }
 if(dirty.size&&!inflight||[...candidates.values()].some(c=>c.visible&&(c.dabs||c.previewIndex<c.stroke.points.length)))schedule();
}
self.onmessage=({data:m})=>{
 try{
  if(m.type==='reset'){
   if(m.epoch<epoch)return;
   epoch=m.epoch;generation=m.generation;width=m.width;height=m.height;navigation=false;measure=m.measure;bitmapMode=m.bitmap;background=m.background;groups.clear();formalSeq=0;formalAcceptedAt=null;
   if(m.navigationPicture){
   navScale=Math.min(1,768/Math.max(width,height));navCanvas=new OffscreenCanvas(Math.max(1,Math.ceil(width*navScale)),Math.max(1,Math.ceil(height*navScale)));navContext=navCanvas.getContext('2d',{alpha:false,willReadFrequently:true});navContext.fillStyle='#fff';navContext.fillRect(0,0,navCanvas.width,navCanvas.height);lastNavSnapshot=0;navNeedsFinal=false;
   }else{navCanvas=null;navContext=null;navNeedsFinal=false;}
   baseTiles.clear();
   candidates.clear();dirty.clear();inflight=null;
   // Allocate the first real paper group during document initialization, rather
   // than paying the browser's first bitmap/compositor setup during pen-up.
   if(bitmapMode){
    const atEpoch=epoch,w=Math.min(512,width),h=Math.min(512,height),data=new Uint8ClampedArray(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,tone=background==='white'||((Math.floor(x/10)+Math.floor(y/10))%2===0)?white:checker;data[i]=tone[0];data[i+1]=tone[1];data[i+2]=tone[2];data[i+3]=255}
    const group={key:0,x:0,y:0,w,h,data};groups.set(0,group);
    snapshotGroup(group).then(bitmap=>{if(atEpoch!==epoch){bitmap.close();return}postMessage({type:'ready',epoch:atEpoch,groups:[{key:0,x:0,y:0,w,h,bitmap}]},[bitmap])}).catch(error=>postMessage({type:'error',epoch:atEpoch,message:String(error)}));
   }else postMessage({type:'ready',epoch});
   return;
  }
  if(m.epoch!==epoch){for(const p of m.pictures||[])p.bitmap?.close();m.bitmap?.close();return}
  if(m.type==='navigation'){navigation=m.active;if(navigation)navNeedsFinal=true;}else if(m.type==='start'){
   const stroke=m.stroke;
   candidates.set(m.id,{id:m.id,stroke,ink:new PreviewInk(stroke,width,height),visible:true,active:true,startedAt:m.startedAt,previewIndex:0,previewCount:0});
  }else if(m.type==='points'){
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
   if(!m.accepted)inflight.keys.forEach(key=>dirty.add(key));inflight=null;
  }
  schedule();
 }catch(error){postMessage({type:'error',epoch,message:String(error)})}
};
