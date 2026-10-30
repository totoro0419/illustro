'use strict';
/* Offline CPU reference/candidate correctness checks; Node.js 22+ */
const C=require('./core.js');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const {performance}=require('node:perf_hooks');
const checks=[];
function check(name,fn){const t=performance.now();try{fn();checks.push({name,pass:true,ms:performance.now()-t});}catch(e){checks.push({name,pass:false,error:String(e)});}}
function eq(name,a,b){const d=C.compare(a,b);assert(d.equal,name+': '+JSON.stringify(d));}
check('fixture repeatability',()=>eq('seed',C.fixture(87,58,7),C.fixture(87,58,7)));
check('box blur exact equality (rectangular and tiny)',()=>{for(const [w,h] of [[1,1],[2,7],[17,12],[57,32]])for(const r of [0,1,2,5,13])eq('blur',C.blurDirect(C.fixture(w,h,28),r),C.blurSeparable(C.fixture(w,h,28),r));});
check('transparent RGBA blur exact equality',()=>{const a=C.fixture(38,51,915);for(let i=3;i<a.data.length;i+=4)a.data[i]=(i*41)%256;for(const r of [0,2,9])eq('alpha',C.blurDirect(a,r),C.blurSeparable(a,r));});
check('4-neighbor BFS and scanline fill equality',()=>{for(const [w,h] of [[1,1],[7,2],[11,43],[61,42]])for(const t of [0,2,15,70,255])for(const [x,y] of [[0,0],[w-1,h-1],[Math.floor(w/2),Math.floor(h/2)]]){const a=C.fixture(w,h,19);eq('fill',C.fillBfs(a,x,y,t),C.fillScanline(a,x,y,t));}});
check('randomized fill equality',()=>{for(let seed=1;seed<55;seed++){const a=C.fixture(43,37,seed),t=(seed*13)%120;for(let k=0;k<4;k++){const x=(seed*11+k*7)%43,y=(seed*3+k*5)%37;eq('seed',C.fillBfs(a,x,y,t),C.fillScanline(a,x,y,t));}}});
check('lasso polygon and scanline equality',()=>{for(const [w,h] of [[11,7],[67,55],[150,91]])for(const count of [3,7,31,255]){const p=C.polygonPath(w,h,count);eq('lasso',C.lassoPoint(w,h,p),C.lassoScanline(w,h,p));}});
check('self-intersecting polygon equality',()=>{const p=[{x:2,y:3},{x:35,y:38},{x:44,y:3},{x:3,y:23},{x:53,y:21}];eq('bowtie',C.lassoPoint(60,49,p),C.lassoScanline(60,49,p));});
check('warp full matches preview factor=1',()=>{for(const [w,h] of [[1,1],[47,27],[96,117]])for(const s of [0,8,31])eq('warp',C.warpFull(C.fixture(w,h),s),C.warpPreview(C.fixture(w,h),s,1));});
check('warp original unchanged',()=>{const a=C.fixture(66,51,197),b=C.clone(a);C.warpFull(a,33);C.warpPreview(a,33,4);eq('immutable',a,b);});
function measure(fn,repeat=4){const ts=[];for(let i=0;i<repeat;i++){const t=performance.now();fn();ts.push(performance.now()-t);}return {samples_ms:ts,median_ms:ts.toSorted((a,b)=>a-b)[Math.floor(ts.length/2)]};}
async function main(){
 let start=performance.now();const a=C.fixture(160,128),p=C.strokePoints(160,128,230),b=C.clone(a),c=C.clone(a);C.strokeSync(b,p,19);const inc=await C.strokeChunked(c,p,19,undefined,170,.5);check('chunked stroke exactly matches sync',()=>eq('brush',b,c));
 const w=C.fixture(128,91),full=C.warpFull(w,27),chunk=await C.warpChunked(w,27,.5);check('chunked warp exactly matches full',()=>eq('warp',full,chunk.dst));
 const cancelled=await C.warpChunked(w,33,.1,()=>true);check('stale transform job cancelled',()=>assert.equal(cancelled.cancelled,true));
 const measures=[];
 function push(kind,name,fn,iterations=4){measures.push({kind,name,...measure(fn,iterations)});}
 {const im=C.fixture(256,256),ps=C.strokePoints(256,256,600);push('brush','synchronous',()=>C.strokeSync(C.clone(im),ps,21));const t=performance.now(),v=await C.strokeChunked(C.clone(im),ps,21,undefined,170,5);measures.push({kind:'brush',name:'chunked_wall',single_ms:performance.now()-t,yields:v.yields});}
 {const im=C.fixture(320,240);push('fill','BFS',()=>C.fillBfs(im,155,114,180));push('fill','scanline',()=>C.fillScanline(im,155,114,180));}
 {const poly=C.polygonPath(160,150,420);push('lasso','per_pixel',()=>C.lassoPoint(160,150,poly));push('lasso','scanline',()=>C.lassoScanline(160,150,poly));}
 {const im=C.fixture(152,136);push('box_blur','direct',()=>C.blurDirect(im,8));push('box_blur','separable',()=>C.blurSeparable(im,8));}
 {const im=C.fixture(320,256);push('warp','full',()=>C.warpFull(im,24));push('warp','quarter_preview',()=>C.warpPreview(im,24,4));}
 const report={type:'illustro_cpu_js_smoke',timestamp:new Date().toISOString(),node:process.version,platform:process.platform,arch:process.arch,os:os.release(),testGroups:checks,failures:checks.filter(x=>!x.pass),measurements:measures,limits:['CPU-only tiny fixtures; not Android, GPU, production app, or input-to-photon','Warp preview is approximate; compare only final result to final oracle','Short samples and fixed order are not adoption evidence'],duration_ms:performance.now()-start};
 if(process.env.LAB_OUTPUT)fs.writeFileSync(process.env.LAB_OUTPUT,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:checks.filter(x=>x.pass).length,failed:report.failures,measures},null,2));
 if(report.failures.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
