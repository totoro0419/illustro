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

it('round-trips linear OpenEXR and keeps semi-transparent straight sRGB values',async()=>{
  const {encodeExr,decodeExr}=await import('./exr');
  const pixels=Uint8ClampedArray.of(16,32,48,128,253,156,11,255,0,0,0,0,12,120,74,1);
  const bytes=encodeExr(pixels,2,2);
  expect(decodeExr(bytes)).toMatchObject({width:2,height:2,pixels});
  expect(()=>decodeExr(bytes.subarray(0,-1))).toThrow(/走査線/);
});

it('embeds the standard sRGB profile and optional text in PNG without an overlapping sRGB chunk',async()=>{
  const {encodePng}=await import('./basicExport');
  const {unzlibSync}=await import('fflate');
  const {srgbIccBytes}=await import('./iccMetadata');
  const png=await encodePng(Uint8ClampedArray.of(2,20,200,80),1,1,300,
    {includeIcc:true,author:'作者',copyright:'権利表記'});
  const bytes=new Uint8Array(await png.arrayBuffer()),view=new DataView(bytes.buffer),labels=new Set<string>(),text=[];
  for(let at=8;at<bytes.length;){
    const length=view.getUint32(at),kind=String.fromCharCode(...bytes.subarray(at+4,at+8));
    labels.add(kind);
    const part=bytes.subarray(at+8,at+8+length);
    if(kind==='iCCP')expect(unzlibSync(part.subarray(part.indexOf(0)+2))).toEqual(srgbIccBytes());
    if(kind==='iTXt')text.push(new TextDecoder().decode(part).replaceAll('\0',' '));
    at+=length+12;
  }
  expect(labels.has('iCCP')).toBe(true);
  expect(labels.has('sRGB')).toBe(false);
  expect(labels.has('pHYs')).toBe(true);
  expect(text).toEqual(['Author     作者','Copyright     権利表記']);
});

it('writes simple SVG text as editable, escaped lines and retains complex text as artwork pixels',async()=>{
  const {svgTextGeometry}=await import('./exchange');
  const simple={kind:'text',text:'<x>&\n語',origin:{x:1,y:2},vertical:false,size:10,family:'sans-serif',
    color:'#001234',align:'center',spacing:1,lineHeight:1.4} as const;
  expect(svgTextGeometry(simple)).toContain('text-anchor="middle"');
  expect(svgTextGeometry(simple)).toContain('<tspan x="1" y="2">&lt;x&gt;&amp;</tspan><tspan x="1" y="16">語</tspan>');
  expect(svgTextGeometry({...simple,vertical:true})).toBeNull();
  expect(svgTextGeometry({...simple,fontAsset:'custom'})).toBeNull();
});
