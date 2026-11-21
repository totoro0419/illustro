import {describe,it,expect} from 'vitest';
import {CoreDocument} from './coreDocument';
import {mergeCoreRecovery,type CoreRecoveryPacketV1} from './persistence';
import type {LayerId} from './ids';
const bytes=(value=0)=>{const p=new Uint8Array(128*128*4);p.set([value,2,3,255]);return p;};
const children=(x=0,y=0)=>Array.from({length:4},(_,i)=>({key:`${x*2+i%2},${y*2+Math.floor(i/2)}`,pixels:bytes(20+i)}));
const ink=(doc:CoreDocument,id:LayerId,tiles:readonly number[])=>{
 const tx=doc.begin('semantic old brush');tx.recordRasterOperation(id,{kind:'brush.stroke',schemaVersion:1,parameters:{}},
  tiles.map(tileX=>({tileX,tileY:0,bounds:{x0:0,y0:0,x1:256,y1:256},workUnits:1,commandIndices:[0]})));return tx.commit();
};
describe('C06-002 partial raster snapshots',()=>{
 it('retains old semantic ink outside a patch through save, recovery and Undo/Redo',()=>{
  const doc=new CoreDocument({width:520,height:300}),id=doc.defaultRasterLayerId;
  const base=doc.capturePersistenceSnapshot(),packets:CoreRecoveryPacketV1[]=[];
  let tx=doc.begin('legacy full snapshot');tx.replaceLayerRasterTiles(id,[{key:'2,0',pixels:bytes(80)}]);
  packets.push(doc.captureRecoveryPacket(tx.commit().persistence));
  const old=ink(doc,id,[0,1]);packets.push(doc.captureRecoveryPacket(old.persistence));
  const oldValue=doc.getTileValue(id,1,0),before=doc.head;
  tx=doc.begin('partial selection');tx.patchLayerRasterTiles(id,['0,0'],children());
  const patch=tx.commit();packets.push(doc.captureRecoveryPacket(patch.persistence));
  expect(patch.revision.command?.operations[0]?.parameters).toMatchObject({partialRaster:true,tileCount:1});
  expect(patch.revision.command?.operations[0]?.parameters.replacesRaster).toBeUndefined();
  expect(doc.getTileValue(id,1,0)).toBe(oldValue);
  const plan=doc.rasterReplayPlan(),strokes=plan.operations.filter(op=>op.kind==='brush.stroke');
  expect(plan.tileFilteredLayers.has(id)).toBe(true);
  expect(strokes).toHaveLength(1);expect(strokes[0]?.dirtyFootprint.map(f=>f.tileX)).toEqual([1]);
  expect(doc.readPixel(id,0,0)).toEqual([20,2,3,255]);
  expect(doc.readBaseRasterTiles(id,doc.head,'replay').map(t=>t.key).sort()).toEqual(['0,0','0,1','1,0','1,1','2,0']);
  doc.undo();expect(doc.head).toBe(before);expect(doc.rasterReplayPlan().operations.find(op=>op.kind==='brush.stroke')?.dirtyFootprint).toHaveLength(2);
  doc.redo();expect(doc.readPixel(id,128,128)).toEqual([23,2,3,255]);
  const saved=doc.capturePersistenceSnapshot();
  const reopened=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(saved)),blockPayloads:doc.persistenceBlockPayloads(saved)});
  expect(reopened.rasterReplayPlan().operations.find(op=>op.kind==='brush.stroke')?.dirtyFootprint).toHaveLength(1);
  const merged=mergeCoreRecovery(base,packets,doc.head);
  const recovered=CoreDocument.restore({snapshot:merged,blockPayloads:doc.persistenceBlockPayloads(merged)});
  expect(recovered.readPixel(id,0,0)).toEqual([20,2,3,255]);
  expect(recovered.getTileValue(id,1,0)).toEqual(oldValue);
 });
 it('replays newer strokes over a patch, supersedes them on a second patch and handles full replacement',()=>{
  const doc=new CoreDocument({width:512,height:256}),id=doc.defaultRasterLayerId;
  ink(doc,id,[0,1]);let tx=doc.begin('patch');tx.patchLayerRasterTiles(id,['0,0'],children());tx.commit();
  ink(doc,id,[0]);
  expect(doc.rasterReplayPlan().operations.filter(op=>op.kind==='brush.stroke')).toHaveLength(2);
  expect(doc.readBaseRasterTiles(id,doc.head,'replay')).toHaveLength(4);
  tx=doc.begin('erase the block');tx.patchLayerRasterTiles(id,['0,0'],children().map(t=>({...t,pixels:new Uint8Array(128*128*4)})));tx.commit();
  expect(doc.readPixel(id,0,0)).toEqual([0,0,0,0]);
  expect(doc.rasterReplayPlan().operations.filter(op=>op.kind==='brush.stroke')).toHaveLength(1);
  tx=doc.begin('full replacement');tx.replaceLayerRasterTiles(id,[]);tx.commit();
  expect(doc.rasterReplayPlan().operations.filter(op=>op.kind==='brush.stroke')).toHaveLength(0);
 });
 it('requires complete neighbors and rejects malformed patches before committing any data',()=>{
  const doc=new CoreDocument({width:520,height:300}),id=doc.defaultRasterLayerId,head=doc.head;
  for(const [blocks,tiles] of [
   [['0,0'],children().slice(0,3)],
   [['0,0','0,0'],children()],
   [['00,0'],children()],
   [['3,0'],children()],
   [['0,0'],[...children().slice(0,3),{key:'2,0',pixels:bytes()}]]
  ] as const){
   const tx=doc.begin('invalid');expect(()=>tx.patchLayerRasterTiles(id,blocks,tiles)).toThrow();tx.cancel();
   expect(doc.head).toBe(head);expect(doc.canonicalBlockCount).toBe(0);
  }
  const tile=bytes(110);tile.set([7,8,9,128],(43*128+7)*4);
  const tx=doc.begin('right bottom edge');tx.patchLayerRasterTiles(id,['2,1'],[{key:'4,2',pixels:tile}]);tx.commit();
  expect(doc.readPixel(id,519,299)).toEqual([7,8,9,128]);
 });
});
