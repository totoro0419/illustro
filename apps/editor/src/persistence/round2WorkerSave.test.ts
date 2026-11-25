import {describe,it,expect} from 'vitest';
import {CoreDocument} from '@illustro/core';
import {encodeIllustroFile,type PortableSectionInput} from './format';
import {appendPortableCapabilitySections,createPortableDocument,encodeVerifiedPortableFile,openPortableDocument} from './portable';

describe('D-021 worker save semantic round-trip',()=>{
  it('rejects the old marker-free worker output and restores partial raster history after repair',async()=>{
    const document=new CoreDocument({width:256,height:256}),layer=document.defaultRasterLayerId;
    const before=document.head;
    const tx=document.begin('partial raster patch');
    tx.patchLayerRasterTiles(layer,['0,0'],Array.from({length:4},(_,i)=>{
      const pixels=new Uint8Array(128*128*4);pixels.set([20+i,2,3,255]);
      return {key:`${i%2},${Math.floor(i/2)}`,pixels};
    }));
    tx.commit();
    const snapshot=document.capturePersistenceSnapshot(),payloads=document.persistenceBlockPayloads(snapshot);
    const sections:PortableSectionInput[]=[{id:'document',type:'document.core.v1',required:true,bytes:new TextEncoder().encode(JSON.stringify(snapshot))}];
    for(const b of snapshot.blocks)sections.push({id:'block:'+b.id,type:'raster.block.v1',required:true,bytes:payloads.get(b.id as never)!});
    const input={generationId:crypto.randomUUID(),documentId:document.root.documentId,snapshotRevisionId:document.head,createdAt:1,sections};
    const old=await encodeIllustroFile(input);
    await expect(openPortableDocument(old)).rejects.toThrow('作品の区画保存情報を確認できません');
    await expect(encodeVerifiedPortableFile(input)).rejects.toThrow('作品の区画保存情報を確認できません');
    appendPortableCapabilitySections(snapshot,sections);
    const bytes=await encodeVerifiedPortableFile(input);
    const opened=await openPortableDocument(bytes);
    expect(opened.document.head).toBe(document.head);
    expect(opened.document.root.rootLayerIds).toEqual(document.root.rootLayerIds);
    expect(opened.document.readPixel(layer,0,0)).toEqual([20,2,3,255]);
    opened.document.undo();expect(opened.document.head).toBe(before);
    opened.document.redo();expect(opened.document.readPixel(layer,128,128)).toEqual([23,2,3,255]);
    const again=await createPortableDocument({document:opened.document,selectedLayerId:layer});
    expect((await openPortableDocument(again.bytes)).document.readPixel(layer,128,128)).toEqual([23,2,3,255]);
  });
});
