import test from 'node:test';
import assert from 'node:assert/strict';
import {queueGpuPreview,takeGpuPreviewWork,previewMemoryDemand,GpuRenderer} from '../dist/rt/renderer.mjs';

function preview(id){return {id,preset:{tip:'round'},tiles:new Map};}
function change(v,key,stable,live=[],clear=false,vertexCount=6,sectors=16){queueGpuPreview(v,{work:new Map([[key,{key,stable,live,clear}]]),vertexCount,sectors},new Set([key]));}

test('GPU tile queue retains ordered exact prefix passes while superseding only transient tails',()=>{
 const v=preview(1),a=new Float32Array([1]),b=new Float32Array([2]),tailA=[new Float32Array([3])],tailB=[new Float32Array([4])];
 change(v,'0,0',[a],tailA,false,18,4);change(v,'0,0',[b],tailB,true,30,8);
 const task=v.pendingGpuWork.get('0,0');
 assert.deepEqual(task.segments,[{commands:[a],vertexCount:18,sectors:4},{commands:[b],vertexCount:30,sectors:8}]);
 assert.equal(task.live,tailB);assert.equal(task.clear,true);assert.equal(task.dirty,true);
 change(v,'0,0',[],[],true);assert.deepEqual(task.live,[]);assert.equal(task.segments.length,2);
});

test('a new active stroke precedes old wide feedback without replaying or losing old tiles',()=>{
 const old=preview(1),next=preview(2),b={previews:new Map([[1,old],[2,next]])};
 for(let x=0;x<75;x++)change(old,x+',0',[new Float32Array([x])]);
 change(next,'1,1',[new Float32Array([90])]);
 const states=[{id:1,finished:true},{id:2,finished:false}],first=takeGpuPreviewWork(b,states,8);
 assert.equal(first.length,8);assert.equal(first[0].v,next);assert.equal(old.pendingGpuWork.size,68);
 const rest=takeGpuPreviewWork(b,states,Infinity);
 assert.equal(rest.length,68);assert.equal(new Set([...first,...rest].filter(x=>x.v===old).map(x=>x.task.key)).size,75);
 assert.equal(takeGpuPreviewWork(b,states,8).length,0);
});

test('preview memory reservations include unchanged queued tiles without double counting',()=>{
 const v=preview(1),state={id:1,preset:v.preset,commands:[]};v.lastState=state;
 change(v,'0,0',[new Float32Array([1])]);const b={width:512,height:512,previewBytes:0,previews:new Map([[1,v]])};
 assert.equal(previewMemoryDemand(b,[state]),128*128*16);
 v.tiles.set('0,0',{});b.previewBytes=128*128*16;
 assert.equal(previewMemoryDemand(b,[state]),b.previewBytes);
 b.previews.delete(1);b.previewBytes=0;assert.equal(previewMemoryDemand(b,[]),0);
});

test('first fallback GPU preview submits before old formal jobs and queued preview tiles keep the renderer awake',async()=>{
 let queuedCalls=0,submittedJobs;const backend={device:{},canvas:{width:512,height:512},viewportCache:{enabled:true,budget:32*1024*1024},previews:new Map,dirtyConfirmed:new Set,lastSubmission:{presentationSubmitted:false},previewGpuPending:true,render:(_s,jobs)=>{submittedJobs=jobs;return Promise.resolve();}};
 const r=new GpuRenderer(backend,512,512,{strokeHandoff:true});r.requestWork=()=>{};
 r.proxy={ready:false,fallback:true,footprints:new Map,guards:[],canUse:()=>false};
 const state={id:2,finished:false,preset:{}};r.snapshot=state;r.previewStates.set(2,state);r.mailbox.value=state;r.inputStarts.set(2,{at:performance.now(),submitted:false});
 r.document.peekMany=()=>{queuedCalls++;return [];};
 assert.equal(r.frame(performance.now()),true);await Promise.resolve();
 assert.deepEqual(submittedJobs,[]);assert.equal(queuedCalls,0);assert.equal(backend.previewTileBudget,8);assert.equal(r.needsFrame,true);
 r.needsFrame=true;r.frame(performance.now());await Promise.resolve();assert.equal(queuedCalls,1);
});
