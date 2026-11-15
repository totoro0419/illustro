import {expect,it} from 'vitest';
import {CoreDocument} from './coreDocument';
import {createDeterministicIdFactory} from './ids';
import type {LayerDeformation} from './layerDeformation';
import {mergeCoreRecovery} from './persistence';

it('keeps the original and later brush commands when a transform is reapplied and recovered',()=>{
  const ids=createDeterministicIdFactory(),doc=new CoreDocument({width:8,height:8,ids}),layer=doc.defaultRasterLayerId;
  const base=doc.capturePersistenceSnapshot(),packets:unknown[]=[];
  const blockPayloads=new Map<string,Uint8Array>();
  const track=(receipt:ReturnType<ReturnType<typeof doc.begin>['commit']>)=>{
    const packet=doc.captureRecoveryPacket(receipt.persistence);
    packets.push(JSON.parse(JSON.stringify(packet)));
    for(const [id,bytes] of doc.recoveryBlockPayloads(packet))blockPayloads.set(id,bytes);
  };
  const original=doc.begin('original');
  original.setPixel(layer,0,0,[10,20,30,255]);
  track(original.commit());
  const parameters:LayerDeformation={
    version:1,sourceRevision:doc.head,mode:'projective',bounds:{x:0,y:0,width:8,height:8},
    corners:[{x:1,y:0},{x:7,y:0},{x:8,y:8},{x:0,y:8}],selection:null,linkedMask:false,interpolation:'nearest'
  };
  const first=doc.begin('transform');
  first.replaceLayerDeformation(layer,new Uint8Array(8*8*4),parameters);
  track(first.commit());
  const brush=doc.begin('paint on the result');
  brush.recordRasterOperation(layer,{kind:'brush.stroke',schemaVersion:1,parameters:{strokeRecordVersion:3}},[
    {tileX:0,tileY:0,bounds:{x0:1,y0:1,x1:2,y1:2},workUnits:1,commandIndices:[0]}
  ]);
  track(brush.commit());
  const beforeId=doc.head;
  const data=new Uint8Array(8*8*4);
  data.set([90,80,70,255],8);
  const next=doc.begin('re-edit');
  next.replaceLayerDeformation(layer,data,{...parameters,corners:[{x:2,y:0},parameters.corners[1],parameters.corners[2],parameters.corners[3]]});
  const receipt=next.commit();track(receipt);
  const snapshot=mergeCoreRecovery(base,packets,doc.head);
  const recovered=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(snapshot)),blockPayloads});
  expect(recovered.root.getLayer(layer).deformation?.sourceRevision).toBe(parameters.sourceRevision);
  expect(recovered.readBaseRasterPixels(layer,parameters.sourceRevision).slice(0,4)).toEqual(Uint8Array.of(10,20,30,255));
  expect(recovered.readBaseRasterPixels(layer).slice(8,12)).toEqual(Uint8Array.of(90,80,70,255));
  expect(recovered.rasterReplayPlan().operations.filter(op=>op.kind==='brush.stroke')).toHaveLength(1);
  expect(recovered.getTileValue(layer,0,0)?.mutations).toHaveLength(1);
  recovered.undo();
  expect(recovered.head).toBe(beforeId);
  recovered.redo();
  expect(recovered.head).toBe(receipt.revision.id);
});
