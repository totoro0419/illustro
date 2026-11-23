import {expect,it} from 'vitest';
import {extractExifPosition,writeExif} from './imagePosition';
import {encodePng} from './basicExport';

it('writes and reads signed position without copying source EXIF fields',async()=>{
  const bytes=writeExif(300,[-33.865143,151.2099]),position=extractExifPosition(bytes)!;
  expect(position[0]).toBeCloseTo(-33.865143,6);
  expect(position[1]).toBeCloseTo(151.2099,6);
  expect(extractExifPosition(bytes.subarray(0,-2))).toBeUndefined();
  const pixels=Uint8ClampedArray.of(30,50,70,255);
  expect(extractExifPosition(new Uint8Array(await (await encodePng(pixels,1,1)).arrayBuffer()))).toBeUndefined();
  const png=await encodePng(pixels,1,1,300,{position});
  expect(extractExifPosition(new Uint8Array(await png.arrayBuffer()))).toEqual(position);
});
