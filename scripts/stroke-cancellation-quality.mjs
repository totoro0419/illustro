import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const html=await fs.readFile('prototypes/brush-rt/dist/illustro-brush-rt.html'),out='/tmp/stroke-cancellation-evidence';await fs.mkdir(out,{recursive:true});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report={commit:process.env.EXPECTED_COMMIT_SHA??null,cases:[],errors:[]};
try{for(const backend of ['webgl2','webgpu'])for(const width of [512,3000])for(const layered of [false,true]){
 const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto('http://127.0.0.1:'+server.address().port+'/?backend='+backend+'&document='+width);await page.waitForFunction(()=>window.__rt,{timeout:45000});
 const result=await page.evaluate(async({width,layered})=>{
  const {renderer,session,foundationPresets}=window.__rt,backend=renderer.backend,surface=layered?'cancel-layer':'default';
  renderer.setSurfaceStack([surface]);const seeded=backend.tile('0,0',surface),pixels=new Uint8Array(128*128*4);
  for(let i=0;i<pixels.length;i+=4)pixels.set(i%128===0?[74,112,180,0]:[74,112,180,210],i);
  if(backend.gl){const g=backend.gl;g.bindTexture(g.TEXTURE_2D,seeded.layer[seeded.l].t);g.texSubImage2D(g.TEXTURE_2D,0,0,0,128,128,g.RGBA,g.UNSIGNED_BYTE,pixels);}else backend.device.queue.writeTexture({texture:seeded.layer[seeded.l]},pixels,{bytesPerRow:512},[128,128]);
  seeded.committedId=-1;backend.dirtyConfirmed.add('0,0');await renderer.drain();
  const before=await renderer.read(surface),composite=await backend.readViewport(),layerTextures=[...seeded.layer],history=backend.historyReservedBytes,stages=[];
  for(const index of [0,4,5,6]){
   const p=structuredClone(foundationPresets[index]);p.size=48;p.prediction.enabled=false;p.stabilization.constant=0;p.forceFade.enabled=false;if(index===4)p.renderer='stamp';
   const rebuilds=session.fullDocumentRebuilds,replays=session.fullReplayStrokes;
   session.begin(p,0,{},surface);const id=session.active.id;
   for(let i=0;i<90;i++)session.accept({x:40+i*2.6,y:42+(i%3),t:performance.now()+i,pointerType:'pen',pressure:.8});session.flush();
   const deadline=performance.now()+45000;while(!renderer.document.touched.has(id)){if(performance.now()>deadline)throw Error('canonical coverage was not received');await new Promise(ok=>requestAnimationFrame(ok));}
   // Stamp material permits canonical work while the pointer is down. Ensure
   // cancellation covers both queued-only and already-submitted accumulation.
   // The fixture permits pending coverage submission without ending/committing
   // the active stroke; this is a resource-lifetime test, not a physical-input
   // performance measurement.
   if(index===4){const latest=renderer.mailbox.take()??renderer.snapshot;renderer.snapshot={...latest,finished:true};const until=performance.now()+45000;while(![...backend.tiles.values()].some(t=>t.active===id)){if(performance.now()>until)throw Error('in-flight accumulation not exercised');await new Promise(ok=>requestAnimationFrame(ok));}}
   const submitted=[...backend.tiles.values()].filter(t=>t.active===id).length;
   await session.cancel();const after=await renderer.read(surface),display=await backend.readViewport();
   let changed=0,changedDisplay=0;for(let i=0;i<before.length;i++){if(before[i]!==after[i])changed++;if(composite[i]!==display[i])changedDisplay++;}
   stages.push({brush:p.id,submittedAccumulationTiles:submitted,changedLayerBytes:changed,changedCompositeBytes:changedDisplay,resetDelta:session.fullDocumentRebuilds-rebuilds,replayDelta:session.fullReplayStrokes-replays,layerObjectsPreserved:seeded.layer.every((t,i)=>t===layerTextures[i]),occupiedTiles:backend.tiles.size,historyBytes:backend.historyReservedBytes,historyBefore:history,jobs:renderer.document.jobs.length,previewCount:backend.previews.size});
  }
  return {width,height:renderer.document.height,layered,stages,errors:[...renderer.errors,...session.errors]};
 },{width,layered});
 report.cases.push({backend,...result});await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 assert.deepEqual(result.errors,[]);for(const stage of result.stages){assert.equal(stage.changedLayerBytes,0);assert.equal(stage.changedCompositeBytes,0);assert.equal(stage.resetDelta,0);assert.equal(stage.replayDelta,0);assert.equal(stage.layerObjectsPreserved,true);assert.equal(stage.occupiedTiles,1);assert.equal(stage.historyBytes,stage.historyBefore);assert.equal(stage.jobs,0);assert.equal(stage.previewCount,0);if(stage.brush===result.stages[1].brush)assert.ok(stage.submittedAccumulationTiles>0);}
 await page.close();
 }assert.equal(report.cases.length,8);assert.deepEqual(report.errors,[]);
}catch(e){report.errors.push(e.stack);throw e;}finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();server.close();}
console.log(JSON.stringify({commit:report.commit,cases:report.cases.length,stages:report.cases.reduce((n,c)=>n+c.stages.length,0),errors:report.errors}));
