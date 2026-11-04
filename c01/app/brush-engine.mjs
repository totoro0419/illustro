import {clamp, hsvToRgb, rgbToHsv} from './model.mjs';

export const algorithm = 'illustro.canvas-dabs.1';
const unit = value => clamp(value, 0, 1);
export const mod = (value, period) => ((value % period) + period) % period;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);

const base = {
 tip:'round', aspect:1, shear:0, hardness:1, spacing:.1, scatter:0, angle:0, particles:1,
 texture:'none', textureScale:1, textureAngle:0, depth:0, textureAnchor:'document',
 taper:false, start:20, end:20, taperUnit:'px', taperShape:'smooth', minWidth:.25, taperAlpha:0,
 blend:'over', accumulate:false, pigment:1, correction:'global', positionTau:0, speedTau:0, pressureTau:0, maps:[]
};
const map = (source, output, min, max) => ({source,output,min,max,scale:1,operation:'multiply',enabled:true,invert:false,knots:[[0,0],[1,1]]});
export const presets = Object.freeze({
 round:{name:'丸ブラシ',tags:'均一 塗り'},
 gpen:{name:'Gペン',tags:'線画 インク',maps:[map('pressure','size',0,1)]},
 pencil:{name:'鉛筆',tags:'下描き 紙 グラファイト',texture:'graphite',depth:.85,textureScale:1.5,maps:[map('pressure','flow',.12,.75)]},
 marker:{name:'マーカー',tags:'塗り 半透明',pigment:.5},
 air:{name:'エアブラシ',tags:'ぼかし ソフト',hardness:0,pigment:.05},
 hardEraser:{name:'硬い消しゴム',tags:'消去',blend:'erase'},
 softEraser:{name:'柔らかい消しゴム',tags:'消去 ぼかし',blend:'erase',hardness:0}
});
export function preset(id){
 return {...structuredClone(base), ...structuredClone(presets[id] || presets.round), id, version:1};
}
export const sources = ['pressure','tilt','azimuth','barrel','speed','direction','distance','time','start','end','random'];
export const domains = {
 size:[0,900], opacity:[0,1], flow:[0,1], spacing:[0,2], angle:[0,360], scatter:[0,400],
 aspect:[.05,2], shear:[-1,1], hue:[-360,360], saturation:[-1,1], value:[-1,1],
 hardness:[0,1], depth:[0,1], textureScale:[.1,16], particles:[1,8]
};
const scalar = {
 aspect:[.05,2], shear:[-1,1], hardness:[0,1], spacing:[.01,2], scatter:[0,400], angle:[-360,360],
 particles:[1,8], textureScale:[.1,16], textureAngle:[-360,360], depth:[0,1], pigment:[0,1],
 start:[0,1000], end:[0,1000], minWidth:[0,300], taperAlpha:[0,1],
 positionTau:[0,.2], speedTau:[0,.2], pressureTau:[0,.2]
};
const choices = {
 tip:['round','square','diamond','bitmap'], texture:['none','graphite','paper'],
 textureAnchor:['document','stroke'], taperUnit:['px','diameter'], taperShape:['smooth','linear'],
 blend:['over','erase','behind','alpha-lock'], correction:['global','off','light','strong','custom']
};
export function validateBrush(brush){
 if (!brush || typeof brush.id !== 'string' || !Number.isSafeInteger(brush.version) || brush.version < 1 ||
     typeof brush.name !== 'string' || !brush.name.trim() || brush.name.length > 80 || typeof brush.tags !== 'string') throw Error('ブラシ名または版が無効です');
 for (const [key,[lo,hi]] of Object.entries(scalar)) {
  if (!Number.isFinite(brush[key]) || brush[key] < lo || brush[key] > hi) throw Error(key + ' の範囲が無効です');
 }
 for (const [key,allowed] of Object.entries(choices)) if (!allowed.includes(brush[key])) throw Error(key + ' が無効です');
 if (brush.tip === 'bitmap') {
  const {width,height,alpha} = brush.asset || {};
  if (!Number.isInteger(width) || !Number.isInteger(height) || width<1 || height<1 || width>128 || height>128 ||
      typeof alpha !== 'string' || alpha.length !== 2*width*height || !/^[0-9a-f]+$/.test(alpha)) throw Error('先端素材がありません');
 }
 if (!Array.isArray(brush.maps) || brush.maps.length > 24) throw Error('変調は24件までです');
 for (const node of brush.maps) {
  if (!sources.includes(node.source) || !Object.hasOwn(domains,node.output) || !['add','multiply','replace'].includes(node.operation) ||
      !Number.isFinite(node.min) || !Number.isFinite(node.max) || Math.abs(node.min)>10000 || Math.abs(node.max)>10000 ||
      !Number.isFinite(node.scale) || node.scale<=0 || (node.constant != null && (!Number.isFinite(node.constant) || node.constant<0 || node.constant>1)) ||
      !Array.isArray(node.knots) || node.knots.length<2 || node.knots.length>16 ||
      node.knots.some((k,i) => !Array.isArray(k) || k.length!==2 || !k.every(v=>Number.isFinite(v)&&v>=0&&v<=1) || (i && k[0]<=node.knots[i-1][0]))) {
   throw Error('変調の範囲・順序・カーブを確認してください');
  }
 }
 return brush;
}

