import {normalize} from '@legacy/input';
import {makeDab,curve} from '@legacy/dynamics';
import {validatePreset} from '@legacy/record';
import {coverage} from '@legacy/coverage';

export const VERSION='illustro-rt-2.1';
export const STRIDE=24;
export const TILE=128;
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function continuous(p){return p.tip==='round' && p.aspect===1 && p.hardness===1 && p.flow===1 && !p.grain && !p.dual && !p.scatter && !p.sizeJitter && !p.opacityJitter && !p.flowJitter && !p.hueJitter && !p.exposureMs && p.mappings.every(m=>m.target==='size');}
// Weighted local linear regression evaluated at the latest real sample. Unlike a
// trailing position average it preserves constant-velocity lines without phase lag.
export class Stabilizer {
 constructor(p,fast=0){this.p=p;this.fast=fast;this.window=[];this.last=null;this.direction=null;}
 accept(s){
  const q=normalize(s);q.p=curve(this.p.pressureCurve,q.p);
  if(this.last&&q.t<this.last.t)throw Error('out-of-order input');
  const dx=q.x-(this.last?.x??q.x),dy=q.y-(this.last?.y??q.y),len=Math.hypot(dx,dy);
  const dir=len>0?[dx/len,dy/len]:this.direction;
  const corner=!!(len>6&&dir&&this.direction&&dir[0]*this.direction[0]+dir[1]*this.direction[1]<.5);
  if(corner)this.window=[];
  this.window.push(q); this.window=this.window.filter(a=>q.t-a.t<=24).slice(-8);
  const speed=this.last?len/Math.max(1,q.t-this.last.t):0;
  const strength=clamp(this.p.stabilization+this.fast*clamp(speed/2));
  let x=q.x,y=q.y;
  if(strength&&this.window.length>=3&&!corner){
   let w=0,wt=0,wtt=0,wx=0,wy=0,wtx=0,wty=0;
   for(const a of this.window){const t=a.t-q.t,k=Math.exp(t/14);w+=k;wt+=k*t;wtt+=k*t*t;wx+=k*a.x;wy+=k*a.y;wtx+=k*t*a.x;wty+=k*t*a.y;}
   const det=w*wtt-wt*wt;
   if(det>1e-6){x=q.x+strength*((wx*wtt-wtx*wt)/det-q.x);y=q.y+strength*((wy*wtt-wty*wt)/det-q.y);}
   const d=Math.hypot(x-q.x,y-q.y),bound=2+4*strength;if(d>bound){x=q.x+(x-q.x)*bound/d;y=q.y+(y-q.y)*bound/d;}
  }
  // Pressure is independent; no spatial delay is introduced by pressure smoothing.
  const prev=this.output,dt=this.last?Math.max(0,q.t-this.last.t):0;
  const alpha=this.p.pressureSmoothing?1-Math.exp(-dt/(2+this.p.pressureSmoothing*10)):1;
  const out={...q,x,y,p:prev?prev.p+(q.p-prev.p)*alpha:q.p};
  this.last=q;this.output=out;if(len>.05)this.direction=dir;return out;
 }
}
export function predict(points,now,browser=[]){
 const b=points.at(-1),a=points.at(-2),c=points.at(-3);if(!a||!b||now-b.t>30)return null;
 const dt=b.t-a.t;if(dt<=0||dt>40)return null;
 const vx=(b.x-a.x)/dt,vy=(b.y-a.y)/dt,v=Math.hypot(vx,vy);if(v<.05)return null;
 if(c){const ux=a.x-c.x,uy=a.y-c.y;if(ux*vx+uy*vy<.7*Math.hypot(ux,uy)*v)return null;}
 let p=browser.find(p=>p.t>b.t&&p.t-b.t<=12);
 const h=clamp(now-b.t+6,0,12);if(!p)p={...b,x:b.x+vx*h,y:b.y+vy*h,t:b.t+h};
 const dx=p.x-b.x,dy=p.y-b.y,d=Math.hypot(dx,dy),limit=Math.min(16,v*12);
 if(dx*vx+dy*vy<=0)return null;
 return {...b,x:b.x+dx*Math.min(1,limit/Math.max(d,.001)),y:b.y+dy*Math.min(1,limit/Math.max(d,.001)),t:p.t,predicted:true};
}
export function taper(p,d,total,finished){let f=1;if(p.taperStart)f=Math.min(f,clamp(d/p.taperStart,p.taperMinimum));if(finished&&p.taperEnd)f=Math.min(f,clamp((total-d)/p.taperEnd,p.taperMinimum));return f;}
export class CanonicalBuilder {
 constructor(p,seed=[0x12345678,0x9abcdef0],fast=0){validatePreset(p);if(!Number.isFinite(fast)||fast<0||fast>1)throw Error('invalid fast stabilization');if(!Array.isArray(seed)||seed.length!==2||seed.some(x=>!Number.isInteger(x)||x<0||x>0xffffffff))throw Error('invalid seed');this.p=structuredClone(p);this.seed=[...seed];this.fast=fast;this.filter=new Stabilizer(p,fast);this.raw=[];this.geometry=[];this.commands=[];this.distance=0;this.index=0;this.carry=0;this.finished=false;this.published=0;this.solid=continuous(p);}
 accept(s){if(this.finished)throw Error('closed');if(s.predicted)throw Error('prediction cannot be canonical');if(this.raw.length>=500000)throw Error('input limit');const q=this.filter.accept(s),a=this.geometry.at(-1);this.raw.push({...s});this.geometry.push(q);if(!a){this.start=q.t;this.nextExposure=q.t+this.p.exposureMs;this.emit(q,null,0,0);return;}const len=Math.hypot(q.x-a.x,q.y-a.y),speed=len/Math.max(.001,(q.t-a.t)/1000),dir=Math.atan2(q.y-a.y,q.x-a.x);
 if(this.solid){this.distance+=len;this.emit(q,a,speed,dir);return;}
 const startDistance=this.geometryDistance??0,dt=q.t-a.t;let traveled=0;
 const at=f=>({...q,x:a.x+(q.x-a.x)*f,y:a.y+(q.y-a.y)*f,p:a.p+(q.p-a.p)*f,t:a.t+dt*f,tilt:a.tilt+(q.tilt-a.tilt)*f,azimuth:a.azimuth+(q.azimuth-a.azimuth)*f,twist:a.twist+(q.twist-a.twist)*f});
 // Distance and elapsed-time deposits are ordered by two actual input timestamps.
 // Derived time deposits are deterministic commands, never predicted input.
 while(true){const step=Math.max(.25,this.spacing??this.p.size*this.p.spacing),needed=Math.max(0,step-this.carry),spatial=len>0?(traveled+needed)/len:Infinity,temporal=this.p.exposureMs>0&&dt>0?(this.nextExposure-a.t)/dt:Infinity,f=Math.min(spatial,temporal);if(!Number.isFinite(f)||f>1)break;this.distance=startDistance+len*f;this.emit(at(f),null,speed,dir);if(spatial<=temporal){traveled+=needed;this.carry=0;}else this.nextExposure+=this.p.exposureMs;}
 this.carry+=len-traveled;this.distance=this.geometryDistance=startDistance+len;
 if(len===0&&q.p!==a.p&&this.commands.at(-1)?.[20]!==q.t)this.emit(q,null,0,dir);
 }

