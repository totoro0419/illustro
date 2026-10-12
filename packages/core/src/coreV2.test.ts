import {describe,expect,it} from 'vitest';
import {CoreDocument} from './coreDocument';
import {createDeterministicIdFactory} from './ids';
import {createRasterSurfaceDescriptor,pixelToTile,tileKey} from './raster/surface';

describe('Core V2 M01 boundaries',()=>{
  it('uses durable UUID identities and signed 256 tile mapping',()=>{
    const ids=createDeterministicIdFactory();const d=new CoreDocument({width:512,height:512,ids});
    expect(typeof d.head).toBe('string');expect(d.head).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(d.tileSize).toBe(256);expect(pixelToTile(-257)).toEqual({tile:-2,local:255});expect(pixelToTile(-256)).toEqual({tile:-1,local:0});expect(pixelToTile(-1)).toEqual({tile:-1,local:255});expect(pixelToTile(256)).toEqual({tile:1,local:0});expect(tileKey(-1,2)).toBe('-1,2');
  });
  it('keeps raster precision in the surface descriptor instead of RGBA8 API lock-in',()=>{
    const ids=createDeterministicIdFactory();for(const encoding of ['rgba.unorm8.v1','rgba.unorm16.v1','rgba.float32.v1'] as const){const descriptor=createRasterSurfaceDescriptor(ids.surface(),encoding,'display-p3');expect(descriptor.sampleEncoding).toBe(encoding);expect(descriptor.tileGridVersion).toBe('tile256.v2');expect(descriptor.alphaMode).toBe('straight');}
  });
  it('publishes a semantic stroke and raster mutation atomically in one revision',()=>{
    const d=new CoreDocument({width:512,height:512,ids:createDeterministicIdFactory()}),l=d.defaultRasterLayerId,t=d.begin('stroke');const base=d.head;
    const key=t.recordRasterOperation(l,{kind:'brush.stroke',schemaVersion:1,parameters:{strokeRecordVersion:3},algorithmVersionRefs:['engine:test'],sourceRevisionIds:[base]},[{tileX:-1,tileY:0,bounds:{x0:250,y0:2,x1:256,y1:20},workUnits:2,commandIndices:[0,1]},{tileX:0,tileY:0,bounds:{x0:0,y0:2,x1:12,y1:20},workUnits:2,commandIndices:[0,1]}]);
    const receipt=t.commit();expect(d.revisionCount).toBe(2);expect(receipt.revision.parentIds).toEqual([base]);expect(receipt.revision.command?.operations).toHaveLength(1);expect(receipt.revision.command?.operations[0]?.kind).toBe('brush.stroke');expect(receipt.revision.command?.operations[0]?.key).toEqual(key);
    expect(d.getTileValue(l,-1,0)?.mutations[0]?.operationKey).toEqual(key);expect(d.getTileValue(l,0,0)?.mutations[0]?.operationKey).toEqual(key);expect(receipt.changedBlockIds).toHaveLength(0);
  });
  it('rejects stale semantic target without publishing partial state',()=>{
    const d=new CoreDocument({width:512,height:512,ids:createDeterministicIdFactory()}),l=d.defaultRasterLayerId,a=d.begin('a'),b=d.begin('b');const hint=[{tileX:0,tileY:0,bounds:{x0:1,y0:1,x1:2,y1:2},workUnits:1,commandIndices:[0]}] as const;
    a.recordRasterOperation(l,{kind:'brush.stroke',schemaVersion:1,parameters:{}},hint);b.recordRasterOperation(l,{kind:'brush.stroke',schemaVersion:1,parameters:{}},hint);a.commit();const head=d.head,count=d.revisionCount;expect(()=>b.commit()).toThrow(/stale/);expect(d.head).toBe(head);expect(d.revisionCount).toBe(count);
  });
  it('does not publish when semantic mutation admission fails',()=>{
    const d=new CoreDocument({width:512,height:512,ids:createDeterministicIdFactory()}),l=d.defaultRasterLayerId,t=d.begin('too much'),head=d.head;t.recordRasterOperation(l,{kind:'brush.stroke',schemaVersion:1,parameters:{}},[{tileX:0,tileY:0,bounds:{x0:0,y0:0,x1:10,y1:10},workUnits:8_000_001,commandIndices:[0]}]);expect(()=>t.commit()).toThrow(/admission/);expect(d.head).toBe(head);expect(d.revisionCount).toBe(1);expect(d.getTileValue(l,0,0)).toBeUndefined();
  });
  it('keeps commit sequence independent from revision identity and branch navigation',()=>{
    const d=new CoreDocument({width:512,height:512,ids:createDeterministicIdFactory()}),l=d.defaultRasterLayerId;let t=d.begin('a');t.setPixel(l,1,1,[1,2,3,255]);const a=t.commit();t=d.begin('b');t.setPixel(l,2,2,[1,2,3,255]);const b=t.commit();d.undo();t=d.begin('c');t.setPixel(l,3,3,[1,2,3,255]);const c=t.commit();expect(a.persistence.commitStamp.commitSequence).toBe(1n);expect(b.persistence.commitStamp.commitSequence).toBe(2n);expect(c.persistence.commitStamp.commitSequence).toBe(3n);expect(typeof c.revision.id).toBe('string');
  });
  it('leaves the published document untouched if ownership transfer fails',()=>{
    const d=new CoreDocument({width:256,height:256,ids:createDeterministicIdFactory(),transfer:{transferBatch(){throw new Error('transfer failed');}}}),l=d.defaultRasterLayerId,t=d.begin('failure'),head=d.head;t.setPixel(l,1,1,[1,2,3,255]);expect(()=>t.commit()).toThrow(/transfer failed/);expect(d.head).toBe(head);expect(d.revisionCount).toBe(1);expect(d.canonicalBlockCount).toBe(0);
  });
});
