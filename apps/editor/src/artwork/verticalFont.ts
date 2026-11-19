import type {OutlineFont} from 'fontkit';
import type {PathCommand} from 'opentype.js';

/** Use the font's own GSUB vertical alternates, GPOS offsets, VORG origin
 * and vmtx top bearing. No Unicode presentation-form substitution is guessed.
 * Missing/invalid data returns null for the existing Canvas/outline fallback. */
export function nativeVerticalGlyph(font:OutlineFont,character:string,size:number):PathCommand[]|null{
 if(!Number.isFinite(size)||size<=0||/[A-Za-z0-9]/u.test(character))return null;
 try{
  if(!font.vmtx||!font.availableFeatures?.some(tag=>tag==='vert'||tag==='vrt2')||
    !Number.isFinite(font.unitsPerEm)||font.unitsPerEm<=0)return null;
  const feature=font.availableFeatures.includes('vrt2')?'vrt2':'vert';
  // Fontkit's shaper accepts ltr/rtl, not ttb. Request vertical GSUB
  // explicitly, then place the glyph using the vertical tables below.
  const run=font.layout(character,{[feature]:true,kern:false},undefined,undefined,'ltr');
  if(run.glyphs.length!==1)return null;
  const glyph=run.glyphs[0]!,position=run.positions[0]!;
  if(!glyph.id||!glyph.path.commands.length)return null;
  const table=font.vmtx,index=glyph.id;
  const metric=table.metrics.get(Math.min(index,table.metrics.length-1));
  const bearing=index<table.metrics.length?metric?.bearing:table.bearings.get(index-table.metrics.length);
  const origin=font.VORG?.metrics.find(item=>item.glyphIndex===index)?.vertOriginY??
    font.VORG?.defaultVertOriginY??(glyph.bbox.maxY+(bearing??NaN));
  const advance=metric?.advance,scale=size/font.unitsPerEm;
  if(![origin,glyph.advanceWidth,advance,position.xOffset,position.yOffset].every(Number.isFinite)||!(advance!>0))return null;
  const point=(a:number,b:number)=>({x:(a-glyph.advanceWidth/2+position.xOffset)*scale,
    y:(origin-b-position.yOffset)*scale});
  const commands:PathCommand[]=[];
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
   }else return null;
  }
  if(commands.some(command=>Object.entries(command).some(([key,value])=>key!=='type'&&!Number.isFinite(value))))return null;
  return commands;
 }catch{return null;}
}
