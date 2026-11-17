import {describe,expect,it} from 'vitest';
import {CoreDocument} from './coreDocument';
import {createDeterministicIdFactory} from './ids';

describe('C06-015 sparse editable-layer placement',()=>{
  it('seeds only touched tiles on a 4000px artwork, and survives Undo/Redo + save/restore',()=>{
    const doc=new CoreDocument({width:4000,height:4000,ids:createDeterministicIdFactory()});
    const original=doc.defaultRasterLayerId,layer=doc.root.getLayer(original);
    const pixels=new Uint8Array(4*3*4);
    pixels.set([15,45,75,255],0);
    pixels.set([90,60,30,200],(2*4+3)*4);
    const tx=doc.begin('paste selected layers');
    const pasted=tx.pasteRasterLayers(original,[{
      layer,pixels:{x:254,y:255,width:4,height:3,pixels}
    }],[]);
    tx.commit();
    expect(doc.readPixel(pasted,254,255)).toEqual([15,45,75,255]);
    expect(doc.readPixel(pasted,257,257)).toEqual([90,60,30,200]);
    expect(doc.readPixel(pasted,2,2)).toEqual([0,0,0,0]);
    expect(doc.canonicalBlockCount).toBeLessThanOrEqual(4);
    doc.undo();
    expect(doc.root.hasLayer(pasted)).toBe(false);
    doc.redo();
    expect(doc.readPixel(pasted,257,257)).toEqual([90,60,30,200]);
    const snapshot=doc.capturePersistenceSnapshot();
    const restored=CoreDocument.restore({
      snapshot:JSON.parse(JSON.stringify(snapshot)),
      blockPayloads:doc.persistenceBlockPayloads(snapshot)
    });
    expect(restored.readPixel(pasted,254,255)).toEqual([15,45,75,255]);
    expect(restored.readPixel(pasted,257,257)).toEqual([90,60,30,200]);
  });
  it('rejects invalid regions before touching the document',()=>{
    const doc=new CoreDocument({width:16,height:16,ids:createDeterministicIdFactory()});
    const original=doc.defaultRasterLayerId,head=doc.head;
    const tx=doc.begin('invalid copy');
    expect(()=>tx.addRasterSnapshotAbove(original,{
      x:15,y:15,width:2,height:2,pixels:new Uint8Array(16)
    },'bad')).toThrow(/大きさ・配置/);
    tx.cancel();
    expect(doc.head).toBe(head);
    expect(doc.root.rootLayerIds).toHaveLength(1);
  });
  it('does not allocate tiles for completely transparent sparse data',()=>{
    const doc=new CoreDocument({width:4000,height:4000,ids:createDeterministicIdFactory()});
    const original=doc.defaultRasterLayerId,tx=doc.begin('empty paste');
    const pasted=tx.addRasterSnapshotAbove(original,{
      x:1000,y:1000,width:8,height:8,pixels:new Uint8Array(8*8*4)
    },'empty');
    tx.commit();
    expect(doc.canonicalBlockCount).toBe(0);
    expect(doc.readPixel(pasted,1000,1000)).toEqual([0,0,0,0]);
  });
});
