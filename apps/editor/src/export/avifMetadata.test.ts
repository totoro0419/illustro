import {expect,it} from 'vitest';
import {encodeAvifMetadata,isoBoxes,isoExif} from './avifMetadata';
import {extractExifPosition} from './imagePosition';
import {extractIsoImageIcc} from './isoImageIcc';
import {srgbIccBytes} from './iccMetadata';

// 2×2 libavif output, with a separate alpha image item.
const source=Uint8Array.from(atob('AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUEAAAGNbWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAsaWxvYwAAAABEAAACAAEAAAABAAAB3QAAAG8AAgAAAAEAAAG1AAAAKAAAAEJpaW5mAAAAAAACAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAAAaaW5mZQIAAAAAAgAAYXYwMUFscGhhAAAAABppcmVmAAAAAAAAAA5hdXhsAAIAAQABAAAAw2lwcnAAAACdaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgSAAAAAAABNjb2xybmNseAACAAIAAIAAAAAOcGl4aQAAAAABCAAAAAxhdjFDgQAcAAAAADhhdXhDAAAAAHVybjptcGVnOm1wZWdCOmNpY3A6c3lzdGVtczphdXhpbGlhcnk6YWxwaGEAAAAAHmlwbWEAAAAAAAAAAgABBAECgwQAAgQBBYYHAAAAn21kYXQSAAoEGAA2FTIeEABuAR////hnmNUoHcz7ft+37ft+37ft+37ft/FAEgAKBzgANhAgIAkyYhAAAIyBp////glSrXV1OLC75WqU1VBgmABaxZ/////////SCVl1MKUwpNusVFMKTbpwTFRNunBHBHBHBHBRsQg//////hygEqGJCx82eLIhiUihNnix82dNnTZ02dNnTZ8U'),c=>c.charCodeAt(0));

it('stores ICC, EXIF and XMP while preserving both encoded image extents',()=>{
  const profile=srgbIccBytes();
  const output=encodeAvifMetadata(source,{position:[35.4,139.7],dpi:144,profile,author:'Illustro'});
  expect(extractIsoImageIcc(output)).toEqual(profile);
  const position=extractExifPosition(isoExif(output)!)!;
  expect(position[0]).toBeCloseTo(35.4,7);expect(position[1]).toBeCloseTo(139.7,7);
  expect(new TextDecoder().decode(output)).toContain('<rdf:li>Illustro</rdf:li>');
  const [,before,originalData]=isoBoxes(source),[,after,updatedData]=isoBoxes(output);
  expect(output.slice(updatedData!.body,updatedData!.body+originalData!.end-originalData!.body))
    .toEqual(source.slice(originalData!.body,originalData!.end));
  const extent=(bytes:Uint8Array,meta:typeof after)=>{
    const dir=isoBoxes(bytes,meta!.body+4,meta!.end).find(item=>item.type==='iloc')!;
    const view=new DataView(bytes.buffer);
    return [0,1].map(i=>view.getUint32(dir.body+14+i*14));
  };
  expect(extent(output,after)).toEqual(extent(source,before).map(offset=>offset+after!.end-before!.end));
});
