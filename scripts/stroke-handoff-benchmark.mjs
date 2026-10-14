import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const root=path.resolve(process.env.HANDOFF_APP_ROOT??'apps/editor/dist'),out=process.env.HANDOFF_OUTPUT??'/tmp/handoff-evidence/before.json';
const server=http.createServer(async(req,res)=>{try{const p=path.resolve(root,'.'+(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!p.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream');res.end(await fs.readFile(p));}catch{res.writeHead(404).end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report={commit:process.env.EXPECTED_COMMIT_SHA,cases:[],errors:[],environment:'Chromium software GPU. Submission and completion proxies, not physical pen-to-photon or isolated GPU execution.'};
try{for(const backend of ['webgl2','webgpu'])for(const [width,height]of [[512,384],[2048,2048],[3000,3000]]){
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,hasTouch:true}),p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto('http://127.0.0.1:'+server.address().port+'/?m09=1&perf=1&backend='+backend);
 await p.evaluate(([w,h])=>{document.getElementById('newCanvasWidth').value=String(w);document.getElementById('newCanvasHeight').value=String(h);},[width,height]);await p.locator('#new').click();await p.waitForFunction(()=>document.getElementById('status').textContent.includes('描画できます'),null,{timeout:90000});
 const result=await p.evaluate(async()=>{
  const port=window.__illustroPerformance,{renderer:r,session:s,controller:c}=port.probe(),traces=[],attempts=[],endMap=new Map,downMap=new Map;let stageTrace=null;
  const now=()=>performance.now(),wrap=(obj,key,fn)=>{const original=obj[key];obj[key]=function(...args){return fn.call(this,original.bind(this),...args);};};
  wrap(s,'begin',(original,...args)=>{const at=now(),id=original(...args);downMap.set(id,at);return id;});
  wrap(s,'end',(original,...args)=>{const id=s.active?.id,at=now(),t={id,upAt:at,syncEndMs:0};traces.push(t);endMap.set(id,t);const promise=original(...args);t.syncEndMs=now()-at;return promise.then(record=>{t.recordAt=now();t.endToRecordMs=t.recordAt-at;return record;});});
  wrap(c.ports.document,'commitStroke',async(original,...args)=>{const t=traces.find(x=>!x.commitStart);stageTrace=t;if(t)t.commitStart=now();const value=await original(...args);if(t){t.commitMs=now()-t.commitStart;t.logicalAt=now();t.dirtyTiles=value.dirtyTileCount;}stageTrace=null;return value;});
  wrap(c.document,'begin',(original,...args)=>{if(stageTrace)stageTrace.dirtyCollectMs=now()-stageTrace.commitStart;const tx=original(...args);wrap(tx,'commit',(commit,...a)=>{const at=now(),v=commit(...a);if(stageTrace)stageTrace.transactionMs=now()-at;return v;});return tx;});
  const message=s.worker.onmessage;s.worker.onmessage=event=>{const at=now();message(event);const t=endMap.get(event.data.id);if(t&&event.data.type==='record')t.workerReceiveMs=now()-at;};
  wrap(r,'drain',async(original,...args)=>{const t=traces.find(x=>x.logicalAt&&!x.readyAt),at=now();await original(...args);if(t)t.drainMs=(t.drainMs??0)+now()-at;});
  wrap(r.backend,'render',(original,snapshot,jobs,states)=>{const at=now(),v=original(snapshot,jobs,states),id=snapshot?.id;if(downMap.has(id)){const t=endMap.get(id)??{};if(!t.firstSubmissionAt){t.firstSubmissionAt=at;t.inputToSubmissionMs=at-downMap.get(id);}if(!endMap.has(id))downMap.set('submission:'+id,t);}return v;});
  const sleep=ms=>new Promise(ok=>setTimeout(ok,ms)),canvas=document.getElementById('canvas'),rect=canvas.getBoundingClientRect(),emit=(type,x,y)=>canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:11,pointerType:'pen',button:0,buttons:type==='pointerup'?0:1,pressure:type==='pointerup'?0:.7,clientX:rect.x+x,clientY:rect.y+y}));
  async function stroke(index,wait){const initial=s.id,at=now();emit('pointerdown',rect.width*.5-40,rect.height*.5+(index%8)*3);const accepted=s.id>initial;attempts.push({at,accepted,busy:port.read().frameState.finishing});if(accepted){for(let i=1;i<=12;i++)emit('pointermove',rect.width*.5-40+i*6,rect.height*.5+(index%8)*3+Math.sin(i)*3);emit('pointerup',rect.width*.5+32,rect.height*.5+(index%8)*3);}
   if(wait&&accepted){const t=traces.at(-1),started=now();while(port.read().frameState.finishing){if(now()-started>180000)throw Error('baseline stroke timeout');await sleep(2);}t.readyAt=now();t.upToReadyMs=t.readyAt-t.upAt;const submission=downMap.get('submission:'+t.id);if(submission)Object.assign(t,submission);}
  }
  for(let i=0;i<8;i++)await stroke(i,true);
  const beforeBurst=now();for(let i=0;i<12;i++){await stroke(i,false);await sleep(25);}const afterInput=now();while(port.read().frameState.finishing||s.resolvers.size||r.document.jobs.length||r.inflight){if(now()-beforeBurst>180000)throw Error('burst timeout');await sleep(5);}
  return {traces,attempts,burstInputMs:afterInput-beforeBurst,burstSettleMs:now()-afterInput,strokes:c.committedStrokeCount,accepted:attempts.filter(x=>x.accepted).length,rejected:attempts.filter(x=>!x.accepted).length,rawAccepted:s.rawAccepted,queue:r.document.jobs.length,queueCommands:r.document.count,metrics:port.read(),memory:performance.memory?{heapBytes:performance.memory.usedJSHeapSize}:null};
 });
 assert.equal(result.strokes,result.accepted);assert.equal(result.queue,0);report.cases.push({backend,width,height,...result});console.log('HANDOFF_CASE '+JSON.stringify({backend,width,height,strokes:result.strokes,rejected:result.rejected,traces:result.traces.slice(0,8),burstSettleMs:result.burstSettleMs}));await context.close();
}}finally{await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2));await browser.close();server.close();}
assert.deepEqual(report.errors,[]);