export function curve(knots, x) {
 if (x <= knots[0][0]) return knots[0][1];
 for (let i=1;i<knots.length;i++){
  const [right,y]=knots[i], [left,previous]=knots[i-1];
  if (x<=right) return lerp(previous,y,(x-left)/(right-left));
 }
 return knots.at(-1)[1];
}

export function correctSample(raw, previousRaw, filtered, correction) {
 if (!previousRaw) return {...raw,speed:0,direction:0,distance:0};
 const dt = (raw.t-previousRaw.t)/1000;
 const speed = dt>0 ? Math.hypot(raw.x-previousRaw.x,raw.y-previousRaw.y)/dt : 0;
 const position = correction.mode==='light'?.0125:correction.mode==='strong'?.05:correction.mode==='custom'?correction.positionTau:0;
 const tau = position + (correction.mode==='custom'?correction.speedTau*unit(speed/1000):0);
 const pressure = correction.mode==='custom'?correction.pressureTau:0;
 const gain = value => value>0 ? -Math.expm1(-dt/value) : 1;
 return {...raw,
  x:lerp(filtered.x,raw.x,gain(tau)), y:lerp(filtered.y,raw.y,gain(tau)), p:lerp(filtered.p,raw.p,gain(pressure)),
  speed, direction:speed>0?mod(Math.atan2(raw.y-previousRaw.y,raw.x-previousRaw.x)*180/Math.PI,360):filtered.direction
 };
}

export function correctedPath(points, correction, guide, terminal=true){
 const path=[];
 for(let i=0;i<points.length;i++){
  const point=correctSample(points[i],points[i-1],path[i-1],correction);
  if (terminal && i===points.length-1) Object.assign(point,{x:points[i].x,y:points[i].y});
  path.push(point);
 }
 let distance=0;
 return path.map((point,i)=>{
  const x=guide?.axis==='x'?lerp(point.x,guide.coordinate,guide.strength):point.x;
  const y=guide?.axis==='y'?lerp(point.y,guide.coordinate,guide.strength):point.y;
  const previous=path[i-1];
  if(previous) distance+=Math.hypot(x-previous.x,y-previous.y);
  Object.assign(point,{x,y,distance});
  return point;
 });
}

