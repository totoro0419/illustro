/** C01 raster authority, isolated from the View/input main thread.
 * Commands are serialized in acceptance order, not completion order.
 * Every response is tagged with the document epoch and raster command sequence.
 */
import {brushBounds,clamp} from './model.mjs';
let docCanvas, ctx, width=0, height=0, epoch=0;
let actions=[], index=0;
let queue=Promise.resolve(),latestRequestedSeq=0;
const eraser=tool=>tool==='hardEraser'||tool==='softEraser';
function stamp(context,s,point){
 const size=s.size*(s.pen?(.12+.88*Math.pow(point.p,s.curve)):1);
 const r=Math.max(.25,size/2);let alpha=s.flow*(s.pen?(.25+.75*Math.pow(point.p,s.curve)):1)*s.colorAlpha;
 if(s.tool==='pencil')alpha*=.47;if(s.tool==='marker')alpha*=.34;if(s.tool==='air')alpha*=.35;
 alpha=clamp(alpha,0,1);if(alpha<=0)return;
 context.save();context.globalCompositeOperation='source-over';
 context.fillStyle=eraser(s.tool)?`rgba(0,0,0,${alpha})`:`rgba(${s.color.join(',')},${alpha})`;
 if(s.tool==='air'||s.tool==='softEraser'){
  const grad=context.createRadialGradient(point.x,point.y,r*.08,point.x,point.y,r);
  grad.addColorStop(0,eraser(s.tool)?`rgba(0,0,0,${alpha})`:`rgba(${s.color.join(',')},${alpha})`);
  grad.addColorStop(1,'rgba(0,0,0,0)');context.fillStyle=grad;
  context.beginPath();context.arc(point.x,point.y,r,0,Math.PI*2);context.fill();
 }else if(s.tool==='marker'){
  context.translate(point.x,point.y);context.rotate(-.3);context.fillRect(-r,-r*.46,2*r,r*.92);
 }else{
  context.beginPath();
  if(s.tool==='pencil')context.ellipse(point.x,point.y,r,r*.77,.1,0,Math.PI*2);
  else if(s.tool==='gpen')context.ellipse(point.x,point.y,r,r*.8,Math.atan2(point.tiltY||0,(point.tiltX||0)+1)*.35,0,Math.PI*2);
  else context.arc(point.x,point.y,r,0,Math.PI*2);
  context.fill();
 }
 context.restore();
}
function renderStroke(context,s){
 if(!s.points.length)return;
 const spacing=Math.max(.5,s.size*(s.tool==='air'||s.tool==='softEraser'?.14:s.tool==='marker'?.2:.12));
 stamp(context,s,s.points[0]);
 for(let n=1;n<s.points.length;n++){
  const from=s.points[n-1],to=s.points[n];const distance=Math.hypot(to.x-from.x,to.y-from.y);
  const count=Math.max(1,Math.ceil(distance/spacing));
  for(let i=1;i<=count;i++){
   const t=i/count;stamp(context,s,{x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,p:from.p+(to.p-from.p)*t,tiltX:to.tiltX,tiltY:to.tiltY});
  }
 }
}
async function emitFrame(msg){
 // No partial frame can be published: the UI accepts only the newest command seq.
 if(msg.seq!==latestRequestedSeq)return;
 const bitmap=await createImageBitmap(docCanvas);
 if(msg.seq!==latestRequestedSeq){bitmap.close();return;}
 self.postMessage({type:'frame',epoch,seq:msg.seq,bitmap},[bitmap]);
}
async function execute(msg){
 if(msg.type==='reset'){
  epoch=msg.epoch;width=msg.width;height=msg.height;
  docCanvas=new OffscreenCanvas(width,height);ctx=docCanvas.getContext('2d',{willReadFrequently:true});
  actions=[];index=0;return;
 }
 if(msg.epoch!==epoch||!ctx)return;
 if(msg.type==='load'){
  const response=await fetch(msg.png);const image=await createImageBitmap(await response.blob());
  if(image.width!==width||image.height!==height)throw Error('ネイティブ画像の寸法不一致');
  ctx.drawImage(image,0,0);image.close();return;
 }
 if(msg.type==='stroke'){
  const s=msg.stroke;const b=brushBounds(s.points,s.size,width,height);
  if(b.w&&b.h){
   const before=ctx.getImageData(b.x,b.y,b.w,b.h);
   const ink=new OffscreenCanvas(b.w,b.h),ic=ink.getContext('2d');
   ic.translate(-b.x,-b.y);renderStroke(ic,s);
   ctx.save();ctx.globalAlpha=s.opacity;ctx.globalCompositeOperation=eraser(s.tool)?'destination-out':'source-over';
   ctx.drawImage(ink,b.x,b.y);ctx.restore();
   const after=ctx.getImageData(b.x,b.y,b.w,b.h);
   actions.length=index;actions.push({bounds:b,before,after});index++;
  } else {actions.length=index;actions.push(null);index++}
  await emitFrame(msg);return;
 }
 if(msg.type==='undo'){
  if(index>0){const a=actions[--index];if(a)ctx.putImageData(a.before,a.bounds.x,a.bounds.y)}
  await emitFrame(msg);return;
 }
 if(msg.type==='redo'){
  if(index<actions.length){const a=actions[index++];if(a)ctx.putImageData(a.after,a.bounds.x,a.bounds.y)}
  await emitFrame(msg);return;
 }
 if(msg.type==='save'){
  const pngBlob=await docCanvas.convertToBlob({type:'image/png'});
  const buffer=await pngBlob.arrayBuffer();
  self.postMessage({type:'saved',epoch,requestId:msg.requestId,png:buffer},[buffer]);
 }
}
self.onmessage=e=>{
 const msg=e.data;
 if(msg.type==='reset')latestRequestedSeq=0;
 else if(typeof msg.seq==='number')latestRequestedSeq=msg.seq;
 queue=queue.then(()=>execute(msg)).catch(err=>{
  self.postMessage({type:'error',epoch:msg.epoch,requestId:msg.requestId||null,message:String(err?.message||err)});
 });
};
