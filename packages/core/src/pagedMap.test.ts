import {expect,it} from 'vitest';
import {PagedMap} from './pagedMap';
it('preserves old map',()=>{const e=PagedMap.empty<string,number>().edit();e.set('a',1);const a=e.commit(),x=a.edit();x.set('a',2);const b=x.commit();expect(a.get('a')).toBe(1);expect(b.get('a')).toBe(2);});
