import {expect,it} from 'vitest';
import {encodePng} from './basicExport';
import {srgbIccBytes} from './iccMetadata';
import {extractRasterIcc} from './rasterIcc';

it('extracts a PNG profile with its original bytes',async()=>{
  const image=await encodePng(new Uint8ClampedArray([12,34,56,255]),1,1,72,{includeIcc:true});
  expect(await extractRasterIcc(new Uint8Array(await image.arrayBuffer()))).toEqual(srgbIccBytes());
  const standard=await encodePng(new Uint8ClampedArray([0,0,0,0]),1,1);
  expect(await extractRasterIcc(new Uint8Array(await standard.arrayBuffer()))).toBeNull();
});

it('reassembles out-of-order JPEG profile segments and rejects missing pieces',async()=>{
  const icc=srgbIccBytes(),signature=new TextEncoder().encode('ICC_PROFILE\0');
  function marker(sequence:number,part:Uint8Array){
    const length=16+part.length;
    return [255,226,length>>8,length&255,...signature,sequence,2,...part];
  }
  const first=marker(1,icc.subarray(0,100)),last=marker(2,icc.subarray(100));
  expect(await extractRasterIcc(Uint8Array.of(255,216,...last,...first,255,218))).toEqual(icc);
  await expect(extractRasterIcc(Uint8Array.of(255,216,...last,255,218))).rejects.toThrow();
});

it('reads a WebP ICC chunk without interpreting it as pixels',async()=>{
  const icc=srgbIccBytes(),data=new Uint8Array(20+icc.length+(icc.length&1));
  data.set(new TextEncoder().encode('RIFF'),0);data.set(new TextEncoder().encode('WEBPICCP'),8);
  const view=new DataView(data.buffer);
  view.setUint32(4,data.length-8,true);view.setUint32(16,icc.length,true);data.set(icc,20);
  expect(await extractRasterIcc(data)).toEqual(icc);
});
