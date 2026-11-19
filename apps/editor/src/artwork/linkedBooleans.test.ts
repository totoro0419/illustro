import {describe,it,expect} from 'vitest';
import {CoreDocument,validateEditableArtwork,type EditablePath,type LayerId} from '@illustro/core';
import {linkedBooleanUpdates} from './linkedBooleans';
import {combineShapes} from './pathOperations';
const id=(x:string)=>x as LayerId;
const rect=(left:number,right:number):EditablePath=>({kind:'path',shape:'rectangle',points:[{x:left,y:0},{x:right,y:20}],closed:true,stroke:'#000000',fill:'#000000',width:0});
const link=async(a:EditablePath,b:EditablePath,mode:NonNullable<EditablePath['booleanOperands']>['mode'],ids:readonly [string,string])=>{
 const result=await combineShapes(a,b,mode);
 return validateEditableArtwork({...result,booleanOperands:{...result.booleanOperands!,sourceLayerIds:ids}}) as EditablePath;
};
describe('C10-006 live non-destructive boolean dependencies',()=>{
 for(const mode of ['union','difference','intersection','xor'] as const)
 it(`updates ${mode} repeatedly from the editable sources`,async()=>{
  const a=rect(0,20),b=rect(10,30),result=await link(a,b,mode,['a','b']);
  const entries=[{id:id('a'),content:a},{id:id('b'),content:b},{id:id('result'),content:result}];
  for(const changed of [rect(1,22),rect(2,24),rect(3,26)]){
   const updates=await linkedBooleanUpdates(entries,id('a'),changed);
   const expected=await combineShapes(changed,b,mode);
   expect(updates).toHaveLength(1);
   expect(updates[0]!.content.points).toEqual(expected.points);
   expect(updates[0]!.content.booleanOperands?.sourceLayerIds).toEqual(['a','b']);
   expect(result.booleanOperands?.a).toEqual(a);
  }
 });
 it('retains an empty intersection, then restores its shape when sources overlap again',async()=>{
  const a=rect(0,20),b=rect(10,30),result=await link(a,b,'intersection',['a','b']);
  const entries=[{id:id('a'),content:a},{id:id('b'),content:b},{id:id('r'),content:result}];
  const empty=(await linkedBooleanUpdates(entries,id('a'),rect(100,120)))[0]!.content;
  expect(empty.empty).toBe(true);expect(empty.booleanOperands?.a.points[0]?.x).toBe(100);
  entries[2]={id:id('r'),content:empty};
  const restored=(await linkedBooleanUpdates(entries,id('a'),a))[0]!.content;
  expect(restored.empty).toBeUndefined();expect(restored.points).toEqual(result.points);
 });
 it('updates chains once in order and safely freezes a deleted source',async()=>{
  const a=rect(0,20),b=rect(10,30),r=await link(a,b,'union',['a','b']);
  const s=await link(r,b,'difference',['r','b']);
  const updates=await linkedBooleanUpdates([{id:id('a'),content:a},{id:id('b'),content:b},{id:id('s'),content:s},{id:id('r'),content:r}],id('a'),rect(0,25));
  expect(updates.map(e=>e.id)).toEqual(['r','s']);
  const frozen=await linkedBooleanUpdates([{id:id('b'),content:b},{id:id('r'),content:r}],id('b'),rect(15,35));
  expect(frozen[0]!.content.booleanOperands?.a).toEqual(a);
 });
 it('rejects cycles and invalid coordinates before applying any updates',async()=>{
  const a=rect(0,20),b=rect(10,30),r=await link(a,b,'union',['a','b']);
  const cycle=await link(a,b,'union',['r','b']);
  await expect(linkedBooleanUpdates([{id:id('a'),content:cycle},{id:id('b'),content:b},{id:id('r'),content:r}],id('b'),b)).rejects.toThrow('循環');
  await expect(linkedBooleanUpdates([],id('a'),{...a,points:[{x:Infinity,y:0},{x:10,y:10}]})).rejects.toThrow('正しく');
 });
 it('commits source/result pixels and links in one revision and restores them losslessly',async()=>{
  const doc=new CoreDocument({width:40,height:40}),a=doc.defaultRasterLayerId;
  let tx=doc.begin('sources');tx.setEditableArtwork(a,rect(0,20));const b=tx.addRasterLayerAbove(a);tx.setEditableArtwork(b,rect(10,30));tx.commit();
  tx=doc.begin('result');const r=tx.addRasterLayerAbove(b);const result=await link(rect(0,20),rect(10,30),'union',[a,b]);tx.setEditableArtwork(r,result);tx.commit();
  const changed=rect(0,25),updates=await linkedBooleanUpdates([{id:a,content:rect(0,20)},{id:b,content:rect(10,30)},{id:r,content:result}],a,changed);
  const old=doc.head,pixels=new Uint8Array(40*40*4);pixels.set([40,50,60,128]);
  tx=doc.begin('edit and linked results');tx.replaceEditableArtworkBatch([{id:a,content:changed,pixels},...updates.map(e=>({...e,pixels}))]);tx.commit();
  expect(doc.root.getLayer(a).editable).toEqual(changed);expect(doc.readPixel(r,0,0)).toEqual([40,50,60,128]);
  doc.undo();expect(doc.head).toBe(old);expect(doc.root.getLayer(r).editable).toEqual(result);doc.redo();
  const snapshot=doc.capturePersistenceSnapshot(),restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(snapshot)),blockPayloads:doc.persistenceBlockPayloads(snapshot)});
  expect(restored.root.getLayer(r).editable).toEqual(updates[0]!.content);expect(restored.readPixel(r,0,0)).toEqual([40,50,60,128]);
  const bad=restored.begin('bad batch'),head=restored.head;
  expect(()=>bad.replaceEditableArtworkBatch([{id:a,content:changed,pixels},{id:r,content:result,pixels:new Uint8Array(4)}])).toThrow('更新');bad.cancel();expect(restored.head).toBe(head);
 });
});
