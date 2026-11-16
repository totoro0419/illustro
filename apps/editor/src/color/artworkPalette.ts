/**
 * C04-004: portable per-artwork palette section for the .illustro container.
 * The caller (document save/load owner) decides when to attach or restore it.
 * Workspace palettes are NOT implicitly copied or changed by reading.
 */
import type {DecodedPortableFile,PortableSectionInput} from '../persistence/format';
import {exportPalette,parsePalette,type Palette} from './model';

export const ARTWORK_PALETTE_SECTION_ID='c04.artwork-palette.v1';
export const ARTWORK_PALETTE_SECTION_TYPE='illustro.color.palette.v1';

/** A non-required section keeps older files and readers compatible. */
export function createArtworkPaletteSection(palette:Palette):PortableSectionInput{
  const payload=exportPalette(palette);
  if(payload.length>262144)throw new Error('作品用パレットは256KBまでです。');
  return {
    id:ARTWORK_PALETTE_SECTION_ID,
    type:ARTWORK_PALETTE_SECTION_TYPE,
    required:false,
    bytes:new TextEncoder().encode(payload),
  };
}

/** Returns null for older documents without a palette; malformed data is rejected. */
export function readArtworkPaletteSection(sections:DecodedPortableFile['sections']):Palette|null{
  const item=sections.get(ARTWORK_PALETTE_SECTION_ID);
  if(!item)return null;
  if(item.descriptor.type!==ARTWORK_PALETTE_SECTION_TYPE)
    throw new Error('作品用パレットの形式が正しくありません。');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(item.bytes);
  return parsePalette(text);
}
