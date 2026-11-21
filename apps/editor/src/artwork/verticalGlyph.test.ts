import {describe,expect,it} from 'vitest';
import {verticalGlyphAdjustment} from './verticalGlyph';

describe('C10-010 vertical Japanese typesetting fallback',()=>{
 it('moves Japanese punctuation towards the upper-right of the cell',()=>{
   const comma=verticalGlyphAdjustment('、',40),period=verticalGlyphAdjustment('。',40);
   for(const glyph of [comma,period]){
     expect(glyph.dx).toBeGreaterThan(0);
     expect(glyph.dy).toBeLessThan(0);
     expect(glyph.rotate).toBe(false);
   }
 });
 it('moves small Japanese kana but leaves regular kana and kanji centered',()=>{
   const small=verticalGlyphAdjustment('ゃ',24);
   expect(small.dx).toBeGreaterThan(0);
   expect(small.dy).toBeLessThan(0);
   expect(verticalGlyphAdjustment('や',24)).toEqual({dx:0,dy:0,rotate:false});
   expect(verticalGlyphAdjustment('絵',24)).toEqual({dx:0,dy:0,rotate:false});
 });
 it('rotates Latin characters, long sound marks and paired brackets',()=>{
   for(const char of ['A','6','ー','「','」','（','）']){
     expect(verticalGlyphAdjustment(char,30).rotate).toBe(true);
   }
 });
});
