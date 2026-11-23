import {CoreDocument} from '@illustro/core';
import {describe,expect,it} from 'vitest';
import {captureExportLayers,compositeArtworkRegion} from '../export/basicExport';
import {buildAdjustment} from './adjustmentPanel';
import {newEffect} from './rasterSettings';

describe('color adjustment layers',()=>{
  it('alters the lower composite but preserves transparency, edit settings and undo after restoration',async()=>{
    const art=new CoreDocument({width:2,height:1});
    const original=art.defaultRasterLayerId;
    const step={...newEffect('brightness'),values:[100,0,0]};
    const adjustment=buildAdjustment(step);
    const start=art.head,tx=art.begin('Lighten');
    const id=tx.addAdjustmentLayerAbove(original,{mode:'normal',space:'encoded',seed:0,adjustment},true);
    tx.setLayerOpacity(id,.5);tx.commit();
    const render=async(artwork:CoreDocument,color:number)=>compositeArtworkRegion(
      captureExportLayers(artwork.root),{x:0,y:0,width:2,height:1},
      async sid=>sid===artwork.root.getLayer(original).surface.descriptor.surfaceId?
        Uint8Array.of(color,color,color,255,10,20,30,0):null);
    expect(Array.from((await render(art,51))!)).toEqual([153,153,153,255,0,0,0,0]);
    const saved=art.capturePersistenceSnapshot();
    const restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(saved)),blockPayloads:art.persistenceBlockPayloads(saved)});
    expect(restored.root.getLayer(id).blend?.adjustment).toEqual(adjustment);
    expect(Array.from((await render(restored,17))!)).toEqual([136,136,136,255,0,0,0,0]);
    restored.undo();expect(restored.head).toBe(start);
    restored.redo();expect(restored.root.getLayer(id).opacity).toBe(.5);
  });
});
