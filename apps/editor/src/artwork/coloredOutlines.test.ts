import {describe,expect,it} from 'vitest';
import {validateEditableArtwork,type EditableText} from '@illustro/core';
import type {Font} from 'opentype.js';
import {outlineStyledText} from './fonts';
import {eraseWholeStroke,combineShapes} from './pathOperations';
import {renderArtwork} from './render';
function font(width:number,ascent:number):Font{return {unitsPerEm:1000,ascender:ascent,
 charToGlyphIndex:c=>c==='X'?0:1,getAdvanceWidth:(_c,size)=>width*size/1000,
 getPath:(_c,x,y,size)=>({commands:[{type:'M',x,y},{type:'L',x:x+size/2,y},
  {type:'L',x:x+size/2,y:y-size/2},{type:'L',x,y:y-size/2},{type:'Z'}]})};}
const text:EditableText={kind:'text',text:'AB',origin:{x:10,y:10},size:20,family:'base',fontAsset:'a',color:'#ff0000',
 vertical:false,align:'left',spacing:0,lineHeight:1.2,styleRanges:[{start:1,end:2,fontAsset:'b',color:'#0000ff'}]};
const fonts=new Map([['base',font(600,800)],['IllustroFont-b',font(900,900)]]);
describe('C10-009/012 mixed-font multicolor outlining',()=>{
 it('uses each font metrics and keeps paint order on the same editable path',()=>{
  const result=outlineStyledText(text,fonts);
  expect(validateEditableArtwork(result)).toEqual(result);
  expect(result.fillRuns?.map(run=>run.color)).toEqual(['#ff0000','#0000ff']);
  const second=result.points[result.fillRuns![1]!.start]!;
  expect(second.x).toBe(22);expect(second.y).toBe(28);
  const vertical=outlineStyledText({...text,vertical:true},fonts);
  expect(vertical.fillRuns).toEqual(result.fillRuns);
 });
 it('draws separate colors and erases a whole painted glyph without corrupting ranges',()=>{
  const result=outlineStyledText(text,fonts),fills:string[]=[];
  const context={fillStyle:'',scale:()=>{},beginPath:()=>{},moveTo:()=>{},lineTo:()=>{},closePath:()=>{},
   fill(){fills.push(this.fillStyle);},getImageData:()=>({data:new Uint8ClampedArray(64*64*4)})};
  renderArtwork(result,{width:64,height:64,outputWidth:64,outputHeight:64},{getContext:()=>context} as unknown as HTMLCanvasElement);
  expect(fills).toEqual(['#ff0000','#0000ff']);
  const remaining=eraseWholeStroke(result,{x:27,y:23})!;
  expect(validateEditableArtwork(remaining)).toEqual(remaining);expect(remaining.fill).toBe('#ff0000');expect(remaining.fillRuns).toBeUndefined();
 });
 it('rejects unavailable glyphs, synthetic font styling and color-losing shape operations',async()=>{
  expect(()=>outlineStyledText({...text,text:'AX'},fonts)).toThrow('一部の文字');
  expect(()=>outlineStyledText({...text,styleRanges:[{start:0,end:1,bold:true}]},fonts)).toThrow('太字');
  const result=outlineStyledText(text,fonts);
  await expect(combineShapes(result,result,'union')).rejects.toThrow('複数色');
 });
});
