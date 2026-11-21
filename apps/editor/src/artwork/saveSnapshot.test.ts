import {describe,it,expect} from 'vitest';
import {CoreDocument,type EditablePath} from '@illustro/core';
import {saveArtworkSnapshot} from './saveSnapshot';
import {roundedRectanglePoints,regularPolygonPoints} from './shapeGradient';

const base:EditablePath={kind:'path',shape:'rectangle',points:[{x:1,y:1},{x:8,y:8}],
 closed:true,stroke:'#123456',fill:'#abcdef',width:2};
const candidates=[base,{...base,shape:'bezier' as const,points:roundedRectanglePoints({x:1,y:1},{x:8,y:8},2)},
 {...base,shape:'ellipse' as const},{...base,shape:'polyline' as const,points:regularPolygonPoints({x:1,y:1},{x:8,y:8},5)},
 {...base,shape:'polyline' as const,closed:false},
 {...base,shape:'bezier' as const,closed:false,points:[{x:1,y:1,outX:2,outY:6},{x:8,y:8,inX:7,inY:3}]}];

describe('C09-007 shared raster/vector shape snapshots',()=>{
 for(const [index,content] of candidates.entries())for(const output of ['raster','vector'] as const)
 it(`retains pixels, mask, history and saved geometry for shape ${index} / ${output}`,()=>{
  const doc=new CoreDocument({width:12,height:12}),reference=doc.defaultRasterLayerId;
  let tx=doc.begin('existing settings');tx.setLayerOpacity(reference,.4);tx.commit();
  const pixels=new Uint8Array(12*12*4);pixels.set([10,20,30,128],(3*12+3)*4);
  const mask={shape:'rectangle' as const,enabled:true,inverted:false,density:.7,x:2,y:2,width:5,height:5};
  const before=doc.head;
  tx=doc.begin('shape');
  const id=saveArtworkSnapshot(tx,reference,pixels,content,'図形',undefined,mask,output);tx.commit();
  expect(doc.readPixel(id,3,3)).toEqual([10,20,30,128]);
  expect(doc.root.getLayer(id).editable).toEqual(output==='vector'?content:null);
  expect(doc.root.getLayer(id).vectorMask).toEqual(mask);
  expect(doc.root.getLayer(reference).opacity).toBe(.4);
  doc.undo();expect(doc.head).toBe(before);doc.redo();
  const snapshot=doc.capturePersistenceSnapshot();
  const restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(snapshot)),blockPayloads:doc.persistenceBlockPayloads(snapshot)});
  expect(restored.readPixel(id,3,3)).toEqual([10,20,30,128]);
  expect((restored.root.getLayer(id).editable??null)).toEqual(output==='vector'?content:null);
  expect(restored.root.getLayer(id).vectorMask).toEqual(mask);
  if(output==='raster'){
   const edit=restored.begin('ordinary brush pixels');edit.setPixel(id,3,3,[0,0,0,0]);edit.commit();
   expect(restored.readPixel(id,3,3)).toEqual([0,0,0,0]);
  }
 });
});
