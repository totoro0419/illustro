import {describe,expect,it} from 'vitest';
import {validateEditableArtwork,type EditableText,type TextStyleRange} from '@illustro/core';
import {applyTextSelectionStyle,layoutStyledText,rebaseTextStyles} from './textStyles';

const base:EditableText={
 kind:'text',text:'色と大きさ🙂を変える',origin:{x:10,y:20},
 size:20,color:'#000000',family:'sans-serif',align:'left',
 vertical:false,spacing:0,lineHeight:1.25
};
describe('C10-009 partial editable text formatting',()=>{
 it('stores selected color and size without changing characters or unselected segments',()=>{
  const colored=applyTextSelectionStyle(base.text,[],0,2,{color:'#ff0000'});
  expect(colored).toEqual([{start:0,end:2,color:'#ff0000'}]);
  const changed=applyTextSelectionStyle(base.text,colored,1,3,{size:36});
  expect(changed).toEqual([
   {start:0,end:1,color:'#ff0000'},
   {start:1,end:2,color:'#ff0000',size:36},
   {start:2,end:3,size:36}
  ]);
  const checked=validateEditableArtwork({...base,styleRanges:changed});
  expect(checked?.kind).toBe('text');
  if(checked?.kind==='text'){
    expect(checked.text).toBe(base.text);
    expect(checked.styleRanges).toEqual(changed);
  }
  const cleared=applyTextSelectionStyle(base.text,changed,1,2,{},true);
  expect(cleared).toEqual([{start:0,end:1,color:'#ff0000'},{start:2,end:3,size:36}]);
 });
 it('rejects corrupt, out-of-bounds, overlapping, and mid-surrogate ranges',()=>{
  const baseRange:TextStyleRange={start:0,end:2,color:'#ff0000'};
  const validate=(ranges:readonly TextStyleRange[])=>validateEditableArtwork({...base,styleRanges:ranges});
  expect(()=>validate([{start:0,end:400,color:'#ff0000'}])).toThrow();
  expect(()=>validate([{...baseRange,start:2,end:1}])).toThrow();
  expect(()=>validate([baseRange,{start:1,end:3,color:'#ffffff'}])).toThrow();
  const emojiIndex=base.text.indexOf('🙂');
  expect(()=>validate([{start:emojiIndex+1,end:emojiIndex+2,size:30}])).toThrow();
  expect(()=>validate([{start:0,end:2,size:0}])).toThrow();
 });
 it('preserves UTF-16 emoji boundaries when applying a selection',()=>{
  const start=base.text.indexOf('🙂');
  const styled=applyTextSelectionStyle(base.text,[],start+1,start+2,{size:30});
  // A selection starting inside a surrogate pair expands to the intact emoji.
  expect(styled).toEqual([{start,end:start+2,size:30}]);
  const entire=applyTextSelectionStyle(base.text,[],start,start+2,{size:30});
  expect(entire).toEqual([{start,end:start+2,size:30}]);
 });
 it('shifts unaffected spans when characters are inserted or deleted',()=>{
  const original='abcXYZdef';
  const ranges=[{start:0,end:3,color:'#ff0000'},{start:6,end:9,size:40}];
  const inserted=rebaseTextStyles(original,'abc123XYZdef',ranges);
  expect(inserted).toEqual([{start:0,end:3,color:'#ff0000'},{start:9,end:12,size:40}]);
  const deleted=rebaseTextStyles(original,'abcdef',ranges);
  expect(deleted).toEqual([{start:0,end:3,color:'#ff0000'},{start:3,end:6,size:40}]);
 });
 it('reflows mixed-size letters without changing the saved Unicode string',()=>{
  const text:EditableText={...base,text:'あいうえ',boxWidth:45,
    styleRanges:[{start:1,end:3,size:35,color:'#ff0000'}]};
  const laidOut=layoutStyledText(text,(_char,size)=>size);
  expect(laidOut.lines.map(row=>row.glyphs.map(g=>g.character).join(''))).toEqual(['あ','い','う','え']);
  expect(laidOut.lines[1]!.glyphs[0]!.color).toBe('#ff0000');
  expect(laidOut.lines[1]!.glyphs[0]!.size).toBe(35);
 });
 it('stops a long styled paragraph after the visible frame rows',()=>{
  const text:EditableText={...base,text:'あ'.repeat(2000),boxWidth:40,boxHeight:40,
    styleRanges:[{start:0,end:2000,color:'#ff0000'}]};
  let calls=0;
  const laidOut=layoutStyledText(text,(_c,size)=>{calls++;return size;});
  expect(laidOut.overflow).toBe(true);
  expect(laidOut.lines.length).toBeLessThanOrEqual(2);
  expect(calls).toBeLessThan(12);
 });
});
