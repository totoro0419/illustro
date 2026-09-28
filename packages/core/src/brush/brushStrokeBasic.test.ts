import {describe,expect,it} from 'vitest';
import {CoreDocument} from '../coreDocument';
import {createDeterministicIdFactory} from '../ids';
import {PointerType,SampleBatchBuilder,SampleValidity} from '../input/sample';
import {BrushStrokeSession} from './session';
import {createOpaqueRoundBrushV1} from './style';

describe('BrushStrokeSession basic',()=>{
  it('commits one stroke as one revision with typed semantics',()=>{
    const d=new CoreDocument({width:1024,height:1024,ids:createDeterministicIdFactory('brush')});
    const style=createOpaqueRoundBrushV1({
      brushId:'basic-round',brushVersion:1,diameterPx:8,minPressureDiameterPx:4,spacingPx:4,
      color:[10,20,30,255],
    });
    const b=new SampleBatchBuilder(3);
    b.write(0,1,0,100.5,100.5,0.5,0,0,1,PointerType.Pen,true,0,0,SampleValidity.Pressure);
    b.write(1,2,1,108.5,100.5,0.5,0,0,1,PointerType.Pen,true,0,0,SampleValidity.Pressure);
    b.write(2,3,2,116.5,100.5,1,0,0,1,PointerType.Pen,true,0,0,SampleValidity.Pressure);

    const stroke=new BrushStrokeSession(d,d.defaultRasterLayerId,style);
    stroke.push(b.seal());
    const result=stroke.finish();

    expect(result).not.toBeNull();
    expect(d.revisionCount).toBe(2);
    expect(d.canonicalBlockCount).toBeGreaterThan(0);
    expect(d.readPixel(d.defaultRasterLayerId,100,100)).toEqual([10,20,30,255]);

    const op=result!.commit.revision.command?.operations.find(x=>x.kind==='brush.stroke');
    expect(op?.kind).toBe('brush.stroke');
    if(!op||op.kind!=='brush.stroke')throw new Error('brush operation missing');
    expect(op.sampleCount).toBe(3);
    expect(op.algorithmVersion).toBe('linear-arc-opaque-round-v1');
    expect(op.dabs.count).toBeGreaterThan(1);
    expect(op.dabs.diameter(0)).toBeCloseTo(6);
  });
});
