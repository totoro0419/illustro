import {expect,it} from 'vitest';
import {CoreDocument} from '../coreDocument';
import {createDeterministicIdFactory} from '../ids';
import {PointerType,SampleBatchBuilder,SampleValidity} from '../input/sample';
import {BrushStrokeSession} from './session';
import {createOpaqueRoundBrushV1} from './style';

function firstDiameter(valid:boolean){
  const d=new CoreDocument({width:64,height:64,ids:createDeterministicIdFactory(valid?'valid':'fallback')});
  const style=createOpaqueRoundBrushV1({
    brushId:'pressure',brushVersion:1,diameterPx:10,minPressureDiameterPx:4,spacingPx:5,color:[1,2,3,255],
  });
  const b=new SampleBatchBuilder(1);
  b.write(0,1,0,20.5,20.5,0,0,0,1,PointerType.Pen,true,0,0,valid?SampleValidity.Pressure:0);
  const s=new BrushStrokeSession(d,d.defaultRasterLayerId,style);
  s.push(b.seal());
  const result=s.finish();
  if(!result)throw new Error('stroke did not commit');
  return result.dabs.diameter(0);
}

it('uses base diameter when pressure is unavailable',()=>{
  expect(firstDiameter(false)).toBe(10);
  expect(firstDiameter(true)).toBe(4);
});
