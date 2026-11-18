import {describe,expect,it} from 'vitest';
import {validateEditableArtwork,type EditableText} from '@illustro/core';
import {layoutEditableText} from './textLayout';

const base:EditableText={
 kind:'text',text:'あいうえお',origin:{x:12,y:20},size:10,family:'sans-serif',color:'#000000',
 align:'left',spacing:0,lineHeight:1,vertical:false
};
const measure=(text:string)=>Array.from(text).length*10;
describe('C10-004 editable text frame',()=>{
 it('preserves legacy text layout without frame dimensions',()=>{
   const result=layoutEditableText({...base,text:'一行\n\n三行'},measure);
   expect(result).toEqual({lines:['一行','','三行'],overflow:false});
 });
 it('wraps Japanese text based on frame width without modifying the saved text',()=>{
   const boxed={...base,boxWidth:20};
   expect(layoutEditableText(boxed,measure)).toEqual({lines:['あい','うえ','お'],overflow:false});
   const validated=validateEditableArtwork(boxed);
   expect(validated?.kind).toBe('text');
   if(validated?.kind==='text'){
     expect(validated.boxWidth).toBe(20);
     expect(validated.text).toBe('あいうえお');
   }
 });
 it('caps visible rows by height while retaining the full original text',()=>{
   const boxed={...base,boxWidth:20,boxHeight:20};
   expect(layoutEditableText(boxed,measure)).toEqual({lines:['あい','うえ'],overflow:true});
   expect(boxed.text).toBe('あいうえお');
 });
 it('wraps vertical text into columns and keeps overflow marked',()=>{
   const boxed={...base,vertical:true,boxHeight:20,boxWidth:20};
   expect(layoutEditableText(boxed,measure)).toEqual({lines:['あい','うえ'],overflow:true});
 });
 it('rejects invalid sizes and cannot loop forever when spacing is negative',()=>{
   expect(()=>validateEditableArtwork({...base,boxWidth:0})).toThrow('正しくありません');
   expect(()=>validateEditableArtwork({...base,boxHeight:Infinity})).toThrow('正しくありません');
   const result=layoutEditableText({...base,vertical:true,boxHeight:10,spacing:-50},measure);
   expect(result.lines.length).toBe(5);
 });
});
