import {expect,it} from 'vitest';
import {CoreDocument} from '../coreDocument';
import {createDeterministicIdFactory} from '../ids';
import {PointerType,SampleBatchBuilder} from '../input/sample';
import {BrushStrokeSession} from './session';
import {createOpaqueRoundBrushV1} from './style';

function style(){
  return createOpaqueRoundBrushV1({brushId:'cancel',brushVersion:1,diameterPx:6,spacingPx:3,color:[9,8,7,255]});
}
function one(sequence:number,x:number,y:number){
  const b=new SampleBatchBuilder(1);
  b.write(0,sequence,sequence,x,y,0,0,0,1,PointerType.Mouse,true,0,0,0);
  return b.seal();
}

it('does not publish cancelled or fully outside strokes',()=>{
  const d=new CoreDocument({width:64,height:64,ids:createDeterministicIdFactory('cancel')});
  const s=new BrushStrokeSession(d,d.defaultRasterLayerId,style());
  s.push(one(1,20.5,20.5));
  s.cancel();
  expect(d.revisionCount).toBe(1);
  expect(d.canonicalBlockCount).toBe(0);

  const outside=new BrushStrokeSession(d,d.defaultRasterLayerId,style());
  outside.push(one(2,-100,-100));
  expect(outside.finish()).toBeNull();
  expect(d.revisionCount).toBe(1);
  expect(d.canonicalBlockCount).toBe(0);
});

it('rejects duplicate sample sequence and requires explicit cancel',()=>{
  const d=new CoreDocument({width:64,height:64,ids:createDeterministicIdFactory('sequence')});
  const s=new BrushStrokeSession(d,d.defaultRasterLayerId,style());
  s.push(one(1,10.5,10.5));
  expect(()=>s.push(one(1,12.5,10.5))).toThrow(/strictly increasing/);
  expect(()=>s.finish()).toThrow(/failed/);
  s.cancel();
  expect(d.revisionCount).toBe(1);
  expect(d.canonicalBlockCount).toBe(0);
});
