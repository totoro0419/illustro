import {describe,it,expect,vi} from 'vitest';
import {create,type OutlineFont} from 'fontkit';
import {CoreDocument,type EditableText} from '@illustro/core';
import {nativeVerticalGlyph} from './verticalFont';
import {verticalFontFixtures} from './verticalFont.fixture';
import {verticalTextUnits} from './verticalGlyph';
import {layoutEditableText} from './textLayout';
import {layoutStyledText} from './textStyles';
import {outlineText,verticalTextForRendering} from './fonts';
import {getAsset,type AssetEntry} from '../assets/library';
vi.mock('../assets/library',()=>({getAsset:vi.fn(),addAsset:vi.fn(),listAssets:vi.fn()}));
const bytes=(encoded:string)=>Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
const text:EditableText={kind:'text',text:'、ゃー「A12',origin:{x:60,y:10},vertical:true,size:30,
 family:'IllustroFont-vertical',fontAsset:'vertical',color:'#123456',align:'left',spacing:2,lineHeight:1.2,combineDigits:true};
describe('C10-010 native vertical OpenType layout',()=>{
 it('uses actual vert substitutions and vmtx bearings from two distinct fonts',()=>{
  const fonts=verticalFontFixtures.map(encoded=>create(bytes(encoded)) as OutlineFont);
  for(const font of fonts)for(const character of ['、','ゃ','ー','「']){
   const expected=font.layout(character,{vert:true,kern:false});
   expect(expected.glyphs[0]?.id).not.toBe(font.glyphForCodePoint(character.codePointAt(0)!).id);
   const commands=nativeVerticalGlyph(font,character,40)!;
   expect(commands[0]?.type).toBe('M');
   expect(commands[0]?.y).toBeCloseTo((font===fonts[0]?180:280)*.04);
  }
  expect(nativeVerticalGlyph(fonts[0]!,'、',40)).not.toEqual(nativeVerticalGlyph(fonts[1]!,'、',40));
  expect(nativeVerticalGlyph(fonts[0]!,'A',40)).toBeNull();
  expect(nativeVerticalGlyph(fonts[0]!,'12',40)).toBeNull();
 });
 it('safely falls back for missing vertical data, invalid metrics and unsupported fonts',()=>{
  const font=create(bytes(verticalFontFixtures[0])) as OutlineFont;
  expect(nativeVerticalGlyph({...font,availableFeatures:[]} as OutlineFont,'、',30)).toBeNull();
  expect(nativeVerticalGlyph({...font,unitsPerEm:0} as OutlineFont,'、',30)).toBeNull();
  expect(nativeVerticalGlyph(font,'X',30)).toBeNull();
  expect(nativeVerticalGlyph(font,'、',NaN)).toBeNull();
 });
 it('groups only opted-in pairs, respects frames, spacing and partial-format boundaries',()=>{
  expect(verticalTextUnits('日12本1234語A56',true)).toEqual(['日','12','本','1','2','3','4','語','A','56']);
  expect(verticalTextUnits('12',false)).toEqual(['1','2']);
  expect(verticalTextUnits('12',true,[1])).toEqual(['1','2']);
  expect(layoutEditableText({...text,text:'日12本',boxHeight:62},()=>0).lines).toEqual(['日12','本']);
  const styled=layoutStyledText({...text,text:'日12本',styleRanges:[{start:1,end:2,color:'#ff0000'}]},()=>20);
  expect(styled.lines[0]!.glyphs.map(g=>g.character)).toEqual(['日','1','2','本']);
 });
 it('shares exact geometry between native text painting and outline export, including colored sizes',async()=>{
  const data=new Blob([bytes(verticalFontFixtures[0])]);
  vi.mocked(getAsset).mockResolvedValue({id:'vertical',kind:'font',version:1,updatedAt:1,data} as AssetEntry);
  for(const styled of [text,{...text,styleRanges:[{start:0,end:2,color:'#ff0000',size:22}]}]){
   const exported=await outlineText(styled),painted=await verticalTextForRendering(styled);
   expect(painted).toEqual(exported);
   expect(exported.points.length).toBeGreaterThan(20);
   const {fontAsset:_asset,...withoutFont}=styled;
   expect(await verticalTextForRendering(withoutFont)).toBeNull();
  }
  const doc=new CoreDocument({width:100,height:300}),id=doc.defaultRasterLayerId;
  const tx=doc.begin('vertical text');tx.setEditableArtwork(id,text);tx.commit();
  const snapshot=doc.capturePersistenceSnapshot(),restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(snapshot)),blockPayloads:doc.persistenceBlockPayloads(snapshot)});
  expect(restored.root.getLayer(id).editable).toEqual(text);
 });
});
