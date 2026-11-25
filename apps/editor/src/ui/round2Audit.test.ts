import {expect,it} from 'vitest';
import {awaitAssistTarget} from '../assist/awaitTarget';
import {shortcutModeLabel,holdRestoreAllowed} from './shortcutSettings';

it('D-017 waits for a pending stroke, then snapshots the new head',async()=>{
  let head='old',pending=true,attempts=0;
  await awaitAssistTarget(async()=>{attempts++;if(attempts===2){head='new';pending=false;}},()=>true,()=>pending);
  expect(head).toBe('new');expect(attempts).toBe(2);
});
it('D-017 rejects a changed layer or document instead of retrying it',async()=>{
  let same=true,attempts=0;
  await expect(awaitAssistTarget(async()=>{attempts++;same=false;},()=>same,()=>false)).rejects.toThrow('解析対象が変わりました');
  expect(attempts).toBe(1);
});
it('D-020 distinguishes the stored modes and rejects stale restoration',()=>{
  expect(['press','toggle','hold'].map(m=>shortcutModeLabel(m as 'press'|'toggle'|'hold'))).toEqual(['一度だけ','押すたび切替','押している間だけ']);
  expect(holdRestoreAllowed('panView',1,new Map(),new Map([['panView',2]]))).toBe(false);
  expect(holdRestoreAllowed('panView',2,new Map(),new Map([['panView',2]]))).toBe(true);
});
