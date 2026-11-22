import {describe,expect,it} from 'vitest';
import {CoreDocument} from '@illustro/core';
import {strFromU8,unzipSync} from 'fflate';
import {captureExport} from './basicExport';
import {createExchangeDocument} from './exchangeDocument';
import {imageLayer,type ExchangeArtwork} from './exchangeTypes';
import {encodeOra} from './oraExchange';
import {decodePhotoshop,encodePhotoshop} from './psdExchange';
import {decodeTiff,encodeTiff} from './tiff';

const art:ExchangeArtwork={
  width:2,height:2,name:'作品',dpi:150,warnings:[],
  merged:Uint8ClampedArray.from([12,98,34,255,0,0,0,0,16,32,48,255,0,0,0,0]),
  layers:[
    imageLayer('背景',2,2,Uint8ClampedArray.from([12,98,34,255,32,16,64,255,0,0,0,0,180,90,30,255])),
    {...imageLayer('半透明',1,1,Uint8ClampedArray.of(16,32,48,128)),y:1,opacity:.6,visible:false,blend:'multiply'},
  ],
};

describe('exchange formats',()=>{
  for(const large of [false,true])it('round-trips '+(large?'PSB':'PSD')+' layers and restores the imported document',()=>{
    const bytes=encodePhotoshop(art,large);
    expect(Array.from(bytes.subarray(0,6))).toEqual([56,66,80,83,0,large?2:1]);
    const read=decodePhotoshop(bytes,art.name);
    expect(read.width).toBe(2);
    expect(read.dpi).toBe(150);
    expect(read.layers.map(layer=>layer.name)).toEqual(['背景','半透明']);
    expect(read.layers[1]).toMatchObject({x:0,y:1,visible:false,blend:'multiply'});
    expect(read.layers[1]?.opacity).toBeCloseTo(.6);
    expect(Array.from(read.layers[1]!.pixels)).toEqual([16,32,48,128]);
    const {artwork,selected}=createExchangeDocument(read);
    expect(captureExport(artwork).basePixels).toHaveLength(2);
    expect(artwork.readPixel(selected,0,1)).toEqual([16,32,48,128]);
    const saved=artwork.capturePersistenceSnapshot();
    const restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(saved)),blockPayloads:artwork.persistenceBlockPayloads(saved)});
    expect(captureExport(restored).basePixels).toHaveLength(2);
    expect(restored.readPixel(selected,0,1)).toEqual([16,32,48,128]);
  });

  it('preserves TIFF alpha and physical resolution and rejects truncated strips',()=>{
    const bytes=encodeTiff(art.layers[1]!.pixels,1,1,150);
    expect(decodeTiff(bytes)).toMatchObject({width:1,height:1,dpi:150,pixels:art.layers[1]!.pixels,warnings:[]});
    expect(()=>decodeTiff(bytes.subarray(0,-1))).toThrow(/途切れて/);
  });

  it('writes the OpenRaster stack in top-to-bottom order with real PNGs',async()=>{
    const zip=unzipSync(await encodeOra(art));
    expect(Object.keys(zip)[0]).toBe('mimetype');
    expect(strFromU8(zip.mimetype!)).toBe('image/openraster');
    const stack=strFromU8(zip['stack.xml']!);
    expect(stack.indexOf('半透明')).toBeLessThan(stack.indexOf('背景'));
    expect(stack).toContain('opacity="0.6" visibility="hidden" composite-op="svg:multiply"');
    for(const entry of ['data/layer0.png','data/layer1.png','Thumbnails/thumbnail.png','mergedimage.png'])
      expect(Array.from(zip[entry]!.subarray(0,8))).toEqual([137,80,78,71,13,10,26,10]);
  });
});
