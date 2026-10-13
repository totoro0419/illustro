import {clamp,hex,hsvToRgb} from './model';

/**
 * Orbit hue selector: a deliberately light Canvas2D rendering of a tilted, thick
 * HSV wheel. The displayed hue travels under the front marker when dragged
 * horizontally; color stays in the shared ForegroundColor model.
 */
export function installOrbitPicker(root:HTMLElement,options:{
 getHue:()=>number;
 onPreview:(h:number,s:number,v:number)=>void;
 getSv:()=>{s:number;v:number};
 begin:()=>void;
 commit:()=>void;
 cancel:()=>void;
}){
 const wheel=root.querySelector<HTMLCanvasElement>('#colorOrbitWheel')!;
 const plane=root.querySelector<HTMLElement>('#colorOrbitPlane')!;
 const point=root.querySelector<HTMLElement>('#colorOrbitSvMarker')!;
 let hue=options.getHue(),frame=0,drag:{id:number;part:'wheel'|'plane';startX:number;startHue:number}|null=null;
 const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
 void reduceMotion; // No inertial animation: color control tracks the input exactly.
 const radius={cx:160,cy:73,outerX:146,outerY:51,innerX:97,innerY:31,depth:13};
 function quad(ctx:CanvasRenderingContext2D,a:number,b:number,r0x:number,r0y:number,r1x:number,r1y:number,shift=0){
  ctx.beginPath();
  ctx.moveTo(radius.cx+r0x*Math.cos(a),radius.cy+r0y*Math.sin(a)+shift);
  ctx.lineTo(radius.cx+r0x*Math.cos(b),radius.cy+r0y*Math.sin(b)+shift);
  ctx.lineTo(radius.cx+r1x*Math.cos(b),radius.cy+r1y*Math.sin(b)+shift);
  ctx.lineTo(radius.cx+r1x*Math.cos(a),radius.cy+r1y*Math.sin(a)+shift);
  ctx.closePath();
 }
 function render(){
  frame=0;
  if(!root.isConnected||root.hidden)return;
  const bound=wheel.getBoundingClientRect();
  if(bound.width<5)return;
  const dpr=Math.min(window.devicePixelRatio||1,2.5),w=Math.max(1,Math.round(bound.width*dpr)),h=Math.max(1,Math.round(bound.height*dpr));
  if(wheel.width!==w||wheel.height!==h){wheel.width=w;wheel.height=h;}
  const ctx=wheel.getContext('2d',{alpha:true});if(!ctx)return;
  ctx.setTransform(w/320,0,0,h/160,0,0);ctx.clearRect(0,0,320,160);
  // Ground shadow and the darker front-facing thickness establish depth.
  ctx.beginPath();ctx.ellipse(160,91,146,53,0,0,Math.PI*2);
  ctx.fillStyle='rgba(44,57,76,.13)';ctx.fill();
  const n=240,step=2*Math.PI/n;
  for(let i=0;i<n/2;i++){
   const a=i*step,b=(i+1)*step+.008;
   const sectionHue=(hue+(a-Math.PI/2)*180/Math.PI+720)%360;
   const c=hsvToRgb(sectionHue,.82,.53);
   ctx.fillStyle=hex(c);
   ctx.beginPath();
   ctx.moveTo(radius.cx+radius.outerX*Math.cos(a),radius.cy+radius.outerY*Math.sin(a));
   ctx.lineTo(radius.cx+radius.outerX*Math.cos(b),radius.cy+radius.outerY*Math.sin(b));
   ctx.lineTo(radius.cx+radius.outerX*Math.cos(b),radius.cy+radius.outerY*Math.sin(b)+radius.depth);
   ctx.lineTo(radius.cx+radius.outerX*Math.cos(a),radius.cy+radius.outerY*Math.sin(a)+radius.depth);
   ctx.closePath();ctx.fill();
  }
  // Hue varies around the actual ellipse, rather than stretching a 2D conic
  // gradient into an oval. The ring remains hollow.
  for(let i=0;i<n;i++){
   const a=i*step,b=(i+1)*step+.004;
   const sectionHue=(hue+(a-Math.PI/2)*180/Math.PI+720)%360;
   ctx.fillStyle=hex(hsvToRgb(sectionHue,1,1));
   quad(ctx,a,b,radius.outerX,radius.outerY,radius.innerX,radius.innerY);
   ctx.fill();
  }
  ctx.save();ctx.beginPath();
  ctx.ellipse(radius.cx,radius.cy,radius.outerX,radius.outerY,0,0,Math.PI*2);
  ctx.ellipse(radius.cx,radius.cy,radius.innerX,radius.innerY,0,0,Math.PI*2);
  ctx.clip('evenodd');
  const shading=ctx.createLinearGradient(0,20,0,135);
  shading.addColorStop(0,'rgba(255,255,255,.24)');
  shading.addColorStop(.45,'rgba(255,255,255,.03)');
  shading.addColorStop(1,'rgba(15,30,53,.19)');
  ctx.fillStyle=shading;ctx.fillRect(0,0,320,150);
  ctx.restore();
  // Thin rims make the 3D effect legible without ornamental decoration.
  ctx.strokeStyle='rgba(31,48,67,.28)';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.ellipse(radius.cx,radius.cy,radius.outerX,radius.outerY,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.ellipse(radius.cx,radius.cy,radius.innerX,radius.innerY,0,0,Math.PI*2);ctx.stroke();
  // Front marker is fixed: drag the wheel left/right to move the spectrum.
  ctx.save();ctx.shadowColor='rgba(15,26,37,.55)';ctx.shadowBlur=4;
  ctx.fillStyle='#fff';ctx.strokeStyle='#28384b';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(151,109);ctx.lineTo(169,109);ctx.lineTo(160,129);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
 }
 const request=()=>{if(!frame)frame=requestAnimationFrame(render);};
 const dimensions=()=>{
  const r=wheel.getBoundingClientRect();
  return {w:r.width,h:r.height};
 };
 const wheelHit=(e:PointerEvent)=>{
  const b=wheel.getBoundingClientRect();if(!b.width||!b.height)return false;
  const x=(e.clientX-b.left)*320/b.width,y=(e.clientY-b.top)*160/b.height;
  const outer=Math.hypot((x-radius.cx)/radius.outerX,(y-radius.cy)/radius.outerY);
  const inner=Math.hypot((x-radius.cx)/radius.innerX,(y-radius.cy)/radius.innerY);
  return outer<=1.16&&inner>=.77;
 };
 void dimensions;
 function reflect(h:number,s:number,v:number){
  hue=h;
  point.style.left=(clamp(s)*100)+'%';
  point.style.top=((1-clamp(v))*100)+'%';
  plane.style.setProperty('--pure',hex(hsvToRgb(hue,1,1)));
  wheel.setAttribute('aria-valuenow',String(Math.round(hue)%360));
  wheel.setAttribute('aria-valuetext','色相 '+Math.round(hue)+'度');
  request();
 }
 function previewHue(next:number){
  const sv=options.getSv();
  options.onPreview((next%360+360)%360,sv.s,sv.v);
 }
 wheel.addEventListener('pointerdown',e=>{
  if(drag||!wheelHit(e))return;
  drag={id:e.pointerId,part:'wheel',startX:e.clientX,startHue:options.getHue()};
  options.begin();wheel.setPointerCapture(e.pointerId);e.preventDefault();
 });
 wheel.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId||drag.part!=='wheel')return;
  previewHue(drag.startHue+(e.clientX-drag.startX)*1.15);
 });
 wheel.addEventListener('pointerup',e=>{
  if(!drag||drag.id!==e.pointerId||drag.part!=='wheel')return;
  previewHue(drag.startHue+(e.clientX-drag.startX)*1.15);drag=null;options.commit();
 });
 wheel.addEventListener('pointercancel',e=>{if(!drag||drag.id!==e.pointerId)return;drag=null;options.cancel();});
 wheel.addEventListener('lostpointercapture',e=>{if(!drag||drag.id!==e.pointerId)return;drag=null;options.cancel();});
 wheel.addEventListener('keydown',e=>{
  const step=e.key==='ArrowRight'||e.key==='ArrowUp'?1:e.key==='ArrowLeft'||e.key==='ArrowDown'?-1:e.key==='PageUp'?10:e.key==='PageDown'?-10:null;
  if(step===null&&e.key!=='Home'&&e.key!=='End')return;
  e.preventDefault();options.begin();
  previewHue(e.key==='Home'?0:e.key==='End'?359:options.getHue()+step!);
  options.commit();
 });
 const previewPlane=(e:PointerEvent)=>{
  const b=plane.getBoundingClientRect();
  const s=clamp((e.clientX-b.left)/b.width),v=1-clamp((e.clientY-b.top)/b.height);
  options.onPreview(options.getHue(),s,v);
 };
 plane.addEventListener('pointerdown',e=>{
  if(drag)return;
  drag={id:e.pointerId,part:'plane',startX:e.clientX,startHue:options.getHue()};
  options.begin();plane.setPointerCapture(e.pointerId);previewPlane(e);e.preventDefault();
 });
 plane.addEventListener('pointermove',e=>{if(drag?.part==='plane'&&drag.id===e.pointerId)previewPlane(e);});
 plane.addEventListener('pointerup',e=>{
  if(drag?.part!=='plane'||drag.id!==e.pointerId)return;
  previewPlane(e);drag=null;options.commit();
 });
 plane.addEventListener('pointercancel',e=>{if(drag?.part!=='plane'||drag.id!==e.pointerId)return;drag=null;options.cancel();});
 plane.addEventListener('lostpointercapture',e=>{if(drag?.part!=='plane'||drag.id!==e.pointerId)return;drag=null;options.cancel();});
 const observer=new ResizeObserver(request);observer.observe(wheel);
 return {reflect,request,destroy:()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame);}};
}
