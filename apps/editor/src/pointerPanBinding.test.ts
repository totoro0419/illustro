import {expect,it} from 'vitest';
import {capturePointerPanBinding,capturePointerButton,matchPointerButton} from './pointerPanBinding';

it('registers additional buttons only when their own bit was actually observed',()=>{
  expect(capturePointerPanBinding({pointerType:'pen',button:2,buttons:3})).toEqual({device:'pen',button:2,mask:2});
  expect(capturePointerPanBinding({pointerType:'mouse',button:1,buttons:4})).toEqual({device:'mouse',button:1,mask:4});
  expect(capturePointerPanBinding({pointerType:'mouse',button:4,buttons:16})).toEqual({device:'mouse',button:4,mask:16});
  for(const event of [
    {pointerType:'pen',button:2,buttons:1},{pointerType:'pen',button:5,buttons:32},
    {pointerType:'touch',button:0,buttons:1},{pointerType:'mouse',button:0,buttons:1},
  ])expect(capturePointerPanBinding(event)).toBeNull();
});

it('supports rear eraser overrides and favors the current tool scope',()=>{
  const end={pointerType:'pen',button:5,buttons:32};
  const button=capturePointerButton(end)!;
  expect(button).toEqual({device:'pen',button:5,mask:32});
  expect(capturePointerButton({...end,buttons:0})).toBeNull();
  const fallback={...button,scope:'any',action:'toggle-eraser'} as const;
  const drawing={...button,scope:'drawing',action:'sample'} as const;
  const pan={...button,scope:'tool',action:'hold-pan'} as const;
  expect(matchPointerButton([fallback,drawing,pan],end,'drawing')).toBe(drawing);
  expect(matchPointerButton([fallback,pan],{...end,button:-1},'tool',true)).toBe(pan);
  expect(matchPointerButton([fallback,drawing],{...end,button:-1},'drawing',true)).toBeUndefined();
});
