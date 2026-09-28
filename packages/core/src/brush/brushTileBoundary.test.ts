import {expect,it} from 'vitest';
import {CoreDocument} from '../coreDocument';
import {createDeterministicIdFactory} from '../ids';
import {PointerType,SampleBatchBuilder} from '../input/sample';
import {BrushStrokeSession} from './session';
import {createOpaqueRoundBrushV1} from './style';

it('canonicalizes only tiles touched by a boundary-crossing dab',()=>{
  const d=new CoreDocument({width:512,height:256,ids:createDeterministicIdFactory('boundary')});
  const style=createOpaqueRoundBrushV1({brushId:'edge',brushVersion:1,diameterPx:12,spacingPx:6,color:[100,110,120,255]});
  const b=new SampleBatchBuilder(1);
  b.write(0,1,0,255.5,100.5,0,0,0,1,PointerType.Pen,true,0,0,0);
  const s=new BrushStrokeSession(d,d.defaultRasterLayerId,style);
  s.push(b.seal());
  const result=s.finish();
  if(!result)throw new Error('stroke did not commit');
  expect(result.commit.changedBlockIds).toHaveLength(2);
  expect(d.canonicalBlockCount).toBe(2);
  expect(d.readPixel(d.defaultRasterLayerId,252,100)).toEqual([100,110,120,255]);
  expect(d.readPixel(d.defaultRasterLayerId,258,100)).toEqual([100,110,120,255]);
});
