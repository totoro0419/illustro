import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright'),root=path.resolve('packages/brush-rt/dist');
const server=http.createServer(async(req,res)=>{try{if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<canvas width="800" height="600" style="width:800px;height:600px"></canvas>');}const file=path.resolve(root,'.'+req.url);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});const report={cases:[],errors:[]};
try{for(const backend of ['webgl2','webgpu'])for(const [width,height]of [[512,384],[513,385],[3000,3000]]){
 const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/');
 const item=await page.evaluate(async({backend,width,height})=>{
  const {GpuRenderer}=await import('/rt/index.mjs');const r=await GpuRenderer.create(document.querySelector('canvas'),width,height,backend),b=r.backend;
  let reference=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,a=(x*3+y*5)%256;reference[i]=Math.min(a,(x*17+y*9)%256);reference[i+1]=Math.min(a,(x*7+y*13)%256);reference[i+2]=Math.min(a,(x*11+y*3)%256);reference[i+3]=a;}
  if(b.gl){const g=b.gl;g.bindTexture(g.TEXTURE_2D,b.liveTarget.t);g.texSubImage2D(g.TEXTURE_2D,0,0,0,width,height,g.RGBA,g.UNSIGNED_BYTE,reference);}
  else b.device.queue.writeTexture({texture:b.liveTarget},reference,{bytesPerRow:width*4},[width,height]);
  const view=new Float32Array([800,600,800,600,width,height,.25,0,0,0,1,1,0,0,0,0]);b.presentationPyramid.clear();let image;
  if(b.gl)image=b.presentationPyramid.source(view);else{const e=b.device.createCommandEncoder();image=b.presentationPyramid.source(view,e);b.device.queue.submit([e.finish()]);}
  let w=width,h=height;for(let level=0;level<2;level++){const nw=Math.ceil(w/2),nh=Math.ceil(h/2),out=new Uint8Array(nw*nh*4);for(let y=0;y<nh;y++)for(let x=0;x<nw;x++)for(let c=0;c<4;c++){let sum=0;for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)sum+=reference[(Math.min(h-1,y*2+dy)*w+Math.min(w-1,x*2+dx))*4+c];out[(y*nw+x)*4+c]=Math.round(sum/4);}reference=out;w=nw;h=nh;}
  let pixels=new Uint8Array(w*h*4);
  if(b.gl){const g=b.gl;g.bindFramebuffer(g.FRAMEBUFFER,image.source.f);g.readPixels(0,0,w,h,g.RGBA,g.UNSIGNED_BYTE,pixels);}
  else{const d=b.device,stride=Math.ceil(w*4/256)*256,buffer=d.createBuffer({size:stride*h,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),e=d.createCommandEncoder();e.copyTextureToBuffer({texture:image.source},{buffer,bytesPerRow:stride},[w,h]);d.queue.submit([e.finish()]);await buffer.mapAsync(GPUMapMode.READ);const raw=new Uint8Array(buffer.getMappedRange());for(let y=0;y<h;y++)pixels.set(raw.subarray(y*stride,y*stride+w*4),y*w*4);buffer.destroy();}
  let maxError=0,channelsOver2=0;for(let i=0;i<pixels.length;i++){const error=Math.abs(pixels[i]-reference[i]);maxError=Math.max(maxError,error);if(error>2)channelsOver2++;}
  const result={backend,width,height,scale:image.scale,levelDimensions:[w,h],maxChannelError:maxError,channelsOver2,cacheBytes:b.presentationPyramid.bytes,originalDimensions:[r.document.width,r.document.height],errors:r.errors};r.destroy();return result;
 },{backend,width,height});
 assert.equal(item.scale,4);assert.equal(item.channelsOver2,0);assert.deepEqual(item.originalDimensions,[width,height]);assert.deepEqual(item.errors,[]);report.cases.push(item);console.log(JSON.stringify(item));await page.close();
}}finally{await fs.mkdir('/tmp/display-cache-evidence',{recursive:true});await fs.writeFile('/tmp/display-cache-evidence/report.json',JSON.stringify(report,null,2));await browser.close();server.close();}
assert.deepEqual(report.errors,[]);
