import {describe,it,expect} from 'vitest';
import {CoreDocument} from './coreDocument';

describe('R2 D-010 atomic layer merge history',()=>{
  it('undoes one merge back to original layers/pixels/names and redoes in one step',()=>{
    const doc=new CoreDocument({width:8,height:8});
    const a=doc.defaultRasterLayerId;
    const one=doc.begin('name and pixels');
    one.renameLayer(a,'line art');
    one.setPixel(a,1,1,[10,20,30,255]);
    one.commit();
    const {layerId:b}=doc.addRasterLayerAbove(a);
    const two=doc.begin('color layer');
    two.renameLayer(b,'color');
    two.setPixel(b,4,4,[220,0,5,255]);
    two.commit();
    const before=doc.head,order=[...doc.root.rootLayerIds];
    const pixels=new Uint8ClampedArray(8*8*4);
    pixels.set([10,20,30,255],4*(1*8+1));
    pixels.set([220,0,5,255],4*(4*8+4));
    const tx=doc.begin('レイヤーを結合');
    const merged=tx.replaceRasterLayers(new Set([a,b]),b,pixels,'結合レイヤー');
    tx.commit();
    const after=doc.head;
    expect(doc.root.rootLayerIds).toEqual([merged]);
    expect(doc.readPixel(merged,4,4)).toEqual([220,0,5,255]);
    expect(doc.currentRevision.command?.label).toBe('レイヤーを結合');
    doc.undo();
    expect(doc.head).toBe(before);
    expect(doc.root.rootLayerIds).toEqual(order);
    expect(doc.root.getLayer(a).name).toBe('line art');
    expect(doc.root.getLayer(b).name).toBe('color');
    expect(doc.readPixel(a,1,1)).toEqual([10,20,30,255]);
    expect(doc.readPixel(b,4,4)).toEqual([220,0,5,255]);
    doc.redo();
    expect(doc.head).toBe(after);
    expect(doc.root.rootLayerIds).toEqual([merged]);
  });
});
