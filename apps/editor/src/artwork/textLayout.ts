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
 if(text.boxWidth===undefined)lines.push(...paragraphs);
 else{
   for(const paragraph of paragraphs){
     let row='';
     for(const char of Array.from(paragraph)){
       if(row&&measureWidth(row+char)>text.boxWidth){
         lines.push(row);row=char;
       }else row+=char;
     }
     lines.push(row);
   }
 }
 const count=text.boxHeight===undefined?Infinity:
   Math.max(1,Math.floor((text.boxHeight-text.size)/(text.size*text.lineHeight))+1);
 return {lines:count<lines.length?lines.slice(0,count):lines,overflow:count<lines.length};
}
