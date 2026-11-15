import {describe,expect,it} from 'vitest';
import {CoreDocument} from './coreDocument';

describe('sparse logical white background',()=>{
  it('creates 4000×4000 white without allocating any white raster bytes',()=>{
    const doc=new CoreDocument({width:4000,height:4000,name:'White',blankBackground:'white'});
    const background=doc.root.rootLayerIds[0]!;
    expect(doc.root.getLayer(background).baseColor).toBe('white');
    expect(doc.root.getLayer(background).surface.tiles.entries()).toHaveLength(0);
    expect(doc.canonicalRasterBytes).toBe(0);
    expect(doc.readPixel(background,0,0)).toEqual([255,255,255,255]);
    expect(doc.readPixel(background,3999,3999)).toEqual([255,255,255,255]);
    const drawing=doc.addRasterLayerAbove(background).layerId;
    expect(doc.readPixel(drawing,0,0)).toEqual([0,0,0,0]);
    expect(doc.canonicalRasterBytes).toBe(0);
  });
  it('preserves sparse white metadata in native snapshot, recovery and undo',()=>{
    const doc=new CoreDocument({width:64,height:32,blankBackground:'white'});
    const background=doc.root.rootLayerIds[0]!;
    const top=doc.addRasterLayerAbove(background).layerId;
    const snapshot=doc.capturePersistenceSnapshot();
    expect(snapshot.blocks).toHaveLength(0);
    const restored=CoreDocument.restore({snapshot,blockPayloads:doc.persistenceBlockPayloads(snapshot)});
    expect(restored.root.getLayer(background).baseColor).toBe('white');
    expect(restored.readPixel(background,63,31)).toEqual([255,255,255,255]);
    expect(restored.readPixel(top,63,31)).toEqual([0,0,0,0]);
    restored.undo();
    expect(restored.root.rootLayerIds).toHaveLength(1);
    expect(restored.readPixel(background,0,0)).toEqual([255,255,255,255]);
    restored.redo();
    expect(restored.root.rootLayerIds).toHaveLength(2);
  });
  it('materializes a white background on explicit geometry operations, not at startup',()=>{
    const doc=new CoreDocument({width:8,height:8,blankBackground:'white'});
    const background=doc.root.rootLayerIds[0]!;
    const pixels=doc.readBaseRasterPixels(background);
    expect(pixels.length).toBe(8*8*4);
    expect([...pixels.slice(0,4)]).toEqual([255,255,255,255]);
    const tx=doc.begin('Edit base');
    tx.resizeDocument(8,8,'document.canvas-resize',new Map([[background,pixels]]));
    tx.commit();
    expect(doc.root.getLayer(background).baseColor).toBeUndefined();
    expect(doc.readPixel(background,7,7)).toEqual([255,255,255,255]);
    doc.undo();
    expect(doc.root.getLayer(background).baseColor).toBe('white');
  });
});
