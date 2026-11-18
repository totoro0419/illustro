import type {EditableText} from '@illustro/core';

/** A shared, bounded text layout for Canvas painting and font outlines.
 * The saved text remains unchanged; only the displayed rows/columns are
 * limited by the optional text frame. Legacy layers without a frame use their
 * explicit newline characters exactly as before. */
export function layoutEditableText(
 text:EditableText,measureWidth:(characters:string)=>number
):Readonly<{lines:readonly string[];overflow:boolean}>{
 const paragraphs=text.text.split('\n');
 const lines:string[]=[];
 if(text.vertical){
   const columnSize=text.boxHeight===undefined?Infinity:
     Math.max(1,Math.floor((text.boxHeight-text.size)/Math.max(1,text.size+text.spacing))+1);
   for(const paragraph of paragraphs){
     const chars=Array.from(paragraph);
     if(!chars.length){lines.push('');continue;}
     for(let i=0;i<chars.length;i+=columnSize)lines.push(chars.slice(i,i+columnSize).join(''));
   }
   const columns=text.boxWidth===undefined?Infinity:
     Math.max(1,Math.floor((text.boxWidth-text.size)/(text.size*text.lineHeight))+1);
   return {lines:columns<lines.length?lines.slice(0,columns):lines,overflow:columns<lines.length};
 }
 const count=text.boxHeight===undefined?Infinity:
   Math.max(1,Math.floor((text.boxHeight-text.size)/(text.size*text.lineHeight))+1);
 if(text.boxWidth===undefined)lines.push(...paragraphs);
 else{
   // Exponential probing with binary refinement avoids measuring a growing
   // 8,192-character string on every glyph: large text stays responsive.
   for(const paragraph of paragraphs){
     const chars=Array.from(paragraph);
     if(!chars.length){lines.push('');continue;}
     for(let start=0;start<chars.length;){
       const available=chars.length-start;
       const widthOf=(count:number)=>measureWidth(chars.slice(start,start+count).join(''));
       let fit=1,probe=2;
       while(probe<=available&&widthOf(probe)<=text.boxWidth){
         fit=probe;probe*=2;
       }
       const upper=Math.min(available,probe);
       if(upper>fit){
         if(widthOf(upper)<=text.boxWidth)fit=upper;
         else{
           let low=fit,high=upper;
           while(low+1<high){
             const mid=Math.floor((low+high)/2);
             if(widthOf(mid)<=text.boxWidth)low=mid;
             else high=mid;
           }
           fit=low;
         }
       }
       lines.push(chars.slice(start,start+fit).join(''));
       start+=fit;
       // One extra row is sufficient to detect a clipped textbox. No need
       // to measure thousands of remaining glyphs that cannot be displayed.
       if(lines.length>count)return {lines:lines.slice(0,count),overflow:true};
     }
   }
 }
 return {lines:count<lines.length?lines.slice(0,count):lines,overflow:count<lines.length};
}
