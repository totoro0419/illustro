/** Reproducible input / next-rAF proxies; never physical stylus/scanout timings. */
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
const roots=JSON.parse(process.env.ILLUSTRO_BENCH_ROOTS||JSON.stringify({after:resolve('.')}));
const server=createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://local'),parts=u.pathname.split('/').filter(Boolean),name=parts.shift(),root=roots[name];
 if(!root)throw Error('root');const file=resolve(root,parts.join('/')||'index.html');if(!file.startsWith(resolve(root)+sep))throw Error('path');
 const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'};
 res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404).end()}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:[...(process.env.ILLUSTRO_DISABLE_2D?['--disable-accelerated-2d-canvas']:[]),'--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={recordedAt:new Date().toISOString(),inputPath:'Same normalized document-space centreline; preset algorithms and UI viewport sizes differ. Coalesced subpixel offsets are CSS-space.',runOptions:{styleAblation:process.env.ILLUSTRO_BENCH_STYLE||null,disableAccelerated2D:!!process.env.ILLUSTRO_DISABLE_2D},scope:'Chromium synthetic pen/touch, same host; next rAF and Canvas submission proxies, no physical scanout. Legacy WebGL2 is software SwiftShader; Canvas2D is a different algorithm.',browser:browser.version(),unmeasured:['physical input/scanout','GC pause duration','whole-process memory','GPU execution time'],cases:[]};
const scenarios=JSON.parse(process.env.ILLUSTRO_BENCH_CASES||JSON.stringify([
 {name:'thin',size:10,brush:'gpen',width:640,height:480,strokes:10},
 {name:'pencil',size:32,brush:'pencil',width:1600,height:1200,strokes:10},
 {name:'broad',size:300,brush:'gpen',width:2560,height:1920,strokes:10},
 {name:'marker',size:200,brush:'marker',width:1600,height:1200,strokes:10},
 {name:'texture',size:300,brush:'pencil',width:2560,height:1920,strokes:10},
 {name:'fifty',size:78,brush:'gpen',width:1600,height:1200,strokes:50},
 {name:'hundred',size:12,brush:'gpen',width:640,height:480,strokes:100}
]));
try{for(const [version] of Object.entries(roots))for(const scenario of scenarios){
 const legacy=version==='legacy',page=await browser.newPage({viewport:{width:1100,height:820}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.exposeFunction('__benchProgress',data=>console.log(JSON.stringify({version,name:scenario.name,progress:data})));
 await page.goto(`http://127.0.0.1:${server.address().port}/${version}/?m09=1&perf=1&backend=webgl2&presentation=${process.env.ILLUSTRO_PRESENTATION||'auto'}`);
 if(legacy){
  await page.waitForFunction(()=>!!window.__illustroPerformance);
  await page.evaluate(s=>{document.getElementById('newCanvasWidth').value=s.width;document.getElementById('newCanvasHeight').value=s.height;document.getElementById('new').click()},scenario);
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('描画できます'),null,{timeout:90000});
 }else{
  await page.waitForFunction(()=>document.getElementById('art')?.width===1600);
  await page.evaluate(s=>{document.querySelector('[data-action=new]').click();for(const [id,v]of [['new-width',s.width],['new-height',s.height]])document.getElementById(id).value=v;document.getElementById('new-dialog').requestSubmit()},scenario);
 }
 if(version==='after'&&!process.env.ILLUSTRO_COLD_INPUT)await page.waitForFunction(()=>document.getElementById('stage').dataset.presentationReady==='true',null,{timeout:30000});
 if(process.env.ILLUSTRO_BENCH_STYLE)await page.addStyleTag({content:process.env.ILLUSTRO_BENCH_STYLE});
 let traceClient;
 if(process.env.ILLUSTRO_TRACE){traceClient=await page.context().newCDPSession(page);await traceClient.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,v8',transferMode:'ReturnAsStream'})}
 let result;try{const evaluation=page.evaluate(async({scenario:s,legacy})=>{
  const sleep=ms=>new Promise(ok=>setTimeout(ok,ms)),stats=a=>{const b=[...a].sort((a,b)=>a-b);return {n:b.length,p50:b[Math.ceil(b.length*.5)-1]??null,p95:b[Math.ceil(b.length*.95)-1]??null,p99:b[Math.ceil(b.length*.99)-1]??null,max:b.at(-1)??null}};
  const viewSamples=[],handlers=[],frames=[],frameDelivery=[],viewLatency=[],formalLatency=[],firstPreview=[],longTasks=[];let running=true,last=0,lastDelivery=0,maxPending=0;
  new PerformanceObserver(list=>{for(const e of list.getEntries())longTasks.push(e.duration)}).observe({type:'longtask',buffered:false});
  const frame=t=>{const now=performance.now();if(last)frames.push(t-last);if(lastDelivery)frameDelivery.push(now-lastDelivery);last=t;lastDelivery=now;if(running)requestAnimationFrame(frame)};requestAnimationFrame(frame);
  const target=document.getElementById(legacy?'canvas':'stage'),r=target.getBoundingClientRect();
  Element.prototype.setPointerCapture=()=>{};Element.prototype.hasPointerCapture=()=>false;
  const size=document.getElementById(legacy?'size':'size-n');size.value=s.size;size.dispatchEvent(new Event(legacy?'input':'change',{bubbles:true}));
  if(!legacy)document.querySelector('[data-tool='+s.brush+']')?.click();
  else {
   const probe=window.__illustroPerformance.probe();
   // Set legacy preset through its actual UI where available, record selected label.
   const select=document.querySelector('#brush');if(select){const match=[...select.options].find(o=>s.brush==='pencil'?/鉛筆/.test(o.text):s.brush==='marker'?/マーカー/.test(o.text):/Gペン/.test(o.text));if(match){select.value=match.value;select.dispatchEvent(new Event('change',{bubbles:true}))}}
  }
  size.value=s.size;size.dispatchEvent(new Event(legacy?'input':'change',{bubbles:true}));
  if(!legacy&&s.correction){const c=document.querySelector('#brush-correction select');c.value=s.correction;c.dispatchEvent(new Event('change'))}
  const emit=(type,kind,id,x,y,n=1)=>{
   const opt={bubbles:true,pointerId:id,pointerType:kind,button:0,buttons:type==='pointerup'?0:1,pressure:type==='pointerup'?0:.7,clientX:r.x+x,clientY:r.y+y,width:1,height:1};
   const e=new PointerEvent(type,opt);if(n>1)e.getCoalescedEvents=()=>Array.from({length:n},(_,j)=>new PointerEvent(type,{...opt,clientX:opt.clientX+j*.01,clientY:opt.clientY+j*.01}));
   const at=performance.now();target.dispatchEvent(e);handlers.push(performance.now()-at);
  };
  const pending=()=>legacy?((window.__illustroPerformance.read().handoff.pendingLogical||0)+(window.__illustroPerformance.read().handoff.pendingGpu||0)):Number(target.dataset.rasterPending||0);
  const wait=async()=>{const start=performance.now();while(pending()){if(performance.now()-start>120000)throw Error('pending timeout');await sleep(10)}};
  await sleep(80);
  const readyAtMs=performance.now();
  const heapBefore=performance.memory?.usedJSHeapSize??null;
  for(let stroke=0;stroke<s.strokes;stroke++){
   if(stroke&&stroke%10===0)await window.__benchProgress({strokes:stroke,pending:pending()});
   if(s.zoom){if(legacy){const v=window.__illustroPerformance.probe().renderer.backend.viewTransform;window.__illustroPerformance.view(v[6]*s.zoom,0)}else{const input=document.getElementById('zoom-n');input.value=Number(input.value)*s.zoom;input.dispatchEvent(new Event('change'))}await new Promise(ok=>requestAnimationFrame(ok));}
   const x=s.width*.25,y=s.height*.45+stroke%7*3;
   const pen=(type,dx,dy,n=1)=>{
    let point;
    if(legacy){const v=window.__illustroPerformance.probe().renderer.backend.viewTransform,c=Math.cos(v[7]),si=Math.sin(v[7]),px=(dx-v[4]/2)*v[10],py=(dy-v[5]/2)*v[11];point={x:v[2]/2+v[8]+v[6]*(px*c-py*si),y:v[3]/2+v[9]+v[6]*(px*si+py*c)}}
    else {const scene=document.getElementById('retained-scene'),sm=scene?new DOMMatrix(scene.style.transform):new DOMMatrix(),pm=new DOMMatrix(document.getElementById('paper').style.transform);point=new DOMPoint(dx,dy).matrixTransform(sm.multiply(pm))}
    emit(type,'pen',11,point.x,point.y,n);
   };
   const start=performance.now();pen('pointerdown',x,y);
   // 24 move events at 4 ms, four coalesced samples per event, sustained burst.
   for(let i=1;i<=24;i++){
    pen('pointermove',x+i*s.width*.015,y+Math.sin(i/3)*s.height*.06,s.samples||4);
    if(s.simultaneous&&i===4){emit('pointerdown','touch',21,r.width*.6,r.height*.7);emit('pointerdown','touch',22,r.width*.7,r.height*.7)}
    if(s.simultaneous&&i>=4&&i<20){const at=performance.now();emit('pointermove','touch',21,r.width*.6+i*2,r.height*.7+i*1);emit('pointermove','touch',22,r.width*.7+i*3,r.height*.7-i*1.5);await new Promise(ok=>requestAnimationFrame(()=>{viewLatency.push(performance.now()-at);viewSamples.push({stroke,step:i,ms:performance.now()-at});ok()}))}
    else await sleep(4);
    if(i===6)firstPreview.push(performance.now()-start); // observation checkpoint, actual first pixel below unmeasured
   }
   pen('pointerup',x+24*s.width*.015,y+Math.sin(8)*s.height*.06);
   maxPending=Math.max(maxPending,pending());
   if(!s.simultaneous){
    emit('pointerdown','touch',21,r.width*.6,r.height*.7);emit('pointerdown','touch',22,r.width*.7,r.height*.7);
    for(let i=4;i<20;i++){const at=performance.now();emit('pointermove','touch',21,r.width*.6+i*2,r.height*.7+i*1);emit('pointermove','touch',22,r.width*.7+i*3,r.height*.7-i*1.5);await new Promise(ok=>requestAnimationFrame(()=>{viewLatency.push(performance.now()-at);viewSamples.push({stroke,step:i,ms:performance.now()-at});ok()}))}
   }
   emit('pointerup','touch',21,r.width*.6+20,r.height*.7+20);emit('pointerup','touch',22,r.width*.7+20,r.height*.7+20);
   maxPending=Math.max(maxPending,pending());
   // Continuous cases deliberately do not drain between strokes.
   if(s.strokes<=10){const at=performance.now();await wait();formalLatency.push(performance.now()-at)}
   else await sleep(4);
   document.querySelector(legacy?'#fit':'[data-action=fit]')?.click();await new Promise(ok=>requestAnimationFrame(ok));
  }
  const at=performance.now();await wait();const finalDrainMs=performance.now()-at;await sleep(100);running=false;
  return {measurementStartedAtMs:readyAtMs,presentationInitializationMs:Number(target.dataset.presentationInitMs)||null,viewport:{x:r.x,y:r.y,width:r.width,height:r.height},viewSamples,diagnostics:window.__c02Perf,handlerMs:stats(handlers),frameMs:stats(frames),frameDeliveryMs:stats(frameDelivery),viewNextRafMs:stats(viewLatency),postNavigationDrainMs:stats(formalLatency),finalDrainMs,maxPending,longTasks:{count:longTasks.length,total:longTasks.reduce((a,b)=>a+b,0),max:Math.max(0,...longTasks)},heapBefore,heapAfter:performance.memory?.usedJSHeapSize??null,viewMatrix:document.getElementById('paper')?.style.transform,worker:legacy?window.__illustroPerformance.read():JSON.parse(target.dataset.rasterStats||'null'),previewStartMs:null,endPending:pending(),selectedBrush:document.querySelector('#brush')?.selectedOptions?.[0]?.textContent||s.brush};
 },{scenario,legacy});
 const timeoutMs=Number(process.env.ILLUSTRO_CASE_TIMEOUT||150000);let caseTimer;try{result=await Promise.race([evaluation,new Promise((_,reject)=>{caseTimer=setTimeout(()=>reject(Error('Case exceeded '+timeoutMs+' ms')),timeoutMs)})])}finally{clearTimeout(caseTimer)}}catch(error){report.cases.push({version,scenario,error:String(error),errors});console.log(JSON.stringify({version,name:scenario.name,error:String(error),errors}));await page.close();continue}
 if(traceClient){const complete=new Promise(ok=>traceClient.once('Tracing.tracingComplete',ok));await traceClient.send('Tracing.end');const {stream}=await complete;let trace='';for(;;){const data=await traceClient.send('IO.read',{handle:stream});trace+=data.data;if(data.eof)break}await traceClient.send('IO.close',{handle:stream});await writeFile(process.env.ILLUSTRO_TRACE,trace)}
 if(legacy&&result.worker.strokes!==scenario.strokes)errors.push('Legacy did not commit every requested stroke: '+result.worker.strokes);
 report.cases.push({version,scenario,...result,errors});console.log(JSON.stringify({version,name:scenario.name,handler:result.handlerMs,frame:result.frameMs,view:result.viewNextRafMs,longTasks:result.longTasks,errors}));await page.close();
}}finally{await browser.close();server.close();const out=process.env.ILLUSTRO_BENCH_OUT||'test/performance-results.json';await mkdir(resolve(out,'..'),{recursive:true});report.executionPassed=report.cases.every(c=>!c.error&&!c.errors.length);report.performanceGate='UNDECIDED: execution success is not legacy non-inferiority; compare p95/p99/max and verify real devices';await writeFile(out,JSON.stringify(report,null,2));if(!report.executionPassed)process.exitCode=1}
