import type {EditableText,TextStyleRange} from '@illustro/core';

const safeBoundary=(text:string,offset:number)=>offset>0&&offset<text.length&&
  text.charCodeAt(offset-1)>=0xd800&&text.charCodeAt(offset-1)<=0xdbff&&
  text.charCodeAt(offset)>=0xdc00&&text.charCodeAt(offset)<=0xdfff?offset-1:offset;
export type TextStylePatch=Omit<TextStyleRange,'start'|'end'>;
export function textFontAssetIds(text:EditableText):string[]{
 return [...new Set([text.fontAsset,...(text.styleRanges??[]).map(range=>range.fontAsset)]
   .filter((id):id is string=>typeof id==='string'&&!!id))];
}
export function textCanvasFont(family:string,size:number,bold=false,italic=false){
 const name=family.replace(/["\\\n\r]/g,'');
 const font=['serif','sans-serif','monospace'].includes(name)?name:'"'+name+'", sans-serif';
 return (italic?'italic ':'')+(bold?'bold ':'')+size+'px '+font;
}
const same=(a:TextStyleRange,b:TextStyleRange)=>a.color===b.color&&a.size===b.size&&a.bold===b.bold&&a.italic===b.italic&&a.family===b.family&&a.fontAsset===b.fontAsset;
function compact(ranges:readonly TextStyleRange[]):TextStyleRange[]{
  const result:TextStyleRange[]=[];
  for(const item of ranges){
    if(item.end<=item.start||(item.color===undefined&&item.size===undefined&&item.bold===undefined&&item.italic===undefined&&item.family===undefined&&item.fontAsset===undefined))continue;
    const last=result.at(-1);
    if(last&&last.end===item.start&&same(last,item))
      result[result.length-1]={...last,end:item.end};
    else result.push(item);
  }
  return result;
}
/** Replace one property in an UTF-16 selection, preserving the other property.
 * Splits ranges at explicit selection boundaries, then merges equal neighbors. */
export function applyTextSelectionStyle(
 text:string,ranges:readonly TextStyleRange[],start:number,end:number,
 patch:TextStylePatch,clear=false
):TextStyleRange[]{
 start=safeBoundary(text,Math.max(0,Math.min(text.length,Math.floor(start))));
 end=safeBoundary(text,Math.max(0,Math.min(text.length,Math.floor(end))));
 if(start>=end||(!clear&&patch.color===undefined&&patch.size===undefined&&patch.bold===undefined&&patch.italic===undefined&&patch.family===undefined&&patch.fontAsset===undefined))return [...ranges];
 const splits=new Set<number>([start,end]);
 for(const r of ranges){splits.add(r.start);splits.add(r.end);}
 const sorted=[...splits].sort((a,b)=>a-b),result:TextStyleRange[]=[];
 let pointer=0;
 for(let i=1;i<sorted.length;i++){
   const a=sorted[i-1]!,b=sorted[i]!;
   while(pointer<ranges.length&&ranges[pointer]!.end<=a)pointer++;
   const candidate=ranges[pointer];
   const old=candidate&&candidate.start<=a&&candidate.end>=b?candidate:undefined;
   const covered=a>=start&&b<=end;
   if(!old&&!covered)continue;
   const next:TextStylePatch=covered?(clear?{}:{...old,...patch}):old??{};
   if(next.color!==undefined||next.size!==undefined||next.bold!==undefined||next.italic!==undefined||next.family!==undefined||next.fontAsset!==undefined)result.push({
     start:a,end:b,
     ...(next.color!==undefined?{color:next.color}:{}),
     ...(next.size!==undefined?{size:next.size}:{}),
     ...(next.bold!==undefined?{bold:next.bold}:{}),
     ...(next.italic!==undefined?{italic:next.italic}:{}),
     ...(next.family!==undefined?{family:next.family}:{}),
     ...(next.fontAsset!==undefined?{fontAsset:next.fontAsset}:{})
   });
 }
 return compact(result);
}
/** Rebase style selections after an ordinary textarea replacement.
 * Unedited prefixes/suffixes retain formatting; typing inside a styled range
 * inherits its style, while deleting text cannot leave out-of-bounds offsets. */
export function rebaseTextStyles(
 before:string,after:string,ranges:readonly TextStyleRange[]
):TextStyleRange[]{
 if(before===after)return [...ranges];
 let prefix=0,suffix=0;
 while(prefix<before.length&&prefix<after.length&&before[prefix]===after[prefix])prefix++;
 while(suffix<before.length-prefix&&suffix<after.length-prefix&&
   before[before.length-1-suffix]===after[after.length-1-suffix])suffix++;
 prefix=safeBoundary(before,prefix);
 // A common suffix may start at the low surrogate of two different Unicode
 // characters. Include both whole characters in the replacement instead.
 while(suffix>0&&(safeBoundary(before,before.length-suffix)!==before.length-suffix||
   safeBoundary(after,after.length-suffix)!==after.length-suffix))suffix--;
 const oldEnd=before.length-suffix,newEnd=after.length-suffix,shift=newEnd-oldEnd;
 const result:TextStyleRange[]=[];
 for(const r of ranges){
   if(r.start<prefix)result.push({...r,end:Math.min(r.end,prefix)});
   // Pure insertion at the *start* of a formatted span belongs before it.
   // Replacement of selected formatted text inherits the replaced style.
   if(newEnd>prefix&&r.end>prefix&&
      (r.start<prefix||(r.start===prefix&&oldEnd>prefix))){
     result.push({...r,start:prefix,end:newEnd});
   }
   if(r.end>oldEnd){
     result.push({...r,start:Math.max(r.start,oldEnd)+shift,end:r.end+shift});
   }
 }
 const sorted=result.filter(r=>r.start<r.end).sort((a,b)=>a.start-b.start||a.end-b.end);
 return compact(sorted);
}

export type StyledGlyph=Readonly<{
 character:string;index:number;color:string;size:number;bold:boolean;italic:boolean;family:string;position:number;advance:number
}>;
export type StyledLine=Readonly<{glyphs:readonly StyledGlyph[];width:number;offset:number;size:number}>;
/** Glyph-aware layout used only when a text layer has partial formatting.
 * Legacy text without overrides retains its existing layout and font kerning.
 * The measure callback uses the actual selected font at the specified size. */
export function layoutStyledText(
 text:EditableText,measure:(character:string,size:number,bold:boolean,italic:boolean,family:string)=>number
):Readonly<{lines:readonly StyledLine[];overflow:boolean}>{
 const lines:StyledLine[]=[];
 let glyphs:StyledGlyph[]=[],length=0,offset=0,crossSize=text.size,overflow=false;
 const crossLimit=text.vertical?text.boxWidth:text.boxHeight;
 const lineLimit=text.vertical?text.boxHeight:text.boxWidth;
 let index=0,rangeIndex=0;
 const flush=()=>{
   const width=Math.max(0,length-(glyphs.length?text.spacing:0));
   if(crossLimit!==undefined&&offset+crossSize>crossLimit&&lines.length){
     overflow=true;return false;
   }
   lines.push({glyphs,width,offset,size:crossSize});
   offset+=crossSize*text.lineHeight;
   glyphs=[];length=0;crossSize=text.size;
   return true;
 };
 for(const character of Array.from(text.text)){
   if(character==='\n'){
     if(!flush())break;
     index+=character.length;continue;
   }
   while(rangeIndex<(text.styleRanges?.length??0)&&
     text.styleRanges![rangeIndex]!.end<=index)rangeIndex++;
   const range=text.styleRanges?.[rangeIndex];
   const style=range&&range.start<=index&&index<range.end?range:null;
   const size=style?.size??text.size,color=style?.color??text.color;
   const bold=style?.bold===true,italic=style?.italic===true;
   const family=style?.fontAsset?'IllustroFont-'+style.fontAsset:style?.family??text.family;
   const rawAdvance=text.vertical?size:measure(character,size,bold,italic,family);
   const advance=Math.max(0,rawAdvance);
   // Adding the next glyph may exceed a framed line. Never create
   // an empty line for a single glyph wider than the frame.
   if(lineLimit!==undefined&&glyphs.length&&
       length+advance+text.spacing>lineLimit+text.spacing){
     if(!flush())break;
   }
   glyphs.push({character,index,color,size,bold,italic,family,position:length,advance});
   length+=advance+text.spacing;
   crossSize=Math.max(crossSize,size);
   index+=character.length;
 }
 if(!overflow&&(!lines.length||glyphs.length||text.text.endsWith('\n')))flush();
 return {lines,overflow};
}
