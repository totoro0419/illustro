import {describe,it,expect} from 'vitest';
import {CoreDocument} from './coreDocument';
import {createDeterministicIdFactory} from './ids';
const block=(x:number,y:number,rgba:[number,number,number,number])=>{
 const pixels=new Uint8Array(128*128*4);pixels.set(rgba,(y*128+x)*4);return pixels;
};
describe('C06-002 sparse selection snapshot (128px GPU to 256px Core)',()=>{
 it('replaces only occupied blocks; Undo/Redo and restore retain exact pixels in a 4000px document',()=>{
  const doc=new CoreDocument({width:4000,height:4000,ids:createDeterministicIdFactory()});
  const id=doc.defaultRasterLayerId;
  let tx=doc.begin('old source');tx.setPixel(id,12,14,[6,7,8,255]);tx.commit();
  tx=doc.begin('selected brush');
  tx.replaceLayerRasterTiles(id,[
   {key:'0,0',pixels:block(12,14,[10,40,90,255])},
   {key:'1,0',pixels:block(4,2,[100,110,120,128])},
   {key:'31,31',pixels:block(31,31,[13,55,87,251])},
  ]);
  tx.commit();
  expect(doc.readPixel(id,12,14)).toEqual([10,40,90,255]);
  expect(doc.readPixel(id,132,2)).toEqual([100,110,120,128]);
  expect(doc.readPixel(id,3999,3999)).toEqual([13,55,87,251]);
  expect(doc.readPixel(id,2,3000)).toEqual([0,0,0,0]);
  expect(doc.rasterReplayPlan().seededLayers.has(id)).toBe(true);
  const chunks=doc.readBaseRasterTiles(id);
  expect(chunks.map(t=>t.key).sort()).toEqual(['0,0','1,0','31,31']);
  expect(doc.canonicalBlockCount).toBeLessThan(10);
  doc.undo();expect(doc.readPixel(id,12,14)).toEqual([6,7,8,255]);
  doc.redo();expect(doc.readPixel(id,3999,3999)).toEqual([13,55,87,251]);
  const saved=doc.capturePersistenceSnapshot();
  const restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(saved)),blockPayloads:doc.persistenceBlockPayloads(saved)});
  expect(restored.readPixel(id,132,2)).toEqual([100,110,120,128]);
  expect(restored.readBaseRasterTiles(id).map(t=>t.key).sort()).toEqual(['0,0','1,0','31,31']);
 });
 it('rejects duplicate and malformed tiles without committing edits',()=>{
  const doc=new CoreDocument({width:300,height:300,ids:createDeterministicIdFactory()}),id=doc.defaultRasterLayerId,head=doc.head;
  const tile={key:'0,0',pixels:block(0,0,[1,2,3,4])};
  const tx=doc.begin('bad tiles');
  expect(()=>tx.replaceLayerRasterTiles(id,[tile,tile])).toThrow(/重複/);
  tx.cancel();
  expect(doc.head).toBe(head);
  const other=doc.begin('offscreen');
  expect(()=>other.replaceLayerRasterTiles(id,[{key:'3,0',pixels:new Uint8Array(128*128*4)}])).toThrow(/作品の外/);
  other.cancel();
 });
 it('supports replacing a nonblank layer with a completely transparent snapshot',()=>{
  const doc=new CoreDocument({width:4000,height:4000,ids:createDeterministicIdFactory()}),id=doc.defaultRasterLayerId;
  let tx=doc.begin('old ink');tx.setPixel(id,20,20,[60,70,80,255]);tx.commit();
  tx=doc.begin('erase all');tx.replaceLayerRasterTiles(id,[]);tx.commit();
  expect(doc.readPixel(id,20,20)).toEqual([0,0,0,0]);
  expect(doc.readBaseRasterTiles(id)).toHaveLength(0);
  doc.undo();expect(doc.readPixel(id,20,20)).toEqual([60,70,80,255]);
 });
});

it('C06-002 safely omits pending semantic blocks when reusing a saved snapshot',()=>{
 const doc=new CoreDocument({width:4000,height:4000,ids:createDeterministicIdFactory()}),id=doc.defaultRasterLayerId;
 let tx=doc.begin('baseline');tx.replaceLayerRasterTiles(id,[
  {key:'0,0',pixels:block(0,0,[1,2,3,255])},
  {key:'1,0',pixels:block(0,0,[4,5,6,255])},
  {key:'3,3',pixels:block(0,0,[7,8,9,128])}
 ]);tx.commit();
 tx=doc.begin('ordinary brush after snapshot');
 tx.recordRasterOperation(id,{kind:'brush.stroke',schemaVersion:1,parameters:{}},[
  {tileX:0,tileY:0,bounds:{x0:0,y0:0,x1:20,y1:20},workUnits:1,commandIndices:[0]}
 ]);tx.commit();
 expect(()=>doc.readBaseRasterTiles(id)).toThrow('materialization');
 const reusable=doc.readBaseRasterTiles(id,doc.head,true);
 expect(reusable.map(tile=>tile.key)).toEqual(['3,3']);
 expect(Array.from(reusable[0]!.pixels.slice(0,4))).toEqual([7,8,9,128]);
});
