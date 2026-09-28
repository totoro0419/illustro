import { performance } from 'node:perf_hooks';
import { uniform01 } from './philox.js';

export const TILE_SIZE = 256;
export const POSITION_QUANTUM = 1 / 65536;

export function quantizePosition(v) {
  return Math.round(v * 65536) / 65536;
}

function alphaForCutoff(cutoff, dt) {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

class LowPass {
  constructor() { this.ready = false; this.y = 0; }
  next(x, a) {
    if (!this.ready) { this.ready = true; this.y = x; return x; }
    this.y = a * x + (1 - a) * this.y;
    return this.y;
  }
}

export class OneEuro1D {
  constructor({ minCutoff, beta, dCutoff = 1 }) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xFilter = new LowPass();
    this.dxFilter = new LowPass();
    this.prevX = null;
  }
  next(x, dt) {
    const dx = this.prevX === null ? 0 : (x - this.prevX) / dt;
    this.prevX = x;
    const edx = this.dxFilter.next(dx, alphaForCutoff(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.next(x, alphaForCutoff(cutoff, dt));
  }
}

export function reconstruct(samples, profile) {
  if (profile.kind === 'raw') return samples.map(s => ({...s}));
  if (profile.kind === 'ema') {
    let px = samples[0]?.x ?? 0, py = samples[0]?.y ?? 0;
    return samples.map((s, i) => {
      if (i === 0) return {...s};
      px = profile.alpha * s.x + (1 - profile.alpha) * px;
      py = profile.alpha * s.y + (1 - profile.alpha) * py;
      return {...s, x:px, y:py};
    });
  }
  if (profile.kind === 'one-euro') {
    const fx = new OneEuro1D(profile), fy = new OneEuro1D(profile);
    let prevT = samples[0]?.t ?? 0;
    return samples.map((s, i) => {
      const dt = i === 0 ? 1 / 120 : Math.max(1e-6, (s.t - prevT) / 1000);
      prevT = s.t;
      return {...s, x:fx.next(s.x, dt), y:fy.next(s.y, dt)};
    });
  }
  throw new Error(`unknown profile ${profile.kind}`);
}

function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s,1664525)+1013904223)>>>0) / 0x100000000);
}

export function makeStroke(kind, count, {noise=0.28, seed=1, hz=120}={}) {
  const rnd=lcg(seed);
  const out=[];
  for(let i=0;i<count;i++) {
    const u=count<=1?0:i/(count-1);
    let x,y;
    if(kind==='straight') { x=16+u*480; y=128; }
    else if(kind==='curve') { x=16+u*480; y=128+62*Math.sin(u*Math.PI*2); }
    else if(kind==='corner') {
      if(u<0.5){x=32+u*2*220;y=80;} else {x=252;y=80+(u-0.5)*2*220;}
    }
    else if(kind==='slow') { x=60+u*30; y=90+4*Math.sin(u*Math.PI*4); }
    else if(kind==='micro') { x=128+2*Math.sin(u*Math.PI*12); y=128+2*Math.cos(u*Math.PI*10); }
    else if(kind==='stationary') { x=128; y=128; }
    else throw new Error(kind);
    const truth={x,y};
    const nx=(rnd()-0.5)*2*noise, ny=(rnd()-0.5)*2*noise;
    out.push({x:x+nx,y:y+ny,truthX:x,truthY:y,t:i*1000/hz,pressure:0.15+0.8*u,tilt:0.2+0.5*Math.sin(u*Math.PI),azimuth:u*Math.PI*2});
  }
  return out;
}

export function rmse(samples) {
  let s=0;
  for(const p of samples){const dx=p.x-p.truthX,dy=p.y-p.truthY;s+=dx*dx+dy*dy;}
  return Math.sqrt(s/Math.max(1,samples.length));
}

export function endpointError(samples){
  if(!samples.length) return 0;
  const p=samples.at(-1); return Math.hypot(p.x-p.truthX,p.y-p.truthY);
}

