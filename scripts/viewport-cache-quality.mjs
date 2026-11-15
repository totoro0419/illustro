import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.RT_PLAYWRIGHT_PATH??'playwright'),root=path.resolve('packages/brush-rt/dist'),out=process.env.VIEWPORT_QUALITY_OUTPUT??'/tmp/viewport-quality/report.json';
const server=http.createServer(async(req,res)=>{try{if(req.url==='/')return res.setHeader('Content-Type','text/html').end('<!doctype html><canvas width="900" height="1450" style="width:360px;height:580px"></canvas>');const file=path.resolve(root,'.'+req.url);if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,...(process.env.HANDOFF_CHROMIUM?{executablePath:process.env.HANDOFF_CHROMIUM}:{}),args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});const report={sourceCommit:process.env.EXPECTED_COMMIT_SHA??'',scope:'Exact physical backing pixels, cached dirty rectangles versus unchanged direct presentation shader; software GPU, no physical phone',cases:[],errors:[]};
try{for(const backend of ['webgl2','webgpu'])for(const canvasSize of [4000,4001]){
 const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/');
 const result=await page.evaluate(async({backend,canvasSize})=>{
  const {GpuRenderer}=await import('/rt/index.mjs'),canvas=document.querySelector('canvas'),r=await GpuRenderer.create(canvas,canvasSize,canvasSize,backend,{strokeHandoff:true}),b=r.backend,cache=b.viewportCache,pyramid=b.presentationPyramid,comparisons=[];
  function upload(x,y,w,h,seed){const data=new Uint8Array(w*h*4);for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const i=(yy*w+xx)*4,a=255;data[i]=(xx*13+yy*7+seed*3)%256;data[i+1]=(xx*5+yy*17+seed*11)%256;data[i+2]=(xx*23+yy*3+seed*31)%256;data[i+3]=a;}if(b.gl){const g=b.gl;g.bindTexture(g.TEXTURE_2D,b.liveTarget.t);g.texSubImage2D(g.TEXTURE_2D,0,x,y,w,h,g.RGBA,g.UNSIGNED_BYTE,data);}else b.device.queue.writeTexture({texture:b.liveTarget,origin:[x,y]},data,{bytesPerRow:w*4},[w,h]);}
  function pixels(){const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;const context=copy.getContext('2d',{willReadFrequently:true});context.drawImage(canvas,0,0);return context.getImageData(0,0,copy.width,copy.height).data;}
  // Snapshot in the same task as submission. Waiting for queue completion first
  // can cross WebGPU canvas automatic expiry, and even the original direct
  // renderer then reads as an empty canvas in Chromium. drawImage synchronizes
  // the submitted writes; the normal completion promise is still checked.
  async function presentPixels(){const complete=b.presentCurrent(),image=pixels();await complete;return image;}
  async function compare(label,partial=false){cache.enabled=true;const cached=await presentPixels(),stats={...cache.last};cache.enabled=false;const direct=await presentPixels();let max=0,changed=0;for(let i=0;i<direct.length;i++){const d=Math.abs(direct[i]-cached[i]);max=Math.max(max,d);changed+=+(d!==0);}if(changed)throw Error(label+' display mismatch '+JSON.stringify({max,changed,stats,cachedFirst:[...cached.slice(0,8)],directFirst:[...direct.slice(0,8)]}));comparisons.push({label,exactPixels:true,...stats});if(partial&&stats.screenPixels>=canvas.width*canvas.height)throw Error(label+' expected partial presentation');cache.enabled=true;await b.presentCurrent();}
  upload(0,0,canvasSize,canvasSize,1);pyramid.clear();
  const view=new Float32Array([900,1450,360,580,canvasSize,canvasSize,.085,0,0,0,1,1,0,0,0,0]);
  for(const [i,settings]of [[.085,0,1,1,0],[.17,.43,1,1,0],[.25,-1.1,-1,1,0],[1,.2,1,-1,0],[2,0,-1,-1,1]].entries()){
   [view[6],view[7],view[10],view[11],view[13]]=settings;r.setViewTransform(view);await compare('view-'+i);
   for(const [j,key]of ['15,15','16,16','14,17'].entries()){const [tx,ty]=key.split(',').map(Number);upload(tx*128,b.gl?canvasSize-(ty+1)*128:ty*128,128,128,i*10+j+2);pyramid.invalidate(new Set([key]));await compare('dirty-'+i+'-'+j,true);}
   // A canvas current texture may expire across tasks even without an edit.
   // Request another cached frame after that boundary, then check its pixels.
   await new Promise(ok=>setTimeout(ok,0));if(b.device){const encoder=b.device.createCommandEncoder(),copied=cache.copiedPixels;if(b.encodePresentation(encoder)!==false)throw Error('unchanged automatic formal frame presented');b.device.queue.submit([encoder.finish()]);await b.device.queue.onSubmittedWorkDone();if(cache.copiedPixels!==copied)throw Error('unchanged automatic frame copied screen pixels');}cache.enabled=true;const retained=await presentPixels();if(cache.last.screenCacheHit!==true)throw Error('unchanged viewport was redrawn');cache.enabled=false;const direct=await presentPixels();let changed=0,max=0,first=-1;for(let k=0;k<direct.length;k++){const delta=Math.abs(direct[k]-retained[k]);if(delta){changed++;max=Math.max(max,delta);if(first<0)first=k;}}if(changed)throw Error('unchanged frame after task mismatch '+JSON.stringify({i,changed,max,first,retainedFirst:[...retained.slice(first,first+16)],directFirst:[...direct.slice(first,first+16)],stats:cache.last}));comparisons.at(-1).unchangedAfterTask=true;cache.enabled=true;await b.presentCurrent();
  }
  view[6]=.085;view[7]=0;view[10]=view[11]=1;view[13]=0;r.setViewTransform(view);await compare('before-edge');upload(3968,b.gl?0:3968,canvasSize-3968,canvasSize-3968,93);pyramid.invalidate(new Set(['31,31']));await compare('clipped-image-edge',true);
  view[12]=1;view[8]=175;view[9]=-80;r.setViewTransform(view);await compare('seamless-direct-fallback');view[12]=0;view[14]=1;r.setViewTransform(view);await compare('reference-direct-fallback');view[14]=0;
  canvas.width=760;canvas.height=1170;view[0]=760;view[1]=1170;r.setViewTransform(view);await compare('backing-resize');
  const budget=cache.budget;cache.budget=1;await compare('budget-direct-fallback');if(cache.bytes!==0)throw Error('over-budget viewport image retained');cache.budget=budget;pyramid.clear();await compare('cleared-cache');
  const result={backend,canvasSize,comparisons,cacheBytes:cache.bytes,budget:cache.budget,errors:r.errors};r.destroy();return result;
 },{backend,canvasSize});assert.deepEqual(result.errors,[]);assert.ok(result.comparisons.length>=25);report.cases.push(result);console.log('VIEWPORT_QUALITY '+backend+' '+canvasSize+' '+result.comparisons.length+' exact backing comparisons');await page.close();
}}finally{await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2));await browser.close();server.close();}assert.deepEqual(report.errors,[]);
