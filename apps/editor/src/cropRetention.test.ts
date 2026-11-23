import {expect,it} from 'vitest';
import {CoreDocument} from '@illustro/core';
import {cropRestorePlan,mergeRetainedCrop} from './cropRetention';

it('retains the original outside across canvas expansion, image scaling, and native restoration',()=>{
  const doc=new CoreDocument({width:6,height:3}),id=doc.defaultRasterLayerId;
  const source=doc.head;
  for(const [width,height,kind,parameters] of [
    [4,2,'document.crop',{x:1,y:1,keepOutside:true}],
    [6,3,'document.canvas-resize',{anchor:'bottom-right'}],
    [12,6,'document.image-resize',{filter:'nearest'}],
  ] as const){
    const tx=doc.begin(kind);
    tx.resizeDocument(width,height,kind,new Map([[id,new Uint8Array(width*height*4)]]),parameters);
    tx.commit();
  }
  const snapshot=doc.capturePersistenceSnapshot(),reopened=CoreDocument.restore({snapshot,blockPayloads:doc.persistenceBlockPayloads(snapshot)});
  const plan=cropRestorePlan(reopened.operationsTo(),reopened.root)!;
  expect(plan).toMatchObject({source,placement:{x:2,y:0,width:12,height:6},output:{width:14,height:6},
    retained:{x:4,y:2,width:8,height:4},currentX:0,currentY:0,filter:'nearest'});
  const target=new Uint8Array(14*6*4).fill(200),current=new Uint8Array(12*6*4);
  const added=(3*12+1)*4;current.set([8,10,12,255],added);
  mergeRetainedCrop(target,current,reopened.root,plan);
  expect(target.slice((3*14+1)*4,(3*14+2)*4)).toEqual(Uint8Array.of(8,10,12,255));
  expect(target.slice((2*14+4)*4,(2*14+5)*4)).toEqual(Uint8Array.of(0,0,0,0));
  expect(target.slice(0,4)).toEqual(Uint8Array.of(200,200,200,200));
});

it('does not recover content removed by a later explicit destructive crop',()=>{
  const doc=new CoreDocument({width:6,height:3}),id=doc.defaultRasterLayerId;
  for(const [width,keepOutside] of [[4,true],[2,false]] as const){
    const tx=doc.begin('crop');tx.resizeDocument(width,3,'document.crop',
      new Map([[id,new Uint8Array(width*3*4)]]),{x:1,y:0,keepOutside});
    tx.commit();
  }
  expect(cropRestorePlan(doc.operationsTo(),doc.root)).toBeNull();
});
