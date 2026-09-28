import { describe,expect,it } from 'vitest';
import { CoreDocument } from './coreDocument';
import { createDeterministicIdFactory } from './ids';

describe('CoreDocument stale transaction',()=>{
  it('rejects before creating canonical orphan blocks',()=>{
    const d=new CoreDocument({width:1024,height:1024,ids:createDeterministicIdFactory()});
    const l=d.defaultRasterLayerId,a=d.begin('a'),b=d.begin('b');
    a.setPixel(l,1,1,[1,0,0,255]);a.commit();
    b.setPixel(l,300,300,[0,1,0,255]);
    const blocks=d.store.blockCount,head=d.head;
    expect(()=>b.commit()).toThrow(/stale/);
    expect(d.store.blockCount).toBe(blocks);
    expect(d.head).toBe(head);
    expect(d.readPixel(l,300,300)).toEqual([0,0,0,0]);
  });
});
