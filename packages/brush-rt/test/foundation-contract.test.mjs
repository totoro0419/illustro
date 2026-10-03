import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreset,referenceBrushes,PresetState,exportPresets,importPresets,compilePreset,cursorState,rendererRegistry} from '../dist/rt/foundation.mjs';
import {CanonicalBuilder,validateRecord} from '../dist/rt/model.mjs';
import {Worker} from 'node:worker_threads';
import {registerTestMaterial} from './fixtures/test-material-provider.mjs';

test('rejected temporary settings preserve both shared and per-brush state',()=>{
 for(const policy of ['restore','per-brush','shared']){
  const state=new PresetState(referenceBrushes);state.select(referenceBrushes[0].id,policy);state.override({size:40,pressure:{smoothing:.3}});
  const before=state.current(),saved=structuredClone([...state.saved]);
  for(const invalid of [{size:-1},{opacity:NaN},{pressure:{curve:[[0,0],[0,1]]}},{taper:{size:{start:{length:-2}}}}]){
   assert.throws(()=>state.override(invalid));assert.deepEqual(state.current(),before);assert.deepEqual([...state.saved],saved);
  }
  state.override({size:24});assert.equal(state.current().size,24);state.commit();assert.equal(state.saved.get(referenceBrushes[0].id).size,24);
 }
});

test('every exported brush pack can be imported; duplicate identities and invalid resources are rejected',()=>{
 assert.deepEqual(importPresets(exportPresets(referenceBrushes)),referenceBrushes);
 assert.throws(()=>exportPresets([referenceBrushes[0],referenceBrushes[0]]),/duplicate/);
 assert.throws(()=>new PresetState([referenceBrushes[0],referenceBrushes[0]]),/duplicate/);
 assert.throws(()=>new PresetState([]),/empty/);
 const resources={image:{kind:'texture',width:2,height:2,alpha:[0,1,1,0]}};
 assert.throws(()=>compilePreset(createPreset('wrong-tip','tip',{renderer:'stamp',tip:{shape:'mask',resource:'image'},resources})),/incompatible/);
 assert.throws(()=>compilePreset(createPreset('wrong-grain','grain',{renderer:'stamp',texture:{paper:{kind:'image',resource:'image',strength:.5}},resources:{image:{...resources.image,kind:'mask'}}})),/incompatible/);
 assert.throws(()=>compilePreset(createPreset('inherited','tip',{renderer:'stamp',tip:{shape:'mask',resource:'toString'}})),/missing/);
});

test('airbrush, image tip and scattered custom pattern compose common settings and replay exactly',()=>{
 const presets=[
  createPreset('contract-airbrush','time paint',{renderer:'stamp',paint:'build-up',size:20,flow:.08,tip:{hardness:0},spacing:{exposureMs:10},dynamics:[{source:'pressure',target:'flow',min:.1,max:1,mode:'multiply',curve:[[0,0],[1,1]]}]}),
  createPreset('contract-image','image tip',{renderer:'stamp',size:20,tip:{shape:'mask',resource:'tip',aspect:.6,direction:true,twist:true},resources:{tip:{kind:'mask',width:2,height:2,alpha:[0,1,1,0]}},texture:{paper:{kind:'hatch',strength:.5,scale:3}},random:[{target:'rotation',amount:.2}]}),
  createPreset('contract-pattern','custom scattered pattern',{renderer:'stamp',size:24,tip:{shape:'leaf',direction:true},scatter:{enabled:true,radius:.5,density:4,particleSize:.3,rotation:'direction'},random:[{target:'size',amount:.2},{target:'position',amount:.2},{target:'hue',amount:.1}],dynamics:[{source:'velocity',target:'opacity',mode:'multiply',min:.2,max:1,curve:[[0,0],[1,1]],input:[0,1000]}]})
 ];
 for(const p of importPresets(exportPresets(presets))){
  const b=new CanonicalBuilder(p,[17,23]);for(let i=0;i<16;i++)b.accept({x:20+(p.id==='contract-airbrush'?0:i*3),y:40,t:i*10,pressure:.2+i/20,pointerType:'pen',twist:i*.1});b.finish();
  const r=b.record();assert.ok(r.commands.length>1);assert.deepEqual(validateRecord(r),r);assert.ok(r.commands.flat().every(Number.isFinite));
  const cursor=cursorState(p,{x:20,y:40,t:0,pressure:.5,pointerType:'pen'});assert.ok(cursor.size>0);assert.equal(cursor.shape,p.tip.shape);
  if(p.id==='contract-airbrush')assert.ok(r.commands.length>=16,'stationary timed deposits must survive');
 }
});

test('explicit material provider retains source identity, extension settings, pack and replay',()=>{
 const dispose=rendererRegistry.register('contract-provider',{compile(p,context){return compilePreset({...p,kind:'mono',renderer:'stamp',extensions:{},flow:p.extensions.test.flow},context);}});
 try{
  const source=createPreset('provider-source','custom material',{kind:'custom',renderer:'contract-provider',extensions:{test:{flow:.25}}});
  const p=importPresets(exportPresets([source]))[0],b=new CanonicalBuilder(p,[17,23]);b.accept({x:20,y:20,t:0,pointerType:'mouse'});b.accept({x:40,y:30,t:10,pointerType:'mouse'});b.finish();
  const r=b.record();assert.equal(r.foundation.renderer,'contract-provider');assert.equal(r.foundation.extensions.test.flow,.25);assert.deepEqual(validateRecord(r),r);
 }finally{dispose();}
 assert.throws(()=>compilePreset(createPreset('missing','missing',{renderer:'contract-provider'})),/extension required/);
});

test('a provider registered in both main and canonical worker replays without engine changes',async()=>{
 const dispose=registerTestMaterial(),worker=new Worker(new URL('./fixtures/provider-worker.mjs',import.meta.url));
 try{
  const preset=createPreset('worker-provider','custom worker material',{kind:'custom',renderer:'worker-contract-provider',extensions:{test:{flow:.25}}}),seed=[17,23];
  const samples=Array.from({length:16},(_,i)=>({x:20+i*3,y:40,t:i*10,pressure:.5,pointerType:'pen'}));
  const expected=new CanonicalBuilder(preset,seed);samples.forEach(s=>expected.accept(s));expected.finish();
  const actual=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('canonical provider worker timeout')),5000);
   worker.on('error',error=>{clearTimeout(timer);reject(error);});
   worker.on('message',m=>{if(m.type==='error'){clearTimeout(timer);reject(Error(m.message));}if(m.type==='record'){clearTimeout(timer);resolve(m.record);}});
   worker.postMessage({type:'begin',id:1,preset,seed,fast:0,context:{}});worker.postMessage({type:'samples',id:1,samples});worker.postMessage({type:'end',id:1});
  });
  assert.deepEqual(actual,expected.record());assert.deepEqual(validateRecord(actual),actual);
 }finally{dispose();await worker.terminate();}
});
