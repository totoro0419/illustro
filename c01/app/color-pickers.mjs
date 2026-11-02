import {clamp,hsvToRgb,rgbToHsv} from './model.mjs';
// Ported from Illustro(old) M09/M10: Classic 45° SV diamond and Orbit painted ellipse.
export const ORBIT=Object.freeze({width:320,height:160,cx:160,cy:73,outerX:146,outerY:51,innerX:97,innerY:31,depth:13});
export function orbitRegion(x,y){
 const r=ORBIT,dx=(x-r.cx)/r.outerX,dy=(y-r.cy)/r.outerY;
 if(dx*dx+dy*dy<=1&&((x-r.cx)/r.innerX)**2+((y-r.cy)/r.innerY)**2>=1)return y<r.cy?'rotate':'slide';
 if(y>=r.cy&&Math.abs(dx)<=1){
  const bottom=r.cy+r.outerY*Math.sqrt(Math.max(0,1-dx*dx));
  if(y>=bottom&&y<=bottom+r.depth)return 'slide';
 }
 return null;
}
export function orbitHueAtPoint(hue,x,y){
 const r=ORBIT,xx=x-r.cx,yy=y-r.cy,outer=(xx/r.outerX)**2+(yy/r.outerY)**2;
 let angle;
 if(y>=r.cy&&outer>1){angle=Math.acos(clamp(xx/r.outerX,-1,1));}
 else{
  let lo=0,hi=1;
  for(let i=0;i<18;i++){
   const m=(lo+hi)/2,rx=r.innerX+(r.outerX-r.innerX)*m,ry=r.innerY+(r.outerY-r.innerY)*m;
   if((xx/rx)**2+(yy/ry)**2>1)lo=m;else hi=m;
  }
  const t=(lo+hi)/2;
  angle=Math.atan2(yy/(r.innerY+(r.outerY-r.innerY)*t),xx/(r.innerX+(r.outerX-r.innerX)*t));
 }
 return ((hue+(angle-Math.PI/2)*180/Math.PI)%360+360)%360;
}
const wrapHue=h=>((h%360)+360)%360;
const hex=rgb=>'#'+rgb.map(c=>Math.round(c).toString(16).padStart(2,'0')).join('');
// The same inverse as in M09/M10; pointer coordinates are viewport coords of the rotated element.
export function diamondPoint(e,plane){
 const box=plane.getBoundingClientRect(),side=plane.offsetWidth;
 const dx=e.clientX-(box.left+box.width/2),dy=e.clientY-(box.top+box.height/2);
 return {s:clamp(.5+(dx+dy)/(Math.SQRT2*side),0,1),v:clamp(.5+(dx-dy)/(Math.SQRT2*side),0,1)};
}
export function installColorPickers({getColor,preview,begin,commit,cancel}){
 const $=id=>document.getElementById(id);
 const classic=$('classic-picker'),orbit=$('orbit-picker'),mode=$('color-picker-mode');
 const ring=$('classic-ring'),plane=$('classic-plane');
 const orbitPlane=$('orbit-plane'),wheel=$('orbit-wheel'),front=$('orbit-wheel-front');
 let hue=rgbToHsv(getColor())[0],saturation=rgbToHsv(getColor())[1],frame=0,drag=null;
 let orbitLastHue=NaN;
 const wheelPos=e=>{const b=wheel.getBoundingClientRect();return {x:(e.clientX-b.left)*ORBIT.width/b.width,y:(e.clientY-b.top)*ORBIT.height/b.height}};
 const wheelAngle=e=>{const p=wheelPos(e);return Math.atan2((p.y-ORBIT.cy)/ORBIT.outerY,(p.x-ORBIT.cx)/ORBIT.outerX)};
 const updateColor=(h,s,v)=>{hue=wrapHue(h);saturation=s;preview(hsvToRgb(hue,s,v));};
 function paintOrbit(){
  frame=0;if(orbit.hidden||!orbit.isConnected)return;
  const b=wheel.getBoundingClientRect();if(b.width<10)return;
  const dpr=Math.min(window.devicePixelRatio||1,2.5),w=Math.round(b.width*dpr),h=Math.round(b.height*dpr);
  if(wheel.width!==w||wheel.height!==h){wheel.width=w;wheel.height=h}
  const ctx=wheel.getContext('2d');if(!ctx)return;
  ctx.setTransform(w/ORBIT.width,0,0,h/ORBIT.height,0,0);ctx.clearRect(0,0,ORBIT.width,ORBIT.height);
  // Actual old-Illustro 3D back face, then its annular top surface.
  ctx.beginPath();ctx.ellipse(160,91,146,53,0,0,Math.PI*2);ctx.ellipse(160,91,97,31,0,0,Math.PI*2);
  ctx.fillStyle='rgba(44,57,76,.13)';ctx.fill('evenodd');
  const n=240,step=2*Math.PI/n;
  for(let i=0;i<n/2;i++){
   const a=i*step,z=(i+1)*step+.008;
   const c=hsvToRgb(wrapHue(hue+(a-Math.PI/2)*180/Math.PI),.82,.53);
   ctx.fillStyle=hex(c);ctx.beginPath();
   ctx.moveTo(ORBIT.cx+ORBIT.outerX*Math.cos(a),ORBIT.cy+ORBIT.outerY*Math.sin(a));
   ctx.lineTo(ORBIT.cx+ORBIT.outerX*Math.cos(z),ORBIT.cy+ORBIT.outerY*Math.sin(z));
   ctx.lineTo(ORBIT.cx+ORBIT.outerX*Math.cos(z),ORBIT.cy+ORBIT.outerY*Math.sin(z)+ORBIT.depth);
   ctx.lineTo(ORBIT.cx+ORBIT.outerX*Math.cos(a),ORBIT.cy+ORBIT.outerY*Math.sin(a)+ORBIT.depth);
   ctx.closePath();ctx.fill();
  }
  for(let i=0;i<n;i++){
   const a=i*step,z=(i+1)*step+.004;
   ctx.fillStyle=hex(hsvToRgb(wrapHue(hue+(a-Math.PI/2)*180/Math.PI),1,1));ctx.beginPath();
   ctx.moveTo(ORBIT.cx+ORBIT.outerX*Math.cos(a),ORBIT.cy+ORBIT.outerY*Math.sin(a));
   ctx.lineTo(ORBIT.cx+ORBIT.outerX*Math.cos(z),ORBIT.cy+ORBIT.outerY*Math.sin(z));
   ctx.lineTo(ORBIT.cx+ORBIT.innerX*Math.cos(z),ORBIT.cy+ORBIT.innerY*Math.sin(z));
   ctx.lineTo(ORBIT.cx+ORBIT.innerX*Math.cos(a),ORBIT.cy+ORBIT.innerY*Math.sin(a));
   ctx.closePath();ctx.fill();
  }
  ctx.save();ctx.beginPath();ctx.ellipse(ORBIT.cx,ORBIT.cy,ORBIT.outerX,ORBIT.outerY,0,0,Math.PI*2);ctx.ellipse(ORBIT.cx,ORBIT.cy,ORBIT.innerX,ORBIT.innerY,0,0,Math.PI*2);
  ctx.clip('evenodd');const shade=ctx.createLinearGradient(0,20,0,135);
  shade.addColorStop(0,'rgba(255,255,255,.24)');shade.addColorStop(.45,'rgba(255,255,255,.03)');shade.addColorStop(1,'rgba(15,30,53,.19)');
  ctx.fillStyle=shade;ctx.fillRect(0,0,320,150);ctx.restore();
  ctx.strokeStyle='rgba(31,48,67,.28)';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.ellipse(ORBIT.cx,ORBIT.cy,ORBIT.outerX,ORBIT.outerY,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.ellipse(ORBIT.cx,ORBIT.cy,ORBIT.innerX,ORBIT.innerY,0,0,Math.PI*2);ctx.stroke();
  ctx.save();ctx.shadowColor='rgba(15,26,37,.55)';ctx.shadowBlur=4;
  ctx.fillStyle='#fff';ctx.strokeStyle='#28384b';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(151,109);ctx.lineTo(169,109);ctx.lineTo(160,129);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  if(front.width!==w||front.height!==h){front.width=w;front.height=h}
  const fctx=front.getContext('2d');if(!fctx)return;
  fctx.setTransform(1,0,0,1,0,0);fctx.clearRect(0,0,w,h);
  const split=Math.round(ORBIT.cy*h/ORBIT.height);
  fctx.drawImage(wheel,0,split,w,h-split,0,split,w,h-split);
 }
 const request=()=>{if(!frame)frame=requestAnimationFrame(paintOrbit)};
 const reflect=([h,s,v])=>{
  if(!Number.isFinite(h))return;
  if(s>.0001){hue=h;saturation=s;}
  const useS=v===0?saturation:s;
  const hx=wrapHue(hue)*Math.PI/180;
  const r=classic.getBoundingClientRect(),r2=r.width/2;
  $('classic-hue-marker').style.left=(r2+Math.cos(hx)*(r2-10))+'px';
  $('classic-hue-marker').style.top=(r2+Math.sin(hx)*(r2-10))+'px';
  plane.style.setProperty('--pure',hex(hsvToRgb(hue,1,1)));
  orbitPlane.style.setProperty('--pure',hex(hsvToRgb(hue,1,1)));
  for(const [id,el] of [['classic-sv-marker',plane],['orbit-sv-marker',orbitPlane]]){
   const marker=$(id);
   marker.style.left=(useS*100)+'%';marker.style.top=((1-v)*100)+'%';
  }
  wheel.setAttribute('aria-valuenow',String(Math.round(hue)));
  ring.setAttribute('aria-valuenow',String(Math.round(hue)));
  if(Math.abs(orbitLastHue-hue)>.05){orbitLastHue=hue;request();}
 };
 function release(e,stopped=false){
  if(!drag||e.pointerId!==drag.id)return;
  const previous=drag;drag=null;
  try{if(previous.root.hasPointerCapture(e.pointerId))previous.root.releasePointerCapture(e.pointerId)}catch{}
  if(stopped)cancel();else commit();
 }
 const update=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  if(drag.root===classic){
   if(drag.part==='ring'){
    const r=ring.getBoundingClientRect();
    const h=wrapHue(Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2)*180/Math.PI);
    const sv=rgbToHsv(getColor());updateColor(h,sv[2]===0?saturation:sv[1],sv[2]);
   }else{
    const v=diamondPoint(e,plane);updateColor(hue,v.s,v.v);
   }
  }else{
   if(drag.part==='sv'){
    const v=diamondPoint(e,orbitPlane);updateColor(hue,v.s,v.v);return;
   }
   drag.distance=Math.max(drag.distance,Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY));
   const pos=wheelPos(e),angle=wheelAngle(e);
   const d=Math.hypot((pos.x-ORBIT.cx)/ORBIT.outerX,(pos.y-ORBIT.cy)/ORBIT.outerY);
   if(d>=.25){
    if(drag.wasOnRing)drag.angleTravel+=Math.atan2(Math.sin(angle-drag.lastAngle),Math.cos(angle-drag.lastAngle));
    drag.lastAngle=angle;drag.wasOnRing=true;
   }else drag.wasOnRing=false;
   if(drag.part==='slide'){
    const horizontal=drag.startHue+(e.clientX-drag.startX)*1.15;
    const band=orbitRegion(pos.x,pos.y)!==null;
    drag.traceCount=band&&d>.55?drag.traceCount+1:0;
    if(drag.traceCount>=3&&Math.abs(e.clientY-drag.startY)>5&&Math.abs(drag.angleTravel)>.34){
     drag.part='rotate';drag.arcSwitchTravel=drag.angleTravel;
     const angular=drag.startHue-drag.angleTravel*180/Math.PI;
     drag.arcOffset=((horizontal-angular+540)%360)-180;
    }else{
     const sv=rgbToHsv(getColor());updateColor(horizontal,sv[2]===0?saturation:sv[1],sv[2]);return;
    }
   }
   const fade=Math.max(0,1-Math.abs(drag.angleTravel-drag.arcSwitchTravel)/(Math.PI/2));
   const sv=rgbToHsv(getColor());
   updateColor(drag.startHue-drag.angleTravel*180/Math.PI+drag.arcOffset*fade,sv[2]===0?saturation:sv[1],sv[2]);
  }
 };
 classic.addEventListener('pointerdown',e=>{
  if(drag||e.button!==0)return;
  const element=e.target instanceof Element?e.target:null;
  const part=element?.closest('#classic-plane')?'sv':element?.closest('#classic-ring')?'ring':null;
  if(!part)return;
  if(part==='ring'){
   const r=ring.getBoundingClientRect(),d=Math.hypot(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2);
   if(d<r.width/2-27||d>r.width/2+3)return;
  }
  drag={id:e.pointerId,root:classic,part};
  begin();classic.setPointerCapture(e.pointerId);update(e);e.preventDefault();
 },{capture:true});
 orbit.addEventListener('pointerdown',e=>{
  if(drag||e.button!==0)return;
  const target=e.target instanceof Element?e.target:null;
  const pos=wheelPos(e);
  const arc=target?.closest('[data-orbit-hue]');
  const ringPart=arc?.getAttribute('data-orbit-hue')||null;
  const hitSv=!ringPart&&(target?.closest('#orbit-plane')||(
   orbitRegion(pos.x,pos.y)===null&&diamondHit(e,orbitPlane)));
  if(!ringPart&&!hitSv)return;
  const part=ringPart||'sv',angle=wheelAngle(e);
  drag={id:e.pointerId,root:orbit,part,startX:e.clientX,startY:e.clientY,startHue:hue,
   lastAngle:angle,angleTravel:0,wasOnRing:true,traceCount:0,arcSwitchTravel:0,arcOffset:0,distance:0,
   tappedX:pos.x,tappedY:pos.y,started:performance.now()};
  begin();orbit.setPointerCapture(e.pointerId);if(part==='sv')update(e);e.preventDefault();
 },{capture:true});
 function end(e,root){
  if(!drag||drag.id!==e.pointerId||drag.root!==root)return;
  if(root===orbit&&drag.part!=='sv'){
   const distance=Math.max(drag.distance,Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY));
   if(distance<=(e.pointerType==='touch'?13:8)&&performance.now()-drag.started<=400){
    const sv=rgbToHsv(getColor());updateColor(orbitHueAtPoint(drag.startHue,drag.tappedX,drag.tappedY),sv[2]===0?saturation:sv[1],sv[2]);
   }else update(e);
  }else update(e);
  release(e);
 }
 for(const root of [classic,orbit]){
  root.addEventListener('pointermove',update);
  root.addEventListener('pointerup',e=>end(e,root));
  root.addEventListener('pointercancel',e=>release(e,true));
  root.addEventListener('lostpointercapture',e=>release(e,true));
 }
 function keyPick(e){
  const delta=e.key==='ArrowUp'||e.key==='ArrowRight'?1:e.key==='ArrowDown'||e.key==='ArrowLeft'?-1:e.key==='PageUp'?10:e.key==='PageDown'?-10:null;
  if(delta===null&&e.key!=='Home'&&e.key!=='End')return;
  e.preventDefault();begin();
  const sv=rgbToHsv(getColor()),h=e.key==='Home'?0:e.key==='End'?359:hue+delta;
  updateColor(h,sv[2]===0?saturation:sv[1],sv[2]);commit();
 }
 ring.addEventListener('keydown',keyPick);wheel.addEventListener('keydown',keyPick);
 function changeMode(value){
  const next=value==='orbit'?'orbit':'classic';mode.value=next;
  classic.hidden=next!=='classic';orbit.hidden=next!=='orbit';
  try{localStorage.setItem('illustro.c01.colorMode',next)}catch{}
  reflect(rgbToHsv(getColor()));if(next==='orbit')request();
 }
 mode.addEventListener('change',()=>changeMode(mode.value));
 let previous='classic';try{previous=localStorage.getItem('illustro.c01.colorMode')||'classic'}catch{}
 const observer=new ResizeObserver(()=>{reflect(rgbToHsv(getColor()));request()});observer.observe(classic);observer.observe(orbit);
 changeMode(previous);
 return {reflect,request};
}
function diamondHit(e,plane){
 const p=diamondPoint(e,plane);return p.s>=0&&p.s<=1&&p.v>=0&&p.v<=1;
}
