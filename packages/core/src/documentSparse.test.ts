import { describe,expect,it } from 'vitest';
import { CoreDocument } from './coreDocument';
import { createDeterministicIdFactory } from './ids';

describe('CoreDocument sparse raster',()=>{
  it('allocates only the touched tile on a huge canvas',()=>{
    const d=new CoreDocument({width:32768,height:32768,ids:createDeterministicIdFactory()});
    const l=d.defaultRasterLayerId;
    expect(d.canonicalBlockCount).toBe(0);
    const t=d.begin('stroke');
    t.setPixel(l,12345,23456,[10,20,30,255]);
    const r=t.commit();
    expect(r.changedBlockIds).toHaveLength(1);
    expect(d.canonicalRasterBytes).toBe(256*256*4);
    expect(d.readPixel(l,12345,23456)).toEqual([10,20,30,255]);
    expect(d.readPixel(l,1,1)).toEqual([0,0,0,0]);
  });
});
