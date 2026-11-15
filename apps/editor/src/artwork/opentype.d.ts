declare module 'opentype.js' {
  export type PathCommand={type:'M'|'L'|'C'|'Q'|'Z';x?:number;y?:number;x1?:number;y1?:number;x2?:number;y2?:number};
  export type Font={
    unitsPerEm:number;ascender:number;
    charToGlyphIndex:(char:string)=>number;
    getAdvanceWidth:(value:string,size:number,options?:{kerning:boolean})=>number;
    getPath:(value:string,x:number,y:number,size:number,options?:{kerning:boolean})=>{commands:PathCommand[]};
  };
  export function parse(buffer:ArrayBuffer):Font;
}
