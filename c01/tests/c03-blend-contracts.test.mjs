import test from 'node:test';
import assert from 'node:assert/strict';
import {blendRgb,sourceOver,NONSEPARABLE_MODES,BLEND_MODES} from '../app/blend-kernels.mjs';
import {blendIfMembership,blendIfChannel,blendIfWeights,blendIfHistogram} from '../app/blend-if.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('NDE-001 W3C boundary semantics',()=>{
 near(blendRgb('color-dodge',[0,.5,1],[1,1,1])[0],0);
 near(blendRgb('color-burn',[1,.5,0],[0,0,0])[0],1);
 near(blendRgb('divide',[0,.7,1],[0,0,0])[0],1);
 assert.equal(BLEND_MODES.length,24);
});
test('NDE-001 non-separable neutral/reference invariants',()=>{
 for(const mode of NONSEPARABLE_MODES){
  const values=blendRgb(mode,[.25,.5,.75],[.75,.1,.4]);
  assert.equal(values.length,3);
  assert.ok(values.every(v=>v>=0&&v<=1&&Number.isFinite(v)),mode);
 }
 const b=[.2,.5,.8],s=[.9,.3,.4];
 for(const mode of ['hue','saturation','color'])near(blendRgb(mode,b,s).reduce((a,v,i)=>a+v*[.3,.59,.11][i],0),b.reduce((a,v,i)=>a+v*[.3,.59,.11][i],0));
 near(blendRgb('luminosity',b,s).reduce((a,v,i)=>a+v*[.3,.59,.11][i],0),s.reduce((a,v,i)=>a+v*[.3,.59,.11][i],0));
 assert.deepEqual(sourceOver([0,0,0,0],[1,0,0,0],'hue'),[0,0,0,0]);
});
test('NDE-002 neutral full coverage and split handles',()=>{
 for(const v of [0,.1,.5,.9,1])near(blendIfMembership(v),1);
 const range={low0:.2,low1:.4,high0:.6,high1:.8};
 near(blendIfMembership(.1,range),0);near(blendIfMembership(.3,range),.5);
 near(blendIfMembership(.5,range),1);near(blendIfMembership(.7,range),.5);
 near(blendIfMembership(.9,range),0);
 assert.equal(blendIfMembership(1,{low0:0,low1:0,high0:.5,high1:.5}),0);
 assert.throws(()=>blendIfMembership(.3,{low0:.6,low1:.5,high0:.8,high1:1}),RangeError);
});
test('NDE-002 source/backdrop independence and luminance',()=>{
 const b=[.2,.2,.2,1],s=[.8,.8,.8,1];
 const r=blendIfWeights(b,s,{sourceRange:{low0:.7,low1:.7,high0:1,high1:1},backdropRange:{low0:0,low1:0,high0:.4,high1:.4}});
 near(r.source,1);near(r.backdrop,1);
 near(blendIfChannel([.5,.5,.5],'luminance','encoded'),.5);
 assert.equal(blendIfHistogram([b,s,[1,1,1,0]],{bins:4}).reduce((a,b)=>a+b),2);
});