export function calibrateReconstruction() {
  const training=[
    makeStroke('straight',240,{seed:11,noise:0.35}),
    makeStroke('curve',360,{seed:12,noise:0.35}),
    makeStroke('corner',280,{seed:13,noise:0.25}),
    makeStroke('slow',360,{seed:14,noise:0.32}),
    makeStroke('micro',360,{seed:15,noise:0.22}),
    makeStroke('stationary',240,{seed:16,noise:0.38}),
  ];
  const candidates=[{kind:'raw'}];
  for(const alpha of [0.4,0.5,0.65,0.8]) candidates.push({kind:'ema',alpha});
  for(const minCutoff of [1,2,4,8,16]) for(const beta of [0.5,1,2,4]) candidates.push({kind:'one-euro',minCutoff,beta,dCutoff:1});
  const rows=candidates.map(profile=>{
    const errors=training.map(s=>rmse(reconstruct(s,profile)));
    const dynamic=errors.slice(0,-1),stationary=errors.at(-1);
    const dynamicMean=dynamic.reduce((a,b)=>a+b,0)/dynamic.length;
    const dynamicWorst=Math.max(...dynamic);
    const endpoint=Math.max(...training.map(s=>endpointError(reconstruct(s,profile))));
    const score=dynamicMean + 0.85*stationary + 0.2*dynamicWorst + 0.05*endpoint;
    return {profile,dynamicMean,dynamicWorst,stationaryRmse:stationary,worstEndpoint:endpoint,score};
  }).sort((a,b)=>a.score-b.score);
  return rows;
}

export function generateDabs(reconstructed,{spacing=1.75,seedLo=0x12345678,seedHi=0x9abcdef0}={}){
  if(reconstructed.length===0) return [];
  const dabs=[]; let index=0, carry=0;
  let prev=reconstructed[0];
  const emit=(x,y,pressure,t)=>{
    const jitterX=(uniform01(seedLo,seedHi,index,1)-0.5)*0.2;
    const jitterY=(uniform01(seedLo,seedHi,index,2)-0.5)*0.2;
    const rotation=uniform01(seedLo,seedHi,index,3)*Math.PI*2;
    dabs.push({index,x:quantizePosition(x+jitterX),y:quantizePosition(y+jitterY),pressure,rotation,t});
    index++;
  };
  emit(prev.x,prev.y,prev.pressure,prev.t);
  for(let i=1;i<reconstructed.length;i++){
    const cur=reconstructed[i],dx=cur.x-prev.x,dy=cur.y-prev.y,dist=Math.hypot(dx,dy);
    if(dist>0){
      let at=spacing-carry;
      while(at<=dist+1e-12){
        const u=at/dist;
        emit(prev.x+dx*u,prev.y+dy*u,prev.pressure+(cur.pressure-prev.pressure)*u,prev.t+(cur.t-prev.t)*u);
        at+=spacing;
      }
      carry=(carry+dist)%spacing;
    }
    prev=cur;
  }
  return dabs;
}

function q16(v){return Math.max(0,Math.min(65535,Math.round(v*65535)));}
function srcOverQ16(dst, src){
  const remain=65535-src;
  return Math.min(65535, src + Math.floor((dst*remain + 32767)/65535));
}
function coverageStrict(dab,x,y){
  const radius=1.6+dab.pressure*2.6;
  const dx=(x+0.5)-dab.x,dy=(y+0.5)-dab.y;
  const d=Math.hypot(dx,dy);
  const c=Math.max(0,Math.min(1,radius+0.5-d));
  return q16(c*(0.18+0.52*dab.pressure));
}

function dabBounds(d){
  const r=1.6+d.pressure*2.6+0.5;
  return {x0:Math.floor(d.x-r),x1:Math.ceil(d.x+r),y0:Math.floor(d.y-r),y1:Math.ceil(d.y+r)};
}

export function renderStrictGlobal(dabs){
  const pixels=new Map();
  for(const d of dabs){
    const b=dabBounds(d);
    for(let y=b.y0;y<b.y1;y++) for(let x=b.x0;x<b.x1;x++){
      const src=coverageStrict(d,x,y); if(!src) continue;
      const k=`${x},${y}`; pixels.set(k,srcOverQ16(pixels.get(k)??0,src));
    }
  }
  return pixels;
}

