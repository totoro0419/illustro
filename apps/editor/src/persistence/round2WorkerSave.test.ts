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

// Exercise both capability markers with an approximately 93 MB raster payload.
it('D-021 validates a 93 MB-class work with partial raster and editable transform history',async()=>{
  const width=4800,height=4800,document=new CoreDocument({width,height}),layer=document.defaultRasterLayerId;
  const pixels=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;pixels[i]=(x*13+y*7)&255;pixels[i+1]=(x>>>8)*11;pixels[i+2]=(y>>>8)*13;pixels[i+3]=255;
  }
  const tx=document.begin('large raster');tx.replaceLayerRaster(layer,pixels);tx.commit();
  const p=document.begin('partial raster');p.patchLayerRasterTiles(layer,['0,0'],Array.from({length:4},(_,i)=>{
    const rgba=new Uint8Array(128*128*4);rgba.fill(255);return {key:`${i%2},${Math.floor(i/2)}`,pixels:rgba};
  }));p.commit();
  const q=document.begin('editable affine');const path=q.addRasterSnapshotAbove(layer,new Uint8Array(width*height*4),'shape');
  q.setEditableArtwork(path,{kind:'path',shape:'rectangle',points:[{x:12,y:12},{x:32,y:32}],closed:true,stroke:'#123456',fill:'#abcdef',width:0,transform:{a:1,b:0,c:0,d:1,e:5,f:7}});q.commit();
  const snapshot=document.capturePersistenceSnapshot(),payloads=document.persistenceBlockPayloads(snapshot);
  const sections:PortableSectionInput[]=[{id:'document',type:'document.core.v1',required:true,bytes:new TextEncoder().encode(JSON.stringify(snapshot))}];
  for(const b of snapshot.blocks)sections.push({id:'block:'+b.id,type:'raster.block.v1',required:true,bytes:payloads.get(b.id as never)!});
  appendPortableCapabilitySections(snapshot,sections);
  expect(sections.map(s=>s.id)).toContain('editable-affine-support');
  expect(sections.map(s=>s.id)).toContain('partial-raster-support');
  const bytes=await encodeVerifiedPortableFile({generationId:crypto.randomUUID(),documentId:document.root.documentId,snapshotRevisionId:document.head,createdAt:1,sections});
  expect(bytes.byteLength).toBeGreaterThan(90000000);
  console.log('D-021 synthetic native file bytes',bytes.byteLength);
  const opened=await openPortableDocument(bytes);
  expect(opened.document.head).toBe(document.head);
  expect(opened.document.root.getLayer(path).editable).toEqual(document.root.getLayer(path).editable);
  expect(opened.document.readPixel(layer,1,1)).toEqual([255,255,255,255]);
  expect(opened.document.readPixel(layer,4700,4700)).toEqual(document.readPixel(layer,4700,4700));
  opened.document.undo();opened.document.undo();expect(opened.document.readPixel(layer,1,1)).toEqual([20,0,0,255]);
  opened.document.redo();opened.document.redo();expect(opened.document.head).toBe(document.head);
},180000);
