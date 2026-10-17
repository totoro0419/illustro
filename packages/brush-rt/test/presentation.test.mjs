import test from 'node:test';
import assert from 'node:assert/strict';
import {GpuRenderer} from '../dist/rt/renderer.mjs';
const view=x=>new Float32Array([800,600,800,600,512,384,1,0,x,0,1,1,0,0,0,0]);
function harness(){let complete;const calls={renders:0,presents:0};const backend={viewTransform:null,dirtyConfirmed:new Set(),tiles:new Map(),presentationHeld:false,
 setViewTransform(v){this.viewTransform=v.slice();},poll(){if(!complete)return false;complete();complete=null;return true;},
 render(){calls.renders++;return new Promise(resolve=>{complete=resolve;});},
 presentView(){calls.presents++;return true;},presentCurrent(){calls.presents++;}};
 const r=new GpuRenderer(backend,512,384);r.needsFrame=false;return {r,backend,calls};}
test('view movement reuses composite for any history length and no raster job is queued',()=>{
 const {r,calls}=harness();for(let i=0;i<2000;i++){r.setViewTransform(view(i));r.frame(i*16.7);}
 assert.equal(calls.renders,0);assert.equal(calls.presents,2000);assert.equal(r.document.jobs.length,0);
});
test('WebGL completed formal work can submit the next frame in the same RAF',()=>{
 const {r,calls}=harness();r.needsFrame=true;r.frame(0);assert.equal(r.inflight,true);
 r.needsFrame=true;r.frame(16.7);assert.equal(calls.renders,2,'completion cannot cost a third RAF');
});
test('newest view remains responsive while formal work is in flight',()=>{
 const {r,backend,calls}=harness();r.needsFrame=true;r.frame(0);backend.poll=()=>false;
 r.setViewTransform(view(30));r.setViewTransform(view(-20));r.frame(16.7);
 assert.equal(calls.renders,1);assert.equal(calls.presents,1);assert.equal(backend.viewTransform[8],-20);assert.equal(r.inflight,true);
});
test('bounded presentation backpressure retains newest request until it can submit',()=>{
 const {r,backend,calls}=harness();backend.presentView=()=>false;r.setViewTransform(view(10));r.frame(0);assert.equal(r.viewPending,true);
 r.setViewTransform(view(40));backend.presentView=()=>{calls.presents++;return true;};r.frame(16.7);assert.equal(r.viewPending,false);assert.equal(backend.viewTransform[8],40);
});
test('atomic history reconstruction holds presentation and does not lose the requested view',()=>{
 const {r,backend,calls}=harness();backend.presentationHeld=true;r.setViewTransform(view(10));assert.equal(r.frame(0),false);assert.equal(calls.presents,0);
 backend.presentationHeld=false;assert.equal(r.frame(16.7),true);
});
test('identical transform creates neither a submission nor a raster render',()=>{
 const {r,calls}=harness();r.setViewTransform(view(0));r.frame(0);r.setViewTransform(view(0));assert.equal(r.frame(16.7),false);assert.equal(calls.presents,1);
});
test('presentation failure is recorded without escaping the animation loop',()=>{
 const {r,backend}=harness();backend.presentView=()=>{throw Error('device lost');};r.setViewTransform(view(2));assert.doesNotThrow(()=>r.frame(0));assert.deepEqual(r.errors,['device lost']);
});

test('zero confirmation delay does not skip formal work after same-RAF fence acknowledgement',()=>{
 const {r,backend}=harness(),queue=[{id:1,key:'0,0',surfaceKey:'a',commit:false,t:null,commands:[]},{id:2,key:'0,0',surfaceKey:'a',commit:false,t:null,commands:[]}],seen=[];
 r.document.jobs=queue;r.document.peekMany=()=>queue.slice(0,1);r.document.complete=()=>queue.shift();
 const original=backend.render.bind(backend);backend.render=(s,jobs,states)=>{seen.push(jobs.map(x=>x.id));return original(s,jobs,states);};
 r.frame(0);r.frame(0);assert.deepEqual(seen,[[1],[2]],'a stale RAF timestamp must not create an empty formal submission');
});


test('navigation presents before old formal jobs and applies only the latest overlay view',()=>{
 const {r,backend,calls}=harness();let views=[];r.proxy={setView:v=>views.push(v[8])};r.needsFrame=true;
 let peeks=0;r.document.peekMany=()=>{peeks++;return [];};
 for(let i=1;i<=40;i++)r.setViewTransform(view(i));
 assert.deepEqual(views,[]);assert.equal(r.frame(0),true);assert.deepEqual(views,[40]);
 assert.equal(calls.presents,1);assert.equal(calls.renders,0);assert.equal(peeks,0);
 r.proxy=null;r.frame(16.7);assert.equal(calls.renders,1);
});


test('a view change during final publication retries the new epoch instead of leaving stroke completion stuck',()=>{
 const {r,backend}=harness();r.strokeHandoff=true;r.requestWork=()=>{};backend.poll=()=>false;backend.previews=new Map;
 r.proxy={epoch:0,ready:true,fallback:false,footprints:new Map,guards:[],canUse:()=>false,setView(){this.epoch++;},fallbackPresented(){},presented(){}};
 r.strokeFrames.set(7,1);r.needsFrame=true;r.frame(0);r.setViewTransform(view(20));r.frame(16.7);r.finishSubmission();
 assert.equal(r.strokeFrames.has(7),true);assert.equal(r.needsFrame,true,'the new view must schedule a matching content acknowledgement');
 r.frame(33.4);r.finishSubmission();assert.equal(r.strokeFrames.size,0);assert.equal(r.presentedStrokes.has(7),true);
});


test('blocked view presentation never admits more formal work behind it',()=>{
 const {r,backend,calls}=harness();r.strokeHandoff=true;r.needsFrame=true;r.requestWork=()=>{};
 let peeks=0;r.document.peekMany=()=>{peeks++;return [];};backend.presentView=()=>false;
 r.setViewTransform(view(12));for(let i=0;i<20;i++)r.frame(i*16.7);
 assert.equal(calls.renders,0);assert.equal(peeks,0);assert.equal(r.viewPending,true);
});


test('a held navigation gesture never resumes formal work between sparse move events',()=>{
 const {r,backend,calls}=harness();r.strokeHandoff=true;r.requestWork=()=>{};r.needsFrame=true;r.setNavigationActive(true);r.navigationUntil=0;
 let peeks=0;r.document.peekMany=()=>{peeks++;return [];};r.frame(performance.now()+10000);
 assert.equal(calls.renders,0);assert.equal(peeks,0);r.setNavigationActive(false);r.navigationUntil=0;r.frame(performance.now());assert.equal(calls.renders,1);
});


test('held reconstruction drains formal work while retaining its pending view until release',()=>{
 const {r,backend,calls}=harness();backend.presentationHeld=true;r.needsFrame=true;r.setViewTransform(view(45));
 r.frame(0);assert.equal(calls.renders,1,'a pending hidden view must not stop reconstruction');assert.equal(calls.presents,0);assert.equal(r.viewPending,true);
 backend.presentationHeld=false;r.frame(16.7);assert.equal(calls.presents,1);assert.equal(r.viewPending,false);
});
