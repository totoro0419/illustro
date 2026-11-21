import {describe,it,expect} from 'vitest';
import {newBoardItem} from './referenceBoardStore';
import {referenceFrameKey} from './referenceFrameKey';

describe('C05-018 stable reference window reuse',()=>{
  it('keeps unchanged windows stable while another one moves',()=>{
    const a=newBoardItem('a',0),b=newBoardItem('b',1);
    const asset=(id:string)=>({id,updatedAt:100,name:id,mime:'image/png',bytes:200});
    const keyA=referenceFrameKey(a,asset('a')),keyB=referenceFrameKey(b,asset('b'));
    const moved={...a,x:a.x+20};
    expect(referenceFrameKey(moved,asset('a'))).not.toBe(keyA);
    expect(referenceFrameKey(b,asset('b'))).toBe(keyB);
  });
  it('refreshes a window if its image was recovered or metadata changed',()=>{
    const item=newBoardItem('recover',0);
    const missing=referenceFrameKey(item,null);
    const present={id:'recover',updatedAt:1,name:'Photo',mime:'image/png',bytes:128};
    expect(referenceFrameKey(item,present)).not.toBe(missing);
    expect(referenceFrameKey(item,{...present,name:'Renamed',updatedAt:2})).not.toBe(referenceFrameKey(item,present));
  });
  it('notices invisible and layout changes without touching unrelated windows',()=>{
    const item=newBoardItem('asset',2),asset={id:'asset',updatedAt:1,name:'Image',mime:'image/png',bytes:1};
    const signature=referenceFrameKey(item,asset);
    expect(referenceFrameKey({...item,pinned:true},asset)).not.toBe(signature);
    expect(referenceFrameKey({...item,rotation:90},asset)).not.toBe(signature);
  });
});
