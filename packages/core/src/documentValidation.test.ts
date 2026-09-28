import {expect,it} from 'vitest';
import {CoreDocument} from './coreDocument';
import {createDeterministicIdFactory} from './ids';
it('rejects fractional pixels and metadata no-ops',()=>{const d=new CoreDocument({width:256,height:256,ids:createDeterministicIdFactory()});const l=d.defaultRasterLayerId,t=d.begin('bad');expect(()=>t.setPixel(l,1.5,2,[1,2,3,4])).toThrow();t.cancel();const n=d.begin('noop');n.renameLayer(l,'Layer 1');expect(()=>n.commit()).toThrow(/empty/);expect(d.revisionCount).toBe(1);});
