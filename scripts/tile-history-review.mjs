import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const roots={before:path.resolve(process.env.HISTORY_BEFORE??'/tmp/illustro-history-before'),after:path.resolve('apps/editor/dist')};
const out=process.env.HISTORY_OUTPUT??'/tmp/tile-history/report.json';
await fs.mkdir(path.dirname(out),{recursive:true});
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),parts=url.pathname.split('/'),mode=parts[1],root=roots[mode];if(!root)return res.writeHead(404).end();const file=path.resolve(root,'.'+('/'+parts.slice(2).join('/')||'/'));if(!file.startsWith(root))return res.writeHead(403).end();const name=url.pathname.endsWith('/')?path.join(file,'index.html'):file;res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':name.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(name));}catch{res.writeHead(404).end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,...(process.env.HANDOFF_CHROMIUM?{executablePath:process.env.HANDOFF_CHROMIUM}:{}),args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report={sourceCommit:process.env.EXPECTED_COMMIT_SHA??'working-tree',baselineCommit:'24993dff35835ec4bd6da12763b0fa328e20b5ca',scope:'Chromium software GPU. Click handler, logical completion and GPU presentation proxies. No physical Android/input-to-photon or RSS/VRAM claim.',cases:[],errors:[]};
const sizes=process.env.HISTORY_QUICK?[512]:[512,2000,4000],backends=(process.env.HISTORY_BACKENDS??'webgl2,webgpu').split(',');
const save=()=>fs.writeFile(out,JSON.stringify(report,null,2));
try{for(const backend of backends)for(const size of sizes){
 const pair={backend,width:size,height:size===512?384:size,builds:{}};
 for(const mode of ['before','after']){
  const context=await browser.newContext({viewport:{width:1000,height:800},hasTouch:true});
  await context.addInitScript(()=>Object.defineProperty(navigator,'deviceMemory',{value:4}));
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push({mode,backend,size,message:error.message}));
  const origin=process.env.HISTORY_PUBLIC_ORIGIN??'http://127.0.0.1:'+server.address().port;
  await page.goto(origin+'/'+mode+'/?m09=1&perf=1&backend='+backend);
  await page.evaluate(([w,h])=>{document.getElementById('newCanvasWidth').value=String(w);document.getElementById('newCanvasHeight').value=String(h);},[pair.width,pair.height]);
  await page.evaluate(()=>document.getElementById('new').click());await page.waitForFunction(()=>document.getElementById('status').textContent.includes('描画できます'),null,{timeout:90000});
  await page.evaluate(()=>document.getElementById('addLayer').click());
  await page.evaluate(async()=>{
   const port=window.__illustroPerformance,{renderer:r}=port.probe(),b=r.backend;
   window.__hist={longTasks:[],beats:[],frames:[],draws:[]};const original=r.onPresentation;r.onPresentation=sample=>{window.__hist.frames.push({at:performance.now(),kind:sample.kind,held:b.presentationHeld});original?.(sample);};
   new PerformanceObserver(list=>{window.__hist.longTasks.push(...list.getEntries().map(e=>({at:e.startTime,ms:e.duration})));}).observe({type:'longtask',buffered:false});
   setInterval(()=>window.__hist.beats.push(performance.now()),4);
   window.__idle=async()=>{const at=performance.now();for(;;){const m=port.read();if(!m.historyNavigation.pending&&!m.handoff.pendingLogical&&!m.handoff.pendingGpu&&!m.frameState.jobs&&!m.frameState.inflight&&!m.frameState.needsFrame)break;if(m.frameState.errors.length||performance.now()-at>60000)throw Error('idle timeout '+JSON.stringify({frame:m.frameState,history:m.tileHistory,handoff:m.handoff}));await new Promise(ok=>setTimeout(ok,5));}};
   window.__hash=async()=>{
    await window.__idle();const result={};
    for(const t of b.tiles.values()){
     let bytes;if(b.gl){const g=b.gl;bytes=new Uint8Array(65536);g.bindFramebuffer(g.FRAMEBUFFER,t.layer[t.l].f);g.readPixels(0,0,128,128,g.RGBA,g.UNSIGNED_BYTE,bytes);}else{const d=b.device,buffer=d.createBuffer({size:65536,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{const e=d.createCommandEncoder();e.copyTextureToBuffer({texture:t.layer[t.l]},{buffer,bytesPerRow:512},[128,128]);d.queue.submit([e.finish()]);await buffer.mapAsync(GPUMapMode.READ);bytes=new Uint8Array(buffer.getMappedRange()).slice();}finally{buffer.destroy();}}
     if(bytes.some(x=>x))result[t.surfaceKey+'\0'+t.key]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).join(',');
    }
    // Layer IDs are session-specific; compare ordered layers and tile coordinates.
    const {controller:c}=port.probe();return c.layers.map(layer=>Object.fromEntries(Object.entries(result).filter(([q])=>q.startsWith(layer.surface.descriptor.surfaceId+'\0')).map(([q,v])=>[q.split('\0')[1],v]).sort(([a],[b])=>a.localeCompare(b))));
   };
   window.__draw=async i=>{
    const {controller:c}=port.probe();c.selectLayer(c.layers[i%2].id);
    const brush=document.getElementById('brush');brush.value=i%7===6?'foundation-hard-eraser':i%8===5?'foundation-marker':'foundation-g-pen';brush.dispatchEvent(new Event('change'));
    const input=document.getElementById('size');input.value=i%8===5?'128':i%7===6?'96':'8';input.dispatchEvent(new Event('input'));
    const canvas=document.getElementById('canvas'),box=canvas.getBoundingClientRect(),v=b.viewTransform,cs=Math.cos(v[7]),sn=Math.sin(v[7]);canvas.setPointerCapture=()=>{};
    const at=performance.now(),emit=(type,x,y,j)=>{const dx=(x-v[4]/2)*v[10],dy=(y-v[5]/2)*v[11],event=new PointerEvent(type,{bubbles:true,pointerId:11,pointerType:'pen',button:0,buttons:type==='pointerup'?0:1,pressure:type==='pointerup'?0:.65,clientX:box.x+v[2]/2+v[8]+v[6]*(dx*cs-dy*sn),clientY:box.y+v[3]/2+v[9]+v[6]*(dx*sn+dy*cs)});Object.defineProperty(event,'timeStamp',{value:1000+i*2000+j*20});canvas.dispatchEvent(event);};
    const steps=i%4===0?40:12,w=v[4],h=v[5];for(let j=0;j<=steps;j++){const t=j/steps;emit(j?'pointermove':'pointerdown',w*(.15+.7*t),h*(.3+(i%6)*.06)+Math.sin(t*Math.PI*2)*h*.025,j);}emit('pointerup',w*.85,h*(.3+(i%6)*.06),steps+1);
    const inputMs=performance.now()-at;await window.__idle();window.__hist.draws.push({inputMs,completionMs:performance.now()-at});
   };
   // Same constrained GPU capacity for both builds. New lower tiers stay bounded.
   b.historyBudget=2*1024*1024;if(b.imageHistory)b.imageHistory.gpuBudget=b.historyBudget;
  });
  await page.evaluate(()=>window.__idle());const empty=await page.evaluate(()=>window.__hash());
  const expected={0:empty};for(let i=0;i<24;i++){await page.evaluate(i=>window.__draw(i),i);if([3,22,23].includes(i))expected[i+1]=await page.evaluate(()=>window.__hash());}
  const final=await page.evaluate(()=>window.__hash()),phases=[];
  const phase=async(name,directions,target)=>{
   const value=await page.evaluate(async({directions,name})=>{
    const p=window.__illustroPerformance,m=window.__hist,start=performance.now(),before=p.read(),beatStart=m.beats.length,taskStart=m.longTasks.length;let receiptMs=0;
    for(const direction of directions){const at=performance.now();document.getElementById(direction).click();receiptMs=Math.max(receiptMs,performance.now()-at);}
    await window.__idle();const end=performance.now();await new Promise(ok=>setTimeout(ok,10));const after=p.read(),beats=[start,...m.beats.slice(beatStart).filter(t=>t<=end),end];
    return {name,commands:directions.length,receiptMaxMs:receiptMs,completeMs:end-start,heartbeatMaxGapMs:Math.max(...beats.slice(1).map((t,i)=>t-beats[i])),longTasks:m.longTasks.slice(taskStart).filter(e=>e.at>=start&&e.at<end),accepted:after.historyNavigation.accepted-before.historyNavigation.accepted,fallbacks:after.strokeReplayFallbacks-before.strokeReplayFallbacks,after};
   },{directions,name});
   assert.equal(value.accepted,directions.length,name+' accepted');assert.equal(value.after.strokes,target,name+' exact count');assert.equal(value.after.historyNavigation.fault,null);assert.deepEqual(await page.evaluate(()=>window.__hash()),expected[target]??final,name+' exact layer pixels');phases.push(value);console.log('TILE_HISTORY '+JSON.stringify({mode,backend,size,name,ms:value.completeMs,gap:value.heartbeatMaxGapMs,fallbacks:value.fallbacks}));
  };
  await phase('single-undo',['undo'],23);await phase('single-redo',['redo'],24);
  await phase('burst-20-undo',Array(20).fill('undo'),4);await phase('burst-20-redo',Array(20).fill('redo'),24);
  await phase('alternating-24',Array.from({length:24},(_,i)=>i%2?'redo':'undo'),24);
  if(mode==='after'){
   // Evict every GPU image while retaining compressed memory and then OPFS.
   await page.evaluate(async()=>{const h=window.__illustroPerformance.probe().renderer.backend.imageHistory;h.gpuBudget=0;h.schedule();await h.maintenance;});
   await phase('cold-image-undo',['undo'],23);await phase('cold-image-redo',['redo'],24);
   assert.equal(phases.at(-1).after.tileHistory.gpuBytes,0);assert.equal(phases.at(-1).fallbacks,0);
   await page.evaluate(async()=>{await window.__illustroPerformance.probe().renderer.backend.imageHistory.archive.call('flush');});
   await phase('disk-image-undo',['undo'],23);await phase('disk-image-redo',['redo'],24);
   assert.ok(phases.at(-1).after.tileHistory.archive.diskHits>0,'OPFS/IDB reads exercised');assert.equal(phases.at(-1).fallbacks,0);
   if(size===512){
    const oldScene=await page.evaluate(async()=>{const b=window.__illustroPerformance.probe().renderer.backend;return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await b.readViewport()))).join(',');});
    await page.evaluate(()=>{const a=window.__illustroPerformance.probe().renderer.backend.imageHistory.archive,original=a.getMany.bind(a);a.getMany=async ids=>{if(ids.length){a.getMany=original;await new Promise(resolve=>window.__releaseTileRead=resolve);}return original(ids);};document.getElementById('undo').click();});
    await page.waitForFunction(()=>typeof window.__releaseTileRead==='function');
    await page.evaluate(()=>window.__illustroPerformance.view(31,27));
    await page.waitForFunction(()=>!window.__illustroPerformance.read().frameState.viewPending);
    assert.equal(await page.evaluate(async()=>{const b=window.__illustroPerformance.probe().renderer.backend;return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await b.readViewport()))).join(',');}),oldScene,'old coherent composite remains available during cold I/O');
    await page.evaluate(()=>window.__releaseTileRead());await page.evaluate(()=>window.__idle());assert.deepEqual(await page.evaluate(()=>window.__hash()),expected[23]);
    await phase('navigation-redo',['redo'],24);
    await page.evaluate(()=>{const a=window.__illustroPerformance.probe().renderer.backend.imageHistory.archive,original=a.getMany.bind(a);a.getMany=async ids=>{if(ids.length){a.getMany=original;return ids.map(()=>({missing:true}));}return original(ids);};});
    await phase('archive-failure-undo',['undo'],23);assert.equal(phases.at(-1).fallbacks,1);await phase('archive-failure-redo',['redo'],24);
   }
  }
  // Undo while moving/rotating the canvas. Verify pixels and overlay retirement.
  await page.evaluate(()=>{document.getElementById('undo').click();window.__illustroPerformance.view(31,27);});await page.evaluate(()=>window.__idle());assert.deepEqual(await page.evaluate(()=>window.__hash()),expected[23]);
  if(mode==='after')await page.evaluate(async()=>{
   const {renderer:r}=window.__illustroPerformance.probe(),b=r.backend;
   const capture=async()=>{const bitmap=await createImageBitmap(b.canvas),canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',ctx.getImageData(0,0,canvas.width,canvas.height).data))).join(',');};
   const before=await capture();b.viewportCache.clear();await b.presentCurrent();const after=await capture();if(before!==after)throw Error('Stale transformed history screen: forced repaint differs');
  });
  await page.evaluate(()=>window.__draw(24));await page.evaluate(()=>window.__idle());assert.equal(await page.evaluate(()=>window.__illustroPerformance.probe().controller.canRedo),false);
  const metrics=await page.evaluate(()=>window.__illustroPerformance.read());assert.deepEqual(metrics.frameState.errors,[]);assert.deepEqual(metrics.frameState.sessionErrors,[]);assert.equal(metrics.historyNavigation.refused,0);
  if(mode==='after'){assert.equal(metrics.instantPreview.pendingStrokes,0);assert.equal(metrics.instantPreview.pendingFinalizations,0);}
  await page.screenshot({path:path.join(path.dirname(out),`${mode}-${backend}-${size}.png`)});
  pair.builds[mode]={phases,final,draws:await page.evaluate(()=>window.__hist.draws),metrics};await context.close();
 }
 assert.deepEqual(pair.builds.after.final,pair.builds.before.final,'immutable baseline exact pixels '+backend+' '+size);
 report.cases.push(pair);await save();
}}finally{await save();await browser.close();server.close();}
assert.deepEqual(report.errors,[]);assert.equal(report.cases.length,backends.length*sizes.length);
