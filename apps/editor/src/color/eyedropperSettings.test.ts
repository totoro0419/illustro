import {describe,expect,it} from 'vitest';
import type {LayerId} from '@illustro/core';
import {sampleSourceLabel} from './eyedropperSettings';

describe('C04-006 sampling source labels',()=>{
 const a='layer-a' as LayerId,b='layer-b' as LayerId;
 const layers=[{id:a,name:'線画'},{id:b,name:'下塗り'}];
 it('distinguishes merged view, selected layer, and named specific layer',()=>{
  expect(sampleSourceLabel({source:'composite',layerId:null},layers)).toBe('見えている作品全体');
  expect(sampleSourceLabel({source:'layer',layerId:null},layers)).toBe('選んでいるレイヤー');
  expect(sampleSourceLabel({source:'specific',layerId:b},layers)).toBe('指定したレイヤー: 下塗り');
 });
 it('never claims a different layer when specified target is missing',()=>{
  expect(sampleSourceLabel({source:'specific',layerId:null},layers)).toBe('指定したレイヤーが見つかりません');
  expect(sampleSourceLabel({source:'specific',layerId:'deleted' as LayerId},layers)).toBe('指定したレイヤーが見つかりません');
 });
});
