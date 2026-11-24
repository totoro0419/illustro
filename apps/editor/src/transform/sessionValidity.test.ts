import {expect,it} from 'vitest';
import {CoreDocument} from '@illustro/core';
import {transformTargetIsCurrent} from './sessionValidity';
import {liquifyMapping,makeLiquifyStroke} from './liquify';

it('D-013 keeps a preview valid across unrelated edits but rejects real target edits and selection changes',()=>{
  const artwork=new CoreDocument({width:96,height:96}),drawing={},selection={};
  const id=artwork.defaultRasterLayerId;
  const stamp={artwork,drawing,layer:artwork.root.getLayer(id),width:96,height:96,selection,target:'selected' as const};
  const current={artwork,drawing,selectedLayerId:id,selection};
  expect(transformTargetIsCurrent(stamp,current)).toBe(true);
  const tx=artwork.begin('other layer'),other=tx.addRasterLayerAbove(id);
  tx.commit();
  expect(transformTargetIsCurrent(stamp,current)).toBe(true);
  expect(transformTargetIsCurrent(stamp,{...current,selectedLayerId:other})).toBe(false);
  expect(transformTargetIsCurrent(stamp,{...current,selection:{}})).toBe(false);
  const edit=artwork.begin('real external edit');edit.setPixel(id,10,10,[255,0,0,255]);edit.commit();
  expect(transformTargetIsCurrent(stamp,current)).toBe(false);
});
it('D-013 push, expand and pinch create real deformation mapping from a dragged stroke',()=>{
  const points=[{x:20,y:20,pressure:1},{x:30,y:20,pressure:1},{x:40,y:20,pressure:1}];
  for(const mode of ['push','expand','pinch'] as const){
    const stroke=makeLiquifyStroke(mode,25,1,points);
    expect(stroke).not.toBeNull();
    const map=liquifyMapping([stroke!]);
    const at={x:32,y:27};
    const mapped=map.inverse(at.x,at.y);
    expect(Math.hypot(mapped.x-at.x,mapped.y-at.y)).toBeGreaterThan(.1);
    expect(map.inverse(90,90)).toEqual({x:90,y:90});
  }
});