export function renderStrictTiled(dabs,{reverseTiles=false}={}){
  const bins=new Map();
  for(const d of dabs){
    const b=dabBounds(d);
    const tx0=Math.floor(b.x0/TILE_SIZE),tx1=Math.floor((b.x1-1)/TILE_SIZE);
    const ty0=Math.floor(b.y0/TILE_SIZE),ty1=Math.floor((b.y1-1)/TILE_SIZE);
    for(let ty=ty0;ty<=ty1;ty++) for(let tx=tx0;tx<=tx1;tx++){
      const k=`${tx},${ty}`; let arr=bins.get(k); if(!arr){arr=[];bins.set(k,arr);} arr.push(d);
    }
  }
  const entries=[...bins.entries()]; if(reverseTiles) entries.reverse();
  const pixels=new Map();
  for(const [tk,arr] of entries){
    const [tx,ty]=tk.split(',').map(Number),minX=tx*TILE_SIZE,maxX=minX+TILE_SIZE,minY=ty*TILE_SIZE,maxY=minY+TILE_SIZE;
    for(const d of arr){
      const b=dabBounds(d);
      for(let y=Math.max(b.y0,minY);y<Math.min(b.y1,maxY);y++) for(let x=Math.max(b.x0,minX);x<Math.min(b.x1,maxX);x++){
        const src=coverageStrict(d,x,y); if(!src) continue;
        const k=`${x},${y}`; pixels.set(k,srcOverQ16(pixels.get(k)??0,src));
      }
    }
  }
  return pixels;
}

export function renderPreviewF32(dabs){
  const p=new Map();
  for(const d of dabs){
    const b=dabBounds(d);
    const radius=Math.fround(1.6+Math.fround(d.pressure*2.6));
    for(let y=b.y0;y<b.y1;y++) for(let x=b.x0;x<b.x1;x++){
      const dx=Math.fround(Math.fround(x+0.5)-Math.fround(d.x));
      const dy=Math.fround(Math.fround(y+0.5)-Math.fround(d.y));
      const dist=Math.fround(Math.hypot(dx,dy));
      const c=Math.fround(Math.max(0,Math.min(1,Math.fround(Math.fround(radius+0.5)-dist))));
      if(c===0) continue;
      const src=Math.fround(c*Math.fround(0.18+Math.fround(0.52*d.pressure)));
      const k=`${x},${y}`,dst=p.get(k)??0;
      p.set(k,Math.fround(src+Math.fround(dst*Math.fround(1-src))));
    }
  }
  return p;
}

export function compareStrict(a,b){
  const keys=new Set([...a.keys(),...b.keys()]);
  let mismatches=0,maxDelta=0;
  for(const k of keys){const d=Math.abs((a.get(k)??0)-(b.get(k)??0));if(d){mismatches++;maxDelta=Math.max(maxDelta,d);}}
  return {mismatches,maxDelta,pixels:keys.size};
}

export function previewError(strict,preview){
  const keys=new Set([...strict.keys(),...preview.keys()]);
  let max=0,sum=0;
  for(const k of keys){const a=(strict.get(k)??0)/65535,b=preview.get(k)??0,d=Math.abs(a-b);max=Math.max(max,d);sum+=d*d;}
  return {max,rmse:Math.sqrt(sum/Math.max(1,keys.size)),pixels:keys.size};
}

export function zoomNormalize(samples,zoom){
  return samples.map(s=>({...s,x:(s.x*zoom)/zoom,y:(s.y*zoom)/zoom}));
}

export function generateExposureDabs(reconstructed,{intervalMs=16.6666666667}={}){
  if(reconstructed.length===0)return [];
  const start=reconstructed[0].t,end=reconstructed.at(-1).t,out=[];
  let j=0;
  for(let t=start,index=0;t<=end+1e-9;t+=intervalMs,index++){
    while(j+1<reconstructed.length&&reconstructed[j+1].t<t)j++;
    const a=reconstructed[j],b=reconstructed[Math.min(j+1,reconstructed.length-1)];
    const span=Math.max(1e-9,b.t-a.t),u=Math.max(0,Math.min(1,(t-a.t)/span));
    out.push({index,t:Math.round(t*1000)/1000,x:quantizePosition(a.x+(b.x-a.x)*u),y:quantizePosition(a.y+(b.y-a.y)*u),pressure:a.pressure+(b.pressure-a.pressure)*u});
  }
  return out;
}

export function makeSemanticStrokeRecord(actualSamples,profile,{seedLo=0x12345678,seedHi=0x9abcdef0,spacing=1.75,sourceSnapshotRef=null,selectionSnapshotRef=null,mixingState=null}={}){
  const reconstructed=reconstruct(actualSamples,profile).map(s=>({
    x:quantizePosition(s.x),y:quantizePosition(s.y),t:Math.round(s.t*1000)/1000,
    pressure:Math.round(Math.max(0,Math.min(1,s.pressure))*65535)/65535,
    tilt:s.tilt,azimuth:s.azimuth
  }));
  return {schemaVersion:1,reconstructionProfile:{...profile},seedLo:seedLo>>>0,seedHi:seedHi>>>0,spacing,sourceSnapshotRef,selectionSnapshotRef,mixingState,reconstructed};
}

