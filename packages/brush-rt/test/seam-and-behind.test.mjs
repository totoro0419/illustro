import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CanonicalBuilder,cpuReference,referenceBrushes,validateRecord} from '../dist/rt/index.mjs';
import {parameters} from '../dist/rt/renderer.mjs';
const sample=(x,y,t)=>({x,y,t,pressure:1,pointerType:'pen'});
test('a saturated stroke wraps across multiple cells and remains one replayable stroke',()=>{
 const preset=structuredClone(referenceBrushes[0]);preset.forceFade.enabled=false;preset.stabilization.constant=0;
 const builder=new CanonicalBuilder(preset,[1,2],0,{wrapDimensions:[24,24]});
 builder.accept(sample(6,12,0));builder.accept(sample(89,12,90));builder.finish();
 const record=builder.record(),pixels=cpuReference(record,24,24);
 for(let x=0;x<24;x++)assert.ok(pixels[(12*24+x)*4+3]>100);
 assert.deepEqual(validateRecord(record).commands,record.commands);
 assert.equal(pixels[(2*24+7)*4+3],0);
});
test('behind paints into transparency and leaves opaque paint and alpha locks intact',()=>{
 const preset=structuredClone(referenceBrushes[0]);preset.forceFade.enabled=false;preset.color=[1,0,0];
 const make=alphaLocked=>{
  const builder=new CanonicalBuilder(preset,[1,2],0,{paintBehind:true,...(alphaLocked?{alphaLocked}:{} )});
  builder.accept(sample(4,4,0));builder.finish();return validateRecord(builder.record());
 };
 const record=make(false),pixel=(3*8+3)*4,base=new Uint8ClampedArray(8*8*4);
 base.set([0,0,255,255],pixel);
 const result=cpuReference(record,8,8,base);
 assert.deepEqual([...result.slice(pixel,pixel+4)],[0,0,255,255]);
 assert.ok(result[(4*8+4)*4]>0);
 assert.equal(parameters(record.preset)[13],8);
 const locked=make(true);
 assert.deepEqual(cpuReference(locked,8,8,base),base);
 assert.equal(parameters(locked.preset)[13],7);
});
