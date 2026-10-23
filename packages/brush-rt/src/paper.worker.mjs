import {makeReferencePattern} from '@rt/reference-pattern';
import {PaperRaster} from '@rt/paper-raster';
const PAGE=512,TILE=128,JOURNAL_LIMIT=16*1024*1024;
let width,height,raster,port,epoch=0,serial=0,version=0,scheduled=false,running=false,waiting=false;
let reference=false,referenceCanvas;
let styles=[],dirty=new Set,base=new Map,overlays=new Map,covered=new Map,journal=new Map,journalBytes=0;
const pendingFrames=new Map,future=[];
const metrics={frames:0,accepted:0,dropped:0,pages:0,maxComposeMs:0,baseBytes:0};
const pause=()=>new Promise(ok=>setTimeout(ok,0));
function markRect(rect){if(!rect)return;for(let y=Math.max(0,Math.floor(rect[1]/PAGE));y<Math.min(Math.ceil(height/PAGE),Math.ceil(rect[3]/PAGE));y++)for(let x=Math.max(0,Math.floor(rect[0]/PAGE));x<Math.min(Math.ceil(width/PAGE),Math.ceil(rect[2]/PAGE));x++)dirty.add(x+','+y);}
function markStroke(id){const s=raster.sink.layers.get(id);let old=overlays.get(id);if(!old&&s?.rect){const owner=[...overlays].findLast(([key,o])=>o.seamless&&key<id&&id<key+9);if(owner){old={...owner[1],seamless:false};overlays.set(id,old);}}if(s?.rect){markRect(s.rect);if(old)old.rect=s.rect.slice();}else markRect(old?.rect);schedule();}
function markAll(){for(const key of base.keys()){const tile=key.slice(key.indexOf('\u0000')+1).split(',').map(Number);dirty.add(Math.floor(tile[0]/4)+','+Math.floor(tile[1]/4));}for(const o of overlays.values())markRect(o.rect);schedule();}
function schedule(){if(scheduled||running||waiting||(!dirty.size&&!covered.size))return;scheduled=true;setTimeout(()=>{scheduled=false;void compose();},0);}
function canvas(w,h){const c=new OffscreenCanvas(w,h);return {canvas:c,context:c.getContext('2d',{alpha:true})};}
function put(tile){const c=canvas(TILE,TILE);c.context.putImageData(new ImageData(new Uint8ClampedArray(tile.pixels.buffer,tile.pixels.byteOffset,tile.pixels.byteLength),TILE,TILE),0,0);return c.canvas;}
function install(m){
 if(m.epoch!==epoch){if(m.epoch>epoch){future.push(m);if(future.length>2)future.shift();}return;}
 version++;
 if(m.replace){markAll();base.clear();journal.clear();journalBytes=0;}
 const before=[],after=[];
 for(const t of m.tiles){const key=t.surfaceId+'\u0000'+t.key;before.push([key,base.get(key)??null]);let ink=false;for(let i=3;i<t.pixels.length;i+=4)if(t.pixels[i]){ink=true;break;}const image=ink?put(t):null;if(image)base.set(key,image);else base.delete(key);after.push([key,image]);const [x,y]=t.key.split(',').map(Number);dirty.add(Math.floor(x/4)+','+Math.floor(y/4));}
 if(m.id!=null){
  const old=journal.get(m.id);if(old)journalBytes-=old.bytes;
  const entry={before,after,bytes:(before.length+after.length)*TILE*TILE*4};journal.set(m.id,entry);journalBytes+=entry.bytes;
  while(journalBytes>JOURNAL_LIMIT&&journal.size){const [id,j]=journal.entries().next().value;journalBytes-=j.bytes;journal.delete(id);}
 }
 for(const id of (m.ids??[]).filter(id=>id!=null)){covered.set(id,m.serial);markStroke(id);}
 metrics.baseBytes=base.size*TILE*TILE*4;schedule();
}
async function compose(){
 if(running||waiting||(!dirty.size&&!covered.size))return;running=true;const at=performance.now(),current=version,keys=[...dirty];dirty.clear();const pages=[];
 try{
  for(const key of keys){
   if(current!==version){pages.forEach(p=>p.bitmap?.close());keys.forEach(k=>dirty.add(k));metrics.dropped++;return;}
   const [px,py]=key.split(',').map(Number),x=px*PAGE,y=py*PAGE,w=Math.min(PAGE,width-x),h=Math.min(PAGE,height-y),out=canvas(w,h),layer=canvas(w,h);let used=reference;
   if(reference)out.context.drawImage(referenceCanvas,-(x%512),-(y%512));
   for(const style of reference?[]:styles){
    if(!style.visible||style.opacity<=0)continue;
    const c=layer.context;c.clearRect(0,0,w,h);c.globalCompositeOperation='source-over';c.globalAlpha=1;
    for(let ty=py*4;ty<py*4+4;ty++)for(let tx=px*4;tx<px*4+4;tx++){const image=base.get(style.surfaceKey+'\u0000'+tx+','+ty);if(image){used=true;c.drawImage(image,tx*TILE-x,ty*TILE-y);}}
    for(const [id,o]of overlays){if(!o.visible||covered.has(id)||o.surfaceKey!==style.surfaceKey)continue;const s=raster.sink.layers.get(id);if(!s?.rect)continue;const r=s.rect;if(r[0]>=x+w||r[2]<=x||r[1]>=y+h||r[3]<=y)continue;
     c.globalCompositeOperation=o.blend==='erase'?'destination-out':o.blend==='multiply'?'multiply':o.blend==='screen'?'screen':'source-over';
     used=true;const scale=s.scale,left=Math.floor(x*scale)-1,top=Math.floor(y*scale)-1,small=canvas(Math.ceil(w*scale)+3,Math.ceil(h*scale)+3);
     for(let cy=Math.floor(top/32);cy<=Math.floor((top+small.canvas.height)/32);cy++)for(let cx=Math.floor(left/32);cx<=Math.floor((left+small.canvas.width)/32);cx++){const cell=s.cells.get(cx+','+cy);if(cell)small.context.drawImage(cell,cx*32-left,cy*32-top);}
     c.drawImage(small.canvas,x*scale-left,y*scale-top,w*scale,h*scale,0,0,w,h);
    }
    out.context.globalAlpha=style.opacity;out.context.drawImage(layer.canvas,0,0);
   }
   pages.push({key,x,y,width:w,height:h,bitmap:used?out.canvas.transferToImageBitmap():null});await pause();
  }
  if(current!==version){pages.forEach(p=>p.bitmap?.close());keys.forEach(k=>dirty.add(k));metrics.dropped++;return;}
  const id=++serial;pendingFrames.set(id,[...covered]);waiting=true;metrics.frames++;metrics.pages+=pages.length;metrics.maxComposeMs=Math.max(metrics.maxComposeMs,performance.now()-at);
  postMessage({type:'frame',epoch,serial:id,pages,metrics:{...metrics,rasterBytes:raster.allocatedBytes+raster.preparedBytes+raster.sink.pixels*4,journalBytes,overlays:[...overlays.values()].filter(o=>o.visible).length,retainedOverlays:overlays.size}},pages.map(p=>p.bitmap).filter(Boolean));
 }catch(error){postMessage({type:'fault',message:String(error)});}finally{running=false;schedule();}
}
function history(m){
 epoch=m.epoch;version++;waiting=false;
 for(const step of m.steps){for(let i=0;i<9;i++){const o=overlays.get(step.id+i);if(o){o.visible=step.direction==='redo';markStroke(step.id+i);}}const j=journal.get(step.id);if(j){for(const [key,image]of j[step.direction==='undo'?'before':'after']){if(image)base.set(key,image);else base.delete(key);}if(step.direction==='undo')covered.delete(step.id);}}
 markAll();for(const packet of future.splice(0))if(packet.epoch===epoch)install(packet);
}
onmessage=({data:m})=>{
 try{switch(m.type){
 case 'init':width=m.width;height=m.height;raster=new PaperRaster(width,height,markStroke);referenceCanvas=canvas(512,512);{const a=makeReferencePattern();for(let i=0;i<a.length;i+=4)if(a[i+3])for(let j=0;j<3;j++)a[i+j]=Math.min(255,Math.round(a[i+j]*255/a[i+3]));referenceCanvas.context.putImageData(new ImageData(new Uint8ClampedArray(a),512,512),0,0);referenceCanvas=referenceCanvas.canvas;}port=m.port;port.onmessage=({data})=>install(data);port.start();break;
 case 'reference':reference=!!m.enabled;version++;for(let y=0;y<Math.ceil(height/PAGE);y++)for(let x=0;x<Math.ceil(width/PAGE);x++)dirty.add(x+','+y);schedule();break;
 case 'styles':styles=m.styles;version++;markAll();break;
 case 'begin':overlays.set(m.id,{surfaceKey:m.surfaceKey,blend:m.preset.blend,visible:true,seamless:m.seamless});raster.begin(m);break;
 case 'samples':raster.samples(m.id,m.samples);break;
 case 'end':raster.end(m.id);break;
 case 'final':raster.final(m.id,m.record);break;
 case 'drop':for(let i=0;i<9;i++){markStroke(m.id+i);raster.drop(m.id+i);overlays.delete(m.id+i);}version++;schedule();break;
 case 'history':history(m);break;
 case 'accepted':{
  const ids=pendingFrames.get(m.serial)??[];pendingFrames.delete(m.serial);if(m.serial===serial)waiting=false;
  if(m.epoch===epoch){metrics.accepted++;for(const [id,publication]of ids)if(covered.get(id)===publication){const original=overlays.get(id);raster.adopted(id);if(original?.seamless)for(let i=1;i<9;i++)if(!overlays.has(id+i)&&!raster.sink.layers.has(id+i))raster.adopted(id+i);overlays.delete(id);covered.delete(id);}}
  postMessage({type:'metrics',metrics:{...metrics,rasterBytes:raster.allocatedBytes+raster.preparedBytes+raster.sink.pixels*4,journalBytes,overlays:[...overlays.values()].filter(o=>o.visible).length,retainedOverlays:overlays.size}});schedule();break;
 }
 case 'rejected':pendingFrames.delete(m.serial);if(m.serial===serial)waiting=false;markAll();break;
 }}catch(error){postMessage({type:'fault',message:String(error)});}
};
