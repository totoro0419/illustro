import {describe,expect,it} from 'vitest';
import type {DocumentRoot,LayerId} from '@illustro/core';
import {validatedBooleanSourceVisibility} from './booleanSourceVisibility';

const first='a' as LayerId,second='b' as LayerId;
function root(locked=false,bIsPath=true):DocumentRoot{
  const all=new Set([first,second]);
  return {
    hasLayer:(id:LayerId)=>all.has(id),
    getLayer:(id:LayerId)=>({editable:{kind:id===second&&!bIsPath?'text':'path'}}),
    isLayerLocked:()=>locked
  } as unknown as DocumentRoot;
}
describe('C10-005 atomic boolean source hiding',()=>{
  it('allows two different unlocked editable shapes without deleting either',()=>{
    expect(validatedBooleanSourceVisibility(root(),[first,second])).toEqual([first,second]);
    expect(validatedBooleanSourceVisibility(root(),[])).toEqual([]);
  });
  it('rejects incomplete or duplicate operands and editing an existing result',()=>{
    expect(()=>validatedBooleanSourceVisibility(root(),[first])).toThrow('2レイヤー');
    expect(()=>validatedBooleanSourceVisibility(root(),[first,first])).toThrow('2レイヤー');
    expect(()=>validatedBooleanSourceVisibility(root(),[first,second],first)).toThrow('2レイヤー');
  });
  it('never hides missing, locked or non-path layers',()=>{
    expect(()=>validatedBooleanSourceVisibility(root(),[first,'missing' as LayerId])).toThrow('変更');
    expect(()=>validatedBooleanSourceVisibility(root(true),[first,second])).toThrow('ロック');
    expect(()=>validatedBooleanSourceVisibility(root(false,false),[first,second])).toThrow('変更');
  });
});
