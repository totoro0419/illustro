import {normalize} from '@legacy/input';
import {makeDab,curve} from '@legacy/dynamics';
import {validatePreset} from '@legacy/record';
import {coverage} from '@legacy/coverage';
import {FOUNDATION,compilePreset,foundationDabs,textureFactor,interpolateAngle} from '@rt/foundation';

export const VERSION='illustro-rt-2.5';
export const STRIDE=24;
export const TILE=128;
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function continuous(p){if(p.__foundation)return p.__foundation.solid;return p.tip==='round' && p.spacing<=.25 && p.aspect===1 && p.hardness===1 && p.flow===1 && !p.grain && !p.dual && !p.scatter && !p.sizeJitter && !p.opacityJitter && !p.flowJitter && !p.hueJitter && !p.exposureMs && p.mappings.every(m=>m.target==='size');}
// Weighted local linear regression evaluated at the latest real sample. Unlike a
// trailing position average it preserves constant-velocity lines without phase lag.
export class Stabilizer {
 constructor(p,fast=0){this.p=p;this.fast=fast;this.window=[];this.last=null;this.direction=null;}
 accept(s){
  const q=normalize(s);if(this.p.__foundation)q.p=q.valid&1?curve(this.p.__foundation.preset.pressure.deviceCurve,q.p):this.p.__foundation.preset.pressure.fallback;q.p=curve(this.p.pressureCurve,q.p);
  if(this.last&&q.t<this.last.t)throw Error('out-of-order input');
  const dx=q.x-(this.last?.x??q.x),dy=q.y-(this.last?.y??q.y),len=Math.hypot(dx,dy);
  const dir=len>0?[dx/len,dy/len]:this.direction;
  const corner=!!(len>6&&dir&&this.direction&&dir[0]*this.direction[0]+dir[1]*this.direction[1]<.5);
  if(corner)this.window=[];
  this.window.push(q); const period=this.last?Math.max(0,q.t-this.last.t):0,horizon=Math.max(24,Math.min(48,period*2.1));this.window=this.window.filter(a=>q.t-a.t<=horizon).slice(-8);
  const speed=this.last?len/Math.max(1,q.t-this.last.t):0;
  const strength=clamp(this.p.stabilization+(this.p.__foundation?.preset.stabilization.speedMode==='reduce'?-1:1)*this.fast*clamp(speed/2));
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
export function limitFoundationDiameter(p,desired,lastRadius,travel){const slope=p.__foundation?.preset.pressure.sizeSlope??0;if(!slope||!Number.isFinite(lastRadius))return desired;const previous=lastRadius*2,maxDelta=slope*Math.max(.25,travel);return clamp(desired,Math.max(.01,previous-maxDelta),previous+maxDelta);}
function releaseEnvelope(p){const e=p.__foundation?.preset.taper.size.end;return e?.mode==='release'?e:null;}
function releasePosition(e,c,totalDistance,totalTime){return e.unit==='time'?Math.max(0,totalTime-c[20]):Math.max(0,totalDistance-c[21]);}
function releaseScale(e,c,totalDistance,totalTime){const v=e.length?releasePosition(e,c,totalDistance,totalTime)/e.length:1;return e.minimum+(1-e.minimum)*curve(e.curve,clamp(v));}
function releaseReady(e,c,totalDistance,totalTime){if(!e)return true;return releasePosition(e,c,totalDistance,totalTime)>=e.length;}
function finalizeFoundationCommands(commands,start,p,totalDistance,totalTime){const e=commands.length>1?releaseEnvelope(p):null,out=[];let previous=start>0?commands[start-1][2]:null;for(let i=start;i<commands.length;i++){const c=commands[i].slice();if(e){let desired=c[2]*releaseScale(e,c,totalDistance,totalTime);if(previous!==null){const travel=Math.max(0,c[21]-commands[i-1][21]);desired=limitFoundationDiameter(p,desired,previous/2,travel);c[18]=previous/2;}else c[18]=desired/2;c[2]=desired;previous=desired;}else{c[2]*=taper(p,c[21],totalDistance,true);c[18]*=taper(p,c[22],totalDistance,true);}out.push(c);}return out;}
export function previewFoundationReleaseTail(commands,start,p,totalDistance,totalTime){return p.__foundation&&releaseEnvelope(p)?finalizeFoundationCommands(commands,start,p,totalDistance,totalTime):null;}
export class CanonicalBuilder {
 constructor(p,seed=[0x12345678,0x9abcdef0],fast=0,context={}){this.foundation=p.format==='illustro-brush-preset'?structuredClone(p):null;this.context=structuredClone(context);if(this.foundation){p=compilePreset(p,context);fast=p.__foundation.preset.stabilization.fast;}else validatePreset(p);if(!Number.isFinite(fast)||fast<0||fast>1)throw Error('invalid fast stabilization');if(!Array.isArray(seed)||seed.length!==2||seed.some(x=>!Number.isInteger(x)||x<0||x>0xffffffff))throw Error('invalid seed');this.p=structuredClone(p);this.seed=[...seed];this.fast=fast;this.filter=new Stabilizer(p,fast);this.raw=[];this.geometry=[];this.commands=[];this.distance=0;this.index=0;this.carry=0;this.finished=false;this.published=0;this.solid=continuous(p);this.sweep=!!p.__foundation?.coverageUnion;}
 accept(s){if(this.finished)throw Error('closed');if(s.predicted||s.origin==='predicted')throw Error('prediction cannot be canonical');if(this.raw.length>=500000)throw Error('input limit');const q=this.filter.accept(s),a=this.geometry.at(-1);if(this.foundation){q.pointerType=s.pointerType??'unknown';q.origin=s.origin??'raw';q.velocity=a?Math.hypot(q.x-a.x,q.y-a.y)/Math.max(.001,(q.t-a.t)/1000):0;q.direction=a&&Math.hypot(q.x-a.x,q.y-a.y)>0?Math.atan2(q.y-a.y,q.x-a.x):(a?.direction??0);q.distance=this.distance+(a?Math.hypot(q.x-a.x,q.y-a.y):0);q.elapsed=q.t-(this.start??q.t);}this.raw.push({...s});this.geometry.push(q);if(!a){this.start=q.t;this.nextExposure=q.t+this.p.exposureMs;this.emit(q,null,0,0);return;}const len=Math.hypot(q.x-a.x,q.y-a.y),speed=len/Math.max(.001,(q.t-a.t)/1000),dir=Math.atan2(q.y-a.y,q.x-a.x);
 if(this.solid||this.sweep){this.distance+=len;this.emit(q,a,speed,dir);return;}
 const startDistance=this.geometryDistance??0,dt=q.t-a.t;let traveled=0;
 const at=f=>({...q,x:a.x+(q.x-a.x)*f,y:a.y+(q.y-a.y)*f,p:a.p+(q.p-a.p)*f,t:a.t+dt*f,tilt:a.tilt+(q.tilt-a.tilt)*f,azimuth:this.foundation?interpolateAngle(a.azimuth,q.azimuth,f):a.azimuth+(q.azimuth-a.azimuth)*f,twist:this.foundation?interpolateAngle(a.twist,q.twist,f):a.twist+(q.twist-a.twist)*f});
 // Distance and elapsed-time deposits are ordered by two actual input timestamps.
 // Derived time deposits are deterministic commands, never predicted input.
 while(true){const step=Math.max(.25,this.spacing??this.p.size*this.p.spacing),needed=Math.max(0,step-this.carry),spatial=len>0?(traveled+needed)/len:Infinity,temporal=this.p.exposureMs>0&&dt>0?(this.nextExposure-a.t)/dt:Infinity,f=Math.min(spatial,temporal);if(!Number.isFinite(f)||f>1)break;this.distance=startDistance+len*f;const sample=at(f);if(temporal<spatial&&len===0){sample.p=a.p;sample.tilt=a.tilt;sample.azimuth=a.azimuth;sample.twist=a.twist;}this.emit(sample,null,speed,dir);if(spatial<=temporal){traveled+=needed;this.carry=0;}else this.nextExposure+=this.p.exposureMs;}
 this.carry+=len-traveled;this.distance=this.geometryDistance=startDistance+len;
 if(len===0&&q.p!==a.p&&this.commands.at(-1)?.[20]!==q.t)this.emit(q,null,0,dir);
 }

 emit(q,a,speed,dir){if(this.commands.length>=2000000)throw Error('command limit');const generated=this.foundation?foundationDabs(q,this.p,this.index,this.seed,this.distance,speed,dir,q.t-this.start):{dabs:[makeDab(q,this.p,this.index,this.seed,this.distance,speed,dir,q.t-this.start)]};for(const dab of generated.dabs){if(this.foundation&&this.solid&&a)dab[2]=limitFoundationDiameter(this.p,dab[2],this.lastRadius,Math.hypot(q.x-a.x,q.y-a.y));this.index++;const c=new Float64Array(STRIDE);c.set(dab);c[16]=a?.x??q.x;c[17]=a?.y??q.y;c[18]=a?(q.x===a.x&&q.y===a.y&&!this.compatLegacyRadius?Math.max(this.lastRadius,dab[2]/2):this.lastRadius):dab[2]/2;c[19]=this.solid?1:this.sweep?2:0;c[20]=q.t;c[21]=this.distance;c[22]=a?this.lastDistance:this.distance;c[23]=dab[2]/2;this.lastRadius=dab[2]/2;this.lastDistance=this.distance;this.spacing=generated.spacing??dab[2]*dab[14];if(this.foundation&&!this.solid)c[22]=dir;if(this.sweep)this.appendSweep(c,q);else this.commands.push(c);}}
 appendSweep(c,q){const old=this.commands.at(-1),t=this.p.__foundation.texture,window=this.sweepWindow??[],same=old&&this.commands.length-1>=this.published&&window.length<64&&t.space==='paper'&&t.sizeMode==='absolute'&&!t.followDirection&&[2,3,5,6,7,8,9,10,18].every(i=>c[i]===old[i])&&old[18]===old[2]/2;let merge=!!same;if(merge){const dx=q.x-old[16],dy=q.y-old[17],den=dx*dx+dy*dy;for(const v of window){const f=clamp(((v.x-old[16])*dx+(v.y-old[17])*dy)/Math.max(1e-9,den));if(Math.hypot(v.x-old[16]-dx*f,v.y-old[17]-dy*f)>.05){merge=false;break;}}}if(merge){c[16]=old[16];c[17]=old[17];c[18]=old[18];this.commands[this.commands.length-1]=c;this.sweepWindow.push({...q});}else{this.commands.push(c);this.sweepWindow=[{x:c[16],y:c[17]},{...q}];}}
 ready(finish=false){let n=this.published,limit=this.commands.length-(this.sweep&&!finish?1:0),endTime=this.commands.at(-1)?.[20]??0,e=this.foundation?releaseEnvelope(this.p):null;while(n<limit&&(finish||(e?releaseReady(e,this.commands[n],this.distance,endTime):this.commands[n][21]<=this.distance-this.p.taperEnd)))n++;if(this.foundation&&finish&&e){const out=finalizeFoundationCommands(this.commands,this.published,this.p,this.distance,endTime);this.published=n;return out;}const out=[];for(;this.published<n;this.published++){const c=this.commands[this.published].slice();c[2]*=taper(this.p,c[21],this.distance,finish);c[18]*=taper(this.p,c[22],this.distance,finish);out.push(c);}return out;}
 release(s){normalize(s);if(s.predicted||s.origin==='predicted')throw Error('prediction cannot be canonical');if(s.t<(this.raw.at(-1)?.t??0))throw Error('out-of-order release');this.releaseInput={...s,phase:'release'};}
 finish(){if(this.finished)throw Error('closed');this.finished=true;return this.ready(true);}
 record(){if(!this.finished)throw Error('not finalized');const endTime=this.commands.at(-1)?.[20]??0,finalCommands=this.foundation&&releaseEnvelope(this.p)?finalizeFoundationCommands(this.commands,0,this.p,this.distance,endTime).map(c=>Array.from(c)):this.commands.map(c=>{const a=Array.from(c);a[2]*=taper(this.p,a[21],this.distance,true);a[18]*=taper(this.p,a[22],this.distance,true);return a;});return {...(this.foundation?{foundation:this.foundation,context:this.context,...(this.releaseInput?{releaseInput:this.releaseInput}:{})}:{}),version:this.foundation?3:2,engine:this.replayEngine??(this.foundation?FOUNDATION:VERSION),smoothing:'local-regression-adaptive-48ms-bounded-2',fast:this.fast,random:'philox4x32-10',seed:this.seed,preset:this.p,raw:this.raw,geometry:this.geometry,commands:finalCommands};}
}
export function commandBounds(c){const solid=c[19]>0,r=Math.max(c[2]/2,c[18])*(solid?1:Math.SQRT2)+2,ax=solid?c[16]:c[0],ay=solid?c[17]:c[1];return {x0:Math.min(c[0],ax)-r,y0:Math.min(c[1],ay)-r,x1:Math.max(c[0],ax)+r,y1:Math.max(c[1],ay)+r};}
export function keysFor(c,width,height){const b=commandBounds(c),out=[];for(let y=Math.max(0,Math.floor(b.y0/TILE));y<=Math.min(Math.ceil(height/TILE)-1,Math.floor(b.y1/TILE));y++)for(let x=Math.max(0,Math.floor(b.x0/TILE));x<=Math.min(Math.ceil(width/TILE)-1,Math.floor(b.x1/TILE));x++)out.push(x+','+y);return out;}
export function capsuleCoverage(c,x,y){const ax=c[16],ay=c[17],dx=c[0]-ax,dy=c[1]-ay;const t=clamp(((x-ax)*dx+(y-ay)*dy)/Math.max(.000001,dx*dx+dy*dy));const r=c[18]+(c[2]/2-c[18])*t;return clamp(r+.5-Math.hypot(x-ax-dx*t,y-ay-dy*t));}
export function referenceCoverage(c,x,y,p,engine=VERSION){if(p.__foundation?.material){const q=Array.from(c);q[7]=0;return referenceCoverage(q,x,y,{...p,__foundation:undefined},engine)*textureFactor(c,x,y,p);}const ellipse=p.tip==='ellipse'&&p.hardness===1&&!p.dual,star=p.tip==='star'&&p.hardness===1&&!p.dual&&engine!=='illustro-rt-2.4';if(!ellipse&&!star)return coverage(c,0,x,y,p);const cs=Math.cos(c[4]),sn=Math.sin(c[4]),dx=x-c[0],dy=y-c[1],rx=c[2]/2,ry=rx*c[3],lx=dx*cs+dy*sn,ly=-dx*sn+dy*cs;let v;if(star){if(rx*ry<.08)v=Math.max(0,1-Math.abs(dx))*Math.max(0,1-Math.abs(dy))*Math.min(1,Math.PI*rx*ry*.48375);else{const u=lx/rx,w=ly/ry,r=Math.hypot(u,w),theta=Math.atan2(w,u),a=1.75*Math.sin(theta*5)/Math.max(r,1e-12),gradient=Math.hypot((Math.cos(theta)-a*Math.sin(theta))/rx,(Math.sin(theta)+a*Math.cos(theta))/ry);v=r>1e-12?clamp(.5-(r-.65-.35*Math.cos(theta*5))/Math.max(gradient,1e-12)):clamp(.5+.3*Math.min(rx,ry));}}else{const k0=Math.hypot(lx/rx,ly/ry),k1=Math.hypot(lx/(rx*rx),ly/(ry*ry));v=k1>1e-12?clamp(.5-k0*(k0-1)/k1):clamp(.5+Math.min(rx,ry));}if(c[7]&&v){const q=Array.from(c);q[0]=x;q[1]=y;q[2]=2;q[3]=1;q[4]=0;v*=coverage(q,0,x,y,{...p,tip:'round',hardness:1});}return v;}

export function cpuReference(record,width,height,base=new Uint8ClampedArray(width*height*4)){
 const accum=new Float64Array(width*height*4),p=record.preset,material=p.__foundation?.material,coveragePreset=material?{...p,__foundation:undefined}:p;
 for(const c of record.commands){const plain=material?Array.from(c):c;if(material)plain[7]=0;const b=commandBounds(c);for(let y=Math.max(0,Math.floor(b.y0));y<Math.min(height,Math.ceil(b.y1));y++)for(let x=Math.max(0,Math.floor(b.x0));x<Math.min(width,Math.ceil(b.x1));x++){const i=(y*width+x)*4,k=(c[19]===1?capsuleCoverage(c,x+.5,y+.5):c[19]===2?sweptCoverage(c,x+.5,y+.5,p):referenceCoverage(plain,x+.5,y+.5,coveragePreset,record.engine)*(material?textureFactor(c,x+.5,y+.5,p):1))*c[6];if(p.__foundation?.coverageUnion){const delta=Math.max(0,k*c[5]-accum[i+3]);for(let j=0;j<3;j++)accum[i+j]+=c[8+j]*delta;accum[i+3]+=delta;continue;}if(p.__foundation?.material){const a=k*c[5];for(let j=0;j<3;j++)accum[i+j]=accum[i+j]*(1-a)+c[8+j]*a;accum[i+3]+=a*(1-accum[i+3]);continue;}const d=c[19]===1?Math.max(0,c[5]*k-accum[i+3]):Math.max(0,c[5]-accum[i+3])*k;for(let j=0;j<3;j++)accum[i+j]+=d*c[8+j];accum[i+3]+=d;}}
 if(p.__foundation?.material)for(let i=0;i<accum.length;i++)accum[i]*=p.__foundation.opacity;
 const out=base.slice();for(let i=0;i<out.length;i+=4){const sa=accum[i+3],da=base[i+3]/255;if(!sa)continue;if(p.blend==='erase'){out[i+3]=Math.round(da*(1-sa)*255);if(!out[i+3])out[i]=out[i+1]=out[i+2]=0;continue;}const a=sa+da*(1-sa);for(let j=0;j<3;j++){const s=accum[i+j]/sa,d=base[i+j]/255,b=p.blend==='multiply'?s*d:p.blend==='screen'?1-(1-s)*(1-d):s;out[i+j]=Math.round(clamp(((1-sa)*da*d+(1-da)*sa*s+sa*da*b)/a)*255);}out[i+3]=Math.round(a*255);if(!out[i+3])out[i]=out[i+1]=out[i+2]=0;}return out;
}
export class LatestMailbox{constructor(){this.value=null;this.revision=0;this.obsolete=0;}set(v){if(this.value)this.obsolete++;this.value={...v,revision:++this.revision};}take(){const v=this.value;this.value=null;return v;}}
export function validateRecord(r){if(r?.version===3){if(r.engine!==FOUNDATION||r.random!=='philox4x32-10'||r.smoothing!=='local-regression-adaptive-48ms-bounded-2'||!Array.isArray(r.raw)||r.raw.length>500000)throw Error('unsupported foundation record');const b=new CanonicalBuilder(r.foundation,r.seed,0,r.context);for(const s of r.raw)b.accept(s);if(r.releaseInput)b.release(r.releaseInput);b.finish();const regenerated=b.record();for(const key of ['fast','preset','geometry','commands'])if(JSON.stringify(regenerated[key])!==JSON.stringify(r[key]))throw Error('foundation replay mismatch: '+key);return regenerated;}if(!r||r.version!==2||![VERSION,'illustro-rt-2.4'].includes(r.engine)||r.random!=='philox4x32-10'||r.smoothing!=='local-regression-adaptive-48ms-bounded-2'||!Array.isArray(r.raw)||r.raw.length>500000)throw Error('unsupported record');validatePreset(r.preset);const b=new CanonicalBuilder(r.preset,r.seed,r.fast);b.compatLegacyRadius=r.engine==='illustro-rt-2.4';b.replayEngine=r.engine;for(const s of r.raw)b.accept(s);b.finish();const regenerated=b.record();if(JSON.stringify(regenerated.geometry)!==JSON.stringify(r.geometry)||JSON.stringify(regenerated.commands)!==JSON.stringify(r.commands))throw Error('record replay mismatch');return regenerated;}

export function solidTileCovered(c,key){
 if(c[19]!==1||c[18]!==c[2]/2||c[18]<1)return false;
 const [tx,ty]=key.split(',').map(n=>Number(n)*TILE),dx=c[0]-c[16],dy=c[1]-c[17],den=dx*dx+dy*dy,r=c[18]-1;
 for(const x of [tx+.5,tx+TILE-.5])for(const y of [ty+.5,ty+TILE-.5]){const t=clamp(((x-c[16])*dx+(y-c[17])*dy)/Math.max(1e-12,den));if((x-c[16]-dx*t)**2+(y-c[17]-dy*t)**2>r*r)return false;}
 return true;
}

// A constant stroke opacity/pigment allows exact normalized source-over density
// accumulation for complex stamps; varying flow/grain/shape remain supported.
export function liveAccumulation(p){if(p.__foundation)return p.__foundation.material&&!p.__foundation.coverageUnion;return Array.isArray(p.mappings)&&!continuous(p)&&!p.opacityJitter&&!p.hueJitter&&p.mappings.every(m=>!['opacity','hue','saturation','value'].includes(m.target));}

export function sweptCoverage(c,x,y,p){const dx=c[0]-c[16],dy=c[1]-c[17],f=clamp(((x-c[16])*dx+(y-c[17])*dy)/Math.max(1e-6,dx*dx+dy*dy)),r=c[18]+(c[2]/2-c[18])*f,d=Math.hypot(x-c[16]-dx*f,y-c[17]-dy*f),h=r*p.hardness;return (d<=h?1:clamp((r+.5-d)/Math.max(.5,r-h)))*textureFactor(c,x,y,p);}