 emit(q,a,speed,dir){if(this.commands.length>=2000000)throw Error('command limit');const dab=makeDab(q,this.p,this.index++,this.seed,this.distance,speed,dir,q.t-this.start);const c=new Float64Array(STRIDE);c.set(dab);c[16]=a?.x??q.x;c[17]=a?.y??q.y;c[18]=a?this.lastRadius:dab[2]/2;c[19]=this.solid?1:0;c[20]=q.t;c[21]=this.distance;c[22]=a?this.lastDistance:this.distance;c[23]=dab[2]/2;this.lastRadius=dab[2]/2;this.lastDistance=this.distance;this.spacing=dab[2]*dab[14];this.commands.push(c);}
 ready(finish=false){let n=this.published;while(n<this.commands.length&&(finish||this.commands[n][21]<=this.distance-this.p.taperEnd))n++;const out=[];for(;this.published<n;this.published++){const c=this.commands[this.published].slice();c[2]*=taper(this.p,c[21],this.distance,finish);c[18]*=taper(this.p,c[22],this.distance,finish);out.push(c);}return out;}
 finish(){if(this.finished)throw Error('closed');this.finished=true;return this.ready(true);}
 record(){if(!this.finished)throw Error('not finalized');return {version:2,engine:VERSION,smoothing:'local-regression-24ms-bounded-1',fast:this.fast,random:'philox4x32-10',seed:this.seed,preset:this.p,raw:this.raw,geometry:this.geometry,commands:this.commands.map(c=>{const a=Array.from(c);a[2]*=taper(this.p,a[21],this.distance,true);a[18]*=taper(this.p,a[22],this.distance,true);return a;})};}
}
export function commandBounds(c){const r=Math.max(c[2]/2,c[18])*Math.SQRT2+2;return {x0:Math.min(c[0],c[16])-r,y0:Math.min(c[1],c[17])-r,x1:Math.max(c[0],c[16])+r,y1:Math.max(c[1],c[17])+r};}
export function keysFor(c,width,height){const b=commandBounds(c),out=[];for(let y=Math.max(0,Math.floor(b.y0/TILE));y<=Math.min(Math.ceil(height/TILE)-1,Math.floor(b.y1/TILE));y++)for(let x=Math.max(0,Math.floor(b.x0/TILE));x<=Math.min(Math.ceil(width/TILE)-1,Math.floor(b.x1/TILE));x++)out.push(x+','+y);return out;}
export function capsuleCoverage(c,x,y){const ax=c[16],ay=c[17],dx=c[0]-ax,dy=c[1]-ay;const t=clamp(((x-ax)*dx+(y-ay)*dy)/Math.max(.000001,dx*dx+dy*dy));const r=c[18]+(c[2]/2-c[18])*t;return clamp(r+.5-Math.hypot(x-ax-dx*t,y-ay-dy*t));}
export function cpuReference(record,width,height,base=new Uint8ClampedArray(width*height*4)){
 const accum=new Float64Array(width*height*4),p=record.preset;
 for(const c of record.commands){const b=commandBounds(c);for(let y=Math.max(0,Math.floor(b.y0));y<Math.min(height,Math.ceil(b.y1));y++)for(let x=Math.max(0,Math.floor(b.x0));x<Math.min(width,Math.ceil(b.x1));x++){const i=(y*width+x)*4,k=(c[19]===1?capsuleCoverage(c,x+.5,y+.5):coverage(c,0,x+.5,y+.5,p))*c[6],d=c[19]===1?Math.max(0,c[5]*k-accum[i+3]):Math.max(0,c[5]-accum[i+3])*k;for(let j=0;j<3;j++)accum[i+j]+=d*c[8+j];accum[i+3]+=d;}}
 const out=base.slice();for(let i=0;i<out.length;i+=4){const sa=accum[i+3],da=base[i+3]/255;if(!sa)continue;if(p.blend==='erase'){out[i+3]=Math.round(da*(1-sa)*255);if(!out[i+3])out[i]=out[i+1]=out[i+2]=0;continue;}const a=sa+da*(1-sa);for(let j=0;j<3;j++){const s=accum[i+j]/sa,d=base[i+j]/255,b=p.blend==='multiply'?s*d:p.blend==='screen'?1-(1-s)*(1-d):s;out[i+j]=Math.round(clamp(((1-sa)*da*d+(1-da)*sa*s+sa*da*b)/a)*255);}out[i+3]=Math.round(a*255);}return out;
}
export class LatestMailbox{constructor(){this.value=null;this.revision=0;this.obsolete=0;}set(v){if(this.value)this.obsolete++;this.value={...v,revision:++this.revision};}take(){const v=this.value;this.value=null;return v;}}
export function validateRecord(r){if(!r||r.version!==2||r.engine!==VERSION||r.random!=='philox4x32-10'||r.smoothing!=='local-regression-24ms-bounded-1'||!Array.isArray(r.raw)||r.raw.length>500000)throw Error('unsupported record');validatePreset(r.preset);const b=new CanonicalBuilder(r.preset,r.seed,r.fast);for(const s of r.raw)b.accept(s);b.finish();const regenerated=b.record();if(JSON.stringify(regenerated.geometry)!==JSON.stringify(r.geometry)||JSON.stringify(regenerated.commands)!==JSON.stringify(r.commands))throw Error('record replay mismatch');return regenerated;}
