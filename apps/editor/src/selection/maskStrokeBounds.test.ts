import {describe,expect,it} from 'vitest';
import type {StrokeRecord} from '@illustro/brush-rt';
import type {MaskData} from './mask';
import {selectedStrokeMayAffectMask} from './maskStrokeBounds';

const mask=(width:number,height:number,x:number,y:number):MaskData=>{
  const alpha=new Uint8Array(width*height);
  if(x>=0&&x<width&&y>=0&&y<height)alpha[y*width+x]=255;
  return {width,height,alpha};
};
const stroke=(commands:readonly number[][]):StrokeRecord=>({commands} as unknown as StrokeRecord);

describe('C06-002 selected-stroke early rejection',()=>{
 it('avoids full GPU tile readback when a stroke is outside a small 4K selection',()=>{
   const selection=mask(4000,4000,3500,3500);
   const before=selection.alpha.slice();
   expect(selectedStrokeMayAffectMask(selection,[stroke([[50,50,12]])])).toBe(false);
   expect(selection.alpha).toEqual(before);
   expect(selectedStrokeMayAffectMask(selection,[stroke([[3500,3500,12]])])).toBe(true);
 });
 it('keeps conservative coverage for connected long brush segments',()=>{
   const selection=mask(512,512,250,250);
   const connected=new Array<number>(20).fill(0);
   connected[0]=480;connected[1]=480;connected[2]=4;
   connected[16]=20;connected[17]=20;connected[19]=1;
   expect(selectedStrokeMayAffectMask(selection,[stroke([connected])])).toBe(true);
 });
 it('handles empty, clipped and entirely unselected strokes without readback',()=>{
   expect(selectedStrokeMayAffectMask(mask(128,128,50,50),[stroke([])])).toBe(false);
   expect(selectedStrokeMayAffectMask(mask(128,128,50,50),[stroke([[900,900,5]])])).toBe(false);
   expect(selectedStrokeMayAffectMask(mask(128,128,-1,-1),[stroke([[50,50,20]])])).toBe(false);
 });
 it('does not reject uncertain or malformed brush bounds',()=>{
   const selection=mask(64,64,50,50);
   expect(selectedStrokeMayAffectMask(selection,[stroke([[NaN,10,3]])])).toBe(true);
   expect(selectedStrokeMayAffectMask({...selection,alpha:new Uint8Array(3)},[stroke([[1,1,3]])])).toBe(true);
 });
 it('bounds main-thread work for a diagonal across a 4K canvas',()=>{
   const selection=mask(4000,4000,200,3900);
   const connected=new Array<number>(20).fill(0);
   connected[0]=3990;connected[1]=3990;connected[2]=6;
   connected[16]=10;connected[17]=10;connected[19]=1;
   // Conservative true is intentional: never scan the entire 4K mask
   // merely to decide whether GPU readback can be skipped.
   expect(selectedStrokeMayAffectMask(selection,[stroke([connected])])).toBe(true);
 });
 it('honors a later stroke in a multi-record batch',()=>{
   const selection=mask(128,128,100,100);
   expect(selectedStrokeMayAffectMask(selection,[stroke([[10,10,4]]),stroke([[100,100,4]])])).toBe(true);
 });
});
