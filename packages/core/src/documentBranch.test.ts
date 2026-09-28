import {describe,expect,it} from 'vitest';
import {CoreDocument} from './coreDocument';
import {createDeterministicIdFactory} from './ids';
it('branches after undo',()=>{const d=new CoreDocument({width:512,height:512,ids:createDeterministicIdFactory()});const l=d.defaultRasterLayerId;let t=d.begin('a');t.setPixel(l,1,1,[1,1,1,255]);t.commit();t=d.begin('b');t.setPixel(l,2,2,[2,2,2,255]);const old=t.commit();d.undo();t=d.begin('c');t.setPixel(l,3,3,[3,3,3,255]);const now=t.commit();expect(d.hasRevision(old.revision.id)).toBe(true);expect(d.head).toBe(now.revision.id);expect(d.redo().id).toBe(now.revision.id);});
