import {describe,expect,it} from 'vitest';
import {decodeIllustroFile,encodeIllustroFile} from '../persistence/format';
import {ARTWORK_PALETTE_SECTION_ID,createArtworkPaletteSection,readArtworkPaletteSection} from './artworkPalette';
import {ForegroundColor,fromHex,hex} from './model';

describe('C04-004 portable artwork palette',()=>{
 it('survives a real .illustro section encode/decode with ordered, exact colors',async()=>{
  const colors=new ForegroundColor(false);
  colors.createPalette('作品専用');
  for(const code of ['#000000','#80A3FF','#FFFFFF']){
    colors.choose(fromHex(code)!);
    colors.addSwatch();
  }
  const snapshot=createArtworkPaletteSection(colors.palette);
  expect(snapshot.required).toBe(false);
  expect(snapshot.id).toBe(ARTWORK_PALETTE_SECTION_ID);
  const encoded=await encodeIllustroFile({
    generationId:'test',documentId:'work',snapshotRevisionId:'rev',createdAt:1,
    sections:[snapshot],
  });
  const decoded=await decodeIllustroFile(encoded);
  const restored=readArtworkPaletteSection(decoded.sections);
  expect(restored?.name).toBe('作品専用');
  expect(restored?.swatches.map(s=>hex(s.color))).toEqual(['#000000','#80A3FF','#FFFFFF']);
 });
 it('does not assume old artwork contains a palette',()=>{
  expect(readArtworkPaletteSection(new Map())).toBeNull();
 });
 it('rejects an invalid palette section without overwriting workspace state',()=>{
  const section=createArtworkPaletteSection(new ForegroundColor(false).palette);
  const entry={
    descriptor:{type:section.type},
    bytes:new TextEncoder().encode('not-json'),
  };
  const sections=new Map([[ARTWORK_PALETTE_SECTION_ID,entry]]);
  expect(()=>readArtworkPaletteSection(sections as never)).toThrow();
 });
});
