import { describe,expect,it } from 'vitest';
import { CoreDocument } from './coreDocument';
import { createDeterministicIdFactory } from './ids';

describe('CoreDocument history',()=>{
  it('undoes and redoes by revision root',()=>{
    const d=new CoreDocument({width:1024,height:1024,ids:createDeterministicIdFactory()});
    const l=d.defaultRasterLayerId,t=d.begin('stroke');
    t.setPixel(l,10,20,[1,2,3,255]);const r=t.commit();
    expect(d.readPixel(l,10,20)).toEqual([1,2,3,255]);
    d.undo();expect(d.readPixel(l,10,20)).toEqual([0,0,0,0]);
    d.redo();expect(d.readPixel(l,10,20)).toEqual([1,2,3,255]);
    expect(d.protect(r.revision.id)).toBe(r.revision.id);
  });
});
