import {describe,it,expect} from 'vitest';
import {rectangleFromPoints,selectionContains,insetSelection,clipSelectionExit,clampSelectionRect} from './strokeSelection';
describe('BRU-010 rectangular selection',()=>{
 it('normalizes dragged corners',()=>expect(rectangleFromPoints({x:8,y:7},{x:2,y:3})).toEqual({x:2,y:3,width:6,height:4}));
 it('keeps brush coverage inside for round tips',()=>expect(insetSelection({x:0,y:0,width:100,height:80},10)).toEqual({x:10,y:10,width:80,height:60}));
 it('rejects a selection smaller than the brush',()=>expect(insetSelection({x:0,y:0,width:12,height:12},7)).toBeNull());
 it('halts a stroke at the first boundary without painting along it',()=>{
  const r={x:10,y:20,width:70,height:60};
  expect(clipSelectionExit({x:30,y:30},{x:110,y:70},r)).toEqual({x:80,y:55});
  expect(clipSelectionExit({x:30,y:30},{x:40,y:50},r)).toEqual({x:40,y:50});
 });
 it('avoids negative selection bounds',()=>{
  const r=clampSelectionRect({x:-10,y:20,width:50,height:90},100,60);
  expect(r).toEqual({x:0,y:20,width:40,height:40});
  expect(selectionContains(r,{x:50,y:30})).toBe(false);
 });
});
