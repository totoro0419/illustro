import {describe,it,expect} from 'vitest';
import {CoreDocument} from '@illustro/core';
import {createPortableDocument,openPortableDocument} from '../persistence/portable';
import {
  DOCUMENT_PALETTE_SECTION,DOCUMENT_PALETTE_TYPE,
  ForegroundColor,fromHex,hex
} from './model';

describe('C04-004 artwork-specific palette portability',()=>{
  it('does not mix two artworks or leak a work palette into global preferences',()=>{
    const color=new ForegroundColor(false);
    color.bindDocumentPalette('artwork-A');
    color.choose(fromHex('#F17A00')!);color.addSwatch();
    const section=color.exportDocumentPaletteSection();
    expect(section?.id).toBe(DOCUMENT_PALETTE_SECTION);
    expect(section?.type).toBe(DOCUMENT_PALETTE_TYPE);
    expect(color.availablePalettes).toHaveLength(2);
    expect(color.palettes[0]?.swatches).toHaveLength(0);
    color.bindDocumentPalette('artwork-B');
    expect(color.palette.swatches).toHaveLength(0);
    color.bindDocumentPalette('artwork-A',section);
    expect(color.palette.swatches.map(sw=>hex(sw.color))).toEqual(['#F17A00']);
    expect(color.palettes[0]?.swatches).toHaveLength(0);
  });
  it('round-trips private swatch order and tags through a real .illustro container',async()=>{
    const artwork=new CoreDocument({width:32,height:32,name:'移動する絵'});
    const original=new ForegroundColor(false);
    original.bindDocumentPalette(artwork.root.documentId);
    original.choose(fromHex('#123ABC')!);original.addSwatch();
    original.choose(fromHex('#FFAA00')!);original.addSwatch();
    const ids=original.palette.swatches.map(item=>item.id);
    original.setSwatchTags(ids[0]!,['人物','影']);
    original.moveSwatch(ids[0]!,1);
    const section=original.exportDocumentPaletteSection();
    expect(section).not.toBeNull();
    const portable=await createPortableDocument({
      document:artwork,selectedLayerId:artwork.defaultRasterLayerId,
      preserved:{manifestExtras:{},optionalSections:[section!]},
    });
    const reopened=await openPortableDocument(portable.bytes);
    const recoveredSection=reopened.preserved.optionalSections.find(item=>item.id===DOCUMENT_PALETTE_SECTION);
    expect(recoveredSection?.type).toBe(DOCUMENT_PALETTE_TYPE);
    const restored=new ForegroundColor(false);
    restored.bindDocumentPalette(reopened.document.root.documentId,recoveredSection);
    expect(restored.palette.swatches.map(sw=>hex(sw.color))).toEqual(['#FFAA00','#123ABC']);
    expect(restored.palette.swatches[1]?.tags).toEqual(['人物','影']);
    expect(restored.palettes[0]?.swatches).toHaveLength(0);
  });
  it('refuses corrupt native palette without altering personal palettes',()=>{
    const colors=new ForegroundColor(false);
    const corrupted={id:DOCUMENT_PALETTE_SECTION,type:DOCUMENT_PALETTE_TYPE,required:false,
      bytes:new TextEncoder().encode('{"format":"illustro-palette","version":1,"name":"broken","swatches":[{}]}')};
    expect(()=>colors.bindDocumentPalette('work-1',corrupted)).toThrow('色');
    expect(colors.palettes[0]?.swatches).toHaveLength(0);
    colors.bindDocumentPalette('work-1');
    expect(colors.palette.swatches).toHaveLength(0);
  });
});
