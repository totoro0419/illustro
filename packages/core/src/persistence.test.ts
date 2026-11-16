import {describe,expect,it} from 'vitest';
import {CoreDocument} from './coreDocument';
import type {LayerDeformation} from './layerDeformation';
import {createDeterministicIdFactory} from './ids';
import {ProtectionTracker} from './recovery';
import {mergeCoreRecovery} from './persistence';

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
  it('saves the accepted revision without serializing later history or pixels',()=>{
    const d=new CoreDocument({width:12,height:12,ids:createDeterministicIdFactory()}),layer=d.defaultRasterLayerId;
    const requestedThrough=d.commitSequence;
    const accepted=d.begin('accepted brush');
    accepted.setPixel(layer,1,1,[7,8,9,255]);
    const target=accepted.commit().revision.id;
    const later=d.begin('after save');
    later.setPixel(layer,2,2,[4,5,6,255]);
    const laterId=later.commit().revision.id;
    const snapshot=d.captureSaveSnapshot(target,requestedThrough);
    const restored=CoreDocument.restore({snapshot,blockPayloads:d.persistenceBlockPayloads(snapshot)});
    expect(restored.head).toBe(target);
    expect(restored.hasRevision(laterId)).toBe(false);
    expect(restored.readPixel(layer,1,1)).toEqual([7,8,9,255]);
    expect(restored.readPixel(layer,2,2)).toEqual([0,0,0,0]);
    expect(d.head).toBe(laterId);
  });
  it('saves and recovers the original of a pasted editable transform with one undo',()=>{
    const d=new CoreDocument({width:2,height:2,ids:createDeterministicIdFactory()}),id=d.defaultRasterLayerId;
    const base=d.capturePersistenceSnapshot(),before=d.head,layer=d.root.getLayer(id);
    const mask={shape:'rectangle',x:0,y:0,width:1,height:1,enabled:true,inverted:false,density:.5,linked:true} as const;
    const deformation:LayerDeformation={version:1,sourceRevision:before,mode:'projective',bounds:{x:0,y:0,width:2,height:2},
      corners:[{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}],interpolation:'bilinear',selection:null,linkedMask:true};
    const tx=d.begin('paste transformed layer');
    const input=new Uint8Array(16);input.set([90,80,70,255],0);
    const output=new Uint8Array(16);output.set([90,80,70,255],4);
    const pasted=tx.pasteRasterLayers(id,[{layer,pixels:output,mask,source:{pixels:input,mask,deformation}}],[]);
    const receipt=tx.commit(),result=d.root.getLayer(pasted).deformation!;
    const original=result.sourceLayerId!;
    expect(result.sourceRevision).toBe(receipt.revision.id);
    expect(d.root.getLayer(original).visible).toBe(false);
    expect(d.readPixel(original,0,0)).toEqual([90,80,70,255]);
    expect(d.readPixel(pasted,1,0)).toEqual([90,80,70,255]);
    const packet=d.captureRecoveryPacket(receipt.persistence);
    const snapshot=d.capturePersistenceSnapshot();
    for(const restoredSnapshot of [snapshot,mergeCoreRecovery(base,[packet])]){
      const restored=CoreDocument.restore({snapshot:restoredSnapshot,blockPayloads:d.persistenceBlockPayloads(snapshot)});
      const source=restored.revision(result.sourceRevision).root.getLayer(original);
      expect(source.vectorMask?.density).toBe(.5);
      const edit=restored.begin('edit pasted transform');
      edit.replaceLayerDeformation(pasted,input,result);edit.commit();
      expect(restored.readPixel(pasted,0,0)).toEqual([90,80,70,255]);
    }
    d.undo();
    expect(d.head).toBe(before);
    expect(d.root.rootLayerIds).toEqual([id]);
    d.redo();
    expect(d.root.hasLayer(pasted)).toBe(true);
  });
  it('recovers an adjusted edit as one undo without rolling back later commands',()=>{
    const d=new CoreDocument({width:3,height:3,ids:createDeterministicIdFactory()}),layer=d.defaultRasterLayerId;
    const base=d.capturePersistenceSnapshot(),before=d.head;
    const first=d.begin('fill');
    first.setPixel(layer,1,1,[10,20,30,255]);
    const applied=first.commit(),firstPacket=d.captureRecoveryPacket(applied.persistence);
    const adjusted=d.beginAdjustment(applied.revision.id,'adjust fill');
    adjusted.setPixel(layer,1,1,[40,50,60,255]);
    const revised=adjusted.commit(),revisedPacket=d.captureRecoveryPacket(revised.persistence);
    const restoredSnapshot=mergeCoreRecovery(base,[firstPacket,revisedPacket]);
    const restored=CoreDocument.restore({snapshot:restoredSnapshot,blockPayloads:d.persistenceBlockPayloads(d.capturePersistenceSnapshot())});
    expect(restored.readPixel(layer,1,1)).toEqual([40,50,60,255]);
    restored.undo();
    expect(restored.head).toBe(before);
    expect(restored.canUndo).toBe(false);
    restored.redo();
    expect(restored.head).toBe(revised.revision.id);
    expect(()=>d.beginAdjustment(applied.revision.id,'stale adjustment')).toThrow();
  });
  it('keeps a masked gradient map editable across restore and undo without touching the original',()=>{
    const d=new CoreDocument({width:4,height:4,ids:createDeterministicIdFactory()}),original=d.defaultRasterLayerId;
    const before=d.begin('original');
    before.setPixel(original,1,1,[100,100,100,255]);before.commit();
    const edit=d.begin('gradient map'),adjustment=edit.addRasterLayerAbove(original);
    const mask={shape:'rectangle' as const,x:0,y:0,width:2,height:2,enabled:true,inverted:false,density:1};
    const gradientMap={levels:4,dither:true,stops:[
      {at:0,color:'#000000',opacity:1,midpoint:.5},{at:1,color:'#ffccaa',opacity:1,midpoint:.5}
    ]};
    edit.setVectorLayerMask(adjustment,mask);
    edit.setLayerBlend(adjustment,{mode:'normal',space:'encoded',seed:0,gradientMap});edit.commit();
    const snapshot=d.capturePersistenceSnapshot();
    const restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(snapshot)),blockPayloads:d.persistenceBlockPayloads(snapshot)});
    expect(restored.root.getLayer(adjustment).blend?.gradientMap).toEqual(gradientMap);
    expect(restored.root.getLayer(adjustment).vectorMask).toEqual(mask);
    const change=restored.begin('change levels');
    change.setLayerBlend(adjustment,{mode:'normal',space:'encoded',seed:0,gradientMap:{...gradientMap,levels:8}});
    change.commit();
    expect(restored.root.getLayer(adjustment).blend?.gradientMap?.levels).toBe(8);
    restored.undo();
    expect(restored.root.getLayer(adjustment).blend?.gradientMap).toEqual(gradientMap);
    restored.undo();
    expect(restored.root.hasLayer(adjustment)).toBe(false);
    restored.redo();
    expect(restored.root.getLayer(adjustment).blend?.gradientMap).toEqual(gradientMap);
    expect(restored.readPixel(original,1,1)).toEqual([100,100,100,255]);
  });
  it('previews and recovers isolated group structure without changing layer content',()=>{
    const doc=new CoreDocument({width:6,height:6,ids:createDeterministicIdFactory()}),first=doc.defaultRasterLayerId;
    const second=doc.addRasterLayerAbove(first).layerId;
    const grouped=doc.begin('group layers');
    grouped.createLayerGroup(new Set([first,second]),'group');
    grouped.commit();
    const id=doc.root.groupsForLayer(first)[0]!.id;
    const comparison=doc.begin('isolate group');
    comparison.updateLayerGroup(id,{compositing:'isolated'});
    expect(comparison.previewLayerStructure().groupsForLayer(first)[0]?.compositing).toBe('isolated');
    expect(doc.root.groupsForLayer(first)[0]?.compositing).toBeUndefined();
    const result=comparison.commit();
    const saved=doc.capturePersistenceSnapshot(),blocks=doc.persistenceBlockPayloads(saved);
    const restored=CoreDocument.restore({snapshot:saved,blockPayloads:blocks});
    expect(restored.root.groupsForLayer(first)[0]?.compositing).toBe('isolated');
    restored.undo();
    expect(restored.root.groupsForLayer(first)[0]?.compositing).toBeUndefined();
    restored.redo();
    expect(restored.head).toBe(result.revision.id);
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
  it('recovers geometry dimensions, replaced pixels and later strokes with contiguous commits',()=>{
    const ids=createDeterministicIdFactory(),doc=new CoreDocument({width:64,height:64,ids}),layer=doc.defaultRasterLayerId;
    const base=doc.capturePersistenceSnapshot(),packets:ReturnType<typeof doc.captureRecoveryPacket>[]=[],allBlocks=new Map<string,Uint8Array>(doc.persistenceBlockPayloads(base));
    const track=(receipt:ReturnType<ReturnType<typeof doc.begin>['commit']>)=>{
      const packet=doc.captureRecoveryPacket(receipt.persistence);
      packets.push(JSON.parse(JSON.stringify(packet)));
      for(const [id,bytes] of doc.recoveryBlockPayloads(packet))allBlocks.set(id,bytes);
    };
    const first=doc.begin('initial pixels');first.setPixel(layer,3,4,[12,34,56,255]);track(first.commit());
    const geometry=doc.begin('resize bounds'),basePixels=new Uint8Array(80*72*4);
    basePixels.set([12,34,56,255],(4*80+3)*4);
    geometry.resizeDocument(80,72,'document.canvas-resize',new Map([[layer,basePixels]]),{anchor:'top-left'});track(geometry.commit());
    const further=doc.begin('continued edit');further.setPixel(layer,70,63,[64,120,230,220]);track(further.commit());
    const cropped=doc.begin('crop'),cropPixels=new Uint8Array(40*40*4);
    cropPixels.set([12,34,56,255],(4*40+3)*4);
    cropped.resizeDocument(40,40,'document.crop',new Map([[layer,cropPixels]]),{x:0,y:0});track(cropped.commit());
    expect(doc.commitSequence).toBe(4n);expect(packets.map(p=>p.handoff.commitSequence)).toEqual(['1','2','3','4']);
    expect(packets[1]!.replacementRoot?.width).toBe(80);
    expect(packets[3]!.replacementRoot?.height).toBe(40);
    const recovered=mergeCoreRecovery(base,packets,doc.head);
    const restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(recovered)),blockPayloads:allBlocks,ids});
    expect(restored.root.width).toBe(40);expect(restored.root.height).toBe(40);
    expect(restored.readPixel(layer,3,4)).toEqual([12,34,56,255]);
    expect(restored.readPixel(layer,6,6)).toEqual([0,0,0,0]);
    restored.undo();expect(restored.root.width).toBe(80);expect(restored.readPixel(layer,70,63)).toEqual([64,120,230,220]);
    restored.undo();expect(restored.root.width).toBe(80);expect(restored.readPixel(layer,70,63)).toEqual([0,0,0,0]);
    restored.redo();restored.redo();expect(restored.root.width).toBe(40);
    const missing=new Map(allBlocks);const newBlock=packets[3]!.handoff.requiredBlockIds[0]!;
    missing.delete(newBlock as never);
    expect(()=>CoreDocument.restore({snapshot:recovered,blockPayloads:missing,ids})).toThrow();
    const corrupted=JSON.parse(JSON.stringify(packets));
    corrupted[3].replacementRoot.width=0;
    expect(()=>mergeCoreRecovery(base,corrupted,doc.head)).toThrow(/dimension/);
  });

});