export function dabsFromSemanticRecord(record){
  return generateDabs(record.reconstructed,{spacing:record.spacing,seedLo:record.seedLo,seedHi:record.seedHi});
}

export function processWithPrediction(actualSamples,predictedSamples,profile){
  const canonical=makeSemanticStrokeRecord(actualSamples,profile);
  const previewInput=actualSamples.concat(predictedSamples??[]);
  const preview=generateDabs(reconstruct(previewInput,profile),{spacing:canonical.spacing,seedLo:canonical.seedLo,seedHi:canonical.seedHi});
  return {canonical,canonicalDabs:dabsFromSemanticRecord(canonical),previewDabs:preview};
}

export function randomOrderInvariant(count=4096){
  const normal=[]; for(let i=0;i<count;i++) normal.push([i,uniform01(0x12345678,0x9abcdef0,i,7)]);
  const reversed=[]; for(let i=count-1;i>=0;i--) reversed.push([i,uniform01(0x12345678,0x9abcdef0,i,7)]);
  const map=new Map(reversed); return normal.every(([i,v])=>Object.is(v,map.get(i)));
}

export class StreamingStrokeRecorder {
  constructor({pageSamples=256,tailSamples=16,maxPendingPages=8}={}){
    this.pageSamples=pageSamples;this.tailSamples=tailSamples;this.maxPendingPages=maxPendingPages;
    this.tail=[];this.page=[];this.sealedPages=0;this.pendingPages=0;this.maxPendingObserved=0;this.releaseWork=0;this.accepted=0;this.admissionFailures=0;
  }
  accept(sample){
    this.accepted++;this.tail.push(sample);
    if(this.tail.length>this.tailSamples){this.page.push(this.tail.shift());}
    if(this.page.length>=this.pageSamples){
      if(this.pendingPages>=this.maxPendingPages){this.admissionFailures++;this.drainOne();}
      this.sealedPages++;this.pendingPages++;this.page=[];this.maxPendingObserved=Math.max(this.maxPendingObserved,this.pendingPages);
    }
  }
  drainOne(){if(this.pendingPages>0)this.pendingPages--;}
  release(){
    this.releaseWork=this.tail.length+this.page.length;
    if(this.page.length||this.tail.length){if(this.pendingPages>=this.maxPendingPages){this.admissionFailures++;this.drainOne();}this.sealedPages++;this.pendingPages++;this.maxPendingObserved=Math.max(this.maxPendingObserved,this.pendingPages);}
    this.page=[];this.tail=[];
  }
}

export function benchmarkHotPath(profile,{batches=200,batchSize=32}={}){
  const source=makeStroke('curve',batches*batchSize,{noise:0.3,seed:99,hz:240});
  const times=[];
  for(let i=0;i<batches;i++){
    const chunk=source.slice(i*batchSize,(i+1)*batchSize);
    const t0=performance.now(); const rec=reconstruct(chunk,profile); generateDabs(rec,{spacing:1.75}); times.push(performance.now()-t0);
  }
  times.sort((a,b)=>a-b);
  const pct=p=>times[Math.min(times.length-1,Math.floor((times.length-1)*p))];
  return {p50Ms:pct(.5),p95Ms:pct(.95),p99Ms:pct(.99),maxMs:times.at(-1),batchSize};
}

export function benchmarkReplayFragments(profile){
  const levels=[4,8,12,16,24,32,48];const rows=[];
  for(const fragments of levels){
    const dabs=[];
    for(let f=0;f<fragments;f++){
      const s=makeStroke('micro',24,{noise:0.1,seed:100+f,hz:120}).map(p=>({...p,x:p.x+((f%4)-2)*8,y:p.y+(Math.floor(f/4)%4)*8}));
      dabs.push(...generateDabs(reconstruct(s,profile),{spacing:2.5,seedLo:f+1,seedHi:0xabcddcba}));
    }
    for(let warm=0;warm<4;warm++)renderStrictGlobal(dabs);
    const times=[];
    for(let rep=0;rep<20;rep++){const t0=performance.now();renderStrictGlobal(dabs);times.push(performance.now()-t0);}
    times.sort((a,b)=>a-b);const pct=p=>times[Math.min(times.length-1,Math.floor((times.length-1)*p))];
    rows.push({fragments,p50Ms:pct(.5),p95Ms:pct(.95),p99Ms:pct(.99),maxMs:times.at(-1),dabCount:dabs.length});
  }
  return rows;
}
