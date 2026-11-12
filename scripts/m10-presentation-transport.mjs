import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const root=path.resolve('packages/brush-rt/dist');
const server=http.createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><canvas id="display" width="780" height="1200"></canvas>');}const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});const report={browser:browser.version(),cases:[]};
try{for(const backend of ['webgl2','webgpu']){const p=await browser.newPage();p.on('pageerror',e=>console.error(e));await p.goto('http://127.0.0.1:'+server.address().port+'/');const result=await p.evaluate(async backend=>{
 const {GpuRenderer}=await import('/rt/renderer.mjs'),{captureTilePages,uploadTilePages}=await import('/rt/presentation-tiles.mjs');
 const a=await GpuRenderer.create(new OffscreenCanvas(512,512),4000,4000,backend,{strokeHandoff:true,tileHistory:false,tiledPresentation:true});
 const c=await GpuRenderer.create(document.getElementById('display'),4000,4000,backend,{strokeHandoff:true,tileHistory:false});
 const source=a.backend,target=c.backend;
 const seed=(key,phase)=>{const [tx,ty]=key.split(',').map(Number),x=tx*128,y=ty*128,w=Math.min(128,4000-x),h=Math.min(128,4000-y),pixels=new Uint8Array(w*h*4);
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const i=(yy*w+xx)*4,alpha=(xx+yy+phase)%5?128:255;pixels[i]=Math.min(alpha,(xx+phase)%100);pixels[i+1]=Math.min(alpha,(yy+phase)%100);pixels[i+2]=Math.min(alpha,(xx+yy+phase)%120);pixels[i+3]=alpha;}
  if(source.gl){const g=source.gl;g.bindTexture(g.TEXTURE_2D,source.liveTarget.t);g.texSubImage2D(g.TEXTURE_2D,0,x,4000-y-h,w,h,g.RGBA,g.UNSIGNED_BYTE,pixels);}else{if(source.format.startsWith('bgra'))for(let i=0;i<pixels.length;i+=4){const r=pixels[i];pixels[i]=pixels[i+2];pixels[i+2]=r;}source.device.queue.writeTexture({texture:source.liveTarget,origin:[x,y]},pixels,{bytesPerRow:w*4},[w,h]);}
 };
 const keys=['0,0','31,0','0,31','31,31','10,17'];for(const key of keys)seed(key,1);
 const first=captureTilePages(source,keys);uploadTilePages(target,first);
 seed('15,15',7);uploadTilePages(target,captureTilePages(source,['15,15']));
 const expected=await source.readViewport(),actual=await target.readViewport();let mismatch=0,max=0;for(let i=0;i<expected.length;i++)if(expected[i]!==actual[i]){mismatch++;max=Math.max(max,Math.abs(expected[i]-actual[i]));}
 const result={backend,bytes:expected.length,mismatch,max,firstPageCount:first.length,sourceAlpha:source.gl?.getContextAttributes().alpha??source.context.getConfiguration().alphaMode};
 a.destroy();c.destroy();return result;
 },backend);console.log('TRANSPORT '+JSON.stringify(result));report.cases.push(result);assert.equal(result.mismatch,0,'every document RGBA byte survives repeated immutable transfers including alpha, row direction, untouched areas and partial edges');await p.close();}}
finally{await browser.close();await new Promise(ok=>server.close(ok));const out=process.env.TRANSPORT_OUTPUT??'/tmp/illustro-transport/report.json';await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2));}
