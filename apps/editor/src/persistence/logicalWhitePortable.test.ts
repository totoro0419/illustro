import {describe,it,expect} from 'vitest';
import {CoreDocument} from '@illustro/core';
import {captureExport} from '../export/basicExport';
import {createPortableDocument,openPortableDocument} from './portable';

describe('white document native .illustro compatibility',()=>{
  it('round-trips a 4000px white work without saving any white raster blocks',async()=>{
    const document=new CoreDocument({width:4000,height:4000,name:'Sparse white',blankBackground:'white'});
    const lower=document.root.rootLayerIds[0]!;
    const upper=document.addRasterLayerAbove(lower).layerId;
    const native=await createPortableDocument({document,selectedLayerId:upper});
    expect(native.snapshot.blocks).toHaveLength(0);
    expect(native.bytes.byteLength).toBeLessThan(50000);
    const opened=await openPortableDocument(native.bytes);
    expect(opened.selectedLayerId).toBe(upper);
    expect(opened.document.root.getLayer(lower).baseColor).toBe('white');
    expect(opened.document.readPixel(lower,3999,3999)).toEqual([255,255,255,255]);
    expect(opened.document.readPixel(upper,0,0)).toEqual([0,0,0,0]);
    const exportData=captureExport(opened.document);
    expect(exportData.layers[0]?.baseColor).toBe('white');
    expect(exportData.layers[1]?.baseColor).toBeUndefined();
    expect(opened.document.canonicalRasterBytes).toBe(0);
  });
});
