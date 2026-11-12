import {describe,expect,it} from 'vitest';
import {CoreDocument} from './coreDocument';
import {createDeterministicIdFactory} from './ids';

describe('M02 raster layer creation',()=>{
  it('adds one sparse Raster Layer above the reference in one formal Document operation',()=>{
    const d=new CoreDocument({width:512,height:512,ids:createDeterministicIdFactory()}),first=d.defaultRasterLayerId,beforeHead=d.head,beforeBlocks=d.canonicalBlockCount,beforeBytes=d.canonicalRasterBytes;
    const firstSurface=d.root.getLayer(first).surface.descriptor.surfaceId,{layerId,receipt}=d.addRasterLayerAbove(first),added=d.root.getLayer(layerId);
    expect(layerId).not.toBe(first);expect(added.surface.descriptor.surfaceId).not.toBe(firstSurface);expect(added.name).toBe('Layer 2');
    expect(d.root.rootLayerIds).toEqual([first,layerId]);expect(receipt.revision.parentIds).toEqual([beforeHead]);expect(d.revisionCount).toBe(2);
    expect(receipt.revision.command?.operations).toHaveLength(1);expect(receipt.revision.command?.operations[0]?.kind).toBe('layer.add-raster');expect(receipt.revision.command?.operations[0]?.targetEntityIds).toEqual([layerId]);
    expect(d.canonicalBlockCount).toBe(beforeBlocks);expect(d.canonicalRasterBytes).toBe(beforeBytes);expect(d.getTileValue(layerId,0,0)).toBeUndefined();
  });
  it('keeps existing Raster content untouched when a Layer is added',()=>{
    const d=new CoreDocument({width:512,height:512,ids:createDeterministicIdFactory()}),first=d.defaultRasterLayerId,t=d.begin('seed');
    t.setPixel(first,12,18,[11,22,33,255]);t.commit();const blocks=d.canonicalBlockCount,bytes=d.canonicalRasterBytes,pixel=d.readPixel(first,12,18);
    const {layerId}=d.addRasterLayerAbove(first);expect(d.readPixel(first,12,18)).toEqual(pixel);expect(d.canonicalBlockCount).toBe(blocks);expect(d.canonicalRasterBytes).toBe(bytes);expect(d.getTileValue(layerId,0,0)).toBeUndefined();
  });
  it('rejects a stale Layer-add transaction without publishing a partial Layer',()=>{
    const d=new CoreDocument({width:512,height:512,ids:createDeterministicIdFactory()}),first=d.defaultRasterLayerId,stale=d.begin('stale add'),unpublished=stale.addRasterLayerAbove(first),intervening=d.begin('intervening');
    intervening.setPixel(first,1,1,[1,2,3,255]);intervening.commit();const head=d.head,count=d.revisionCount,blocks=d.canonicalBlockCount;
    expect(()=>stale.commit()).toThrow(/stale/);expect(d.head).toBe(head);expect(d.revisionCount).toBe(count);expect(d.canonicalBlockCount).toBe(blocks);expect(d.root.hasLayer(unpublished)).toBe(false);expect(d.root.rootLayerIds).toEqual([first]);
  });
  it('rejects an invalid insertion target without changing the Document',()=>{
    const d=new CoreDocument({width:512,height:512,ids:createDeterministicIdFactory()}),tx=d.begin('bad add'),head=d.head,count=d.revisionCount;
    const missing='00000000-0000-4000-8000-ffffffffffff' as typeof d.defaultRasterLayerId;
    expect(()=>tx.addRasterLayerAbove(missing)).toThrow(/missing reference/);expect(d.head).toBe(head);expect(d.revisionCount).toBe(count);expect(d.root.rootLayerIds).toEqual([d.defaultRasterLayerId]);
  });
});
