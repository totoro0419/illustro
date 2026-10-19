// Matched CPU-only raster/upload proxies. No GPU, compositor or device claims.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
globalThis.ImageData??=class{constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4);}};
const root=path.resolve(process.env.M10_CPU_ROOT??'packages/brush-rt/dist'),out=process.env.M10_CPU_OUTPUT??'/tmp/m10-cpu.json';
const {StrokeOverlay}=await import(pathToFileURL(path.join(root,'rt/stroke-overlay.mjs')));
const {CanonicalBuilder,referenceBrushes}=await import(pathToFileURL(path.join(root,'rt/index.mjs')));
const stats=a=>{const b=[...a].sort((a,b)=>a-b);return {count:b.length,p50:b[Math.ceil(b.length*.5)-1]??null,p95:b[Math.ceil(b.length*.95)-1]??null,max:b.at(-1)??null};};
const report={baseline:'4708ffe5136ad1fa47be5909c129bb5f8fcb7869',scope:'Node 24 CPU raster and fake upload sink. Same 390x644 CSS, DPR3, inputs and presets. Not visible latency.',cases:[]};
for(const size of (process.env.M10_CPU_SIZES??'512,2000,3000,4000').split(',').map(Number))for(const zoom of (process.env.M10_CPU_ZOOMS??'fit,1,4,16,64').split(','))for(const brush of (process.env.M10_CPU_BRUSHES??'thin,normal,broad,pencil,marker').split(',')){
 const z=zoom==='fit'?360/size:Number(zoom),index=brush==='pencil'?4:brush==='marker'?3:0,preset=structuredClone(referenceBrushes[index]);preset.size={thin:1,normal:16,broad:256,pencil:32,marker:64}[brush];preset.forceFade.enabled=false;
 const builder=new CanonicalBuilder(preset);for(let i=0;i<9;i++)builder.accept({x:size/2+(-30+i*8)/z,y:size/2+Math.sin(i*.5)*10/z,t:100+i*8,pressure:.7,pointerType:'pen'});builder.finish();const record=builder.record(),times=[],pixels=[],slices=[],bytes=[];
 for(let round=0;round<Number(process.env.M10_CPU_ROUNDS??3);round++){
  const sink={pixels:0,configure(p,b){this.pixels=Math.ceil((b[2]-b[0])*p.scale)*Math.ceil((b[3]-b[1])*p.scale);return true;},draw(){},hide(){this.pixels=0;},destroy(){}};
  const p=new StrokeOverlay({canvas:{},surfaceStack:['a'],previews:new Map},{sink});p.setView(new Float64Array([1170,1932,390,644,size,size,z,0,0,0,1,1,0,0,0,0]));
  const state={id:1,preset:record.preset,surfaceKey:'a',stableSource:record.commands,stableEnd:record.commands.length,commands:[],inputTip:{t:performance.now()},finished:false};
  const at=performance.now();p.enqueue(state);while(p.pending.size)p.safeFlush();times.push(performance.now()-at);pixels.push(p.metrics.rasterPixels);slices.push(p.metrics.maxSliceMs??p.metrics.maxCpuMs);bytes.push(p.summary().bytes);p.destroy();
 }
 report.cases.push({size,zoom,brush,commands:record.commands.length,cpuMs:stats(times),maxSliceMs:stats(slices),rasterPixels:Math.max(...pixels),peakBytes:Math.max(...bytes)});
}
await fs.writeFile(out,JSON.stringify(report,null,2));
console.log(JSON.stringify({output:out,cases:report.cases.length,highZoom:report.cases.filter(c=>c.size===4000&&c.zoom==='64')}));
