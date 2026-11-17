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

describe('C06-015 sparse multi-layer clipboard using 128px source tiles',()=>{
 const sample=(x:number,y:number,rgba:readonly [number,number,number,number])=>{
  const pixels=new Uint8Array(128*128*4);pixels.set(rgba,(y*128+x)*4);return pixels;
 };
 it('pastes several sparse layers at an unaligned offset without a full 4000px per-layer RGBA buffer',()=>{
  const doc=new CoreDocument({width:4000,height:4000,ids:createDeterministicIdFactory()});
  const base=doc.defaultRasterLayerId,layer=doc.root.getLayer(base);
  const t=doc.begin('paste group sparse');
  const placed=t.pasteRasterLayers(base,[
   {layer,pixels:{x:13,y:7,width:3900,height:3900,tileSize:128,tiles:[
    {key:'0,0',pixels:sample(0,0,[20,40,80,255])},
    {key:'1,1',pixels:sample(127,127,[100,90,60,128])}
   ]}},
   {layer,pixels:{x:13,y:7,width:3900,height:3900,tileSize:128,tiles:[
    {key:'0,1',pixels:sample(5,12,[180,110,35,255])}
   ]}}
  ],[]);
  t.commit();
  expect(doc.root.rootLayerIds).toHaveLength(3);
  const created=doc.root.rootLayerIds.filter(id=>id!==base);
  expect(doc.readPixel(created[0]!,13,7)).toEqual([20,40,80,255]);
  expect(doc.readPixel(created[0]!,268,262)).toEqual([100,90,60,128]);
  expect(doc.readPixel(created[1]!,18,147)).toEqual([180,110,35,255]);
  expect(doc.readPixel(created[1]!,3000,3000)).toEqual([0,0,0,0]);
  expect(doc.canonicalBlockCount).toBeLessThan(12);
  doc.undo();expect(doc.root.rootLayerIds).toHaveLength(1);
  doc.redo();expect(doc.readPixel(created[0]!,268,262)).toEqual([100,90,60,128]);
  const saved=doc.capturePersistenceSnapshot();
  const recovered=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(saved)),blockPayloads:doc.persistenceBlockPayloads(saved)});
  expect(recovered.readPixel(created[1]!,18,147)).toEqual([180,110,35,255]);
 });
 it('rejects bad tile keys and invalid placement before changing document history',()=>{
  const doc=new CoreDocument({width:4000,height:4000,ids:createDeterministicIdFactory()}),id=doc.defaultRasterLayerId,head=doc.head;
  const test=(tiles:readonly {key:string;pixels:Uint8Array}[],x=0)=>{
   const tx=doc.begin('invalid group');
   expect(()=>tx.addRasterSnapshotAbove(id,{x,y:0,width:300,height:300,tileSize:128,tiles},'bad')).toThrow();
   tx.cancel();
  };
  const valid={key:'0,0',pixels:sample(1,1,[30,45,55,255])};
  test([valid,valid]);
  test([{key:'3,0',pixels:valid.pixels}]);
  test([valid],3800);
  expect(doc.head).toBe(head);
 });
});
