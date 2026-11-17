import {describe,it,expect} from 'vitest';
import {needsUnloadWarning} from './unloadGuard';

describe('C03-008 best-effort protection before unload',()=>{
  const done={saving:false,protectionPending:false,queueLength:0,storageError:null};
  it('does not interrupt leaving a fully protected work',()=>{
    expect(needsUnloadWarning(done)).toBe(false);
  });
  it('warns if a file write, protection queue or storage error remains',()=>{
    expect(needsUnloadWarning({...done,saving:true})).toBe(true);
    expect(needsUnloadWarning({...done,protectionPending:true})).toBe(true);
    expect(needsUnloadWarning({...done,queueLength:2})).toBe(true);
    expect(needsUnloadWarning({...done,storageError:'disk full'})).toBe(true);
  });
});
