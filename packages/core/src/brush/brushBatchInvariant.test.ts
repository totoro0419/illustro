import {expect,it} from 'vitest';
import {CoreDocument} from '../coreDocument';
import {createDeterministicIdFactory} from '../ids';
import {PointerType,SampleBatchBuilder,SampleValidity} from '../input/sample';
import {BrushStrokeSession} from './session';
import {createOpaqueRoundBrushV1} from './style';

const samples=[
  [1,0,10.5,10.5,0.25],
  [2,1,14.5,10.5,0.5],
  [3,2,18.5,14.5,0.75],
  [4,3,24.5,14.5,1],
] as const;

function makeBatch(from:number,to:number){
  const b=new SampleBatchBuilder(to-from);
  for(let i=from;i<to;i++){
    const s=samples[i]!;
    b.write(i-from,s[0],s[1],s[2],s[3],s[4],0,0,1,PointerType.Pen,true,0,0,SampleValidity.Pressure);
  }
  return b.seal();
}

function run(split:boolean){
  const d=new CoreDocument({width:128,height:128,ids:createDeterministicIdFactory(split?'split':'one')});
  const style=createOpaqueRoundBrushV1({brushId:'b',brushVersion:1,diameterPx:6,minPressureDiameterPx:3,spacingPx:3,color:[50,60,70,255]});
  const s=new BrushStrokeSession(d,d.defaultRasterLayerId,style);
  if(split){s.push(makeBatch(0,2));s.push(makeBatch(2,4));}
  else s.push(makeBatch(0,4));
  const result=s.finish();
  if(!result)throw new Error('stroke did not commit');
  return {d,result};
}

it('is invariant to normalized input batch boundaries',()=>{
  const a=run(false),b=run(true);
  expect(a.result.dabs.toFloat64Array()).toEqual(b.result.dabs.toFloat64Array());
  expect(a.result.sampleCount).toBe(b.result.sampleCount);
  expect(a.d.readPixel(a.d.defaultRasterLayerId,14,10)).toEqual(b.d.readPixel(b.d.defaultRasterLayerId,14,10));
});
