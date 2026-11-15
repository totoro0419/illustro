import {describe,expect,it} from 'vitest';
import {CoreDocument} from './coreDocument';
import {createDeterministicIdFactory} from './ids';

describe('CoreDocument history',()=>{
  it('undoes and redoes by revision root with availability state',()=>{
    const d=new CoreDocument({width:1024,height:1024,ids:createDeterministicIdFactory()}),l=d.defaultRasterLayerId,t=d.begin('stroke');
    expect(d.canUndo).toBe(false);expect(d.canRedo).toBe(false);
    t.setPixel(l,10,20,[1,2,3,255]);const committed=t.commit().revision;
    expect(d.head).toBe(committed.id);expect(d.canUndo).toBe(true);expect(d.canRedo).toBe(false);expect(d.readPixel(l,10,20)).toEqual([1,2,3,255]);
    d.undo();expect(d.canUndo).toBe(false);expect(d.canRedo).toBe(true);expect(d.readPixel(l,10,20)).toEqual([0,0,0,0]);
    d.redo();expect(d.head).toBe(committed.id);expect(d.canUndo).toBe(true);expect(d.canRedo).toBe(false);expect(d.readPixel(l,10,20)).toEqual([1,2,3,255]);
  });
  it('walks consecutive history in order',()=>{
    const d=new CoreDocument({width:256,height:256,ids:createDeterministicIdFactory()}),l=d.defaultRasterLayerId,heads=[d.head];
    for(let i=1;i<=3;i++){const t=d.begin('edit '+i);t.setPixel(l,i,i,[i,i,i,255]);heads.push(t.commit().revision.id);}
    expect(d.head).toBe(heads[3]);d.undo();expect(d.head).toBe(heads[2]);d.undo();expect(d.head).toBe(heads[1]);d.undo();expect(d.head).toBe(heads[0]);
    expect(d.canUndo).toBe(false);expect(d.canRedo).toBe(true);
    d.redo();expect(d.head).toBe(heads[1]);d.redo();expect(d.head).toBe(heads[2]);d.redo();expect(d.head).toBe(heads[3]);expect(d.canRedo).toBe(false);
  });
  it('drops the ordinary redo route after undo followed by a new edit',()=>{
    const d=new CoreDocument({width:256,height:256,ids:createDeterministicIdFactory()}),l=d.defaultRasterLayerId;
    const a=d.begin('A');a.setPixel(l,1,1,[1,1,1,255]);a.commit();
    const b=d.begin('B');b.setPixel(l,2,2,[2,2,2,255]);const bId=b.commit().revision.id;
    d.undo();expect(d.canRedo).toBe(true);
    const c=d.begin('C');c.setPixel(l,3,3,[3,3,3,255]);const cId=c.commit().revision.id;
    expect(d.canRedo).toBe(false);expect(d.head).toBe(cId);expect(d.redo().id).toBe(cId);expect(d.hasRevision(bId)).toBe(true);
  });
});
