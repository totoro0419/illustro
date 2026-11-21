import {describe,it,expect} from 'vitest';
import {shouldPreventFileNavigation} from './dropImport';

describe('C06-014 prevent navigation from unhandled image drops',()=>{
  it('protects artwork when files are dropped over a locked or unrelated panel',()=>{
    expect(shouldPreventFileNavigation(['Files'])).toBe(true);
    expect(shouldPreventFileNavigation(['Files','text/plain'])).toBe(true);
    expect(shouldPreventFileNavigation(['Files'],false)).toBe(true);
  });
  it('does not block deliberate file-input drops or ordinary text drags',()=>{
    expect(shouldPreventFileNavigation(['Files'],true)).toBe(false);
    expect(shouldPreventFileNavigation(['text/plain'])).toBe(false);
    expect(shouldPreventFileNavigation([])).toBe(false);
  });
});
