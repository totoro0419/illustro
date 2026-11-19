import {describe,it,expect,vi} from 'vitest';
import {BrushSurface} from './brushSurface';

describe('C06-002 cold materialized history recovery',()=>{
 function surface(message:string){
  const state:any={pointer:null,finishing:false,historySyncing:false,
   onStateChanged:vi.fn(),syncLayerStack:vi.fn(),
   session:{navigateDerived:vi.fn(async()=>{throw Error(message);})}};
  state.restoreDocumentProjection=vi.fn(async()=>{expect(state.historySyncing).toBe(false);});
  return state;
 }
 it('restores the authoritative current head only when an image-history miss requires raster baseline data',async()=>{
  const state=surface('Raster baseline restore required');
  await BrushSurface.prototype.syncHistoryBatch.call(state,[{operations:[],direction:'undo'} as any]);
  expect(state.restoreDocumentProjection).toHaveBeenCalledTimes(1);
  expect(state.historySyncing).toBe(false);
 });
 it('does not hide unrelated rendering failures or claim a successful restore',async()=>{
  const state=surface('GPU unavailable');
  await expect(BrushSurface.prototype.syncHistoryBatch.call(state,[{operations:[],direction:'undo'} as any])).rejects.toThrow('GPU unavailable');
  expect(state.restoreDocumentProjection).not.toHaveBeenCalled();expect(state.historySyncing).toBe(false);
 });
});
