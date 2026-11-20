import {describe,expect,it,vi} from 'vitest';
import type {EditableText} from '@illustro/core';
import {parseWoff2Outline} from './woff2Outline';
import {fontOutlineCapability,outlineText} from './fonts';
import {getAsset,type AssetEntry} from '../assets/library';
vi.mock('../assets/library',()=>({getAsset:vi.fn(),addAsset:vi.fn(),listAssets:vi.fn()}));
// Self-authored 4-glyph font: A/B have lines and a quadratic curve, no external font data.
const encoded='d09GMgABAAAAAAFgAAoAAAAAAwgAAAEWAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAAPApASgE2AiQDCgsKAAQgBYFAByobUwIArgp4MnyUQ6wRpqn2qh4mAsJ+xioiiMba7N6iGk2qWLNGaN+IlEao1Ailmkby6Tat/xB8O57okBAGgTmwQXggefXGSnC+fGCTLoTdp8cVQRSA54E1DyyNYwnsfqMT3g/AhzrZXxONfSEUc6KWg8iQEhyA8+9gzVWjn9HWPAIA1kCiYVETWFT2MKyEtOaqd6y57L0/9QQACowiMYpZQAEIUTVx8zagHFz379XbIBDcPvyx+S/aJ3xs2lo7IAc5mgTBfupV4iB3BIiF+2ogUEqABADAuDsDhBkESCNmBGhmEKB6Gp6aqDFhxbIkTTvqzesFDsd14B+tWaOL6SeqbkMMAH0lPSq0Qskt7iI40pSspvQt2wAAAA==';
const bytes=()=>Uint8Array.from(atob(encoded),char=>char.charCodeAt(0));
const text:EditableText={kind:'text',text:'AB',origin:{x:10,y:20},size:100,family:'Fixture',
 fontAsset:'fixture',vertical:false,color:'#123456',align:'left',spacing:0,lineHeight:1.2};
describe('C10-014 WOFF2 vector outlines',()=>{
 it('decodes actual WOFF2 glyphs, advances and quadratic curves into canvas coordinates',async()=>{
  const font=await parseWoff2Outline(bytes());
  expect(font.unitsPerEm).toBe(1000);expect(font.ascender).toBe(800);
  expect(font.getAdvanceWidth('AB',100)).toBe(120);
  expect(font.charToGlyphIndex('A')).not.toBe(0);expect(font.charToGlyphIndex('X')).toBe(0);
  const commands=font.getPath('A',10,50,100).commands;
  expect(commands[0]).toMatchObject({type:'M',x:15,y:50});
  expect(commands.find(c=>c.type==='Q')).toMatchObject({x1:70,y1:10,x:65,y:50});
  expect(commands.at(-1)?.type).toBe('Z');
 });
 it('uses the same cached decoded font for capability checks and final outlining',async()=>{
  const data=new Blob([bytes()]),read=vi.spyOn(data,'arrayBuffer');
  vi.mocked(getAsset).mockResolvedValue({id:'fixture',kind:'font',version:1,updatedAt:1,data} as AssetEntry);
  expect(await fontOutlineCapability('fixture')).toBeNull();
  expect(await fontOutlineCapability('fixture')).toBeNull();
  const path=await outlineText(text);
  expect(path.fill).toBe('#123456');expect(path.points.length).toBeGreaterThan(3);
  expect(path.points.some(p=>p.outX!==undefined)).toBe(true);expect(read).toHaveBeenCalledTimes(1);
  await expect(outlineText({...text,text:'X'})).rejects.toThrow('一部の文字');
 });
 it('rejects malformed WOFF2 and does not keep failed font data in the cache',async()=>{
  vi.mocked(getAsset).mockResolvedValue({id:'retry',kind:'font',version:1,updatedAt:1,data:new Blob(['wOF2invalid'])} as AssetEntry);
  expect(await fontOutlineCapability('retry')).toContain('読み取れません');
  vi.mocked(getAsset).mockResolvedValue({id:'retry',kind:'font',version:1,updatedAt:1,data:new Blob([bytes()])} as AssetEntry);
  expect(await fontOutlineCapability('retry')).toBeNull();
 });
});
