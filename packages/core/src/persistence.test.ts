import {describe,expect,it} from 'vitest';
import {CoreDocument} from './coreDocument';
import {createDeterministicIdFactory} from './ids';
import {ProtectionTracker} from './recovery';

describe('M05 core persistence',()=>{
  it('round-trips IDs, layers, hidden RGB, metadata and retained Undo roots',()=>{
    let now=1000;const ids=createDeterministicIdFactory(),d=new CoreDocument({width:320,height:240,name:'保存テスト',colorProfileId:'srgb',ids,clock:()=>now++});
    const first=d.defaultRasterLayerId,firstSurface=d.root.getLayer(first).surface.descriptor.surfaceId,documentId=d.root.documentId;
    const a=d.begin('hidden rgb');a.setPixel(first,4,5,[7,8,9,0]);a.commit();
    const second=d.addRasterLayerAbove(first).layerId,secondSurface=d.root.getLayer(second).surface.descriptor.surfaceId;
    const b=d.begin('opaque');b.setPixel(second,8,9,[10,20,30,200]);b.commit();
    const savedRevision=d.head,snapshot=d.capturePersistenceSnapshot(),blocks=d.persistenceBlockPayloads(snapshot);
    const parsed=JSON.parse(JSON.stringify(snapshot)),restored=CoreDocument.restore({snapshot:parsed,blockPayloads:blocks,ids,clock:()=>now++});
    expect(restored.root.documentId).toBe(documentId);expect(restored.head).toBe(savedRevision);expect(restored.root.rootLayerIds).toEqual([first,second]);
    expect(restored.root.getLayer(first).surface.descriptor.surfaceId).toBe(firstSurface);expect(restored.root.getLayer(second).surface.descriptor.surfaceId).toBe(secondSurface);
    expect(restored.readPixel(first,4,5)).toEqual([7,8,9,0]);expect(restored.readPixel(second,8,9)).toEqual([10,20,30,200]);
    expect(restored.root.name).toBe('保存テスト');expect(restored.root.colorProfileId).toBe('srgb');expect(restored.root.metadata.createdAt).toBe(1000);expect(restored.root.metadata.modifiedAt).toBeGreaterThan(1000);
    expect(restored.canUndo).toBe(true);restored.undo();expect(restored.readPixel(second,8,9)).toEqual([0,0,0,0]);restored.redo();expect(restored.readPixel(second,8,9)).toEqual([10,20,30,200]);
    expect(restored.writerEpochId).not.toBe(d.writerEpochId);expect(restored.commitSequence).toBe(0n);
  });
  it('continues CommitSequence across Undo branch edits and protection never skips a gap',()=>{
    const ids=createDeterministicIdFactory(),d=new CoreDocument({width:64,height:64,ids}),l=d.defaultRasterLayerId;
    const a=d.begin('A');a.setPixel(l,1,1,[1,1,1,255]);expect(a.commit().revision.commitStamp?.commitSequence).toBe(1n);
    const b=d.begin('B');b.setPixel(l,2,2,[2,2,2,255]);expect(b.commit().revision.commitStamp?.commitSequence).toBe(2n);d.undo();
    const c=d.begin('C');c.setPixel(l,3,3,[3,3,3,255]);const stamp=c.commit().revision.commitStamp!;expect(stamp.commitSequence).toBe(3n);
    const tracker=new ProtectionTracker(stamp.writerEpochId);expect(tracker.acknowledge({...stamp,commitSequence:1n},true)).toBe(1n);
    expect(tracker.acknowledge(stamp,true)).toBe(1n);expect(tracker.acknowledge({...stamp,commitSequence:2n},true)).toBe(3n);
  });
  it('rejects missing or corrupted raster dependencies instead of inventing transparent pixels',()=>{
    const ids=createDeterministicIdFactory(),d=new CoreDocument({width:64,height:64,ids}),tx=d.begin('pixel');tx.setPixel(d.defaultRasterLayerId,1,1,[1,2,3,4]);tx.commit();
    const snapshot=d.capturePersistenceSnapshot(),blocks=d.persistenceBlockPayloads(snapshot),parsed=JSON.parse(JSON.stringify(snapshot)),first=snapshot.blocks[0]!;
    const missing=new Map(blocks);missing.delete(first.id as never);expect(()=>CoreDocument.restore({snapshot:parsed,blockPayloads:missing,ids})).toThrow(/missing|required|mismatch/);
    const corrupt=new Map(blocks),bytes=corrupt.get(first.id as never)!.slice(0,-1);corrupt.set(first.id as never,bytes);expect(()=>CoreDocument.restore({snapshot:parsed,blockPayloads:corrupt,ids})).toThrow(/byte length/);
  });
});
