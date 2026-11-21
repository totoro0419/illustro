import type {Font,PathCommand} from 'opentype.js';

/** Only WOFF2 uses this decoder. Existing TTF/OTF/WOFF outlines retain the
 * established parser, metrics and kerning behavior. Loaded lazily on demand. */
export async function parseWoff2Outline(bytes:Uint8Array):Promise<Font>{
 const {create}=await import('fontkit');
 const font=create(bytes);
 if(!('layout' in font)||!Number.isFinite(font.unitsPerEm)||font.unitsPerEm<=0)
   throw Error('このフォントの輪郭を読み取れません。');
 const layout=(text:string,options?:{kerning:boolean})=>font.layout(text,options?.kerning===false?{kern:false}:undefined);
 return {
  unitsPerEm:font.unitsPerEm,ascender:font.ascent,
  charToGlyphIndex:character=>font.glyphForCodePoint(character.codePointAt(0)??0).id,
  getAdvanceWidth:(text,size,options)=>layout(text,options).positions.reduce((sum,p)=>sum+p.xAdvance,0)*size/font.unitsPerEm,
  getPath:(text,x,y,size,options)=>{
   const run=layout(text,options),scale=size/font.unitsPerEm,commands:PathCommand[]=[];
   let penX=0,penY=0;
   run.glyphs.forEach((glyph,index)=>{
    const position=run.positions[index]!;
    const point=(a:number,b:number)=>({x:x+(penX+position.xOffset+a)*scale,y:y-(penY+position.yOffset+b)*scale});
    for(const command of glyph.path.commands){
     const a=command.args;
     if(command.command==='closePath'){commands.push({type:'Z'});continue;}
     if(command.command==='moveTo'||command.command==='lineTo')
      commands.push({type:command.command==='moveTo'?'M':'L',...point(a[0]!,a[1]!)});
     else if(command.command==='quadraticCurveTo'){
      const c=point(a[0]!,a[1]!);commands.push({type:'Q',x1:c.x,y1:c.y,...point(a[2]!,a[3]!)});
     }else if(command.command==='bezierCurveTo'){
      const c=point(a[0]!,a[1]!),d=point(a[2]!,a[3]!);
      commands.push({type:'C',x1:c.x,y1:c.y,x2:d.x,y2:d.y,...point(a[4]!,a[5]!)});
     }else throw Error('この文字の輪郭形式には対応していません。');
    }
    penX+=position.xAdvance;penY+=position.yAdvance;
   });
   return {commands};
  }
 };
}
