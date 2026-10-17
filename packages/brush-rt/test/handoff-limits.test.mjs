import test from 'node:test';
import assert from 'node:assert/strict';
import {CanonicalBuilder} from '../../../prototypes/brush-rt/dist/rt/model.mjs';
import {TileDocument,GpuRenderer} from '../../../prototypes/brush-rt/dist/rt/renderer.mjs';
import fs from 'node:fs';
const presets=JSON.parse(fs.readFileSync(new URL('../../../docs/brush/evidence/presets.json',import.meta.url))),ink={...presets.find(p=>p.id==='fine-ink'),size:16,stabilization:1,pressureSmoothing:0};

test('completed coverage tiles do not retain per-stroke scheduling tags',()=>{
 const p={...ink,size:1024,stabilization:0},b=new CanonicalBuilder(p);b.accept({x:64,y:64,t:0,pressure:1,pointerType:'pen'});b.finish();const d=new TileDocument(128,128);
 for(let id=1;id<=1100;id++){d.append(id,p,b.record().commands);d.end(id,p);while(d.jobs.length)for(const job of d.peekMany(128))d.complete(job);assert.equal(d.full.size,0);}
 assert.equal(d.count,0);assert.equal(d.open.size,0);assert.equal(d.touched.size,0);
});

test('retained dirty pixels under preview pressure do not start an empty submission loop',()=>{
 const backend={previewPressure:true,dirtyConfirmed:new Set(['0,0']),previews:new Map,render(){assert.fail('no formal work or new feedback can relieve pressure');}},r=new GpuRenderer(backend,128,128,{strokeHandoff:true});
 r.needsFrame=false;assert.equal(r.frame(performance.now()),false);assert.equal(r.inflight,false);assert.equal(r.performance.renders,0);
});

test('a cached unchanged frame acknowledges already displayed exact GPU feedback',async()=>{const backend={previews:new Map,dirtyConfirmed:new Set,lastSubmission:{presentationSubmitted:false},render:()=>Promise.resolve()},r=new GpuRenderer(backend,128,128,{strokeHandoff:true});r.strokeFrames.set(7,1);r.frame(performance.now());await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(r.errors,[]);assert.ok(r.presentedStrokes.has(7));clearTimeout(r.workTimer);r.disposed=true;});

test('empty preview frames do not inflate the next ended stroke formal batch',async()=>{
 const counts=[],backend={previews:new Map,dirtyConfirmed:new Set,lastSubmission:{presentationSubmitted:false},render(_s,jobs){counts.push(jobs.length);return Promise.resolve();}},r=new GpuRenderer(backend,4000,4000,{strokeHandoff:true});r.requestWork=()=>{};r.proxy={ready:true,fallback:false,footprints:new Map,epoch:0,canUse:()=>true,fallbackPresented(){}};
 for(let n=0;n<100;n++){r.needsFrame=true;r.frame(performance.now());await Promise.resolve();}
 assert.equal(r.instantJobLimit,16);r.snapshot={finished:true};const jobs=Array.from({length:140},(_,id)=>({id,key:'0,0',preset:{},commands:[],commit:true}));r.document.jobs=jobs.slice();r.frame(performance.now());await Promise.resolve();assert.equal(counts.at(-1),16);assert.equal(r.document.jobs.length,124);assert.ok(r.instantJobLimit<=18);r.disposed=true;
});
