import {expect,it} from 'vitest';
import {CoreDocument} from './coreDocument';
import {createDeterministicIdFactory} from './ids';
it('coalesces raster and layer metadata in one revision',()=>{const d=new CoreDocument({width:512,height:512,ids:createDeterministicIdFactory()});const l=d.defaultRasterLayerId,t=d.begin('combo');t.setPixel(l,5,5,[8,9,10,255]);t.renameLayer(l,'Ink');t.setLayerVisibility(l,false);const r=t.commit();const layer=d.root.getLayer(l);expect(layer.name).toBe('Ink');expect(layer.visible).toBe(false);expect(r.revision.command?.operations.length).toBe(2);expect(d.revisionCount).toBe(2);});
