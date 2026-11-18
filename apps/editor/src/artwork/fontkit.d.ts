declare module 'fontkit' {
 export type OutlineGlyph={id:number;path:{commands:readonly {command:string;args:readonly number[]}[]}};
 export type OutlineFont={unitsPerEm:number;ascent:number;
  glyphForCodePoint:(codePoint:number)=>OutlineGlyph;
  layout:(text:string,features?:Record<string,boolean>)=>{glyphs:readonly OutlineGlyph[];
   positions:readonly {xAdvance:number;yAdvance:number;xOffset:number;yOffset:number}[]};
 };
 export function create(bytes:Uint8Array):OutlineFont|{fonts:readonly OutlineFont[]};
}
