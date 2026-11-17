import {describe,expect,it} from 'vitest';
import {layerEditingStates} from './layerEditingStates';

describe('C07-016 readable layer editing indicators',()=>{
 it('describes re-editable, hidden or absent deformations without changing the data',()=>{
  const entry={deformation:{enabled:false}};
  expect(layerEditingStates(entry)).toEqual(['変形OFF']);
  expect(layerEditingStates({deformation:{enabled:true}})).toEqual(['変形を再編集可']);
  expect(layerEditingStates({})).toEqual([]);
  expect(entry.deformation.enabled).toBe(false);
 });
 it('distinguishes external linked files, embedded image and instance links',()=>{
  expect(layerEditingStates({imageLink:{kind:'linked'}})).toEqual(['外部画像を参照']);
  expect(layerEditingStates({imageLink:{kind:'embedded'}})).toEqual(['画像を埋め込み']);
  expect(layerEditingStates({imageLink:{kind:'instance'}})).toEqual(['他のレイヤーの画像を使用']);
 });
 it('shows whether an enabled mask moves with the artwork',()=>{
  expect(layerEditingStates({vectorMask:{enabled:true,linked:true}})).toEqual(['マスク：連動']);
  expect(layerEditingStates({vectorMask:{enabled:true,linked:false}})).toEqual(['マスク：独立']);
  expect(layerEditingStates({vectorMask:{enabled:false,linked:false}})).toEqual(['マスクOFF']);
 });
 it('keeps complex layer states readable without duplicates',()=>{
  const states=layerEditingStates({deformation:{enabled:true},imageLink:{kind:'embedded'},vectorMask:{enabled:true,linked:false}});
  expect(states).toEqual(['変形を再編集可','画像を埋め込み','マスク：独立']);
  expect(new Set(states).size).toBe(states.length);
 });
});