const shaK = new Uint32Array([
 0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
 0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
 0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
 0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
 0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
 0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
 0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
 0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
]);
const rotr=(value,bits)=>(value>>>bits)|(value<<(32-bits));
/** The v1 counter has a fixed 44-byte message, so SHA-256 needs one block. */
export function counterRandom(seed, index, channel){
 const words=new Uint32Array(64);
 const input=new DataView(new ArrayBuffer(64));
 const prefix='Illustro.Numeric.v1\0';
 for(let i=0;i<prefix.length;i++) input.setUint8(i,prefix.charCodeAt(i));
 input.setUint32(20,parseInt(seed.slice(0,8),16));
 input.setUint32(24,parseInt(seed.slice(8),16));
 input.setUint32(28,Math.floor(index/2**32));input.setUint32(32,index);
 input.setUint32(40,channel);input.setUint8(44,128);input.setUint32(60,44*8);
 for(let i=0;i<16;i++) words[i]=input.getUint32(i*4);
 for(let i=16;i<64;i++){
  const a=words[i-15],b=words[i-2];
  words[i]=words[i-16]+(rotr(a,7)^rotr(a,18)^(a>>>3))+words[i-7]+(rotr(b,17)^rotr(b,19)^(b>>>10));
 }
 let a=0x6a09e667,b=0xbb67ae85,c=0x3c6ef372,d=0xa54ff53a,e=0x510e527f,f=0x9b05688c,g=0x1f83d9ab,h=0x5be0cd19;
 for(let i=0;i<64;i++){
  const t1=(h+(rotr(e,6)^rotr(e,11)^rotr(e,25))+((e&f)^(~e&g))+shaK[i]+words[i])|0;
  const t2=((rotr(a,2)^rotr(a,13)^rotr(a,22))+((a&b)^(a&c)^(b&c)))|0;
  h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;
 }
 return (((a+0x6a09e667)>>>0)*2**21+((b+0xbb67ae85)>>>11))/2**53;
}
export function makeSeed(){
 return Array.from(crypto.getRandomValues(new Uint8Array(8)),byte=>byte.toString(16).padStart(2,'0')).join('');
}
function sourceValue(node, s, p, total, index, channel){
 switch(node.source){
  case 'pressure':return s.pen?unit(p.p**s.curve):1;
  case 'tilt':return p.tiltX==null||p.tiltY==null?node.constant:unit(Math.hypot(p.tiltX,p.tiltY)/90);
  case 'azimuth':return p.azimuth==null?node.constant:mod(p.azimuth,360)/360;
  case 'barrel':return p.twist==null?node.constant:mod(p.twist,360)/360;
  case 'direction':return mod(p.direction,360)/360;
  case 'speed':return unit(p.speed/node.scale);
  case 'distance':case 'start':return unit(p.distance/node.scale);
  case 'end':return total===null?null:unit((total-p.distance)/node.scale);
  case 'time':return unit((p.t-s.points[0].t)/1000/node.scale);
  case 'random':return counterRandom(s.seed,index,channel);
 }
}
export function evaluateDab(s,p,total,index){
 const b=s.brush;
 const a={size:s.size,opacity:1,flow:s.flow*b.pigment,spacing:b.spacing,angle:b.angle,scatter:b.scatter,
  aspect:b.aspect,shear:b.shear,hue:0,saturation:0,value:0,hardness:b.hardness,depth:b.depth,textureScale:b.textureScale,particles:b.particles};
 for(let channel=0;channel<b.maps.length;channel++){
  const node=b.maps[channel];
  if(!node.enabled) continue;
  const value=sourceValue(node,s,p,total,index,channel+8);
  if(value==null) continue;
  const factor=lerp(node.min,node.max,curve(node.knots,node.invert?1-value:value));
  const previous=a[node.output];
  a[node.output]=node.operation==='replace'?factor:node.operation==='add'?previous+factor:previous*factor;
 }
 for(const [key,[lo,hi]] of Object.entries(domains)) a[key]=key==='angle'?mod(a[key],360):clamp(a[key],lo,hi);
 const spacing=Math.max(1/256,a.spacing*a.size);
 if(b.taper){
  const multiplier=b.taperUnit==='diameter'?s.size:1;
  const shape=b.taperShape==='smooth'?smooth:x=>x;
  const head=b.start?shape(unit(p.distance/(b.start*multiplier))):1;
  const tail=b.end&&total!==null?shape(unit((total-p.distance)/(b.end*multiplier))):1;
  const taper=head*tail;
  a.size=Math.min(a.size,Math.max(b.minWidth,a.size*taper));
  a.opacity*=lerp(1,taper,b.taperAlpha);
 }
 const x=p.x+(a.scatter?(counterRandom(s.seed,index,0)*2-1)*a.scatter:0);
 const y=p.y+(a.scatter?(counterRandom(s.seed,index,1)*2-1)*a.scatter:0);
 let color=s.color;
 if(a.hue||a.saturation||a.value){
  const [h,sat,v]=rgbToHsv(color);
  color=hsvToRgb(h+a.hue,unit(sat+a.saturation),unit(v+a.value));
 }
 return {...a,x,y,spacing,color,index};
}

const analog=['x','y','p','t','speed','distance','tiltX','tiltY'];
function sampleAt(from,to,distance){
 const weight=unit((distance-from.distance)/(to.distance-from.distance));
 const sample={...to};
 for(const key of analog) sample[key]=from[key]==null||to[key]==null?null:lerp(from[key],to[key],weight);
 for(const key of ['azimuth','twist']){
  sample[key]=from[key]==null||to[key]==null?null:mod(from[key]+(mod(to[key]-from[key]+180,360)-180)*weight,360);
 }
 return sample;
}
export function* strokeDabs(s){
 const path=correctedPath(s.points,s.correction,s.guide);
 if(!path.length)return;
 const end=path.at(-1),total=end.distance;
 let index=0;
 const first=evaluateDab(s,path[0],total,index++);
 yield first;
 let next=first.spacing;
 for(let i=1;i<path.length && next<total;i++){
  const to=path[i],from=path[i-1];
  while(next<=to.distance && next<total){
   const dab=evaluateDab(s,sampleAt(from,to,next),total,index++);
   yield dab;
   next+=dab.spacing;
  }
 }
 if(total>0) yield evaluateDab(s,end,total,index);
}
