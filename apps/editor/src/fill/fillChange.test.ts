import {describe,expect,it} from 'vitest';
import {colorMask,hasFillPixelChanges,type FillSettings} from './pixels';

const settings:FillSettings={method:'color',tolerance:0,gap:0,opacity:1,
 color:'#ff0000',erase:false,contiguous:true,closedOnly:false};

describe('C08-011 masked pixel-change detection',()=>{
 it('detects a changed pixel without requiring a full RGBA scan',()=>{
  const mask={width:2,height:1,alpha:Uint8Array.of(0,255)};
  const pixels=colorMask(null,mask,settings,false);
  expect(hasFillPixelChanges(pixels,null,mask)).toBe(true);
  expect([...pixels.slice(0,4)]).toEqual([0,0,0,0]);
 });
 it('treats a completely empty mask as a no-op',()=>{
  const target=Uint8Array.of(0,0,255,255,12,34,56,255);
  const mask={width:2,height:1,alpha:Uint8Array.of(0,0)};
  expect(hasFillPixelChanges(colorMask(target,mask,settings,false),target,mask)).toBe(false);
 });
 it('does not report impossible erase or zero-opacity paint as a change',()=>{
  const mask={width:1,height:1,alpha:Uint8Array.of(255)};
  expect(hasFillPixelChanges(colorMask(null,mask,{...settings,erase:true},false),null,mask)).toBe(false);
  const target=Uint8Array.of(1,2,3,255);
  expect(hasFillPixelChanges(colorMask(target,mask,{...settings,opacity:0},false),target,mask)).toBe(false);
 });
 it('preserves alpha-lock semantics on transparent and existing pixels',()=>{
  const mask={width:1,height:1,alpha:Uint8Array.of(255)};
  expect(hasFillPixelChanges(colorMask(null,mask,settings,true),null,mask)).toBe(false);
  const target=Uint8Array.of(0,0,255,255);
  expect(hasFillPixelChanges(colorMask(target,mask,settings,true),target,mask)).toBe(true);
 });
});
