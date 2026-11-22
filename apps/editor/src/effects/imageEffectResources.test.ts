import {expect,it} from 'vitest';
import {newEffect,readEffectSteps} from './rasterSettings';
import {applyRasterEffects} from './rasterFilters';
import {parseCube} from './imageEffectResources';

it('uses a saved 3D color table with red changing fastest and preserves alpha and selection',()=>{
  const lut=parseCube('LUT_3D_SIZE 2\n0 0 0\n0 1 0\n1 0 0\n1 1 0\n0 0 1\n0 1 1\n1 0 1\n1 1 1','swap.cube');
  const values=Uint8Array.of(255,32,0,64,0,255,0,255);
  const recipe=readEffectSteps(JSON.parse(JSON.stringify([{...newEffect('lut'),resource:lut}])))!;
  expect(applyRasterEffects(values,2,1,recipe,Uint8Array.of(255,0))).toEqual(Uint8ClampedArray.of(32,255,0,64,0,255,0,255));
});
it('uses the saved reference red channel for horizontal displacement with transparent or wrapped edges',()=>{
  const source=Uint8Array.of(20,40,60,255,70,80,90,128);
  const resource={kind:'displacement' as const,width:1,height:1,name:'test.png',bytes:btoa(String.fromCharCode(255,128))};
  expect(applyRasterEffects(source,2,1,[{...newEffect('displace'),values:[1,0,1,0],resource}],null))
    .toEqual(Uint8ClampedArray.of(70,80,90,128,0,0,0,0));
  expect(applyRasterEffects(source,2,1,[{...newEffect('displace'),values:[1,0,0,0],resource}],null))
    .toEqual(Uint8ClampedArray.of(70,80,90,128,20,40,60,255));
  expect(readEffectSteps([{...newEffect('displace'),resource:{...resource,bytes:'bad'}}])).toBeNull();
});
