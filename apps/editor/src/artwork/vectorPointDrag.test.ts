import {describe,expect,it} from 'vitest';
import type {EditablePath} from '@illustro/core';
import {vectorPointDrag,type VectorDragHandle} from './vectorPointDrag';

const curved:EditablePath={
  kind:'path',shape:'bezier',closed:false,stroke:'#123456',fill:null,width:4,
  points:[{x:10,y:20,inX:5,inY:18,outX:15,outY:22},{x:50,y:60,inX:45,inY:58,outX:55,outY:62}]
};
const handles:VectorDragHandle[]=[{index:0,kind:'in'},{index:0,kind:'out'},{index:1,kind:'in'}];

describe('C10-002/015 vector drag preview geometry',()=>{
  it('moves an anchor and both attached handles without mutating the source',()=>{
    const moved=vectorPointDrag(curved,0,2,handles,{x:30,y:35});
    expect(moved.points[0]).toEqual({x:30,y:35,inX:25,inY:33,outX:35,outY:37});
    expect(moved.points[1]).toEqual(curved.points[1]);
    expect(curved.points[0]?.x).toBe(10);
  });
  it('moves only the selected incoming or outgoing handle',()=>{
    const incoming=vectorPointDrag(curved,2,2,handles,{x:2,y:3});
    expect(incoming.points[0]).toEqual({x:10,y:20,inX:2,inY:3,outX:15,outY:22});
    const outgoing=vectorPointDrag(curved,3,2,handles,{x:90,y:91});
    expect(outgoing.points[0]).toEqual({x:10,y:20,inX:5,inY:18,outX:90,outY:91});
  });
  it('rejects invalid drag coordinates and unknown handles',()=>{
    expect(()=>vectorPointDrag(curved,0,2,handles,{x:NaN,y:0})).toThrow();
    expect(()=>vectorPointDrag(curved,5,2,handles,{x:2,y:3})).toThrow();
  });
});
