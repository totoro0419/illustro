import test from 'node:test';
import assert from 'node:assert/strict';
import {ScreenProxy,proxyPlan,polygonArea,clipPolygon,composePixel,toScreen,toDocument} from '../dist/rt/screen-proxy.mjs';
import {CanonicalBuilder,referenceBrushes} from '../dist/rt/index.mjs';
globalThis.ImageData??=class{constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4);}};
const view=(size=4000,angle=0,dpr=1)=>new Float64Array([400*dpr,600*dpr,400,600,size,size,.09,angle,0,0,1,1,0,0,0,0]);
function setup(ratio=1/32){const sink={images:[],resize(){},upload(image,rects){this.images.push({data:image.data.slice(),rects});},hide(){},destroy(){}},backend={canvas:{},surfaceStack:['a','b']},p=new ScreenProxy(backend,{ratio,sink});p.setView(view());p.invalidate();return {p,sink};}
function stroke(preset=referenceBrushes[2],x=1000,y=1300){const b=new CanonicalBuilder({...structuredClone(preset),size:160});for(let i=0;i<12;i++)b.accept({x:x+i*40,y,t:100+i*4,pressure:.7,pointerType:'pen'});b.finish();return b.record();}
const delay=()=>new Promise(r=>setTimeout(r,5));

test('visible budget uses clipped polygon area rather than the rotated bounding box',()=>{
 const p=proxyPlan(view(4000,Math.PI/4),1/64),box=p.cssWidth*p.cssHeight;
 assert.ok(p.visibleArea<box);assert.ok(p.pixels<=Math.floor(p.visibleArea/64));
 assert.ok(Math.abs(polygonArea(clipPolygon([{x:-5,y:-5},{x:10,y:-5},{x:10,y:10},{x:-5,y:10}],0,0,5,5))-25)<1e-8);
});
test('same visible area has the same budget at 512, 4000 and 8000 document pixels',()=>{
 for(const q of [1/16,1/32,1/64]){const plans=[512,4000,8000].map(size=>{const v=view(size);v[6]=360/size;return proxyPlan(v,q);});assert.equal(plans[0].pixels,plans[1].pixels);assert.equal(plans[1].pixels,plans[2].pixels);}
});
test('zoom outside screen is clipped and DPR never multiplies the budget without a cap',()=>{
 const v=view(8000,0,3);v[6]=4;const p=proxyPlan(v,1/32);assert.equal(p.visibleArea,400*600);assert.equal(p.density,2);assert.ok(p.pixels<=400*600/16);
});
test('inverse mapping preserves floating input through rotation and both flips',()=>{
 const v=view(4000,1.1);v[10]=-1;v[11]=-1;v[8]=41.25;v[9]=-50.5;const q={x:1234.123456789,y:2345.987654321},s=toScreen(v,q.x,q.y),back=toDocument(v,s.x,s.y);assert.ok(Math.abs(back.x-q.x)<1e-9);assert.ok(Math.abs(back.y-q.y)<1e-9);
});
test('erase removes layer alpha and reveals the lower color',()=>{
 const lower=[1,0,0,1],upper=[0,0,1,1],erased=composePixel(upper,[0,0,0,1],'erase');assert.equal(erased[3],0);assert.deepEqual(composePixel(lower,[0,0,0,0]),lower);assert.deepEqual(composePixel(lower,[0,0,1,1]),upper);
});
test('updates only changed screen cells and preserves commands and earlier pixels',()=>{
 const {p,sink}=setup(),record=stroke(),before=JSON.stringify(record),state={id:1,preset:record.preset,surfaceKey:'a',stableSource:record.commands,stableEnd:6,commands:[],inputTip:{t:performance.now()}};
 p.enqueue(state);p.safeFlush();const first=p.metrics.updatedPixels;assert.ok(first>0&&first<p.plan.pixels);
 p.enqueue({...state,stableEnd:12,inputTip:{t:performance.now()}});p.safeFlush();assert.ok(p.metrics.updatedPixels-first<p.plan.pixels);assert.equal(JSON.stringify(record),before);assert.ok(sink.images.length>=2);p.destroy();
});
test('formal handoff removes one pending stroke and retains newer overlapping feedback',async()=>{
 const {p}=setup(),record=stroke();for(const id of [1,10])p.enqueue({id,preset:record.preset,surfaceKey:'a',stableSource:record.commands,stableEnd:record.commands.length,commands:[],finished:true,inputTip:{t:performance.now()}});p.safeFlush();
 p.committed(1,record,'a');while(p.finalizing)await delay();p.presented(1);assert.ok(!p.footprints.has(1));assert.ok(p.footprints.has(10));assert.ok(p.image.data.some((n,i)=>i%4===3&&n===255));
 const epoch=p.epoch;p.setView(view(4000,.5));p.presented(10,epoch);assert.ok(p.epoch>epoch);p.destroy();
});
test('cancel removes disposable coverage without mutating a committed base',async()=>{
 const {p}=setup(),record=stroke();p.committed(1,record,'a');while(p.finalizing)await delay();p.presented(1);const before=p.bases.get('a').slice();p.enqueue({id:10,preset:record.preset,surfaceKey:'a',stableSource:record.commands,stableEnd:12,commands:[]});p.safeFlush();p.cancel(10);assert.deepEqual(p.bases.get('a'),before);assert.equal(p.footprints.size,0);p.destroy();
});
test('bottom-layer paint stays below upper ink; upper erase reveals the colored lower layer',async()=>{
 const {p}=setup(),red=stroke({...referenceBrushes[2],color:[1,0,0]}),blue=stroke({...referenceBrushes[2],color:[0,0,1]}),green=stroke({...referenceBrushes[2],color:[0,1,0]}),erase=stroke({...referenceBrushes[2],blend:'erase'});
 for(const [id,record,surface]of [[1,red,'a'],[10,blue,'b']]){p.committed(id,record,surface);while(p.finalizing)await delay();p.presented(id);}
 const at=()=>{const q=toScreen(p.view,1200,1300),x=Math.floor((q.x-p.plan.x)*p.plan.scale),y=Math.floor((q.y-p.plan.y)*p.plan.scale),i=(y*p.plan.width+x)*4;return [...p.image.data.subarray(i,i+4)];};
 const live=(id,record,surface)=>{p.enqueue({id,preset:record.preset,surfaceKey:surface,stableSource:record.commands,stableEnd:record.commands.length,commands:[]});p.safeFlush();};
 live(19,green,'a');assert.deepEqual(at(),[0,0,255,255]);p.cancel(19);
 live(28,erase,'b');assert.deepEqual(at(),[255,0,0,255]);p.cancel(28);
 p.styles=new Map([['b',{opacity:.5}]]);live(37,red,'a');const c=at();assert.ok(Math.abs(c[0]-128)<=1&&Math.abs(c[2]-128)<=1);p.destroy();
});
