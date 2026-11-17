import {describe,it,expect} from 'vitest';
import {createTiledPreviewAccumulator,canUseTiledHistoryPreview} from './tiledPreview';

describe('C03-007 bounded tile compositing',()=>{
  it('downsamples opaque checker tiles without allocating a full-size destination',()=>{
    const acc=createTiledPreviewAccumulator(4,4,2,2);
    const solid=(r:number,g:number,b:number)=>Uint8Array.from(Array.from({length:4},()=>[r,g,b,255]).flat());
    acc.addTile(solid(255,0,0),0,0,2);
    acc.addTile(solid(0,255,0),2,0,2);
    acc.addTile(solid(0,0,255),0,2,2);
    acc.addTile(solid(255,255,255),2,2,2);
    expect([...acc.finish()]).toEqual([255,0,0,255,0,255,0,255,0,0,255,255,255,255,255,255]);
  });
  it('averages premultiplied color to avoid dark halos around transparent ink',()=>{
    const acc=createTiledPreviewAccumulator(2,1,1,1);
    acc.addTile(Uint8Array.of(255,0,0,255,0,0,255,0,0,0,0,0,0,0,0,0),0,0,2);
    expect([...acc.finish()]).toEqual([255,0,0,128]);
  });
  it('handles partial edge tiles without bleeding past canvas bounds',()=>{
    const acc=createTiledPreviewAccumulator(3,2,1,1);
    acc.addTile(new Uint8Array(16).fill(255),0,0,2);
    acc.addTile(new Uint8Array(16).fill(255),2,0,2);
    expect([...acc.finish()]).toEqual([255,255,255,255]);
  });
  it('keeps advanced effects and saved raster bases on the exact fallback path',()=>{
    const layer={surfaceId:'ink',visible:true,opacity:1};
    const simple={width:4000,height:4000,layers:[layer]};
    expect(canUseTiledHistoryPreview(simple,160,120)).toBe(true);
    expect(canUseTiledHistoryPreview({...simple,layers:[{...layer,clipSurfaceId:'under'}]},160,120)).toBe(false);
    expect(canUseTiledHistoryPreview({...simple,basePixels:[{surfaceId:'ink',pixels:new Uint8Array(4)}]},160,120)).toBe(false);
    expect(canUseTiledHistoryPreview({...simple,layers:[{...layer,isolation:['g']}]},160,120)).toBe(false);
    expect(canUseTiledHistoryPreview(simple,1600,1200)).toBe(false);
  });
});
