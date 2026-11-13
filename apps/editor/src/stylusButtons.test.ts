import {expect,it} from 'vitest';
import {isPenEraserContact} from './stylusButtons';
it('recognizes eraser tip transition and eraser held during contact',()=>{
 expect(isPenEraserContact({pointerType:'pen',button:5,buttons:32})).toBe(true);
 expect(isPenEraserContact({pointerType:'pen',button:0,buttons:33})).toBe(true);
 expect(isPenEraserContact({pointerType:'pen',button:-1,buttons:32})).toBe(true);
});
it('never treats barrel, ordinary pen, mouse or fingers as an eraser',()=>{
 for(const e of [{pointerType:'pen',button:2,buttons:2},{pointerType:'pen',button:0,buttons:1},{pointerType:'mouse',button:5,buttons:32},{pointerType:'touch',button:0,buttons:1},{pointerType:'pen',button:0,buttons:0}])expect(isPenEraserContact(e)).toBe(false);
});
