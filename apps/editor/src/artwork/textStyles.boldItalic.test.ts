import {describe,expect,it} from 'vitest';
import {validateEditableArtwork,type EditableText} from '@illustro/core';
import {applyTextSelectionStyle,layoutStyledText,rebaseTextStyles} from './textStyles';

const base:EditableText={
  kind:'text',text:'太字と斜体🙂',origin:{x:100,y:80},vertical:false,
  size:20,family:'sans-serif',color:'#101010',align:'left',spacing:0,lineHeight:1.2
};
describe('C10-009 bold/italic partial text',()=>{
  it('stores bold and italic separately and never changes original text',()=>{
    const bold=applyTextSelectionStyle(base.text,[],0,2,{bold:true});
    const both=applyTextSelectionStyle(base.text,bold,1,3,{italic:true});
    expect(both).toEqual([
      {start:0,end:1,bold:true},
      {start:1,end:2,bold:true,italic:true},
      {start:2,end:3,italic:true}
    ]);
    const approved=validateEditableArtwork({...base,styleRanges:both});
    expect(approved?.kind).toBe('text');
    if(approved?.kind==='text'){
      expect(approved.styleRanges).toEqual(both);
      expect(approved.text).toBe(base.text);
    }
    const noBold=applyTextSelectionStyle(base.text,both,1,2,{bold:false});
    expect(noBold[1]).toMatchObject({start:1,end:2,bold:false,italic:true});
  });
  it('rejects invalid formatting flags and partial surrogate pair offsets',()=>{
    expect(()=>validateEditableArtwork({...base,styleRanges:[{start:0,end:1,bold:'yes'}]})).toThrow();
    expect(()=>validateEditableArtwork({...base,styleRanges:[{start:0,end:1,italic:1}]})).toThrow();
    const i=base.text.indexOf('🙂');
    expect(()=>validateEditableArtwork({...base,styleRanges:[{start:i+1,end:i+2,bold:true}]})).toThrow();
  });
  it('measures mixed style widths using font weight and font slant per glyph',()=>{
    const text:EditableText={...base,text:'ABCD',styleRanges:[
      {start:1,end:2,bold:true},{start:2,end:3,italic:true}
    ]};
    const measured:Array<[string,number,boolean,boolean]>=[];
    const laidOut=layoutStyledText(text,(c,size,bold,italic)=>{
      measured.push([c,size,bold,italic]);
      return size+(bold?4:0)+(italic?2:0);
    });
    expect(measured).toEqual([
      ['A',20,false,false],['B',20,true,false],['C',20,false,true],['D',20,false,false]
    ]);
    expect(laidOut.lines[0]!.width).toBe(86);
    expect(laidOut.lines[0]!.glyphs[1]!.bold).toBe(true);
    expect(laidOut.lines[0]!.glyphs[2]!.italic).toBe(true);
  });
  it('keeps style flags after inserted characters and merges identical neighboring runs',()=>{
    const range=[{start:1,end:3,bold:true,italic:true}];
    expect(rebaseTextStyles('abcd','aXbcd',range)).toEqual([
      {start:2,end:4,bold:true,italic:true}
    ]);
    // Replacing the first styled letter should keep its style, unlike
    // inserting *before* it.
    expect(rebaseTextStyles('abcd','aXcd',range)).toEqual([
      {start:1,end:3,bold:true,italic:true}
    ]);
    const merged=applyTextSelectionStyle('abcd',range,0,1,{bold:true,italic:true});
    expect(merged).toEqual([{start:0,end:3,bold:true,italic:true}]);
  });
});
