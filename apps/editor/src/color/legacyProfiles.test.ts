import {expect,it} from 'vitest';
import {legacyProfileTransform} from './legacyProfiles';

it('transforms encoded colors and preserves alpha and source bytes',async()=>{
  expect(legacyProfileTransform('sRGB','srgb')).toBeNull();
  expect(()=>legacyProfileTransform('unknown','srgb')).toThrow(/ICC/);
  const convert=legacyProfileTransform('linear-srgb','srgb')!;
  const source=Uint8Array.of(128,0,255,73);
  expect(await convert.pixels(source)).toEqual(Uint8Array.of(188,0,255,73));
  expect(source).toEqual(Uint8Array.of(128,0,255,73));
  expect(convert.hex('#8000ff')).toBe('#bc00ff');
  const color=legacyProfileTransform('display-p3','srgb')!.color([.5,.5,.5]);
  for(const channel of color)expect(channel).toBeCloseTo(.5,5);
});
