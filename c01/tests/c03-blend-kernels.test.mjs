import test from 'node:test';
import assert from 'node:assert/strict';
import {blendRgb,sourceOver,CHANNEL_MODES} from '../app/blend-kernels.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
test('all advertised separable kernels produce bounded finite values',()=>{
 for(const mode of CHANNEL_MODES){
  const result=blendRgb(mode,[0,.3,1],[1,.7,0]);
  assert.equal(result.length,3);
  for(const value of result)assert.ok(Number.isFinite(value)&&value>=0&&value<=1,mode);
 }
});
test('source-over normal transparent and opaque invariants',()=>{
 assert.deepEqual(sourceOver([0,0,0,0],[1,0,0,0]),[0,0,0,0]);
 assert.deepEqual(sourceOver([0,0,1,1],[1,0,0,1]),[1,0,0,1]);
 const mixed=sourceOver([0,0,1,1],[1,0,0,.5]);
 near(mixed[0],.5);near(mixed[1],0);near(mixed[2],.5);near(mixed[3],1);
});
test('multiply opaque reference and zero opacity preserve backdrop',()=>{
 const b=[.8,.6,.4,1],s=[.5,.25,.75,1];
 const result=sourceOver(b,s,'multiply');
 for(let i=0;i<3;i++)near(result[i],b[i]*s[i]);
 assert.deepEqual(sourceOver(b,s,'multiply',0),b);
});
test('unsupported blend never silently falls back to normal',()=>{
 assert.throws(()=>blendRgb('unknown',[0,0,0],[1,1,1]),RangeError);
});
