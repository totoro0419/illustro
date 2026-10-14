import {it,expect} from 'vitest';
import {ContiguousProtection} from './contiguousProtection';
it('advances only through a verified contiguous dependency prefix',()=>{const p=new ContiguousProtection<string>();p.verified(2n,'second');expect(p.through).toBe(0n);p.verified(1n,'first');expect(p.through).toBe(2n);expect(p.value).toBe('second');expect(p.pending).toBe(0);});
it('does not regress the verified head on duplicate old writes',()=>{const p=new ContiguousProtection<string>();p.verified(1n,'first');p.verified(2n,'second');p.verified(1n,'old');expect(p.value).toBe('second');});
it('does not retain a growing map of already acknowledged writes',()=>{const p=new ContiguousProtection<number>();for(let i=1;i<=1100;i++)p.verified(BigInt(i),i);expect(p.through).toBe(1100n);expect(p.pending).toBe(0);});
