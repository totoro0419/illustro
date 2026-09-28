import {expect,it} from 'vitest';
import {CoreDocument} from '../coreDocument';
import {createDeterministicIdFactory} from '../ids';
import {PointerType,SampleBatchBuilder,SampleProvenance} from '../input/sample';
import {BrushStrokeSession} from './session';
import {createOpaqueRoundBrushV1} from './style';

const style=createOpaqueRoundBrushV1({brushId:'guard',brushVersion:1,diameterPx:6,spacingPx:3,color:[1,2,3,255]});

it('rejects predicted samples from canonical stroke input',()=>{
  const d=new CoreDocument({width:64,height:64,ids:createDeterministicIdFactory('predicted')});
  const b=new SampleBatchBuilder(1);
  b.write(0,1,0,10.5,10.5,0,0,0,1,PointerType.Pen,true,0,0,SampleProvenance.Predicted);
  const s=new BrushStrokeSession(d,d.defaultRasterLayerId,style);
  expect(()=>s.push(b.seal())).toThrow(/predicted/);
  s.cancel();
  expect(d.revisionCount).toBe(1);
  expect(d.canonicalBlockCount).toBe(0);
});

it('rejects a locked raster target before stroke state is created',()=>{
  const d=new CoreDocument({width:64,height:64,ids:createDeterministicIdFactory('locked')});
  const lock=d.begin('lock layer');
  lock.setLayerLocked(d.defaultRasterLayerId,true);
  lock.commit();
  expect(()=>new BrushStrokeSession(d,d.defaultRasterLayerId,style)).toThrow(/locked/);
  expect(d.revisionCount).toBe(2);
  expect(d.canonicalBlockCount).toBe(0);
});
