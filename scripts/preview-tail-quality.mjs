import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),pw=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const html=await fs.readFile(new URL('../prototypes/brush-rt/dist/illustro-brush-rt.html',import.meta.url));
const output=process.env.TAIL_EVIDENCE_DIRECTORY??'/tmp/preview-tail-evidence';
await fs.mkdir(output,{recursive:true});
const report={commit:process.env.EXPECTED_COMMIT_SHA??null,cases:[],errors:[]};
const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(html);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await pw.chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface']});
try{
 for(const backend of ['webgl2','webgpu'])for(const width of [512,3000])for(const layered of [false,true]){
  const page=await browser.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  try{
   await page.goto(`http://127.0.0.1:${server.address().port}/?backend=${backend}&document=${width}`);
   await page.waitForFunction(()=>window.__rt||document.getElementById('status').classList.contains('danger'),{timeout:45000});
   assert.ok(await page.evaluate(()=>!!window.__rt),await page.locator('#status').textContent());
   for(const variant of [{index:0,stamp:false},{index:4,stamp:false},{index:4,stamp:true},{index:6,stamp:false}]){
    const result=await page.evaluate(async({index,stamp,width,layered})=>{
     const {renderer,session,foundationPresets}=window.__rt;
     const {CanonicalBuilder,cpuReference}=await import('@rt/model');
     const height=renderer.document.height,surfaceKey=layered?'tail-quality':'default';
     await session.rebuild();renderer.setSurfaceStack([surfaceKey]);
     const positions=[[20,20],[width-12,height-12],[width/2,height/2],[-20,height/2],[width/2,10],null];
     const base=new Uint8ClampedArray(width*height*4);
     if(index===6){
      // Known straight-alpha pixels isolate mutable-tail replacement from the
      // unrelated cost of formally rasterizing a 3000px background brush.
      // The CPU base is constructed independently, never read from this GPU.
      const backend=renderer.backend,keys=new Set;
      for(const position of positions.filter(Boolean)){
       const [px,py]=position;
       for(let y=Math.max(0,Math.floor((py-320)/128));y<=Math.min(Math.ceil(height/128)-1,Math.floor((py+320)/128));y++)
        for(let x=Math.max(0,Math.floor((px-320)/128));x<=Math.min(Math.ceil(width/128)-1,Math.floor((px+320)/128));x++)keys.add(x+','+y);
      }
      const pixels=new Uint8Array(128*128*4);
      for(let i=0;i<pixels.length;i+=4)pixels.set([74,112,180,210],i);
      for(const key of keys){
       const tile=backend.tile(key,surfaceKey),texture=tile.layer[tile.l];
       if(backend.gl){const g=backend.gl;g.bindTexture(g.TEXTURE_2D,texture.t);g.texSubImage2D(g.TEXTURE_2D,0,0,0,128,128,g.RGBA,g.UNSIGNED_BYTE,pixels);}
       else backend.device.queue.writeTexture({texture},pixels,{bytesPerRow:128*4},[128,128]);
       for(let y=0;y<128&&tile.y+y<height;y++){
        const n=Math.min(128,width-tile.x)*4;
        base.set(pixels.subarray(y*128*4,y*128*4+n),((tile.y+y)*width+tile.x)*4);
       }
       backend.dirtyConfirmed.add(key);
      }
      renderer.needsFrame=true;await renderer.drain();
     }
     const p=structuredClone(foundationPresets[index]);p.size=width===512?64:512;
     p.forceFade.enabled=false;p.prediction.enabled=false;p.stabilization.constant=0;p.stabilization.fast=0;
     if(stamp){p.renderer='stamp';p.tip.direction=true;p.tip.aspect=.4;}
     // Replace the entire mutable tail, including jumps across tile boundaries,
     // a clipped edge, and disappearance. Expected pixels come from the CPU
     // brush reference, not from this renderer's dirty-key implementation.
     const stages=[];let lastPreset;
     for(const position of positions){
      let record,commands=[];
      if(position){
       const b=new CanonicalBuilder(p,[0x12345678,51]);
       b.accept({x:position[0],y:position[1],t:performance.now(),pressure:.8,pointerType:'pen'});
       b.accept({x:position[0]+12,y:position[1]-9,t:performance.now()+1,pressure:.8,pointerType:'pen'});
       b.finish();record=b.record();commands=record.commands;lastPreset=record.preset;
      }
      renderer.setLive({id:1000,surfaceKey,preset:lastPreset,stableSource:[],stableEnd:0,commands,tip:{x:0,y:0,t:performance.now()},finished:false});
      const revision=renderer.mailbox.revision,deadline=performance.now()+45000;
      while(!renderer.completions.some(m=>m.revision>=revision)){
       if(performance.now()>deadline)throw Error('mutable tail presentation timeout');
       await new Promise(r=>requestAnimationFrame(r));
      }
      const actual=await renderer.backend.readViewport();
      const expected=record?cpuReference(record,width,height,base):base;
      let max=0,bad=0;
      for(let i=0;i<actual.length;i+=4)for(let c=0;c<4;c++){
       const delta=Math.abs(actual[i+c]-(c===3?expected[i+c]:expected[i+c]*expected[i+3]/255));
       max=Math.max(max,delta);if(delta>3)bad++;
      }
      stages.push({position,maxPremultipliedChannelError:max,channelsOver3:bad,submission:renderer.backend.lastSubmission});
     }
     renderer.backend.retirePreview(1000);renderer.previewStates.delete(1000);
     renderer.snapshot=null;renderer.mailbox.value=null;
     return {width,height,layered,brush:p.id,stamp,stages,errors:[...renderer.errors,...session.errors]};
    },{...variant,width,layered});
    report.cases.push({backend,...result});
    await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
    assert.deepEqual(result.errors,[]);
    for(const stage of result.stages)assert.equal(stage.channelsOver3,0,JSON.stringify({backend,brush:result.brush,width,layered,stage}));
   }
  }finally{await page.close();}
 }
 assert.equal(report.cases.length,32);assert.deepEqual(report.errors,[]);
}catch(e){report.errors.push(e.stack);throw e;}
finally{
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
 await browser.close();server.close();
}
console.log(JSON.stringify({cases:report.cases.length,errors:report.errors}));
