import {expect,it} from 'vitest';
import {extractIsoImageIcc} from './isoImageIcc';
import {srgbIccBytes} from './iccMetadata';
import {encodeTiff,decodeTiff} from './tiff';

function box(type:string,...parts:Uint8Array[]){
  const bytes=new Uint8Array(8+parts.reduce((sum,part)=>sum+part.length,0));
  new DataView(bytes.buffer).setUint32(0,bytes.length);
  bytes.set(new TextEncoder().encode(type),4);
  let offset=8;
  for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  return bytes;
}

it('uses the profile associated with the primary AVIF or HEIF item',()=>{
  const profile=srgbIccBytes(),other=new Uint8Array(profile);other[67]=other[67]!^1;
  const prefix=new TextEncoder().encode('prof');
  const container=box('ipco',box('colr',prefix,other),box('colr',prefix,profile));
  const table=box('ipma',Uint8Array.of(0,0,0,0,0,0,0,2,0,1,1,129,0,2,1,130));
  const candidate=box('meta',new Uint8Array(4),box('pitm',Uint8Array.of(0,0,0,0,0,2)),box('iprp',container,table));
  expect(extractIsoImageIcc(candidate)).toEqual(profile);
  expect(extractIsoImageIcc(candidate.subarray(0,-1))).toBeNull();
});

it('preserves TIFF ICC, text and density alongside the original alpha',()=>{
  const profile=srgbIccBytes(),pixels=Uint8ClampedArray.of(225,10,40,127);
  const file=encodeTiff(pixels,1,1,300,{profile,author:'作者',copyright:'利用条件'});
  const decoded=decodeTiff(file);
  expect(decoded.sourceIcc).toEqual(profile);
  expect(decoded.pixels).toEqual(pixels);
  expect(decoded.dpi).toBe(300);
  expect(new TextDecoder().decode(file)).toContain('利用条件');
});