it('keeps document information through recovery, undo, redo and older snapshots',()=>{
  const doc=new CoreDocument({width:512,height:384,name:'Original',dpi:300});
  const layer=doc.defaultRasterLayerId;
  const ink=doc.begin('Ink');ink.setPixel(layer,3,4,[10,20,30,255]);ink.commit();
  const original=doc.capturePersistenceSnapshot(),blocks=doc.persistenceBlockPayloads(original);
  const change=doc.begin('作品情報');
  expect(change.setDocumentInfo({name:'Updated',author:'Artist',description:'First\nSecond',dpi:600})).toBe(true);
  const receipt=change.commit();
  const packet=doc.captureRecoveryPacket(receipt.persistence);
  expect(packet.tileChanges).toEqual([]);
  expect(receipt.changedBlockIds).toEqual([]);
  const merged=mergeCoreRecovery(
    // Recovery starts at the base of each writer epoch.
    original,[{...packet,handoff:{...packet.handoff,commitSequence:'1'},
      revision:{...packet.revision,commitStamp:{...packet.revision.commitStamp,commitSequence:'1'}}}],
  );
  const restored=CoreDocument.restore({snapshot:merged,blockPayloads:blocks});
  expect(restored.root.info).toEqual({name:'Updated',author:'Artist',description:'First\nSecond',dpi:600});
  expect(restored.readPixel(layer,3,4)).toEqual([10,20,30,255]);
  restored.undo();expect(restored.root.info).toEqual({name:'Original',author:'',description:'',dpi:300});
  doc.undo();expect(doc.root.name).toBe('Original');
  doc.redo();expect(doc.root.name).toBe('Updated');
  const older=new CoreDocument({width:32,height:32,name:'Existing file'});
  const reopened=CoreDocument.restore({snapshot:older.capturePersistenceSnapshot(),blockPayloads:new Map()});
  expect(reopened.root.info.dpi).toBeNull();
});
