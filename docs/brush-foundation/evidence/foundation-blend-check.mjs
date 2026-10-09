import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'../../..'),pw=createRequire(import.meta.url)(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const html=await fs.readFile(path.join(root,'prototypes/brush-rt/dist/illustro-brush-rt.html'));
const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(html);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await pw.chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface']});
const report={source:process.env.SOURCE_REF??'UNSPECIFIED (set SOURCE_REF when running)',environment:'software GPU; physical display unverified',backends:[]};
try{for(const backend of ['webgl2','webgpu']){
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/?backend=${backend}&document=128`);await page.waitForFunction(()=>window.__rt);
 const checks=await page.evaluate(async()=>{
  const {createPreset}=await import('@rt/foundation'),{CanonicalBuilder,cpuReference,validateRecord}=await import('@rt/model'),{session,renderer}=window.__rt;session.prediction=false;
  const check=(pixels,ref)=>{let bad=0,max=0;for(let i=0;i<pixels.length;i+=4)for(let j=0;j<4;j++){const d=Math.abs(pixels[i+j]-(j<3?ref[i+j]*ref[i+3]/255:ref[i+3]));if(d>3)bad++;max=Math.max(max,d);}return {channelsOver3:bad,max};};
  const wait=async()=>{const revision=renderer.mailbox.revision,deadline=performance.now()+30000;while(!renderer.completions.some(m=>m.revision>=revision)){if(performance.now()>deadline)throw Error('blend completion timeout');await new Promise(r=>requestAnimationFrame(r));}};
  const results=[];
  for(const rendererKind of ['auto','stamp','sweep'])for(const paint of (rendererKind==='stamp'?['saturated','build-up']:['saturated']))for(const blend of ['normal','erase','multiply','screen']){
   renderer.confirmDelay=0;session.records=[];await session.rebuild();
   const under=createPreset('under','under',{size:72,opacity:.55,color:[.1,.4,.8]});session.begin(under);session.accept({x:50,y:48,t:performance.now(),pointerType:'mouse'});await session.end();await renderer.drain();const base=await renderer.read();
   const p=createPreset('blend-contract','blend',{renderer:rendererKind,paint,blend,size:24,opacity:.6,flow:rendererKind==='auto'?1:.4,color:[.8,.2,.1],stabilization:{constant:0},tip:rendererKind==='stamp'?{shape:'ellipse',aspect:.6,hardness:.4}:rendererKind==='sweep'?{hardness:.4}:{},texture:rendererKind==='auto'?{}:{paper:{strength:.4,scale:2}}});
   renderer.confirmDelay=Infinity;session.begin(p);const t=performance.now();for(let i=0;i<16;i++)session.accept({x:25+i*4,y:48+Math.sin(i/3)*8,t:t+i*5,pointerType:'mouse'});
   const b=new CanonicalBuilder(p,session.active.seed);session.active.raw.forEach(s=>b.accept(s));b.finish();const ref=cpuReference(b.record(),128,96,base);
   await wait();const active=check(await renderer.backend.readViewport(),ref);await session.end();await wait();const lifted=check(await renderer.backend.readViewport(),ref);renderer.confirmDelay=0;await renderer.drain();const confirmed=check(await renderer.backend.readViewport(),ref);
   const saved=JSON.stringify(session.export());await session.load(JSON.parse(saved));const loaded=check(await renderer.backend.readViewport(),ref),exact=JSON.stringify(session.export())===saved;validateRecord(session.records.at(-1));
   results.push({renderer:rendererKind,paint,blend,active,lifted,confirmed,loaded,exact});
  }return results;
 });
 assert.ok(checks.every(c=>c.exact&&[c.active,c.lifted,c.confirmed,c.loaded].every(v=>!v.channelsOver3)),JSON.stringify(checks.filter(c=>[c.active,c.lifted,c.confirmed,c.loaded].some(v=>v.channelsOver3))));assert.deepEqual(errors,[]);report.backends.push({backend,status:'PASS',checks,consoleErrors:errors});await page.close();
}}finally{await browser.close();server.close();await fs.writeFile(path.join(import.meta.dirname,'foundation-blend-results.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report.backends.map(b=>({backend:b.backend,status:b.status,checks:b.checks.length}))));
