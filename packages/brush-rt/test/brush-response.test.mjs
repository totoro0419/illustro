import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceBrushes} from '../../../prototypes/brush-rt/dist/rt/foundation.mjs';
import {CanonicalBuilder,validateRecord} from '../../../prototypes/brush-rt/dist/rt/model.mjs';
import {blendArtworkPixel} from '../../../prototypes/brush-rt/dist/rt/layer-blending.mjs';

test('stabilization strength suppresses jitter, anchors the ends, and replays the live geometry',()=>{
 const build=(strength,live)=>{
  const preset=structuredClone(referenceBrushes.find(p=>p.id==='foundation-pencil'));
  preset.stabilization.constant=strength;
  const builder=new CanonicalBuilder(preset,undefined,0,{stabilizationGeometry:'adaptive-v2'});
  for(let i=0;i<70;i++){
   builder.accept({x:20+i*1.4,y:42+(i%2?-2:2),t:i*8,pressure:.6,pointerType:'pen'});
   if(live)builder.ready();
  }
  builder.release({x:118,y:42,t:560,pressure:0,pointerType:'pen'});
  builder.finish();
  return builder.record();
 };
 const records=[0,.45,1].map(strength=>build(strength,true));
 const rms=record=>Math.sqrt(record.geometry.slice(8,-2).reduce((n,p)=>n+(p.y-42)**2,0)/(record.geometry.length-10));
 assert.ok(rms(records[0])>rms(records[1])&&rms(records[1])>rms(records[2]));
 assert.ok(rms(records[2])<rms(records[0])*.5);
 const final=records[2];
 assert.deepEqual([final.geometry[0].x,final.geometry[0].y],[20,44]);
 assert.deepEqual([final.geometry.at(-1).x,final.geometry.at(-1).y],[118,42]);
 assert.deepEqual(build(1,false),final);
 assert.deepEqual(validateRecord(JSON.parse(JSON.stringify(final))),final);
});

test('add glow adds opacity-weighted RGB, clips white and leaves transparent pixels alone',()=>{
 const add=(backdrop,source,alpha=1,space='encoded')=>{
  const dest=Uint8ClampedArray.from(backdrop);
  blendArtworkPixel(dest,0,Uint8Array.from(source),alpha,{mode:'linear-dodge',space,seed:0},0,0);
  return [...dest];
 };
 for(const space of ['encoded','linear'])for(const alpha of [0,128,255]){
  assert.deepEqual(add([25,100,220,alpha],[255,255,255,255],1,space),[255,255,255,255]);
 }
 assert.deepEqual(add([210,40,80,255],[130,100,240,255],.5),[255,90,200,255]);
 assert.deepEqual(add([210,40,80,255],[130,100,240,255],0),[210,40,80,255]);
 assert.deepEqual(add([0,0,0,0],[130,100,240,128],.5),[130,100,240,128]);
 assert.deepEqual(add([80,40,10,128],[20,30,40,255],.5),[67,47,33,192]);
});
