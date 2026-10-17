import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const {chromium}=createRequire(import.meta.url)(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const baseline='579c31de4f34f2a4ec7777590ecd3e7137dc3aa8',out=process.env.NAV_PRESENT_OUTPUT??'/tmp/navigation-presentation/report.json';
const roots={before:path.resolve(process.env.NAV_PRESENT_BEFORE??'/tmp/navigation-before/packages/brush-rt/dist'),after:path.resolve('packages/brush-rt/dist')};
const oldSource=execFileSync('git',['show',baseline+':packages/brush-rt/src/renderer.mjs'],{encoding:'utf8'}),newSource=await fs.readFile('packages/brush-rt/src/renderer.mjs','utf8');
const shaderHashes={};
for(const name of ['PRESENT_GL_VERTEX','PRESENT_GL_FRAGMENT','PRESENT_WGSL']){
 const expression=new RegExp('const '+name+'=\\x60([\\s\\S]*?)\\x60;'),before=oldSource.match(expression)?.[1],after=newSource.match(expression)?.[1];
 assert.ok(before&&after);assert.equal(after,before,'Idle/manual presentation shader changed: '+name);
 shaderHashes[name]=createHash('sha256').update(after).digest('hex');
}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),parts=url.pathname.split('/').filter(Boolean);
  if(!parts.length){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><canvas id="before"></canvas><canvas id="after"></canvas>');}
  const root=roots[parts.shift()],file=path.resolve(root??'',parts.join('/'));if(!root||!file.startsWith(root+path.sep))throw Error('path');
  res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(file));
 }catch{res.writeHead(404).end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,...(process.env.RT_CHROMIUM_PATH?{executablePath:process.env.RT_CHROMIUM_PATH}:{}),args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
const report={sourceCommit:process.env.EXPECTED_COMMIT_SHA??'',baseline,shaderHashes,scope:'Actual previous renderer versus candidate; paired sequential GPU-completion proxies in Chromium SwiftShader. Full backing-pixel comparisons; no physical Android, scanout, input-to-photon or hardware FPS claim.',cases:[],errors:[]};
await fs.mkdir(path.dirname(out),{recursive:true});
const save=()=>fs.writeFile(out,JSON.stringify(report,null,2));
try{
 for(const backend of (process.env.NAV_PRESENT_BACKENDS??'webgl2,webgpu').split(','))for(const tablet of [false,true])for(const size of [4000,4001]){
  const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/');
  const result=await page.evaluate(async({backend,tablet,size})=>{
   const renderers={},backends={};
   const width=tablet?1600:900,height=tablet?2000:1450,cw=tablet?800:360,ch=tablet?1000:580;
   for(const mode of ['before','after']){
    const {GpuRenderer}=await import('/'+mode+'/rt/index.mjs'),canvas=document.getElementById(mode);canvas.width=width;canvas.height=height;canvas.style.width=cw+'px';canvas.style.height=ch+'px';
    const r=await GpuRenderer.create(canvas,size,size,backend,{strokeHandoff:true});r.requestWork=()=>{};renderers[mode]=r;backends[mode]=r.backend;
   }
   const data=new Uint8Array(size*size*4);
   for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4;let a=255,r,g,b;
    if(x<size/2&&y<size/2){r=g=b=((x^y)&1)*255;}
    else if(y<size/2){r=x%256;g=y%256;b=(x*17+y*31)%256;}
    else if(x<size/2){const d=Math.abs(y-size*.75-250*Math.sin(x/85));a=Math.round(255*Math.max(0,Math.min(1,1.5-d)));r=25*a/255;g=60*a/255;b=100*a/255;}
    else{a=(x+y)%256;r=a;g=a*.15;b=a*.35;}
    data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=a;
   }
   for(const b of Object.values(backends)){
    if(b.gl){const g=b.gl;g.bindTexture(g.TEXTURE_2D,b.liveTarget.t);g.texSubImage2D(g.TEXTURE_2D,0,0,0,size,size,g.RGBA,g.UNSIGNED_BYTE,data);}
    else b.device.queue.writeTexture({texture:b.liveTarget},data,{bytesPerRow:size*4},[size,size]);
    b.presentationPyramid.clear();
   }
   const view=new Float32Array([width,height,cw,ch,size,size,.08,0,0,0,1,1,0,0,0,0]),fit=Math.min(cw/size,ch/size)*.85;
   const capture=document.createElement('canvas');capture.width=width;capture.height=height;const ctx=capture.getContext('2d',{willReadFrequently:true});
   async function settleGl(b){
    if(!b.gl)return;const g=b.gl,fence=g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE,0);g.flush();const start=performance.now();
    try{for(;;){const s=g.clientWaitSync(fence,0,0);if(s===g.ALREADY_SIGNALED||s===g.CONDITION_SATISFIED)break;if(s===g.WAIT_FAILED||performance.now()-start>60000)throw Error('Presentation completion fence');await new Promise(ok=>setTimeout(ok,0));}}finally{g.deleteSync(fence);}
   }
   function settings(variant){
    const b=backends.after;b.navigationPresentation=variant!=='idle';b.navigationCull=variant!=='manual';b.navigationLinear=variant==='optimized';
   }
   async function draw(mode,snapshot=false){
    const b=backends[mode],at=performance.now(),done=b.presentCurrent(true),cpuMs=performance.now()-at;
    let pixels;if(snapshot){ctx.clearRect(0,0,width,height);ctx.drawImage(b.canvas,0,0);pixels=ctx.getImageData(0,0,width,height).data;}
    await done;await settleGl(b);return {pixels,cpuMs,completeMs:performance.now()-at,stats:{...b.viewportCache.last}};
   }
   function difference(a,b){let max=0,changed=0,sum=0,first=-1;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d){if(first<0)first=i;changed++;sum+=d;max=Math.max(max,d);}}return {max,changed,mean:sum/a.length,first};}
   const checks=[],views=[
    ['fit',fit,0,0,0,1,1,0,0,0],
    ['rotate',fit,.67,30,-40,1,1,0,0,0],
    ['flip',fit,-1.1,25,0,-1,-1,0,0,0],
    ['small',fit*.2,.31,80,-120,1,1,0,0,0],
    ['quarter',.25,.43,0,0,1,-1,0,0,0],
    ['actual-pixel',cw/width,.27,0,0,1,1,0,0,0],
    ['large',2,-.2,-40,20,-1,1,0,0,0],
    ['nearest',2,.2,0,0,1,1,0,1,0],
    ['outside',fit,.2,cw*12,0,1,1,0,0,0],
    ['seamless',fit,.33,175,-80,1,1,1,0,0],
    ['reference',fit,.4,0,0,1,1,0,0,1]
   ];
   for(const [label,zoom,angle,panX,panY,fx,fy,seamless,nearest,reference]of views){
    [view[6],view[7],view[8],view[9],view[10],view[11],view[12],view[13],view[14]]=[zoom,angle,panX,panY,fx,fy,seamless,nearest,reference];
    for(const r of Object.values(renderers))r.setViewTransform(view);
    const expected=(await draw('before',true)).pixels;
    for(const variant of ['manual','cull','optimized','idle']){
     settings(variant);const actual=await draw('after',true),diff=difference(expected,actual.pixels);
     if(variant==='optimized'){if(diff.max>2)throw Error(label+' navigation sampling exceeded two RGBA8 steps: '+JSON.stringify(diff));}
     else if(diff.changed)throw Error(label+' '+variant+' exact presentation mismatch: '+JSON.stringify(diff));
     checks.push({label,variant,diff,stats:actual.stats});
    }
   }
   // End-of-gesture restoration must request a final exact presentation even
   // when there is no new coordinate event after the last optimized frame.
   const r=renderers.after;r.navigationActive=false;r.setNavigationActive(true);r.setNavigationActive(false);
   if(r.backend.navigationPresentation||!r.viewPending)throw Error('Exact idle presentation was not requested');
   view[12]=view[13]=view[14]=0;
   const timings=[];
   for(let round=0;round<3;round++)for(let step=0;step<18;step++){
    const t=step/18*Math.PI*2;view[6]=fit*(1+.23*Math.sin(t));view[7]=.55*Math.sin(t);view[8]=35*Math.sin(t*2);view[9]=25*Math.cos(t);view[10]=view[11]=1;
    for(const r of Object.values(renderers))r.setViewTransform(view);
    const variants=['before','cull','optimized'];if((round+step)%2)variants.reverse();
    for(const variant of variants){settings(variant);const actual=await draw(variant==='before'?'before':'after');timings.push({round,step,variant,cpuMs:actual.cpuMs,completeMs:actual.completeMs,shadedPixels:actual.stats.screenPixels});}
   }
   const quantile=(a,q)=>[...a].sort((a,b)=>a-b)[Math.ceil(a.length*q)-1],summary={};
   for(const variant of ['before','cull','optimized']){const a=timings.filter(v=>v.variant===variant);summary[variant]={n:a.length,completeP50Ms:quantile(a.map(v=>v.completeMs),.5),completeP95Ms:quantile(a.map(v=>v.completeMs),.95),completeMaxMs:Math.max(...a.map(v=>v.completeMs)),cpuP95Ms:quantile(a.map(v=>v.cpuMs),.95),shadedPixels:a.reduce((n,v)=>n+v.shadedPixels,0)};}
   const result={backend,tablet,size,width,height,checks,summary,timings,errors:Object.values(renderers).flatMap(r=>r.errors),adapter:backends.after.info};
   for(const r of Object.values(renderers))r.destroy();return result;
  },{backend,tablet,size});
  assert.deepEqual(result.errors,[]);report.cases.push(result);console.log('NAV_PRESENT '+JSON.stringify({backend,tablet,size,summary:result.summary,checks:result.checks.length}));await save();await page.close();
 }
}catch(error){report.errors.push(String(error.stack??error));throw error;}finally{await save();await browser.close();server.close();}
assert.deepEqual(report.errors,[]);
