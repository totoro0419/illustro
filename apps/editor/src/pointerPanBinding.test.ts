import {expect,it} from 'vitest';
import {capturePointerPanBinding} from './pointerPanBinding';

it('registers additional buttons only when their own bit was actually observed',()=>{
  expect(capturePointerPanBinding({pointerType:'pen',button:2,buttons:3})).toEqual({device:'pen',button:2,mask:2});
  expect(capturePointerPanBinding({pointerType:'mouse',button:1,buttons:4})).toEqual({device:'mouse',button:1,mask:4});
  expect(capturePointerPanBinding({pointerType:'mouse',button:4,buttons:16})).toEqual({device:'mouse',button:4,mask:16});
  for(const event of [
    {pointerType:'pen',button:2,buttons:1},{pointerType:'pen',button:5,buttons:32},
    {pointerType:'touch',button:0,buttons:1},{pointerType:'mouse',button:0,buttons:1},
  ])expect(capturePointerPanBinding(event)).toBeNull();
});
