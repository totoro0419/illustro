import {expect,it} from 'vitest';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {extractRasterIcc} from './rasterIcc';
import {srgbIccBytes} from './iccMetadata';
import {addRasterMetadata} from './rasterMetadata';

it.each(['jpeg','webp'] as const)('writes %s metadata without corrupting the image',async format=>{
  const canvas=createCanvas(8,5),context=canvas.getContext('2d');
  context.fillStyle='#c83210';context.fillRect(0,0,5,5);
  const input=new Blob([new Uint8Array(await canvas.encode(format))],{type:format==='jpeg'?'image/jpeg':'image/webp'});
  const profile=srgbIccBytes();
  const result=await addRasterMetadata(input,format,8,5,{profile,dpi:300,author:'作者 & 友人',copyright:'© Illustro'});
  const bytes=new Uint8Array(await result.arrayBuffer());
  const image=await loadImage(bytes);
  expect([image.width,image.height]).toEqual([8,5]);
  expect(await extractRasterIcc(bytes)).toEqual(profile);
  expect(new TextDecoder().decode(bytes)).toContain('作者 &amp; 友人');
  expect(new TextDecoder().decode(bytes)).toContain('© Illustro');
  if(format==='jpeg')expect(new DataView(bytes.buffer).getUint16(14)).toBe(300);
  else expect(new TextDecoder().decode(bytes)).toContain('EXIF');
});
