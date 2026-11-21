import type {EditableText} from '@illustro/core';

/** One shared placement convention for Canvas text and editable font outlines.
 * The layout origin represents the aligned beginning of the first line.
 * Measure each line using the renderer's own font metrics. */
export function alignedTextLineStart(text:Pick<EditableText,'origin'|'align'>,measuredWidth:number){
 if(!Number.isFinite(measuredWidth)||measuredWidth<0)throw Error('文字幅が正しくありません。');
 return text.origin.x-(text.align==='center'?measuredWidth/2:text.align==='right'?measuredWidth:0);
}
export function textRowTop(text:Pick<EditableText,'origin'|'size'|'lineHeight'>,row:number){
 return text.origin.y+row*text.size*text.lineHeight;
}
export function textVerticalCell(text:Pick<EditableText,'origin'|'size'|'lineHeight'|'spacing'>,column:number,row:number){
 return {
  x:text.origin.x-column*text.size*text.lineHeight,
  y:text.origin.y+row*(text.size+text.spacing)
 };
}
