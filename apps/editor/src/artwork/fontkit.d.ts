declare module 'fontkit' {
 export type OutlineGlyph={id:number;advanceWidth:number;bbox:{maxY:number};path:{commands:readonly {command:string;args:readonly number[]}[]}};
 export type OutlineFont={unitsPerEm:number;ascent:number;
  availableFeatures?:readonly string[];
  vmtx?:{metrics:{length:number;get:(index:number)=>{advance:number;bearing:number}|undefined};bearings:{get:(index:number)=>number|undefined}};
  VORG?:{defaultVertOriginY:number;metrics:readonly {glyphIndex:number;vertOriginY:number}[]};
  glyphForCodePoint:(codePoint:number)=>OutlineGlyph;
  layout:(text:string,features?:Record<string,boolean>,script?:string,language?:string,direction?:string)=>{glyphs:readonly OutlineGlyph[];
   positions:readonly {xAdvance:number;yAdvance:number;xOffset:number;yOffset:number}[]};
 };
 export function create(bytes:Uint8Array):OutlineFont|{fonts:readonly OutlineFont[]};
}
