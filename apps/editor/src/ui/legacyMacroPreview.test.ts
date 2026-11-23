import {expect,it} from 'vitest';
import {CoreDocument} from '@illustro/core';
import {previewLegacyMacro} from './legacyMacroPreview';

it('stages mixed layer, view and history commands before one undoable edit',()=>{
  const artwork=new CoreDocument({width:40,height:32}),base=artwork.defaultRasterLayerId;
  const {layerId:top}=artwork.addRasterLayerAbove(base);
  const before=artwork.head;
  const candidate=previewLegacyMacro(artwork,top,['layerAlphaLock','undo','redo','layerClipping','fitView']);
  expect(candidate.revision).toBe(before);
  expect(candidate.views).toEqual(['fitView']);
  expect(candidate.root.getLayer(top)).toMatchObject({alphaLocked:true,clipSourceId:base});
  expect(artwork.root.getLayer(top).alphaLocked).toBeFalsy();
  expect(artwork.head).toBe(before);
  const transaction=artwork.begin('operation set');
  expect(transaction.restoreRevision(candidate.revision,candidate.flags)).toBe(true);
  const applied=transaction.commit().revision.id;
  expect(artwork.head).toBe(applied);
  expect(artwork.root.getLayer(top)).toMatchObject({alphaLocked:true,clipSourceId:base});
  const snapshot=artwork.capturePersistenceSnapshot();
  const restored=CoreDocument.restore({snapshot,blockPayloads:artwork.persistenceBlockPayloads(snapshot)});
  expect(restored.root.getLayer(top)).toMatchObject({alphaLocked:true,clipSourceId:base});
  expect(restored.undo().id).toBe(before);
  expect(restored.root.getLayer(top).alphaLocked).toBeFalsy();
  expect(restored.redo().id).toBe(applied);
});

it('describes the last valid partial result after a failed step without mutating the artwork',()=>{
  const artwork=new CoreDocument({width:40,height:32}),layer=artwork.defaultRasterLayerId;
  const initial=artwork.head;
  const candidate=previewLegacyMacro(artwork,layer,['layerAlphaLock','layerClipping','fitView']);
  expect(candidate.failed).toMatchObject({index:2});
  expect(candidate.views).toHaveLength(0);
  expect(candidate.flags[0]).toMatchObject({id:layer,alphaLocked:true,clipSourceId:null});
  expect(artwork.head).toBe(initial);
  expect(artwork.root.getLayer(layer).alphaLocked).toBeFalsy();
});
