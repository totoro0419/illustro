import {clamp,hex,hsvToRgb} from './model';
import {ORBIT_WHEEL,orbitHueRegion} from './orbitGeometry';

/**
 * Orbit hue selector: a deliberately light Canvas2D rendering of a tilted, thick
 * HSV wheel. The displayed hue travels under the front marker when dragged
 * horizontally (front arc) or by tracing the upper arc clockwise/counterclockwise.
 * Color stays in the shared ForegroundColor model.
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
 type Drag={id:number;part:'wheel'|'plane';mode:'slide'|'rotate'|'sv';startX:number;startHue:number;lastAngle:number;angleTravel:number};
 let hue=options.getHue(),frame=0,drag:Drag|null=null;
 const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
 void reduceMotion; // No inertial animation: color control tracks the input exactly.
 const radius=ORBIT_WHEEL;
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
  ctx.setTransform(w/radius.width,0,0,h/radius.height,0,0);ctx.clearRect(0,0,radius.width,radius.height);
  // Ground shadow and the darker front-facing thickness establish depth.
  ctx.beginPath();ctx.ellipse(160,91,146,53,0,0,Math.PI*2);
  ctx.ellipse(160,91,97,31,0,0,Math.PI*2);
  // The cast shadow is ring-shaped. Never fill the hole with a flat gray disk:
  // the SV diamond must remain visibly joined through the transparent opening.
  ctx.fillStyle='rgba(44,57,76,.13)';ctx.fill('evenodd');
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
 // Coordinate helpers always use painted geometry, not the canvas's rectangular box.
 const wheelPoint=(e:PointerEvent)=>{
  const b=wheel.getBoundingClientRect();
  return {x:(e.clientX-b.left)*radius.width/b.width,y:(e.clientY-b.top)*radius.height/b.height};
 };
 const planeLocal=(e:PointerEvent)=>{
  const b=plane.getBoundingClientRect(),side=plane.offsetWidth;
  // Invert the same clockwise 45° CSS rotation used by Classic.
  const dx=e.clientX-b.left-b.width/2,dy=e.clientY-b.top-b.height/2;
  return {s:.5+(dx+dy)/(Math.SQRT2*side),v:1-(.5+(-dx+dy)/(Math.SQRT2*side))};
 };
 const ellipseAngle=(e:PointerEvent)=>{
  const {x,y}=wheelPoint(e);
  // Normalize the ellipse before measuring angles so a dragged finger follows
  // the physical 3D wheel rather than an unrelated horizontal slider.
  return Math.atan2((y-radius.cy)/radius.outerY,(x-radius.cx)/radius.outerX);
 };
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
 // A gesture is owned by its initial control until release, even if the
 // finger crosses the other surface. Routing on the parent in capture phase
 // avoids the rotated diamond stealing touches from the upper hue ring.
 root.addEventListener('pointerdown',e=>{
  if(drag!==null)return;
  const target=e.target instanceof Element?e.target:null;
  const {x,y}=wheelPoint(e);
  // Geometry is authoritative. SVG hit paths are retained for touch-action
  // negotiation, but CSS stacking and SVG hit-test differences must never
  // steal a painted hue pixel for SV or turn a visible SV pixel into hue.
  const ringRegion=orbitHueRegion(x,y);
  const sv=planeLocal(e);
  const hitSv=ringRegion===null&&(
   (!!target&&plane.contains(target))||
   (sv.s>=0&&sv.s<=1&&sv.v>=0&&sv.v<=1)
  );
  if(ringRegion===null&&!hitSv)return;
  // Capture the initial operation until release, including crossovers.
  // Empty space remains available for workspace scrolling.
  const mode=ringRegion??'sv';
  const angle=ringRegion!==null?ellipseAngle(e):0;
  drag={id:e.pointerId,part:ringRegion!==null?'wheel':'plane',mode,startX:e.clientX,
   startHue:options.getHue(),lastAngle:angle,angleTravel:0};
  root.dataset.orbitGesture=mode;
  options.begin();
  root.setPointerCapture(e.pointerId);
  if(mode==='sv')previewPlane(e);
  e.preventDefault();
 },{capture:true});
 const previewPlane=(e:PointerEvent)=>{
  const {s,v}=planeLocal(e);
  options.onPreview(options.getHue(),clamp(s),clamp(v));
 };
 const update=(e:PointerEvent)=>{
  if(!drag||drag.id!==e.pointerId)return;
  if(drag.mode==='sv'){previewPlane(e);return;}
  if(drag.mode==='slide'){
   // Preserve the familiar horizontal slide on the front-facing arc.
   previewHue(drag.startHue+(e.clientX-drag.startX)*1.15);return;
  }
  // At the BACK/UPPER arc, dragging right naturally rotates the colored
  // wheel clockwise. Hue decreases because the wheel art is color(hue+angle).
  // Accumulate the shortest angular step around the ellipse. Using the
  // current pointer location directly avoids duplicate/out-of-order
  // coalesced samples on styluses and touch screens.
  const angle=ellipseAngle(e);
  drag.angleTravel+=Math.atan2(Math.sin(angle-drag.lastAngle),Math.cos(angle-drag.lastAngle));
  drag.lastAngle=angle;
  previewHue(drag.startHue-drag.angleTravel*180/Math.PI);
 };
 root.addEventListener('pointermove',update);
 root.addEventListener('pointerup',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  update(e);drag=null;options.commit();
 });
 root.addEventListener('pointercancel',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  drag=null;options.cancel();
 });
 root.addEventListener('lostpointercapture',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  drag=null;options.cancel();
 });
 wheel.addEventListener('keydown',e=>{
  const step=e.key==='ArrowRight'||e.key==='ArrowUp'?1:e.key==='ArrowLeft'||e.key==='ArrowDown'?-1:e.key==='PageUp'?10:e.key==='PageDown'?-10:null;
  if(step===null&&e.key!=='Home'&&e.key!=='End')return;
  e.preventDefault();options.begin();
  previewHue(e.key==='Home'?0:e.key==='End'?359:options.getHue()+step!);
  options.commit();
 });
 const observer=new ResizeObserver(request);observer.observe(wheel);
 return {reflect,request,destroy:()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame);}};
}
