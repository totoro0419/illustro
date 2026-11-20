import {describe,expect,it} from 'vitest';
import {alignedTextLineStart,textRowTop,textVerticalCell} from './textPlacement';
const base={origin:{x:120,y:80},align:'center' as const,size:20,lineHeight:1.5,spacing:2};
describe('C10-012 consistent Canvas and outline text coordinates',()=>{
 it('uses the same anchor convention for left, center and right aligned text',()=>{
  expect(alignedTextLineStart({...base,align:'left'},40)).toBe(120);
  expect(alignedTextLineStart(base,40)).toBe(100);
  expect(alignedTextLineStart({...base,align:'right'},40)).toBe(80);
  expect(()=>alignedTextLineStart(base,-1)).toThrow('文字幅');
 });
 it('places horizontal lines by the same line height in both render paths',()=>{
  expect(textRowTop(base,0)).toBe(80);
  expect(textRowTop(base,2)).toBe(140);
 });
 it('places vertical glyph cells without adding font-specific measurements',()=>{
  expect(textVerticalCell(base,0,0)).toEqual({x:120,y:80});
  expect(textVerticalCell(base,1,2)).toEqual({x:90,y:124});
 });
});
